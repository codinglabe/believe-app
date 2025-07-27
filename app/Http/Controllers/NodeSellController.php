<?php

namespace App\Http\Controllers;

use App\Models\NodeSell;
use App\Models\NodeBoss;
use App\Models\NodeReferral;
use App\Models\NodeShare;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Cashier\Cashier;

class NodeSellController extends Controller
{
    /**
     * Display the buy share page
     */
    public function buy($nodeBossId)
    {
        $nodeBoss = NodeBoss::findOrFail($nodeBossId);

        // Get all shares for this NodeBoss
        $shares = NodeShare::where('node_boss_id', $nodeBossId)->get();

        // Calculate total targeted amount (sum of cost)
        $totalTargetAmount = $shares->sum('cost');

        // Calculate total sold amount (cost - remaining)
        $totalSoldAmount = $shares->sum(function ($share) {
            return $share->cost - $share->remaining;
        });

        // Calculate total remaining amount
        $remainingAmount = $shares->sum('remaining');

        // Calculate progress percentage
        $progressPercentage = $totalTargetAmount > 0
            ? ($totalSoldAmount / $totalTargetAmount) * 100
            : 0;

        // Get current open shares (remaining > 0, status = 'open')
        $openShares = $shares->filter(function ($share) {
            return $share->status === 'open' && $share->remaining > 0;
        })->values();

        return Inertia::render('frontend/nodeboss/buy-nodeboss', [
            'nodeBoss' => $nodeBoss,
            'openShares' => $openShares,
            'stripeKey' => config('cashier.key'),
            'statistics' => [
                'total_target_amount' => $totalTargetAmount,
                'total_sold_amount' => $totalSoldAmount,
                'remaining_amount' => $remainingAmount,
                'progress_percentage' => round($progressPercentage, 2),
            ],
            'user' => Auth::user() ? [
                'name' => Auth::user()->name,
                'email' => Auth::user()->email,
            ] : null,
        ]);
    }


    /**
     * Process the share purchase
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'node_boss_id' => 'required|exists:node_bosses,id',
            'amount' => 'required|numeric|min:1',
            'buyer_name' => 'required|string|max:255',
            'buyer_email' => 'required|email|max:255',
            'message' => 'nullable|string|max:1000',
        ]);

        $ref = $request->query('ref'); // get ?ref= from URL
        $user = Auth::user();
        $amount = $validated['amount'];

        // Stripe fee calculation
        $processingFee = ($amount * 0.029) + 0.30;
        $totalAmount = $amount + $processingFee;
        $totalAmountInCents = (int) ($totalAmount * 100);

        try {
            DB::beginTransaction();

            $nodeBoss = NodeBoss::findOrFail($validated['node_boss_id']);
            $nodeShare = $this->getOrCreateAvailableShare($nodeBoss->id, $amount);

            $referralId = null;

            // Check referral link if provided
            if ($ref) {
                $referral = NodeReferral::where('referral_link', $ref)->first();

                if ($referral) {
                    // Prevent self referral usage except admin/org
                    if ($referral->user_id == $user->id && !$request->user()->hasRole(['admin', 'organization'])) {
                        return redirect()->back()->with('warning', 'You cannot use your own referral link.');
                    }

                    if ($referral->node_boss_id == $nodeBoss->id) {
                        $referralId = $referral->id;
                    }
                }
            }

            // Create the node sell record
            $nodeSell = NodeSell::create([
                'user_id' => $user->id,
                'node_boss_id' => $nodeBoss->id,
                'node_share_id' => $nodeShare->id,
                'node_referral_id' => $referralId, // may be null
                'amount' => $amount,
                'buyer_name' => $validated['buyer_name'],
                'buyer_email' => $validated['buyer_email'],
                'message' => $validated['message'] ?? null,
                'status' => 'pending',
                'payment_method' => 'stripe',
                'transaction_id' => 'temp_' . rand(100000, 999999),
                'certificate_id' => 'CERT-' . strtoupper(Str::random(8)),
                'purchase_date' => now(),
            ]);

            // Create or get user’s own referral link (if not exists)
            NodeReferral::firstOrCreate(
                ['user_id' => $user->id, 'node_boss_id' => $nodeBoss->id],
                [
                    'node_share_id' => $nodeShare->id,
                    'node_sell_id' => $nodeSell->id,
                    'status' => 'inactive',
                    'referral_link' => $user->referral_code ?? Str::slug($user->name) . '-' . rand(1000, 9999),
                    'parchentage' => 20.00, // default commission %
                ]
            );

            DB::commit();

            // Proceed to Stripe checkout with metadata
            $checkout = $user->checkoutCharge(
                $totalAmountInCents,
                "Share purchase for {$nodeBoss->name}",
                1,
                [
                    'success_url' => route('node-share.success') . '?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => route('node-share.cancel'),
                    'metadata' => [
                        'node_sell_id' => $nodeSell->id,
                        'node_boss_id' => $nodeBoss->id,
                        'node_share_id' => $nodeShare->id,
                        'referral_id' => $referralId, // will be null if no referral used
                        'share_amount' => $amount,
                    ],
                    'payment_method_types' => ['card'],
                ]
            );

            return Inertia::location($checkout->url);
        } catch (\Exception $e) {
            DB::rollBack();

            if (isset($nodeSell)) {
                $nodeSell->update(['status' => 'failed']);
            }

            return redirect()->back()->withErrors([
                'payment' => 'Payment processing failed: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Handle successful payment
     */
    public function success(Request $request)
    {
        $sessionId = $request->get('session_id');

        if (!$sessionId) {
            return redirect()->route('nodeboss.index')->with([
                'warning' => 'Invalid purchase session'
            ]);
        }

        try {
            DB::beginTransaction();

            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);
            $nodeSell = NodeSell::with(['user', 'nodeShare', 'nodeBoss'])
                ->findOrFail($session->metadata->node_sell_id);

            // Update NodeSell with Stripe payment info
            $nodeSell->update([
                'transaction_id' => $session->payment_intent,
                'payment_method' => $session->payment_method_types[0] ?? 'card',
                'status' => 'completed',
                'purchase_date' => now(),
            ]);

            if (!empty($session->metadata->referral_id)) {
                $nodeSell->update([
                    'node_referral_id' => $session->metadata->referral_id,
                ]);
            }

            // Update NodeShare after purchase
            $nodeShare = $nodeSell->nodeShare;
            $this->updateNodeShareAfterPurchase($nodeShare, $nodeSell->amount);

            // Handle referral commission only if referral_id exists and referral user is NOT buyer
            $referralId = $session->metadata->referral_id;
            if ($referralId) {
                $referral = NodeReferral::find($referralId);

                if ($referral && $referral->user_id != $nodeSell->user_id) {
                    if ($referral->status !== 'active') {
                        $referral->status = 'active';
                        $referral->save();
                    }

                    // ✅ NEW: Check if commission already paid to this referrer for this referred user + node boss
                    // $alreadyRewarded = $referral->user
                    //     ->transactions()
                    //     ->where('type', 'commission')
                    //     ->whereJsonContains('meta->node_boss_id', $nodeSell->node_boss_id)
                    //     ->whereJsonContains('meta->referred_user_id', $nodeSell->user_id)
                    //     ->exists();

                    // if (!$alreadyRewarded) {

                    // }

                    // Calculate commission
                    $commissionPercent = $referral->parchentage ?? 20;
                    $commissionAmount = ($nodeSell->amount * $commissionPercent) / 100;

                    // Add commission with detailed meta
                    $referral->user->commissionAdd($commissionAmount, [
                        'node_sell_id' => $nodeSell->id,
                        'node_boss_id' => $nodeSell->node_boss_id,
                        'referral_id' => $referral->id,
                        'referred_user_id' => $nodeSell->user_id, // 👈 used for one-time check
                    ]);
                }
            }

            DB::commit();

            return Inertia::location(route('certificate.show', $nodeSell->id));
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->route('nodeboss.index')->withErrors([
                'message' => 'Error verifying payment: ' . $e->getMessage()
            ]);
        }
    }







    /**
     * Get or create an available share based on the updated logic
     */
    private function getOrCreateAvailableShare($nodeBossId, $amount)
    {
        // First, fix any existing shares with incorrect status
        $this->fixExistingSharesStatus($nodeBossId);

        // Find the first open share that can accommodate the amount
        $existingShare = NodeShare::where('node_boss_id', $nodeBossId)
            ->where('status', 'open')
            ->where('remaining', '>=', $amount)
            ->orderBy('created_at', 'asc') // Use oldest share first
            ->first();

        if ($existingShare) {
            Log::info("Using existing share ID: {$existingShare->id} with remaining: {$existingShare->remaining}");
            return $existingShare;
        }

        // If no existing share can accommodate the amount, create a new one
        Log::info("Creating new share for node_boss_id: {$nodeBossId}, amount: {$amount}");
        return NodeShare::create([
            'node_boss_id' => $nodeBossId,
            'cost' => NodeShare::DEFAULT_SHARE_AMOUNT, // 2000.00
            'sold' => 0,
            'remaining' => NodeShare::DEFAULT_SHARE_AMOUNT,
            'status' => 'open'
        ]);
    }

    /**
     * Fix existing shares status based on remaining amount
     */
    private function fixExistingSharesStatus($nodeBossId)
    {
        // Close shares that have no remaining amount
        NodeShare::where('node_boss_id', $nodeBossId)
            ->where('remaining', '<=', 0)
            ->where('status', 'open')
            ->update(['status' => 'closed']);

        // Ensure shares with remaining amount are open
        NodeShare::where('node_boss_id', $nodeBossId)
            ->where('remaining', '>', 0)
            ->where('status', 'closed')
            ->update(['status' => 'open']);
    }



    /**
     * Update node share after successful purchase
     */
    private function updateNodeShareAfterPurchase($nodeShare, $amount)
    {
        $nodeShare->sold += $amount;
        $nodeShare->remaining -= $amount;

        // If the share is fully sold (remaining <= 0), close it
        if ($nodeShare->remaining <= 0) {
            $nodeShare->status = 'closed';
            $nodeShare->remaining = 0; // Ensure it's exactly 0
        }

        $nodeShare->save();

        Log::info("Updated share ID: {$nodeShare->id}, sold: {$nodeShare->sold}, remaining: {$nodeShare->remaining}, status: {$nodeShare->status}");
    }

    /**
     * Handle canceled payment
     */
    public function cancel(Request $request)
    {
        $sessionId = $request->get('session_id');

        if ($sessionId) {
            try {
                $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);
                if ($session->metadata->node_sell_id) {
                    NodeSell::where('id', $session->metadata->node_sell_id)
                        ->update(['status' => 'canceled']);
                }
            } catch (\Exception $e) {
                Log::error('Error updating canceled share purchase: ' . $e->getMessage());
            }
        }

        return Inertia::render('frontend/SharePurchaseCancel', [
            'message' => 'Your share purchase was canceled. You can try again anytime.'
        ]);
    }

    /**
     * Show certificate page
     */
    public function certificate($nodeSellId)
    {
        $nodeSell = NodeSell::with(['user', 'nodeShare', 'nodeBoss'])
            ->findOrFail($nodeSellId);

        // Ensure user can only view their own certificate or is admin
        if ($nodeSell->user_id !== Auth::id() && !Auth::user()->hasRole('admin')) {
            abort(403);
        }
        $refferalLink = NodeReferral::where('node_boss_id', $nodeSell->node_boss_id)
            ->where('user_id', $nodeSell->user_id)
            ->first();

        $fullReferralLink = $refferalLink
            ? route('nodeboss.index', ['ref' => $refferalLink->referral_link])
            : null;

        return Inertia::render('frontend/nodeboss/certificate', [
            'nodeSell' => $nodeSell,
            'nodeBoss' => $nodeSell->nodeBoss,
            'refferalLink' => $fullReferralLink
        ]);
    }

    /**
     * Send certificate via email
     */
    public function emailCertificate($nodeSellId)
    {
        $nodeSell = NodeSell::with(['user', 'nodeShare', 'nodeBoss'])
            ->findOrFail($nodeSellId);

        if ($nodeSell->user_id !== Auth::id()) {
            abort(403);
        }

        try {
            // Here you would send the email with certificate
            // Mail::to($nodeSell->buyer_email)->send(new ShareCertificateMail($nodeSell));

            return back()->with('success', 'Certificate sent to your email successfully!');
        } catch (\Exception $e) {
            return back()->withErrors(['email' => 'Failed to send certificate: ' . $e->getMessage()]);
        }
    }

    /**
     * Download certificate as PDF
     */
    public function downloadCertificate($nodeSellId)
    {
        $nodeSell = NodeSell::with(['user', 'nodeShare', 'nodeBoss'])
            ->findOrFail($nodeSellId);

        if ($nodeSell->user_id !== Auth::id()) {
            abort(403);
        }

        try {
            // Generate PDF using a library like DomPDF
            // $pdf = PDF::loadView('certificates.pdf', compact('nodeSell'));
            // return $pdf->download('certificate-' . $nodeSell->certificate_id . '.pdf');

            return back()->with('success', 'Certificate download will start shortly!');
        } catch (\Exception $e) {
            return back()->withErrors(['download' => 'Failed to download certificate: ' . $e->getMessage()]);
        }
    }

    /**
     * Display user's share purchases
     */
    public function myShares(Request $request)
    {
        $user = Auth::user();

        $query = NodeSell::with(['nodeBoss', 'nodeShare'])
            ->where('user_id', $user->id);

        // Apply search filter
        if ($request->has('search') && $request->input('search') !== '') {
            $search = $request->input('search');
            $query->whereHas('nodeBoss', function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%');
            });
        }

        // Apply status filter
        if ($request->has('status') && $request->input('status') !== '') {
            $query->where('status', $request->input('status'));
        }

        $shares = $query->orderBy('created_at', 'desc')->paginate(10);

        return Inertia::render('frontend/MyShares', [
            'shares' => $shares,
            'searchQuery' => $request->input('search', ''),
            'statusFilter' => $request->input('status', ''),
        ]);
    }

    /**
     * Update a sold share
     */
    public function update(Request $request, NodeSell $nodeSell)
    {
        $validated = $request->validate([
            'buyer_name' => 'required|string|max:255',
            'buyer_email' => 'required|email|max:255',
            'amount' => 'required|numeric|min:0',
            'status' => 'required|in:pending,completed,failed,canceled',
            'message' => 'nullable|string|max:1000',
        ]);

        $nodeSell->update($validated);

        return response()->json([
            'message' => 'Sold share updated successfully.',
            'soldShare' => $nodeSell
        ]);
    }

    /**
     * Delete a sold share
     */
    public function destroy(NodeSell $nodeSell)
    {
        $nodeSell->delete();
        return response()->json(['message' => 'Sold share deleted successfully.']);
    }
}

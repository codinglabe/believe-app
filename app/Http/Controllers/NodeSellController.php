<?php

namespace App\Http\Controllers;

use App\Models\NodeSell;
use App\Models\NodeBoss;
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

        $user = Auth::user();
        $nodeBoss = NodeBoss::findOrFail($validated['node_boss_id']);
        $amount = $validated['amount'];
        $amountInCents = (int) ($amount * 100);

        // Calculate processing fee (2.9% + $0.30)
        $processingFee = ($amount * 0.029) + 0.30;
        $totalAmount = $amount + $processingFee;
        $totalAmountInCents = (int) ($totalAmount * 100);

        try {
            DB::beginTransaction();

            // Get or create appropriate share using the updated logic
            $nodeShare = $this->getOrCreateAvailableShare($validated['node_boss_id'], $amount);

            // Create NodeSell record with pending status
            $nodeSell = NodeSell::create([
                'user_id' => $user->id,
                'node_boss_id' => $validated['node_boss_id'],
                'node_share_id' => $nodeShare->id,
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

            DB::commit();

            // Create Stripe checkout session
            $checkoutOptions = [
                'success_url' => route('node-share.success') . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('node-share.cancel'),
                'metadata' => [
                    'node_sell_id' => $nodeSell->id,
                    'node_boss_id' => $validated['node_boss_id'],
                    'node_share_id' => $nodeShare->id,
                    'share_amount' => $amount,
                ],
                'payment_method_types' => ['card'],
            ];

            // One-time payment for share purchase
            $checkout = $user->checkoutCharge(
                $totalAmountInCents,
                "Share purchase for {$nodeBoss->name}",
                1,
                $checkoutOptions
            );

            return Inertia::location($checkout->url);
        } catch (\Exception $e) {
            DB::rollBack();

            // Update status to failed if record was created
            if (isset($nodeSell)) {
                $nodeSell->update(['status' => 'failed']);
            }

            return redirect()->back()->withErrors([
                'payment' => 'Payment processing failed: ' . $e->getMessage()
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
     * Handle successful payment
     */
    public function success(Request $request)
    {
        $sessionId = $request->get('session_id');

        if (!$sessionId) {
            return redirect()->route('node-boss.index')->withErrors([
                'message' => 'Invalid purchase session'
            ]);
        }

        try {
            DB::beginTransaction();

            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);
            $nodeSell = NodeSell::with(['user', 'nodeShare', 'nodeBoss'])
                ->findOrFail($session->metadata->node_sell_id);

            // Update NodeSell record with successful payment info
            $nodeSell->update([
                'transaction_id' => $session->payment_intent,
                'payment_method' => $session->payment_method_types[0] ?? 'card',
                'status' => 'completed',
                'purchase_date' => now(),
            ]);

            // Update NodeShare with the new logic
            $nodeShare = $nodeSell->nodeShare;
            $this->updateNodeShareAfterPurchase($nodeShare, $nodeSell->amount);

            DB::commit();

            // Redirect to certificate page
            return redirect()->route('certificate.show', $nodeSell->id);
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->route('node-boss.index')->withErrors([
                'message' => 'Error verifying payment: ' . $e->getMessage()
            ]);
        }
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

        return Inertia::render('frontend/nodeboss/certificate', [
            'nodeSell' => $nodeSell,
            'nodeBoss' => $nodeSell->nodeBoss
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

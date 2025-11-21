<?php

namespace App\Http\Controllers;

use App\Models\FractionalOffering;
use App\Models\FractionalAsset;
use App\Models\FractionalOrder;
use App\Services\FractionalTagService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

class FractionalOwnershipController extends Controller
{
    public function index(Request $request)
    {
        $query = FractionalOffering::with('asset')
            ->where('status', 'live')
            ->orderBy('created_at', 'desc');

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('summary', 'like', "%{$search}%")
                  ->orWhereHas('asset', function ($assetQuery) use ($search) {
                      $assetQuery->where('name', 'like', "%{$search}%")
                                 ->orWhere('type', 'like', "%{$search}%");
                  });
            });
        }

        // Filter by asset type
        if ($request->has('asset_type') && $request->asset_type) {
            $query->whereHas('asset', function ($q) use ($request) {
                $q->where('type', $request->asset_type);
            });
        }

        $offerings = $query->paginate(12);

        // Get unique asset types for filter
        $assetTypes = FractionalAsset::distinct()
            ->whereNotNull('type')
            ->pluck('type')
            ->sort()
            ->values();

        return Inertia::render('frontend/fractional/Index', [
            'offerings' => $offerings,
            'assetTypes' => $assetTypes,
            'filters' => [
                'search' => $request->search,
                'asset_type' => $request->asset_type,
            ],
        ]);
    }

    public function myPurchases(Request $request)
    {
        $user = Auth::user();
        
        $query = FractionalOrder::with(['offering.asset'])
            ->where('user_id', $user->id)
            ->where('status', 'paid')
            ->orderBy('paid_at', 'desc');

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhere('tag_number', 'like', "%{$search}%")
                  ->orWhereHas('offering', function ($offeringQuery) use ($search) {
                      $offeringQuery->where('title', 'like', "%{$search}%")
                                    ->orWhereHas('asset', function ($assetQuery) use ($search) {
                                        $assetQuery->where('name', 'like', "%{$search}%");
                                    });
                  });
            });
        }

        $orders = $query->paginate(12);

        // Calculate stats
        $totalInvested = FractionalOrder::where('user_id', $user->id)
            ->where('status', 'paid')
            ->sum('amount');
        
        $totalOrders = FractionalOrder::where('user_id', $user->id)
            ->where('status', 'paid')
            ->count();
        
        $totalShares = FractionalOrder::where('user_id', $user->id)
            ->where('status', 'paid')
            ->get()
            ->sum(function ($order) {
                $meta = $order->meta ?? [];
                return $meta['full_shares'] ?? $order->shares ?? 0;
            });
        
        $totalTokens = FractionalOrder::where('user_id', $user->id)
            ->where('status', 'paid')
            ->sum('tokens');

        return Inertia::render('frontend/user-profile/fractional-ownership', [
            'orders' => $orders,
            'stats' => [
                'total_invested' => $totalInvested,
                'total_orders' => $totalOrders,
                'total_shares' => $totalShares,
                'total_tokens' => $totalTokens,
            ],
            'filters' => [
                'search' => $request->search,
            ],
        ]);
    }

    public function show(FractionalOffering $offering)
    {
        $offering->load('asset');
        
        // Only show live offerings to public
        if ($offering->status !== 'live') {
            abort(404);
        }

        return Inertia::render('frontend/fractional/Show', [
            'offering' => $offering,
        ]);
    }

    public function purchase(Request $request, FractionalOffering $offering)
    {
        $request->validate([
            'amount' => ['required', 'numeric', 'min:' . ($offering->token_price ?? $offering->price_per_share)],
        ]);

        if (!Auth::check()) {
            return redirect()->route('login')->with('error', 'Please login to purchase.');
        }

        $tokenPrice = $offering->token_price ?? $offering->price_per_share;
        $costPerShare = $offering->price_per_share;
        $amountInvested = $request->amount;
        
        // Calculate full shares and tokens from amount invested
        $fullShares = $costPerShare > 0 ? floor($amountInvested / $costPerShare) : 0;
        $remainingAmount = $costPerShare > 0 ? $amountInvested % $costPerShare : $amountInvested;
        $tokens = $tokenPrice > 0 ? floor($remainingAmount / $tokenPrice) : 0;
        
        if ($fullShares <= 0 && $tokens <= 0) {
            return back()->with('error', 'Amount is too low. Minimum purchase is ' . $offering->currency . ' ' . number_format($tokenPrice, 2));
        }

        // Check available shares and tokens
        $tokensPerShare = $offering->tokens_per_share;
        $totalTokensNeeded = ($fullShares * $tokensPerShare) + $tokens;
        $availableTokens = $offering->available_shares * $tokensPerShare;
        
        if ($totalTokensNeeded > $availableTokens) {
            return back()->with('error', 'Not enough available. Maximum available: ' . $offering->available_shares . ' shares');
        }

        DB::beginTransaction();
        try {
            $user = Auth::user();
            $tagService = new FractionalTagService();
            
            // Assign tag numbers for all tokens (from full shares + remaining tokens)
            $totalTokensNeeded = ($fullShares * $tokensPerShare) + $tokens;
            $assignedTags = $tagService->assignTagNumber($offering, $totalTokensNeeded);

            $orderIds = [];
            $totalAmount = $amountInvested; // Use the exact amount invested

            // Generate unique order number
            $orderNumber = $this->generateOrderNumber();
            
            // Create order(s) for each tag assignment
            // For now, we'll create one order with the total purchase
            // The tag service handles splitting across multiple shares if needed
            $order = FractionalOrder::create([
                'user_id' => $user->id,
                'offering_id' => $offering->id,
                'order_number' => $orderNumber,
                'tag_number' => $assignedTags[0]['tag_number'] ?? null, // First tag number
                'tokens' => $totalTokensNeeded,
                'shares' => $fullShares, // Store full shares
                'amount' => $amountInvested, // Store exact amount invested
                'status' => 'requires_payment',
                'payment_provider' => 'stripe',
                'meta' => [
                    'full_shares' => $fullShares,
                    'tokens' => $tokens,
                    'total_tokens' => $totalTokensNeeded,
                    'all_tag_numbers' => array_column($assignedTags, 'tag_number'),
                ],
            ]);
            
            $orderIds[] = $order->id;

            // Calculate total amount in cents for Stripe
            $totalAmountInCents = (int) ($totalAmount * 100);

            // Create description for Stripe
            $description = "Fractional Ownership: {$offering->title}";
            if ($fullShares > 0 && $tokens > 0) {
                $description .= " - {$fullShares} " . ($fullShares === 1 ? 'Share' : 'Shares') . " & {$tokens} " . ($tokens === 1 ? 'Token' : 'Tokens');
            } elseif ($fullShares > 0) {
                $description .= " - {$fullShares} " . ($fullShares === 1 ? 'Share' : 'Shares');
            } else {
                $description .= " - {$tokens} " . ($tokens === 1 ? 'Token' : 'Tokens');
            }

            // Create Stripe checkout session
            $checkout = $user->checkoutCharge(
                $totalAmountInCents,
                $description,
                1,
                [
                    'success_url' => route('fractional.purchase.success') . '?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => route('fractional.purchase.cancel') . '?offering_id=' . $offering->id,
                    'metadata' => [
                        'user_id' => $user->id,
                        'offering_id' => $offering->id,
                        'order_ids' => implode(',', $orderIds),
                        'full_shares' => $fullShares,
                        'tokens' => $tokens,
                        'total_tokens' => $totalTokensNeeded,
                        'amount_invested' => $amountInvested,
                        'tag_numbers' => implode(',', array_column($assignedTags, 'tag_number')),
                        'type' => 'fractional_ownership',
                    ],
                    'payment_method_types' => ['card'],
                ]
            );

            DB::commit();

            // Redirect to Stripe checkout
            return Inertia::location($checkout->url);
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Purchase failed: ' . $e->getMessage());
        }
    }

    public function purchaseSuccess(Request $request)
    {
        $sessionId = $request->get('session_id');
        
        if (!$sessionId) {
            return redirect()->route('fractional.index')->with('error', 'Invalid payment session.');
        }

        try {
            $user = Auth::user();
            
            // Retrieve Stripe session
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);
            
            if ($session->payment_status !== 'paid') {
                return redirect()->route('fractional.index')->with('error', 'Payment was not completed.');
            }

            $metadata = $session->metadata ?? (object)[];
            $orderIds = !empty($metadata->order_ids) ? explode(',', $metadata->order_ids) : [];
            $offeringId = $metadata->offering_id ?? null;

            if (empty($orderIds) || !$offeringId) {
                return redirect()->route('fractional.index')->with('error', 'Invalid payment metadata.');
            }

            DB::beginTransaction();
            
            // Update all orders to paid status
            $orders = FractionalOrder::whereIn('id', $orderIds)
                ->where('user_id', $user->id)
                ->where('status', 'requires_payment')
                ->get();

            // Get metadata from session to preserve shares and tokens info
            $fullShares = $metadata->full_shares ?? 0;
            $tokens = $metadata->tokens ?? 0;
            $amountInvested = $metadata->amount_invested ?? null;

            foreach ($orders as $order) {
                // Preserve existing meta and add payment info
                $existingMeta = $order->meta ?? [];
                $order->update([
                    'status' => 'paid',
                    'payment_intent_id' => $session->payment_intent,
                    'paid_at' => now(),
                    'amount' => $amountInvested ?? $order->amount, // Use exact amount from metadata
                    'shares' => $fullShares, // Update shares from metadata
                    'meta' => array_merge($existingMeta, [
                        'stripe_session_id' => $sessionId,
                        'payment_status' => $session->payment_status,
                        'full_shares' => $fullShares,
                        'tokens' => $tokens,
                        'amount_invested' => $amountInvested ?? $order->amount,
                    ]),
                ]);

                // Update or create holdings
                $holding = \App\Models\FractionalHolding::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'offering_id' => $order->offering_id,
                    ],
                    [
                        'shares' => 0,
                        'avg_cost_per_share' => 0,
                    ]
                );

                // Update holdings (convert tokens to shares for tracking)
                $offering = $order->offering;
                $tokensPerShare = $offering->tokens_per_share;
                $sharesFromTokens = $order->tokens / $tokensPerShare;
                
                $totalShares = $holding->shares + $sharesFromTokens;
                $totalCost = ($holding->shares * $holding->avg_cost_per_share) + $order->amount;
                $newAvgCost = $totalShares > 0 ? $totalCost / $totalShares : 0;

                $holding->update([
                    'shares' => $totalShares,
                    'avg_cost_per_share' => $newAvgCost,
                ]);
            }

            // Update available shares after payment confirmation
            // Only count full shares sold, not tokens
            $offering = \App\Models\FractionalOffering::find($offeringId);
            if ($offering) {
                // Sum only full shares from orders (from meta or shares field)
                $fullSharesSold = $orders->sum(function ($order) {
                    $meta = $order->meta ?? [];
                    return $meta['full_shares'] ?? $order->shares ?? 0;
                });
                
                // Only decrease available_shares by actual full shares sold
                $offering->available_shares = max(0, $offering->available_shares - $fullSharesSold);
                if ($offering->available_shares == 0) {
                    $offering->status = 'sold_out';
                }
                $offering->save();
            }

            DB::commit();

            // Redirect to certificate page for the first order
            $firstOrder = $orders->first();
            if ($firstOrder) {
                return redirect()->route('fractional.certificate.show', $firstOrder->id)
                    ->with('success', 'Payment successful! Your purchase has been confirmed.');
            }

            return redirect()->route('fractional.show', $offeringId)
                ->with('success', 'Payment successful! Your purchase has been confirmed.');
                
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Fractional purchase success error: ' . $e->getMessage());
            return redirect()->route('fractional.index')->with('error', 'Error processing payment: ' . $e->getMessage());
        }
    }

    public function purchaseCancel(Request $request)
    {
        $offeringId = $request->get('offering_id');
        
        // Clean up pending orders if needed
        if ($offeringId && Auth::check()) {
            FractionalOrder::where('user_id', Auth::id())
                ->where('offering_id', $offeringId)
                ->where('status', 'requires_payment')
                ->delete();
        }

        if ($offeringId) {
            return redirect()->route('fractional.show', $offeringId)
                ->with('info', 'Payment was cancelled. You can try again when ready.');
        }

        return redirect()->route('fractional.index')
            ->with('info', 'Payment was cancelled.');
    }

    /**
     * Generate a unique order number
     * Format: FO-YYYYMMDD-XXXXXX (e.g., FO-20251116-000001)
     */
    private function generateOrderNumber(): string
    {
        $prefix = 'FO-' . date('Ymd') . '-';
        
        // Get the last order number for today
        $lastOrder = FractionalOrder::where('order_number', 'like', $prefix . '%')
            ->orderBy('order_number', 'desc')
            ->first();
        
        if ($lastOrder) {
            // Extract the sequence number and increment
            $lastNumber = (int) substr($lastOrder->order_number, -6);
            $nextNumber = $lastNumber + 1;
        } else {
            // First order of the day
            $nextNumber = 1;
        }
        
        return $prefix . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);
    }
}


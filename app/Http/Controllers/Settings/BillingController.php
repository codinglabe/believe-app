<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class BillingController extends Controller
{
    /**
     * Display the billing page
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        
        // Get wallet status
        $walletConnected = !empty($user->wallet_access_token);
        $walletExpired = $walletConnected && $user->wallet_token_expires_at && $user->wallet_token_expires_at->isPast();
        
        $walletBalance = $user->balance ?? 0;
        
        // Balance will be fetched by frontend via API call
        // Using local balance as initial value
        
        // Get paginated transactions
        $perPage = $request->get('per_page', 10);
        $transactions = $user->transactions()
            ->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();
        
        // Transform transactions to include plan details
        $transactions->getCollection()->transform(function ($transaction) {
            $meta = $transaction->meta ?? [];
            $transactionData = [
                'id' => $transaction->id,
                'type' => $transaction->type,
                'status' => $transaction->status,
                'amount' => (float) $transaction->amount,
                'fee' => (float) $transaction->fee,
                'currency' => $transaction->currency,
                'payment_method' => $transaction->payment_method,
                'transaction_id' => $transaction->transaction_id,
                'processed_at' => $transaction->processed_at?->toIso8601String(),
                'created_at' => $transaction->created_at->toIso8601String(),
                'meta' => $meta,
                // Include plan details if it's a plan purchase
                'plan_name' => $meta['plan_name'] ?? null,
                'plan_frequency' => $meta['plan_frequency'] ?? null,
                'credits_added' => $meta['credits_added'] ?? null,
                'description' => $meta['description'] ?? null,
            ];
            return $transactionData;
        });
        
        return Inertia::render('settings/billing', [
            'wallet' => [
                'connected' => $walletConnected && !$walletExpired,
                'expired' => $walletExpired,
                'connected_at' => $user->wallet_connected_at?->toIso8601String(),
                'expires_at' => $user->wallet_token_expires_at?->toIso8601String(),
                'wallet_user_id' => $user->wallet_user_id,
                'balance' => $walletBalance,
            ],
            'transactions' => $transactions,
        ]);
    }
}


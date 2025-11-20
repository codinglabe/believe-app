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


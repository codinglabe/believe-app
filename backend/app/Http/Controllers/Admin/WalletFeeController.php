<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WalletFee;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WalletFeeController extends Controller
{
    /**
     * Display wallet fees management page
     */
    public function index()
    {
        $fees = WalletFee::orderBy('transaction_type')->get();

        // Ensure all transaction types exist
        $transactionTypes = ['deposit', 'send', 'receive', 'withdraw'];
        foreach ($transactionTypes as $type) {
            if (!$fees->where('transaction_type', $type)->first()) {
                WalletFee::create([
                    'transaction_type' => $type,
                    'fee_type' => 'percentage',
                    'fee_amount' => 0,
                    'is_active' => false,
                ]);
            }
        }

        $fees = WalletFee::orderBy('transaction_type')->get();

        return Inertia::render('Admin/WalletFees', [
            'fees' => $fees,
        ]);
    }

    /**
     * Update wallet fee
     */
    public function update(Request $request, WalletFee $walletFee)
    {
        $validated = $request->validate([
            'fee_type' => 'required|in:fixed,percentage',
            'fee_amount' => 'required|numeric|min:0',
            'min_fee' => 'nullable|numeric|min:0',
            'max_fee' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'description' => 'nullable|string|max:500',
        ]);

        $walletFee->update($validated);

        return back()->with('success', 'Wallet fee updated successfully!');
    }

    /**
     * Toggle fee active status
     */
    public function toggleActive(WalletFee $walletFee)
    {
        $walletFee->update([
            'is_active' => !$walletFee->is_active,
        ]);

        return response()->json([
            'success' => true,
            'is_active' => $walletFee->is_active,
            'message' => $walletFee->is_active ? 'Fee activated' : 'Fee deactivated',
        ]);
    }
}




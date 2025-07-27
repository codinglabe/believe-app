<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Transaction::query();
        $query->where('user_id', $user->id);
        // Apply search filter
        if ($request->has('search') && $request->input('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('transaction_id', 'like', '%' . $search . '%')
                    ->orWhere('type', 'like', '%' . $search . '%')
                    ->orWhere('amount', 'like', '%' . $search . '%');
                // Add more fields to search if needed
            });
        }

        // Apply status filter
        if ($request->has('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        // Order by latest transactions
        $transactions = $query->orderBy('processed_at', 'desc')
        ->latest()
            ->paginate(5) // Adjust per_page as needed
            ->withQueryString(); // Keep query parameters in pagination links

        return Inertia::render('frontend/user-profile/transactions', [ // Assuming your React component is named TransactionsPage.jsx/tsx
            'transactions' => $transactions,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    // You might have other methods like show, create, store, etc.
    public function show(Transaction $transaction)
    {
        return Inertia::render('TransactionDetails', [
            'transaction' => $transaction,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\NonprofitBarterTransaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin audit view for the Nonprofit Barter Network.
 * Both nonprofits, both listings, settlement delta, points ledger entries, full status history, dispute flags.
 */
class BarterAuditController extends Controller
{
    public function index(Request $request): Response
    {
        $query = NonprofitBarterTransaction::query()
            ->with([
                'requestingNonprofit:id,name,ein',
                'respondingNonprofit:id,name,ein',
                'requestedListing:id,nonprofit_id,title,points_value',
                'returnListing:id,nonprofit_id,title,points_value',
                'settlements',
            ])
            ->orderByDesc('created_at');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('dispute')) {
            $query->where('dispute_flag', true);
        }

        $transactions = $query->paginate(20)->withQueryString();

        return Inertia::render('admin/barter/audit', [
            'transactions' => $transactions,
            'filters' => [
                'status' => $request->input('status', 'all'),
                'dispute' => $request->filled('dispute') ? '1' : '',
            ],
        ]);
    }

    public function show(NonprofitBarterTransaction $transaction): Response
    {
        $transaction->load([
            'requestingNonprofit:id,name,ein,user_id',
            'respondingNonprofit:id,name,ein,user_id',
            'requestedListing',
            'returnListing',
            'settlements.fromOrganization:id,name',
            'settlements.toOrganization:id,name',
            'offers.proposerNonprofit:id,name',
            'offers.proposedReturnListing:id,title,points_value',
        ]);

        return Inertia::render('admin/barter/audit-show', [
            'transaction' => $transaction,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PhazeBalanceLedgerEntry;
use App\Services\PhazeBalanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PhazeBalanceController extends Controller
{
    public function __construct(
        private readonly PhazeBalanceService $phazeBalanceService,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorizePhazeBalanceRead($request);

        $summary = $this->phazeBalanceService->getSummary(fetchLivePhazeBalance: true);
        $ledger = $this->phazeBalanceService->getLedgerEntries(
            perPage: 25,
            type: $request->string('type')->toString() ?: null,
        );

        return Inertia::render('admin/phaze-balance/Index', [
            'summary' => $summary,
            'ledger' => $ledger->through(fn (PhazeBalanceLedgerEntry $entry) => [
                'id' => $entry->id,
                'type' => $entry->type,
                'amount' => (float) $entry->amount,
                'balance_before' => (float) $entry->balance_before,
                'balance_after' => (float) $entry->balance_after,
                'reference_type' => $entry->reference_type,
                'reference_id' => $entry->reference_id,
                'reference_label' => $entry->reference_label,
                'notes' => $entry->notes,
                'created_by' => $entry->creator ? [
                    'id' => $entry->creator->id,
                    'name' => $entry->creator->name,
                    'email' => $entry->creator->email,
                ] : null,
                'metadata' => $entry->metadata,
                'created_at' => $entry->created_at?->toIso8601String(),
            ]),
            'filters' => [
                'type' => $request->string('type')->toString() ?: null,
            ],
            'canTopUp' => $request->user()?->can('phaze.balance.top_up') || $request->user()?->can('phaze.balance.manage'),
        ]);
    }

    public function topUp(Request $request): RedirectResponse
    {
        $this->authorizePhazeBalanceWrite($request);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:99999999.99'],
            'notes' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        try {
            $this->phazeBalanceService->topUp(
                (float) $validated['amount'],
                $validated['notes'],
                $request->user(),
            );
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['amount' => $e->getMessage()]);
        }

        return redirect()
            ->route('admin.phaze-balance.index')
            ->with('success', 'Phaze prefunded balance top-up recorded successfully.');
    }

    private function authorizePhazeBalanceRead(Request $request): void
    {
        $user = $request->user();

        if (! $user || $user->role !== 'admin') {
            abort(403);
        }

        if (! $user->can('phaze.balance.read') && ! $user->can('phaze.balance.manage')) {
            abort(403);
        }
    }

    private function authorizePhazeBalanceWrite(Request $request): void
    {
        $user = $request->user();

        if (! $user || $user->role !== 'admin') {
            abort(403);
        }

        if (! $user->can('phaze.balance.top_up') && ! $user->can('phaze.balance.manage')) {
            abort(403);
        }
    }
}

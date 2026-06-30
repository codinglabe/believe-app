<?php

use App\Models\Transaction;
use App\Support\UnifiedLedgerBpStatus;
use App\Support\UnifiedLedgerOwner;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Transaction::query()
            ->where('bp_status', 'settled')
            ->orWhere('bp_status', 'settlement_available')
            ->orderBy('id')
            ->chunkById(500, function ($rows) {
                foreach ($rows as $transaction) {
                    if (! $transaction instanceof Transaction) {
                        continue;
                    }

                    $transaction->forceFill([
                        'bp_status' => UnifiedLedgerBpStatus::AVAILABLE,
                    ])->saveQuietly();
                }
            });

        // Normalize legacy person-name owners to client category labels where inferrable.
        Transaction::query()
            ->whereIn('ledger_type', ['bp', 'brp'])
            ->whereNotNull('current_owner')
            ->whereNotIn('current_owner', UnifiedLedgerOwner::all())
            ->orderBy('id')
            ->chunkById(500, function ($rows) {
                foreach ($rows as $transaction) {
                    if (! $transaction instanceof Transaction) {
                        continue;
                    }

                    $meta = is_array($transaction->meta) ? $transaction->meta : [];
                    $ownerType = is_string($meta['owner_type'] ?? null) ? $meta['owner_type'] : null;
                    if ($ownerType === null && ($meta['source'] ?? '') === 'believe_points_donation') {
                        $ownerType = 'organization';
                    }
                    if ($ownerType === null && in_array($transaction->ledger_type, ['bp', 'brp'], true)) {
                        $ownerType = 'supporter';
                    }

                    $label = UnifiedLedgerOwner::fromOwnerType($ownerType);
                    $transaction->forceFill(['current_owner' => $label])->saveQuietly();
                }
            });
    }

    public function down(): void
    {
        // Non-reversible data normalization.
    }
};

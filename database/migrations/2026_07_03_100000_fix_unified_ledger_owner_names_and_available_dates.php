<?php

use App\Models\Transaction;
use App\Models\User;
use App\Support\UnifiedLedgerBpStatus;
use App\Support\UnifiedLedgerOwner;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Transaction::query()
            ->where('ledger_type', 'bp')
            ->where('bp_status', UnifiedLedgerBpStatus::PROCESSING)
            ->whereNotNull('available_at')
            ->orderBy('id')
            ->chunkById(500, function ($rows) {
                foreach ($rows as $transaction) {
                    if (! $transaction instanceof Transaction) {
                        continue;
                    }

                    $transaction->forceFill(['available_at' => null])->saveQuietly();
                }
            });

        $genericOwners = [
            UnifiedLedgerOwner::SUPPORTER,
            UnifiedLedgerOwner::ORGANIZATION,
            UnifiedLedgerOwner::MERCHANT,
        ];

        Transaction::query()
            ->whereIn('ledger_type', ['bp', 'brp'])
            ->where(function ($q) use ($genericOwners) {
                $q->whereIn('current_owner', $genericOwners)->orWhereNull('current_owner');
            })
            ->orderBy('id')
            ->chunkById(500, function ($rows) {
                foreach ($rows as $transaction) {
                    if (! $transaction instanceof Transaction) {
                        continue;
                    }

                    $meta = is_array($transaction->meta) ? $transaction->meta : [];
                    $owner = null;

                    if (! empty($meta['organization_name'])) {
                        $owner = trim((string) $meta['organization_name']);
                    } elseif ($transaction->user_id) {
                        $owner = User::query()->whereKey($transaction->user_id)->value('name');
                    }

                    if ($owner !== null && trim($owner) !== '') {
                        $transaction->forceFill(['current_owner' => trim($owner)])->saveQuietly();
                    }
                }
            });
    }

    public function down(): void
    {
        //
    }
};

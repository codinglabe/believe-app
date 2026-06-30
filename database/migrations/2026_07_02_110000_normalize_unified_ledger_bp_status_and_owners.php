<?php

use App\Models\Transaction;
use App\Support\UnifiedLedgerBpStatus;
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
    }

    public function down(): void
    {
        // Non-reversible data normalization.
    }
};

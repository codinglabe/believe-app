<?php

use App\Models\Transaction;
use App\Services\Admin\UnifiedLedgerClassificationService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('transactions', 'ledger_type')) {
                $table->string('ledger_type', 16)->default('money')->after('type');
            }
            if (! Schema::hasColumn('transactions', 'bp_status')) {
                $table->string('bp_status', 24)->nullable()->after('ledger_type');
            }
            if (! Schema::hasColumn('transactions', 'available_at')) {
                $table->timestamp('available_at')->nullable()->after('bp_status');
            }
            if (! Schema::hasColumn('transactions', 'current_owner')) {
                $table->string('current_owner')->nullable()->after('available_at');
            }
            if (! Schema::hasColumn('transactions', 'brp_activity_type')) {
                $table->string('brp_activity_type', 24)->nullable()->after('current_owner');
            }

            $table->index('ledger_type');
        });

        Transaction::query()->orderBy('id')->chunkById(500, function ($rows) {
            foreach ($rows as $transaction) {
                if (! $transaction instanceof Transaction) {
                    continue;
                }

                $classified = UnifiedLedgerClassificationService::classify($transaction);
                $updates = array_filter([
                    'ledger_type' => $classified['ledger_type'],
                    'bp_status' => $classified['bp_status'],
                    'brp_activity_type' => $classified['brp_activity_type'],
                    'current_owner' => $classified['current_owner'],
                    'available_at' => $classified['available_at'],
                ], static fn ($v) => $v !== null);

                if ($updates !== []) {
                    $transaction->forceFill($updates)->saveQuietly();
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            foreach (['brp_activity_type', 'current_owner', 'available_at', 'bp_status', 'ledger_type'] as $col) {
                if (Schema::hasColumn('transactions', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

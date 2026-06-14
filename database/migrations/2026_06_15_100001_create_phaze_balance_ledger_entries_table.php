<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('phaze_balance_ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('phaze_balance_wallet_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->decimal('amount', 12, 2);
            $table->decimal('balance_before', 12, 2);
            $table->decimal('balance_after', 12, 2);
            $table->nullableMorphs('reference');
            $table->string('reference_label')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['type', 'created_at']);
            $table->unique(
                ['phaze_balance_wallet_id', 'type', 'reference_type', 'reference_id'],
                'phaze_balance_ledger_purchase_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('phaze_balance_ledger_entries');
    }
};

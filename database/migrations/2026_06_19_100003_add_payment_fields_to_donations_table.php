<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            if (! Schema::hasColumn('donations', 'payment_transaction_id')) {
                $table->foreignId('payment_transaction_id')->nullable()->after('transaction_id')
                    ->constrained('payment_transactions')->nullOnDelete();
            }
            if (! Schema::hasColumn('donations', 'receipt_image')) {
                $table->string('receipt_image')->nullable()->after('message');
            }
            if (! Schema::hasColumn('donations', 'reward_points_issued')) {
                $table->boolean('reward_points_issued')->default(false)->after('receipt_image');
            }
            if (! Schema::hasColumn('donations', 'metadata')) {
                $table->json('metadata')->nullable()->after('reward_points_issued');
            }
        });
    }

    public function down(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            if (Schema::hasColumn('donations', 'payment_transaction_id')) {
                $table->dropConstrainedForeignId('payment_transaction_id');
            }
            foreach (['receipt_image', 'reward_points_issued', 'metadata'] as $col) {
                if (Schema::hasColumn('donations', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

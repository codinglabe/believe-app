<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            if (! Schema::hasColumn('believe_point_purchases', 'stripe_balance_transaction_id')) {
                $table->string('stripe_balance_transaction_id')->nullable()->after('stripe_settlement_reference');
            }
            if (! Schema::hasColumn('believe_point_purchases', 'stripe_payout_id')) {
                $table->string('stripe_payout_id')->nullable()->after('stripe_balance_transaction_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            foreach (['stripe_balance_transaction_id', 'stripe_payout_id'] as $col) {
                if (Schema::hasColumn('believe_point_purchases', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->decimal('transaction_fee', 10, 2)->default(0)->after('platform_fee');
            $table->decimal('sales_tax', 10, 2)->default(0)->after('transaction_fee');
            $table->decimal('sales_tax_rate', 5, 2)->nullable()->after('sales_tax');
            $table->string('buyer_state', 2)->nullable()->after('sales_tax_rate');
            $table->enum('payment_method', ['stripe', 'believe_points'])->nullable()->after('payment_status');
            $table->string('stripe_payment_intent_id')->nullable()->after('stripe_session_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->dropColumn([
                'transaction_fee',
                'sales_tax',
                'sales_tax_rate',
                'buyer_state',
                'payment_method',
                'stripe_payment_intent_id',
            ]);
        });
    }
};

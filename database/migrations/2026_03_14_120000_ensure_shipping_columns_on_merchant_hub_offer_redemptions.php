<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            if (!Schema::hasColumn('merchant_hub_offer_redemptions', 'shipping_name')) {
                $table->string('shipping_name')->nullable()->after('receipt_code');
            }
            if (!Schema::hasColumn('merchant_hub_offer_redemptions', 'shipping_line1')) {
                $table->string('shipping_line1')->nullable()->after('shipping_name');
            }
            if (!Schema::hasColumn('merchant_hub_offer_redemptions', 'shipping_line2')) {
                $table->string('shipping_line2')->nullable()->after('shipping_line1');
            }
            if (!Schema::hasColumn('merchant_hub_offer_redemptions', 'shipping_city')) {
                $table->string('shipping_city')->nullable()->after('shipping_line2');
            }
            if (!Schema::hasColumn('merchant_hub_offer_redemptions', 'shipping_state')) {
                $table->string('shipping_state')->nullable()->after('shipping_city');
            }
            if (!Schema::hasColumn('merchant_hub_offer_redemptions', 'shipping_postal_code')) {
                $table->string('shipping_postal_code')->nullable()->after('shipping_state');
            }
            if (!Schema::hasColumn('merchant_hub_offer_redemptions', 'shipping_country')) {
                $table->string('shipping_country', 2)->nullable()->after('shipping_postal_code');
            }
        });
    }

    public function down(): void
    {
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            $columns = [
                'shipping_name', 'shipping_line1', 'shipping_line2',
                'shipping_city', 'shipping_state', 'shipping_postal_code', 'shipping_country',
            ];
            foreach ($columns as $col) {
                if (Schema::hasColumn('merchant_hub_offer_redemptions', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

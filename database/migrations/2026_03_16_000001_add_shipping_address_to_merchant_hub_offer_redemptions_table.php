<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            $table->string('shipping_name')->nullable()->after('receipt_code');
            $table->string('shipping_line1')->nullable()->after('shipping_name');
            $table->string('shipping_line2')->nullable()->after('shipping_line1');
            $table->string('shipping_city')->nullable()->after('shipping_line2');
            $table->string('shipping_state')->nullable()->after('shipping_city');
            $table->string('shipping_postal_code')->nullable()->after('shipping_state');
            $table->string('shipping_country', 2)->nullable()->after('shipping_postal_code');
        });
    }

    public function down(): void
    {
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            $table->dropColumn([
                'shipping_name', 'shipping_line1', 'shipping_line2',
                'shipping_city', 'shipping_state', 'shipping_postal_code', 'shipping_country',
            ]);
        });
    }
};

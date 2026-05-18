<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            if (! Schema::hasColumn('merchant_hub_offer_redemptions', 'stripe_processing_fee_addon')) {
                $table->decimal('stripe_processing_fee_addon', 12, 2)->nullable()->after('total_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('merchant_hub_offer_redemptions', function (Blueprint $table) {
            if (Schema::hasColumn('merchant_hub_offer_redemptions', 'stripe_processing_fee_addon')) {
                $table->dropColumn('stripe_processing_fee_addon');
            }
        });
    }
};

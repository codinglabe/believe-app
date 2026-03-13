<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * BIU Unity Points: Retail/reference price for discount calculation.
     * discount_amount = reference_price * (discount_percentage/100)
     * points_required = discount_amount * 1000
     */
    public function up(): void
    {
        Schema::table('merchant_hub_offers', function (Blueprint $table) {
            $table->decimal('reference_price', 10, 2)->nullable()->after('description')
                ->comment('Retail price for this offer; used to calculate discount amount and points');
        });
    }

    public function down(): void
    {
        Schema::table('merchant_hub_offers', function (Blueprint $table) {
            $table->dropColumn('reference_price');
        });
    }
};

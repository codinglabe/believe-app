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
        Schema::table('merchant_hub_offers', function (Blueprint $table) {
            $table->boolean('is_standard_discount')->default(false)->after('points_required');
            $table->decimal('discount_percentage', 5, 2)->nullable()->after('is_standard_discount');
            $table->decimal('discount_cap', 10, 2)->nullable()->after('discount_percentage')->comment('Maximum discount amount (e.g., 10% off, max $20)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('merchant_hub_offers', function (Blueprint $table) {
            $table->dropColumn(['is_standard_discount', 'discount_percentage', 'discount_cap']);
        });
    }
};

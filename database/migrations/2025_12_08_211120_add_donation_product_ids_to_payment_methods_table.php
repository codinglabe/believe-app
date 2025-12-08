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
        Schema::table('payment_methods', function (Blueprint $table) {
            // Donation product IDs for test and live environments
            $table->string('test_donation_product_id')->nullable()->after('live_webhook_secret');
            $table->string('live_donation_product_id')->nullable()->after('test_donation_product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn([
                'test_donation_product_id',
                'live_donation_product_id',
            ]);
        });
    }
};

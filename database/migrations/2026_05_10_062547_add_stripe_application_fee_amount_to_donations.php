<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add a column to record the platform fee BIU collects via Stripe Connect destination charges.
     * Stored in USD (decimal) to match the rest of the donations table; null for non-Connect rows.
     */
    public function up(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->decimal('stripe_application_fee_amount', 10, 2)->nullable()->after('stripe_connect_account_id');
        });
    }

    public function down(): void
    {
        Schema::table('donations', function (Blueprint $table) {
            $table->dropColumn('stripe_application_fee_amount');
        });
    }
};

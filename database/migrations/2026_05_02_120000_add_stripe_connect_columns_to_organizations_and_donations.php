<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('stripe_connect_account_id')->nullable();
            $table->boolean('stripe_connect_charges_enabled')->default(false);
            $table->boolean('stripe_connect_payouts_enabled')->default(false);
        });

        Schema::table('donations', function (Blueprint $table) {
            $table->string('stripe_connect_account_id')->nullable();
            $table->string('stripe_checkout_session_id')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn([
                'stripe_connect_account_id',
                'stripe_connect_charges_enabled',
                'stripe_connect_payouts_enabled',
            ]);
        });

        Schema::table('donations', function (Blueprint $table) {
            $table->dropColumn(['stripe_connect_account_id', 'stripe_checkout_session_id']);
        });
    }
};

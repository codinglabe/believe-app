<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('believe_points_payment_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('stripe_card_enabled')->default(true);
            $table->boolean('stripe_ach_enabled')->default(true);
            $table->boolean('stripe_venmo_enabled')->default(false);
            $table->boolean('venmo_manual_enabled')->default(false);
            $table->string('venmo_username')->nullable();
            $table->boolean('stripe_cash_app_pay_enabled')->default(false);
            $table->boolean('paypal_enabled')->default(false);
            $table->boolean('cashapp_manual_enabled')->default(false);
            $table->boolean('zelle_enabled')->default(false);
            $table->string('cashapp_qr_image')->nullable();
            $table->string('cashapp_cashtag')->nullable();
            $table->string('zelle_email')->nullable();
            $table->string('zelle_phone')->nullable();
            $table->text('payment_instructions')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('believe_points_payment_settings');
    }
};

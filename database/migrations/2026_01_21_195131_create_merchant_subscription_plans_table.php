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
        Schema::create('merchant_subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('frequency')->default('monthly'); // monthly, yearly
            $table->decimal('price', 10, 2);
            $table->string('stripe_price_id')->nullable();
            $table->string('stripe_product_id')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_popular')->default(false);
            $table->integer('sort_order')->default(0);
            $table->integer('trial_days')->nullable();
            $table->json('custom_fields')->nullable(); // For dynamic fields like max_offers, max_redemptions, etc.
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('merchant_subscription_plans');
    }
};

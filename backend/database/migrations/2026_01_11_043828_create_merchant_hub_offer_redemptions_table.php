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
        Schema::create('merchant_hub_offer_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_hub_offer_id')->constrained('merchant_hub_offers')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->integer('points_spent');
            $table->decimal('cash_spent', 10, 2)->default(0);
            $table->enum('status', ['pending', 'approved', 'fulfilled', 'canceled'])->default('pending');
            $table->string('receipt_code')->unique();
            $table->timestamps();

            $table->index('merchant_hub_offer_id');
            $table->index('user_id');
            $table->index('status');
            $table->index('receipt_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('merchant_hub_offer_redemptions');
    }
};

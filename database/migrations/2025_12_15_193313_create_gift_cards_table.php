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
        Schema::create('gift_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('organization_id')->nullable()->constrained()->onDelete('set null');
            $table->string('external_id')->nullable(); // ID from external API
            $table->string('voucher')->nullable(); // Voucher code
            $table->decimal('amount', 12, 2);
            $table->string('brand')->nullable();
            $table->string('brand_name')->nullable();
            $table->string('country')->nullable();
            $table->string('currency', 3)->default('USD');
            $table->boolean('is_sent')->default(false);
            $table->string('status')->default('pending'); // pending, active, used, expired
            $table->string('stripe_payment_intent_id')->nullable();
            $table->string('stripe_session_id')->nullable();
            $table->timestamp('purchased_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->json('meta')->nullable(); // Store additional data
            $table->timestamps();

            $table->index('user_id');
            $table->index('organization_id');
            $table->index('external_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gift_cards');
    }
};

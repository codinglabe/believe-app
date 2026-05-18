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
        Schema::create('stripe_refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('service_orders')->onDelete('cascade');
            $table->string('refund_id')->unique();
            $table->string('payment_intent_id');
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('usd');
            $table->text('reason');
            $table->enum('status', ['pending', 'succeeded', 'failed', 'canceled']);
            $table->json('stripe_response')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stripe_refunds');
    }
};

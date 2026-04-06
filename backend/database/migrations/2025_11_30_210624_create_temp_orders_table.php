<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('temp_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('platform_fee', 12, 2)->default(0);
            $table->boolean('include_donation')->default(false);
            $table->decimal('donation_amount', 12, 2)->default(0);
            $table->decimal('shipping_cost', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->string('status')->default('pending'); // pending, payment_processing, completed
            $table->json('shipping_info')->nullable();
            $table->json('items_snapshot')->nullable(); // Cart items snapshot
            $table->string('shipping_method')->nullable();
            $table->string('stripe_payment_intent_id')->nullable();
            $table->timestamp('expires_at')->nullable(); // Auto-delete after 24 hours
            $table->timestamps();

            $table->index('user_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('temp_orders');
    }
};

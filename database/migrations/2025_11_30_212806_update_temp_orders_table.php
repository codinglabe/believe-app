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
        Schema::dropIfExists('temp_orders');

        Schema::create('temp_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $table->string('printify_order_id')->nullable();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('shipping_address');
            $table->string('city');
            $table->string('state');
            $table->string('zip');
            $table->string('country');
            $table->decimal('subtotal', 10, 2);
            $table->decimal('platform_fee', 10, 2)->default(0);
            $table->decimal('donation_amount', 10, 2)->default(0);
            $table->decimal('shipping_cost', 10, 2)->default(0);
            $table->decimal('tax_amount', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2);
            $table->json('shipping_methods')->nullable();
            $table->string('selected_shipping_method')->nullable();
            $table->enum('status', ['pending', 'shipping_calculated', 'payment_completed'])->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('temp_orders');
    }
};

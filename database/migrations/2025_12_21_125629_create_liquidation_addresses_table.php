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
        Schema::create('liquidation_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bridge_integration_id')->constrained('bridge_integrations')->onDelete('cascade');
            $table->string('bridge_customer_id')->index();
            $table->string('bridge_liquidation_address_id')->unique()->nullable(); // Bridge API ID
            $table->string('chain'); // solana, ethereum, base, polygon, etc.
            $table->string('currency'); // usdc, usdt, etc.
            $table->string('address'); // The liquidation address to receive crypto
            $table->string('destination_payment_rail'); // solana, ethereum, bridge_wallet, etc.
            $table->string('destination_currency'); // usdb, usdc, etc.
            $table->string('destination_address'); // Where funds are forwarded to
            $table->string('return_address')->nullable(); // Where to send if transaction fails
            $table->string('state')->default('active'); // active, inactive, etc.
            $table->json('liquidation_metadata')->nullable(); // Store full Bridge API response
            $table->timestamp('last_sync_at')->nullable();
            $table->timestamps();

            // Indexes for common queries
            $table->index(['bridge_integration_id', 'chain', 'currency']);
            $table->index(['bridge_customer_id', 'chain', 'currency']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('liquidation_addresses');
    }
};

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
        Schema::create('bridge_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bridge_integration_id')->constrained('bridge_integrations')->onDelete('cascade');
            $table->string('bridge_customer_id')->nullable(); // Reference to Bridge customer
            $table->string('bridge_wallet_id')->unique()->nullable(); // Bridge wallet ID
            $table->string('wallet_address')->nullable(); // Wallet address (e.g., Solana address)
            $table->string('chain')->default('solana'); // Blockchain chain (solana, ethereum, etc.)
            $table->enum('status', ['pending', 'active', 'inactive', 'suspended'])->default('active');
            $table->decimal('balance', 20, 8)->default(0); // Current balance (cached)
            $table->string('currency', 10)->default('USD'); // Currency code
            $table->string('virtual_account_id')->nullable(); // Bridge virtual account ID for deposits
            $table->json('virtual_account_details')->nullable(); // Virtual account details (bank info, etc.)
            $table->json('wallet_metadata')->nullable(); // Additional wallet data from Bridge
            $table->timestamp('last_balance_sync')->nullable(); // Last time balance was synced
            $table->boolean('is_primary')->default(false); // Primary wallet for the customer
            $table->timestamps();
            
            $table->index('bridge_integration_id');
            $table->index('bridge_customer_id');
            $table->index('bridge_wallet_id');
            $table->index('chain');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bridge_wallets');
    }
};

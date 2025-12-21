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
        Schema::create('card_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bridge_integration_id')->constrained('bridge_integrations')->onDelete('cascade');
            $table->string('bridge_customer_id')->nullable(); // Reference to Bridge customer
            $table->string('bridge_card_account_id')->unique()->nullable(); // Bridge card account ID
            $table->string('card_number')->nullable(); // Masked card number (last 4 digits)
            $table->string('card_type')->nullable(); // Card type (debit, credit, etc.)
            $table->string('card_brand')->nullable(); // Card brand (visa, mastercard, etc.)
            $table->string('expiry_month')->nullable(); // Card expiry month
            $table->string('expiry_year')->nullable(); // Card expiry year
            $table->enum('status', ['pending', 'active', 'inactive', 'suspended', 'expired', 'cancelled'])->default('active');
            $table->decimal('balance', 20, 8)->default(0); // Current balance (cached)
            $table->string('currency', 10)->default('USD'); // Currency code
            $table->json('card_metadata')->nullable(); // Additional card data from Bridge
            $table->timestamp('last_balance_sync')->nullable(); // Last time balance was synced
            $table->boolean('is_primary')->default(false); // Primary card for the customer
            $table->timestamps();
            
            $table->index('bridge_integration_id');
            $table->index('bridge_customer_id');
            $table->index('bridge_card_account_id');
            $table->index('status');
            $table->index('is_primary');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('card_wallets');
    }
};

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
        Schema::create('wallet_fees', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_type'); // deposit, send, receive, withdraw
            $table->enum('fee_type', ['fixed', 'percentage'])->default('percentage');
            $table->decimal('fee_amount', 10, 2)->default(0); // Fixed amount or percentage
            $table->decimal('min_fee', 10, 2)->default(0)->nullable(); // Minimum fee for percentage
            $table->decimal('max_fee', 10, 2)->default(0)->nullable(); // Maximum fee for percentage
            $table->boolean('is_active')->default(false);
            $table->text('description')->nullable();
            $table->timestamps();
            
            $table->unique('transaction_type');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wallet_fees');
    }
};

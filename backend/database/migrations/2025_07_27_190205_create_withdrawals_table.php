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
        Schema::create('withdrawals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // User requesting withdrawal
            $table->decimal('amount', 10, 2);
            $table->string('payment_method')->default('paypal'); // e.g., 'paypal', 'stripe', 'bank_transfer'
            $table->string('paypal_email')->nullable(); // For PayPal withdrawals
            $table->string('status')->default('pending'); // 'pending', 'accepted', 'processing', 'completed', 'rejected', 'failed'
            $table->string('transaction_id')->nullable(); // ID from payment gateway
            $table->text('admin_notes')->nullable(); // Notes from admin regarding the withdrawal
            $table->timestamp('processed_at')->nullable(); // When the withdrawal was processed/paid
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('withdrawals');
    }
};

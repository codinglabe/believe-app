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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('related_id')->nullable(); // can be order_id, sell_id, etc.
            $table->string('related_type')->nullable();  // model class: App\Models\Order, etc.

            $table->enum('type', ['deposit', 'withdrawal', 'purchase', 'refund', 'commission'])->default('purchase');
            $table->enum('status', ['pending', 'completed', 'failed', 'cancelled'])->default('pending');

            $table->decimal('amount', 12, 2); // transaction amount
            $table->decimal('fee', 12, 2)->default(0); // optional transaction fee
            $table->string('currency', 3)->default('USD');

            $table->string('payment_method')->nullable(); // stripe, paypal, wallet, etc.
            $table->string('transaction_id')->nullable(); // gateway transaction ID

            $table->json('meta')->nullable(); // optional for extra data

            $table->timestamp('processed_at')->nullable(); // when processed
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};

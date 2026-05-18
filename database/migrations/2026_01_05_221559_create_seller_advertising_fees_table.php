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
        Schema::create('seller_advertising_fees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->onDelete('cascade');
            $table->decimal('amount', 10, 2)->default(2.00);
            $table->date('billing_period_start');
            $table->date('billing_period_end');
            $table->enum('status', ['pending', 'paid', 'failed'])->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_method')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['seller_id', 'status']);
            $table->index('billing_period_start');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seller_advertising_fees');
    }
};

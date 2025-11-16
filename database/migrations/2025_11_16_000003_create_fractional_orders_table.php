<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('fractional_orders')) {
            return;
        }

        Schema::create('fractional_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('offering_id')->constrained('fractional_offerings')->cascadeOnDelete();
            $table->unsignedBigInteger('shares'); // requested/filled shares
            $table->decimal('amount', 12, 2); // total amount charged
            $table->enum('status', ['pending', 'requires_payment', 'paid', 'cancelled', 'failed', 'refunded'])->default('pending')->index();
            $table->string('payment_provider')->default('stripe');
            $table->string('payment_intent_id')->nullable()->index();
            $table->timestamp('paid_at')->nullable();
            $table->json('meta')->nullable(); // provider payloads
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fractional_orders');
    }
};



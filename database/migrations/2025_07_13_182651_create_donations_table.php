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
        Schema::create('donations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->decimal('amount', 10, 2);
            $table->string('frequency')->default('one-time'); // e.g., one-time
            $table->string('payment_method')->nullable();
            $table->string('transaction_id')->unique();
            $table->string('status')->default('pending'); // e.g., pending, completed
            $table->text('messages')->nullable(); // Optional notes about the donation
            $table->timestamp('donation_date')->useCurrent(); // Date of the donation
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('donations');
    }
};

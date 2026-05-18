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
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g., 'paypal', 'stripe'
            $table->string('type'); // e.g., 'withdrawal', 'buy'
            $table->string('mode')->default('manual'); // 'automatic' or 'manual'
            $table->text('client_id')->nullable(); // Encrypted client ID
            $table->text('client_secret')->nullable(); // Encrypted client Secret
            $table->string('mode_environment')->default('sandbox'); // 'sandbox' or 'live'
            $table->json('additional_config')->nullable(); // For any extra dynamic config
            $table->timestamps();

            $table->unique(['name', 'type']); // Ensure unique combination of payment method and type
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};

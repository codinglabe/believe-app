<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sweepstakes_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('raffle_id')->constrained('raffles')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('entry_method', 64);
            $table->foreignId('donation_transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->string('device_fingerprint', 128)->nullable();
            $table->string('status', 32)->default('confirmed');
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['raffle_id', 'entry_method']);
            $table->index(['raffle_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sweepstakes_entries');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('care_alliance_donations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('care_alliance_campaign_id')->constrained('care_alliance_campaigns')->cascadeOnDelete();
            $table->foreignId('donor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency', 3)->default('USD');
            $table->string('status', 32)->default('pending');
            $table->json('split_snapshot')->nullable()->comment('Frozen cents per recipient at checkout');
            $table->string('payment_reference', 190)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('care_alliance_donations');
    }
};

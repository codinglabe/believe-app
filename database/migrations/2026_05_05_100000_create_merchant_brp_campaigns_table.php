<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchant_brp_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('merchants')->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->decimal('fund_amount_usd', 12, 2);
            /** Display units: fund_amount_usd * 100 (1 BRP = $0.01 in product UI). */
            $table->unsignedBigInteger('merchant_brp_amount');
            $table->json('award_triggers')->nullable();
            $table->json('trigger_rules')->nullable();
            $table->string('status', 32)->default('draft');
            $table->string('stripe_payment_intent')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_brp_campaigns');
    }
};

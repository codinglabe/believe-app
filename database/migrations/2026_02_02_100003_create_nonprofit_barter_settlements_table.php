<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Audit ledger: each point movement for barter settlement.
     * No Stripe; internal debit/credit only.
     */
    public function up(): void
    {
        Schema::create('nonprofit_barter_settlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('nonprofit_barter_transactions')->cascadeOnDelete();
            $table->foreignId('from_organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('to_organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->unsignedInteger('points');
            $table->timestamps();

            $table->index('transaction_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nonprofit_barter_settlements');
    }
};

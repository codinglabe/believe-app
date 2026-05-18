<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Single source of truth for a barter trade.
     * Positive points_delta = requesting (A) pays responding (B). Negative = B pays A.
     */
    public function up(): void
    {
        Schema::create('nonprofit_barter_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requesting_nonprofit_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('responding_nonprofit_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('requested_listing_id')->constrained('nonprofit_barter_listings')->cascadeOnDelete();
            $table->foreignId('return_listing_id')->nullable()->constrained('nonprofit_barter_listings')->nullOnDelete()->comment('A\'s listing; set when B accepts or chooses alternate');
            $table->integer('points_delta')->default(0)->comment('Signed: >0 A pays B, <0 B pays A');
            $table->string('status', 30)->default('pending')->comment('pending|accepted|in_fulfillment|completed|cancelled');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->boolean('dispute_flag')->default(false);
            $table->timestamps();

            $table->index(['requesting_nonprofit_id', 'status'], 'nbt_requesting_status');
            $table->index(['responding_nonprofit_id', 'status'], 'nbt_responding_status');
            $table->index('status', 'nbt_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nonprofit_barter_transactions');
    }
};

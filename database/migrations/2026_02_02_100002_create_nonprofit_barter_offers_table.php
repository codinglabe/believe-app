<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Counter-offers: B can propose a different return listing or point delta.
     */
    public function up(): void
    {
        Schema::create('nonprofit_barter_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('nonprofit_barter_transactions')->cascadeOnDelete();
            $table->foreignId('proposer_nonprofit_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('proposed_return_listing_id')->nullable()->constrained('nonprofit_barter_listings')->nullOnDelete();
            $table->integer('proposed_points_delta')->nullable();
            $table->text('message')->nullable();
            $table->string('status', 20)->default('pending')->comment('pending|accepted|rejected');
            $table->timestamps();

            $table->index(['transaction_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nonprofit_barter_offers');
    }
};

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
        Schema::create('merchant_hub_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_hub_merchant_id')->constrained('merchant_hub_merchants')->onDelete('cascade');
            $table->foreignId('merchant_hub_category_id')->constrained('merchant_hub_categories')->onDelete('cascade');
            $table->string('title');
            $table->text('short_description')->nullable();
            $table->text('description');
            $table->string('image_url')->nullable();
            $table->integer('points_required');
            $table->decimal('cash_required', 10, 2)->nullable();
            $table->string('currency', 3)->default('USD');
            $table->integer('inventory_qty')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->enum('status', ['draft', 'active', 'paused', 'expired'])->default('draft');
            $table->timestamps();
            
            $table->index('merchant_hub_category_id');
            $table->index('status');
            $table->index('merchant_hub_merchant_id');
            $table->index(['starts_at', 'ends_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('merchant_hub_offers');
    }
};

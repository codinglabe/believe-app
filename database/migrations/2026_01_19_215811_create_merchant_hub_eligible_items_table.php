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
        Schema::create('merchant_hub_eligible_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_hub_merchant_id')->constrained('merchant_hub_merchants')->onDelete('cascade');
            $table->string('item_name');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2)->nullable()->comment('Optional base price for reference');
            $table->integer('quantity_limit')->nullable()->comment('Optional: "First 100 redemptions available"');
            $table->decimal('discount_cap', 10, 2)->nullable()->comment('Optional: "10% off, max $20"');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index('merchant_hub_merchant_id');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('merchant_hub_eligible_items');
    }
};

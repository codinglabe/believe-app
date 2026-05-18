<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Merchant “pool” products for the nonprofit marketplace (separate from org Product catalog).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('marketplace_products')) {
            return;
        }

        Schema::create('marketplace_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('merchants')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->decimal('base_price', 10, 2);
            $table->decimal('cost', 10, 2)->nullable();
            $table->unsignedInteger('inventory_quantity')->nullable();
            $table->string('product_type', 32);
            $table->json('images')->nullable();
            $table->string('fulfillment_shipping_by', 32);
            $table->text('digital_delivery_notes')->nullable();
            $table->boolean('nonprofit_marketplace_enabled')->default(false);
            $table->decimal('pct_nonprofit', 8, 2)->nullable();
            $table->decimal('pct_merchant', 8, 2)->nullable();
            $table->decimal('pct_biu', 8, 2)->nullable();
            $table->decimal('min_resale_price', 10, 2)->nullable();
            $table->decimal('suggested_retail_price', 10, 2)->nullable();
            $table->string('nonprofit_approval_type', 32);
            $table->string('status', 32);
            $table->timestamps();

            $table->index('category_id');
            $table->index(['merchant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_products');
    }
};

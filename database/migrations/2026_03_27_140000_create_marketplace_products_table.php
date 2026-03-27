<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('merchants')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category', 255)->nullable();
            $table->decimal('base_price', 12, 2);
            $table->decimal('cost', 12, 2)->nullable();
            $table->unsignedInteger('inventory_quantity')->nullable();
            $table->string('product_type', 32)->default('physical');
            $table->json('images')->nullable();
            $table->string('fulfillment_shipping_by', 32)->default('merchant');
            $table->text('digital_delivery_notes')->nullable();

            $table->boolean('nonprofit_marketplace_enabled')->default(false);
            $table->decimal('pct_nonprofit', 5, 2)->nullable();
            $table->decimal('pct_merchant', 5, 2)->nullable();
            $table->decimal('pct_biu', 5, 2)->nullable();
            $table->decimal('min_resale_price', 12, 2)->nullable();
            $table->decimal('suggested_retail_price', 12, 2)->nullable();
            $table->string('nonprofit_approval_type', 16)->default('auto');

            $table->string('status', 32)->default('draft');

            $table->timestamps();

            $table->index(['status', 'nonprofit_marketplace_enabled']);
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_products');
    }
};

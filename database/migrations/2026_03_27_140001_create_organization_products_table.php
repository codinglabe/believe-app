<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('organization_products')) {
            return;
        }

        Schema::create('organization_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('marketplace_product_id')->constrained('marketplace_products')->cascadeOnDelete();
            $table->decimal('custom_price', 12, 2);
            $table->text('supporter_message')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->string('status', 32)->default('active');
            $table->timestamps();

            $table->unique(['organization_id', 'marketplace_product_id'], 'org_mkt_product_unique');
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_products');
    }
};

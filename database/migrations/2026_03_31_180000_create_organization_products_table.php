<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Nonprofit adoption of a merchant pool product (custom price, listing on marketplace).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('organization_products')) {
            return;
        }

        Schema::create('organization_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('marketplace_product_id')->constrained('marketplace_products')->cascadeOnDelete();
            $table->decimal('custom_price', 10, 2);
            $table->text('supporter_message')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->string('status', 64);
            $table->timestamps();

            $table->unique(['organization_id', 'marketplace_product_id'], 'org_prod_org_mp_unique');
            $table->index(['status', 'organization_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_products');
    }
};

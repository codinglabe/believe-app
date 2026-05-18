<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Repairs environments where 2026_03_28_120000 was marked run but columns were never created.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('cart_items') && ! Schema::hasColumn('cart_items', 'organization_product_id')) {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->foreignId('organization_product_id')
                    ->nullable()
                    ->after('product_id')
                    ->constrained('organization_products')
                    ->nullOnDelete();
            });
        }

        if (Schema::hasTable('order_items') && ! Schema::hasColumn('order_items', 'organization_product_id')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->foreignId('organization_product_id')
                    ->nullable()
                    ->after('product_id')
                    ->constrained('organization_products')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('cart_items') && Schema::hasColumn('cart_items', 'organization_product_id')) {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->dropForeign(['organization_product_id']);
                $table->dropColumn('organization_product_id');
            });
        }

        if (Schema::hasTable('order_items') && Schema::hasColumn('order_items', 'organization_product_id')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropForeign(['organization_product_id']);
                $table->dropColumn('organization_product_id');
            });
        }
    }
};

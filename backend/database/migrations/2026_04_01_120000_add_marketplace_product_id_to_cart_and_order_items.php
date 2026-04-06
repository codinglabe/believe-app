<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('cart_items') && ! Schema::hasColumn('cart_items', 'marketplace_product_id')) {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->foreignId('marketplace_product_id')->nullable()->after('organization_product_id')
                    ->constrained('marketplace_products')->nullOnDelete();
            });
        }

        if (Schema::hasTable('order_items') && ! Schema::hasColumn('order_items', 'marketplace_product_id')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->foreignId('marketplace_product_id')->nullable()->after('organization_product_id')
                    ->constrained('marketplace_products')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('cart_items') && Schema::hasColumn('cart_items', 'marketplace_product_id')) {
            Schema::table('cart_items', function (Blueprint $table) {
                $table->dropForeign(['marketplace_product_id']);
                $table->dropColumn('marketplace_product_id');
            });
        }

        if (Schema::hasTable('order_items') && Schema::hasColumn('order_items', 'marketplace_product_id')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropForeign(['marketplace_product_id']);
                $table->dropColumn('marketplace_product_id');
            });
        }
    }
};

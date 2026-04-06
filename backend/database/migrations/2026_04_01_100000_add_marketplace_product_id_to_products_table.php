<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'marketplace_product_id')) {
                $table->foreignId('marketplace_product_id')
                    ->nullable()
                    ->after('ship_from_merchant_id')
                    ->constrained('marketplace_products')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('products')) {
            return;
        }
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'marketplace_product_id')) {
                $table->dropForeign(['marketplace_product_id']);
                $table->dropColumn('marketplace_product_id');
            }
        });
    }
};

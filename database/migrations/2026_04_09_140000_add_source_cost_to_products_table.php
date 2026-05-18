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
            if (! Schema::hasColumn('products', 'source_cost')) {
                $table->decimal('source_cost', 12, 2)->nullable()->after('unit_price');
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('products') && Schema::hasColumn('products', 'source_cost')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('source_cost');
            });
        }
    }
};

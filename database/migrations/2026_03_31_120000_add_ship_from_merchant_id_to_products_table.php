<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'ship_from_merchant_id')) {
                $table->unsignedBigInteger('ship_from_merchant_id')->nullable()->after('ship_from_country');
                $table->foreign('ship_from_merchant_id')
                    ->references('id')
                    ->on('merchants')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'ship_from_merchant_id')) {
                $table->dropForeign(['ship_from_merchant_id']);
                $table->dropColumn('ship_from_merchant_id');
            }
        });
    }
};

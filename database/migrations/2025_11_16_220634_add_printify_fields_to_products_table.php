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
        Schema::table('products', function (Blueprint $table) {
            $table->string('printify_product_id')->nullable()->after('quantity_available');
            $table->string('printify_blueprint_id')->nullable()->after('printify_product_id');
            $table->string('printify_provider_id')->nullable()->after('printify_blueprint_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('printify_product_id');
            $table->dropColumn('printify_blueprint_id');
            $table->dropColumn('printify_provider_id');
        });
    }
};

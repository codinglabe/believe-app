<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('temp_orders', function (Blueprint $table) {
            $table->decimal('organization_markup_basis', 12, 2)->nullable()->after('platform_fee');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('organization_markup_basis', 12, 2)->nullable()->after('platform_fee');
        });
    }

    public function down(): void
    {
        Schema::table('temp_orders', function (Blueprint $table) {
            $table->dropColumn('organization_markup_basis');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('organization_markup_basis');
        });
    }
};

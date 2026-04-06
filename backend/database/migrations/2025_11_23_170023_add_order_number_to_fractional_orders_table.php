<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fractional_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('fractional_orders', 'order_number')) {
                $table->string('order_number')->unique()->nullable()->after('id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('fractional_orders', function (Blueprint $table) {
            if (Schema::hasColumn('fractional_orders', 'order_number')) {
                $table->dropColumn('order_number');
            }
        });
    }
};

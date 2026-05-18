<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products') && ! Schema::hasColumn('products', 'pickup_available')) {
            Schema::table('products', function (Blueprint $table) {
                $table->boolean('pickup_available')->default(false)->after('type');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('products', 'pickup_available')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('pickup_available');
            });
        }
    }
};

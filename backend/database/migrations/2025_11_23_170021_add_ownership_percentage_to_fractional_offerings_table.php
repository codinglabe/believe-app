<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fractional_offerings', function (Blueprint $table) {
            if (!Schema::hasColumn('fractional_offerings', 'ownership_percentage')) {
                $table->decimal('ownership_percentage', 8, 4)->nullable()->after('token_price');
            }
        });
    }

    public function down(): void
    {
        Schema::table('fractional_offerings', function (Blueprint $table) {
            if (Schema::hasColumn('fractional_offerings', 'ownership_percentage')) {
                $table->dropColumn('ownership_percentage');
            }
        });
    }
};

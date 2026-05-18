<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fractional_offerings', function (Blueprint $table) {
            if (!Schema::hasColumn('fractional_offerings', 'token_price')) {
                $table->decimal('token_price', 12, 2)->nullable()->after('price_per_share');
            }
        });
    }

    public function down(): void
    {
        Schema::table('fractional_offerings', function (Blueprint $table) {
            if (Schema::hasColumn('fractional_offerings', 'token_price')) {
                $table->dropColumn('token_price');
            }
        });
    }
};

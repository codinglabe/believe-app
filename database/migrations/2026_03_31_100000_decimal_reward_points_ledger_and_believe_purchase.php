<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reward_point_ledgers', function (Blueprint $table) {
            $table->decimal('points', 12, 2)->change();
        });

        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->decimal('reward_points_awarded', 10, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('reward_point_ledgers', function (Blueprint $table) {
            $table->integer('points')->change();
        });

        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->unsignedInteger('reward_points_awarded')->nullable()->change();
        });
    }
};

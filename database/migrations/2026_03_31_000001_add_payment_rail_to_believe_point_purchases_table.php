<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->string('payment_rail', 16)->nullable()->after('source');
            $table->unsignedInteger('reward_points_awarded')->nullable()->after('payment_rail');
        });
    }

    public function down(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->dropColumn(['payment_rail', 'reward_points_awarded']);
        });
    }
};

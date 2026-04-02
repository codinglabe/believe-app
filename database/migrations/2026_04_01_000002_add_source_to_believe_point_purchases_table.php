<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->string('source', 32)->default('manual')->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('believe_point_purchases', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }
};

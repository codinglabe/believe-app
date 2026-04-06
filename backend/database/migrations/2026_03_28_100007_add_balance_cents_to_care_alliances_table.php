<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('care_alliances', function (Blueprint $table) {
            $table->unsignedBigInteger('balance_cents')->default(0)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('care_alliances', function (Blueprint $table) {
            $table->dropColumn('balance_cents');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supporter_activity', function (Blueprint $table) {
            $table->unsignedBigInteger('amount_cents')->nullable()->after('reference_id');
            $table->unsignedInteger('believe_points')->nullable()->after('amount_cents');
        });
    }

    public function down(): void
    {
        Schema::table('supporter_activity', function (Blueprint $table) {
            $table->dropColumn(['amount_cents', 'believe_points']);
        });
    }
};

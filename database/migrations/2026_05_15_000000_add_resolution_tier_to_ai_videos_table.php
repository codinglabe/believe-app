<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_videos', function (Blueprint $table) {
            $table->string('resolution_tier', 16)->nullable()->after('resolution');
        });
    }

    public function down(): void
    {
        Schema::table('ai_videos', function (Blueprint $table) {
            $table->dropColumn('resolution_tier');
        });
    }
};

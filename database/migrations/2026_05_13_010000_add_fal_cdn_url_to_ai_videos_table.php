<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_videos', function (Blueprint $table) {
            $table->text('fal_cdn_url')->nullable()->after('video_source_url');
        });
    }

    public function down(): void
    {
        Schema::table('ai_videos', function (Blueprint $table) {
            $table->dropColumn('fal_cdn_url');
        });
    }
};

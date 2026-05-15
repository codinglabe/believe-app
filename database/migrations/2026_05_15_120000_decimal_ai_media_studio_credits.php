<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('ai_media_studio_credits', 12, 2)->default(0)->change();
        });

        Schema::table('ai_videos', function (Blueprint $table) {
            $table->decimal('media_studio_credits_charged', 12, 2)->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('ai_media_studio_credits')->default(0)->change();
        });

        Schema::table('ai_videos', function (Blueprint $table) {
            $table->unsignedTinyInteger('media_studio_credits_charged')->default(0)->change();
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('ai_media_studio_credits')->default(0)->after('credits');
        });

        Schema::table('ai_videos', function (Blueprint $table) {
            $table->unsignedTinyInteger('media_studio_credits_charged')->default(0)->after('failure_message');
            $table->timestamp('media_studio_credits_refunded_at')->nullable()->after('media_studio_credits_charged');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('ai_media_studio_credits');
        });

        Schema::table('ai_videos', function (Blueprint $table) {
            $table->dropColumn(['media_studio_credits_charged', 'media_studio_credits_refunded_at']);
        });
    }
};

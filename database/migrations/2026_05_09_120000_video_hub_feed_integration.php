<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('community_videos', function (Blueprint $table) {
            $table->string('youtube_video_id', 32)->nullable()->unique()->after('slug');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->foreignId('community_video_id')->nullable()->after('fundme_id')->constrained('community_videos')->nullOnDelete();
            $table->string('visibility', 32)->default('public')->after('community_video_id')->index();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('auto_share_youtube_imports_to_feed')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('auto_share_youtube_imports_to_feed');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropForeign(['community_video_id']);
            $table->dropColumn(['community_video_id', 'visibility']);
        });

        Schema::table('community_videos', function (Blueprint $table) {
            $table->dropColumn('youtube_video_id');
        });
    }
};

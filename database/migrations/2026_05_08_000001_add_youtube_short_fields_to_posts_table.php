<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->string('post_type', 32)->default('standard')->after('user_id')->index();

            $table->string('youtube_url', 2048)->nullable()->after('images');
            $table->string('youtube_video_id', 32)->nullable()->after('youtube_url')->index();
            $table->string('thumbnail_url', 2048)->nullable()->after('youtube_video_id');
            $table->text('caption')->nullable()->after('thumbnail_url');

            $table->foreignId('organization_id')->nullable()->after('caption')->constrained()->nullOnDelete();
            $table->foreignId('campaign_id')->nullable()->after('organization_id')->constrained()->nullOnDelete();
            $table->foreignId('fundme_id')->nullable()->after('campaign_id')->constrained('fundme_campaigns')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropForeign(['campaign_id']);
            $table->dropForeign(['fundme_id']);
            $table->dropColumn([
                'post_type',
                'youtube_url',
                'youtube_video_id',
                'thumbnail_url',
                'caption',
                'organization_id',
                'campaign_id',
                'fundme_id',
            ]);
        });
    }
};

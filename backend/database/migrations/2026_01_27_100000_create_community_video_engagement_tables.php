<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('community_video_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('video_id', 64)->index();
            $table->string('source', 16)->default('yt'); // yt | community
            $table->unsignedBigInteger('organization_id')->nullable()->index();
            $table->timestamps();
            $table->unique(['user_id', 'video_id', 'source']);
        });

        Schema::create('community_video_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('video_id', 64)->index();
            $table->string('source', 16)->default('yt');
            $table->unsignedBigInteger('organization_id')->nullable()->index();
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('community_video_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('video_id', 64)->index();
            $table->string('source', 16)->default('yt');
            $table->unsignedBigInteger('organization_id')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('community_video_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('video_id', 64)->index();
            $table->string('source', 16)->default('yt');
            $table->unsignedBigInteger('organization_id')->nullable()->index();
            $table->timestamp('viewed_at');
            $table->index(['user_id', 'video_id', 'source']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_video_views');
        Schema::dropIfExists('community_video_shares');
        Schema::dropIfExists('community_video_comments');
        Schema::dropIfExists('community_video_likes');
    }
};

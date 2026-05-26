<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recording_youtube_uploads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('dropbox_path', 2048);
            $table->char('dropbox_path_hash', 64);
            $table->string('dropbox_name', 512);
            $table->string('status', 32)->default('pending');
            $table->string('title', 255)->nullable();
            $table->text('description')->nullable();
            $table->string('privacy_status', 16)->default('unlisted');
            $table->string('youtube_video_id', 64)->nullable();
            $table->string('youtube_watch_url', 512)->nullable();
            $table->text('error_message')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'dropbox_path_hash'], 'recording_youtube_uploads_user_path_unique');
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recording_youtube_uploads');
    }
};

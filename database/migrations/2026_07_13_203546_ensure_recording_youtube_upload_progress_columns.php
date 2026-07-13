<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('recording_youtube_uploads')) {
            Schema::create('recording_youtube_uploads', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('dropbox_path', 2048);
                $table->char('dropbox_path_hash', 64);
                $table->string('dropbox_name', 512);
                $table->string('status', 32)->default('pending');
                $table->string('progress_stage', 32)->nullable();
                $table->unsignedTinyInteger('progress_percent')->default(0);
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

            return;
        }

        Schema::table('recording_youtube_uploads', function (Blueprint $table) {
            if (! Schema::hasColumn('recording_youtube_uploads', 'progress_stage')) {
                $table->string('progress_stage', 32)->nullable()->after('status');
            }
            if (! Schema::hasColumn('recording_youtube_uploads', 'progress_percent')) {
                $table->unsignedTinyInteger('progress_percent')->default(0)->after('progress_stage');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('recording_youtube_uploads')) {
            return;
        }

        Schema::table('recording_youtube_uploads', function (Blueprint $table) {
            if (Schema::hasColumn('recording_youtube_uploads', 'progress_percent')) {
                $table->dropColumn('progress_percent');
            }
            if (Schema::hasColumn('recording_youtube_uploads', 'progress_stage')) {
                $table->dropColumn('progress_stage');
            }
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Production self-heal: ensure every column RecordingYoutubePublishService needs exists.
 * Safe to run repeatedly (checks hasColumn before ALTER).
 */
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

        $this->addColumnIfMissing('dropbox_path', 'VARCHAR(2048) NOT NULL DEFAULT \'\'');
        $this->addColumnIfMissing('dropbox_path_hash', 'CHAR(64) NOT NULL DEFAULT \'\'');
        $this->addColumnIfMissing('dropbox_name', 'VARCHAR(512) NOT NULL DEFAULT \'\'');
        $this->addColumnIfMissing('status', 'VARCHAR(32) NOT NULL DEFAULT \'pending\'');
        $this->addColumnIfMissing('progress_stage', 'VARCHAR(32) NULL');
        $this->addColumnIfMissing('progress_percent', 'TINYINT UNSIGNED NOT NULL DEFAULT 0');
        $this->addColumnIfMissing('title', 'VARCHAR(255) NULL');
        $this->addColumnIfMissing('description', 'TEXT NULL');
        $this->addColumnIfMissing('privacy_status', 'VARCHAR(16) NOT NULL DEFAULT \'unlisted\'');
        $this->addColumnIfMissing('youtube_video_id', 'VARCHAR(64) NULL');
        $this->addColumnIfMissing('youtube_watch_url', 'VARCHAR(512) NULL');
        $this->addColumnIfMissing('error_message', 'TEXT NULL');
        $this->addColumnIfMissing('attempts', 'TINYINT UNSIGNED NOT NULL DEFAULT 0');
        $this->addColumnIfMissing('started_at', 'TIMESTAMP NULL');
        $this->addColumnIfMissing('published_at', 'TIMESTAMP NULL');

        // Unique index for (user_id, dropbox_path_hash) if missing.
        $indexExists = collect(DB::select('SHOW INDEX FROM recording_youtube_uploads'))
            ->contains(fn ($row) => ($row->Key_name ?? '') === 'recording_youtube_uploads_user_path_unique');

        if (! $indexExists && Schema::hasColumn('recording_youtube_uploads', 'dropbox_path_hash')) {
            try {
                DB::statement('ALTER TABLE recording_youtube_uploads ADD UNIQUE recording_youtube_uploads_user_path_unique (user_id, dropbox_path_hash)');
            } catch (\Throwable) {
                // Index may exist under another name, or duplicates block creation — non-fatal.
            }
        }
    }

    public function down(): void
    {
        // No-op: this is a repair migration; do not drop columns that may hold production data.
    }

    private function addColumnIfMissing(string $column, string $definition): void
    {
        // Prefer live SHOW COLUMNS — Schema::hasColumn can be wrong with a stale schema cache.
        $exists = collect(DB::select('SHOW COLUMNS FROM `recording_youtube_uploads`'))
            ->contains(fn ($row) => strcasecmp((string) ($row->Field ?? ''), $column) === 0);

        if ($exists) {
            return;
        }

        DB::statement("ALTER TABLE recording_youtube_uploads ADD COLUMN `{$column}` {$definition}");
    }
};

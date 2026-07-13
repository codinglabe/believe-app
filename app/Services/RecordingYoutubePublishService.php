<?php

namespace App\Services;

use App\Jobs\PublishDropboxRecordingToYouTube;
use App\Models\Organization;
use App\Models\RecordingYoutubeUpload;
use App\Models\User;
use App\Models\UserLivestream;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class RecordingYoutubePublishService
{
    public function __construct(
        private readonly YouTubeService $youtubeService,
    ) {}

    public function userHasYoutubeConnected(User $user): bool
    {
        if (! empty($user->youtube_refresh_token) || ! empty($user->youtube_access_token)) {
            return true;
        }

        $organization = Organization::forAuthUser($user);

        return $organization !== null
            && (! empty($organization->youtube_refresh_token) || ! empty($organization->youtube_access_token));
    }

    public function userCanUploadToYoutube(User $user): bool
    {
        try {
            if (! empty($user->youtube_refresh_token)) {
                return $this->youtubeService->userCanUploadVideos($user);
            }

            $organization = Organization::forAuthUser($user);
            if ($organization !== null && ! empty($organization->youtube_refresh_token)) {
                return $this->youtubeService->organizationCanUploadVideos($organization);
            }
        } catch (\Throwable $e) {
            Log::warning('YouTube upload-capability check failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            // Prefer allowing the publish UI when tokens exist; the job validates upload scopes.
            return $this->userHasYoutubeConnected($user);
        }

        return false;
    }

    /**
     * @return array{success: bool, upload?: array<string, mixed>, error?: string}
     */
    public function queuePublish(
        User $user,
        string $dropboxPath,
        string $dropboxName,
        ?string $title = null,
        ?string $description = null,
        string $privacyStatus = 'unlisted',
    ): array {
        if (! $this->userHasYoutubeConnected($user)) {
            return [
                'success' => false,
                'error' => 'Connect YouTube under Integrations before publishing recordings.',
            ];
        }

        if (! $this->isVideoRecordingFilename($dropboxName)) {
            return [
                'success' => false,
                'error' => 'Only video recordings can be uploaded to YouTube.',
            ];
        }

        try {
            $this->ensureRecordingYoutubeUploadsSchema();

            if (! $this->tableExistsLive('recording_youtube_uploads')) {
                return [
                    'success' => false,
                    'error' => 'YouTube upload storage is not ready yet. Please run migrations, then try again.',
                ];
            }

            return $this->queuePublishWithSchemaReady(
                $user,
                $dropboxPath,
                $dropboxName,
                $title,
                $description,
                $privacyStatus,
            );
        } catch (\Throwable $e) {
            // One automatic repair + retry if a column was missing mid-request.
            if (str_contains($e->getMessage(), 'Unknown column')) {
                Log::warning('YouTube upload hit Unknown column; repairing schema and retrying', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
                try {
                    $this->ensureRecordingYoutubeUploadsSchema(forceRefresh: true);

                    return $this->queuePublishWithSchemaReady(
                        $user,
                        $dropboxPath,
                        $dropboxName,
                        $title,
                        $description,
                        $privacyStatus,
                    );
                } catch (\Throwable $retry) {
                    $e = $retry;
                }
            }

            Log::error('Failed to queue Dropbox recording YouTube upload', [
                'user_id' => $user->id,
                'path' => $dropboxPath,
                'error' => $e->getMessage(),
                'exception' => $e::class,
                'file' => $e->getFile().':'.$e->getLine(),
            ]);

            $hint = 'Could not start YouTube upload. Please try again in a moment.';
            if (preg_match("/Unknown column ['`]([^'`]+)['`]/", $e->getMessage(), $m) === 1) {
                $hint = "YouTube upload database is missing column \"{$m[1]}\". Deploy/migrate may still be running — wait a minute and try again.";
            } elseif (str_contains(strtolower($e->getMessage()), 'jobs') && str_contains(strtolower($e->getMessage()), "doesn't exist")) {
                $hint = 'Queue is not set up on this server. Contact support to enable the jobs worker.';
            }

            return [
                'success' => false,
                'error' => $hint,
            ];
        }
    }

    /**
     * @return array{success: bool, upload?: array<string, mixed>, error?: string}
     */
    private function queuePublishWithSchemaReady(
        User $user,
        string $dropboxPath,
        string $dropboxName,
        ?string $title,
        ?string $description,
        string $privacyStatus,
    ): array {
        $pathHash = RecordingYoutubeUpload::hashDropboxPath($dropboxPath);
        $liveColumns = $this->liveColumnNames();
        $hasProgressColumns = in_array('progress_stage', $liveColumns, true)
            && in_array('progress_percent', $liveColumns, true);

        $existing = RecordingYoutubeUpload::query()
            ->where('user_id', $user->id)
            ->where('dropbox_path_hash', $pathHash)
            ->first();

        if ($existing !== null) {
            if ($existing->status === RecordingYoutubeUpload::STATUS_UPLOADING) {
                return [
                    'success' => true,
                    'upload' => $this->serializeUpload($existing),
                ];
            }

            if ($existing->status === RecordingYoutubeUpload::STATUS_PUBLISHED) {
                return [
                    'success' => true,
                    'upload' => $this->serializeUpload($existing),
                ];
            }

            if ($existing->status === RecordingYoutubeUpload::STATUS_PENDING
                || $existing->status === RecordingYoutubeUpload::STATUS_FAILED) {
                $reset = [
                    'status' => RecordingYoutubeUpload::STATUS_PENDING,
                    'dropbox_path' => $dropboxPath,
                    'dropbox_name' => $dropboxName,
                    'title' => $this->resolveTitle($user, $dropboxName, $title),
                    'description' => $description,
                    'privacy_status' => in_array($privacyStatus, ['public', 'unlisted', 'private'], true)
                        ? $privacyStatus
                        : 'unlisted',
                    'error_message' => null,
                    'youtube_video_id' => null,
                    'youtube_watch_url' => null,
                    'published_at' => null,
                ];
                if ($hasProgressColumns) {
                    $reset['progress_stage'] = RecordingYoutubeUpload::STAGE_QUEUED;
                    $reset['progress_percent'] = 0;
                }
                $existing->update($reset);
                $this->dispatchUploadJob($existing->id);

                return [
                    'success' => true,
                    'upload' => $this->serializeUpload($existing->fresh() ?? $existing),
                ];
            }
        }

        $resolvedTitle = $this->resolveTitle($user, $dropboxName, $title);

        $attributes = [
            'dropbox_path' => $dropboxPath,
            'dropbox_name' => $dropboxName,
            'status' => RecordingYoutubeUpload::STATUS_PENDING,
            'title' => $resolvedTitle,
            'description' => $description,
            'privacy_status' => in_array($privacyStatus, ['public', 'unlisted', 'private'], true)
                ? $privacyStatus
                : 'unlisted',
            'error_message' => null,
            'attempts' => 0,
        ];
        if ($hasProgressColumns) {
            $attributes['progress_stage'] = RecordingYoutubeUpload::STAGE_QUEUED;
            $attributes['progress_percent'] = 0;
        }

        $upload = RecordingYoutubeUpload::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'dropbox_path_hash' => $pathHash,
            ],
            $attributes,
        );

        $this->dispatchUploadJob($upload->id);

        return [
            'success' => true,
            'upload' => $this->serializeUpload($upload),
        ];
    }

    /**
     * Ensure production has every column the YouTube upload flow needs (self-heal without waiting on migrate).
     * Uses live SHOW COLUMNS — Schema::hasColumn can lie when bootstrap/cache/schema.php is stale.
     */
    private function ensureRecordingYoutubeUploadsSchema(bool $forceRefresh = false): void
    {
        static $checked = false;
        if ($checked && ! $forceRefresh) {
            return;
        }
        $checked = true;

        $tableExists = $this->tableExistsLive('recording_youtube_uploads');
        if (! $tableExists) {
            Schema::create('recording_youtube_uploads', function ($table) {
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

        $existing = $this->liveColumnNames();
        $columns = [
            'dropbox_path' => 'VARCHAR(2048) NOT NULL DEFAULT \'\'',
            'dropbox_path_hash' => 'CHAR(64) NOT NULL DEFAULT \'\'',
            'dropbox_name' => 'VARCHAR(512) NOT NULL DEFAULT \'\'',
            'status' => 'VARCHAR(32) NOT NULL DEFAULT \'pending\'',
            'progress_stage' => 'VARCHAR(32) NULL',
            'progress_percent' => 'TINYINT UNSIGNED NOT NULL DEFAULT 0',
            'title' => 'VARCHAR(255) NULL',
            'description' => 'TEXT NULL',
            'privacy_status' => 'VARCHAR(16) NOT NULL DEFAULT \'unlisted\'',
            'youtube_video_id' => 'VARCHAR(64) NULL',
            'youtube_watch_url' => 'VARCHAR(512) NULL',
            'error_message' => 'TEXT NULL',
            'attempts' => 'TINYINT UNSIGNED NOT NULL DEFAULT 0',
            'started_at' => 'TIMESTAMP NULL',
            'published_at' => 'TIMESTAMP NULL',
        ];

        foreach ($columns as $name => $definition) {
            if (in_array($name, $existing, true)) {
                continue;
            }
            try {
                DB::statement("ALTER TABLE recording_youtube_uploads ADD COLUMN `{$name}` {$definition}");
                Log::info('Added missing recording_youtube_uploads column', ['column' => $name]);
                $existing[] = $name;
            } catch (\Throwable $e) {
                Log::warning('Could not add recording_youtube_uploads column', [
                    'column' => $name,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    private function tableExistsLive(string $table): bool
    {
        try {
            $row = DB::selectOne(
                'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
                [$table],
            );

            return (int) ($row->c ?? 0) > 0;
        } catch (\Throwable) {
            return Schema::hasTable($table);
        }
    }

    /**
     * @return list<string>
     */
    private function liveColumnNames(): array
    {
        try {
            return collect(DB::select('SHOW COLUMNS FROM `recording_youtube_uploads`'))
                ->map(fn ($row) => strtolower((string) ($row->Field ?? '')))
                ->filter()
                ->values()
                ->all();
        } catch (\Throwable) {
            return [];
        }
    }

    private function dispatchUploadJob(int $uploadId): void
    {
        // afterCommit: worker must not pick the job before the upload row is visible.
        // onQueue default: Supervisor workers listen on redis --queue=default.
        PublishDropboxRecordingToYouTube::dispatch($uploadId)
            ->onQueue('default')
            ->afterCommit();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function uploadsForPaths(int $userId, array $paths): array
    {
        if ($paths === []) {
            return [];
        }

        return RecordingYoutubeUpload::query()
            ->where('user_id', $userId)
            ->whereIn('dropbox_path', $paths)
            ->get()
            ->map(fn (RecordingYoutubeUpload $row) => $this->serializeUpload($row))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeUpload(RecordingYoutubeUpload $upload): array
    {
        return [
            'dropbox_path' => $upload->dropbox_path,
            'status' => $upload->status,
            'title' => $upload->title,
            'privacy_status' => $upload->privacy_status,
            'youtube_video_id' => $upload->youtube_video_id,
            'youtube_watch_url' => $upload->youtube_watch_url,
            'error_message' => $upload->error_message,
            'progress_stage' => $upload->progress_stage,
            'progress_percent' => (int) $upload->progress_percent,
            'published_at' => $upload->published_at?->toIso8601String(),
        ];
    }

    private function resolveTitle(User $user, string $dropboxName, ?string $title): string
    {
        if (is_string($title) && trim($title) !== '') {
            return Str::limit(trim($title), 100, '');
        }

        $base = pathinfo($dropboxName, PATHINFO_FILENAME);
        $base = trim(preg_replace('/[_-]+/', ' ', $base) ?? $base);

        if ($base !== '') {
            foreach (UserLivestream::where('user_id', $user->id)->get(['room_name', 'title']) as $ls) {
                $room = (string) $ls->room_name;
                if ($room !== '' && stripos($dropboxName, $room) !== false && $ls->title) {
                    return Str::limit((string) $ls->title, 100, '');
                }
            }

            return Str::limit($base, 100, '');
        }

        return 'Meeting recording';
    }

    private function isVideoRecordingFilename(string $name): bool
    {
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));

        return in_array($ext, ['webm', 'mp4', 'mkv', 'mov', 'avi', 'm4v'], true);
    }
}

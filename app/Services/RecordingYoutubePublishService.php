<?php

namespace App\Services;

use App\Jobs\PublishDropboxRecordingToYouTube;
use App\Models\Organization;
use App\Models\RecordingYoutubeUpload;
use App\Models\User;
use App\Models\UserLivestream;
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
        if (! empty($user->youtube_refresh_token)) {
            return $this->youtubeService->userCanUploadVideos($user);
        }

        $organization = Organization::forAuthUser($user);
        if ($organization !== null && ! empty($organization->youtube_refresh_token)) {
            return $this->youtubeService->organizationCanUploadVideos($organization);
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

        if (! $this->userCanUploadToYoutube($user)) {
            return [
                'success' => false,
                'error' => 'YouTube upload permission is missing. Open Integrations → YouTube, disconnect, connect again, and allow all requested access (including upload videos).',
            ];
        }

        if (! $this->isVideoRecordingFilename($dropboxName)) {
            return [
                'success' => false,
                'error' => 'Only video recordings can be uploaded to YouTube.',
            ];
        }

        $pathHash = RecordingYoutubeUpload::hashDropboxPath($dropboxPath);

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

            if ($existing->status === RecordingYoutubeUpload::STATUS_PENDING) {
                PublishDropboxRecordingToYouTube::dispatch($existing->id);

                return [
                    'success' => true,
                    'upload' => $this->serializeUpload($existing->fresh()),
                ];
            }

            if ($existing->status === RecordingYoutubeUpload::STATUS_FAILED) {
                $existing->update([
                    'status' => RecordingYoutubeUpload::STATUS_PENDING,
                    'error_message' => null,
                    'progress_stage' => RecordingYoutubeUpload::STAGE_QUEUED,
                    'progress_percent' => 0,
                    'youtube_video_id' => null,
                    'youtube_watch_url' => null,
                    'published_at' => null,
                ]);
                PublishDropboxRecordingToYouTube::dispatch($existing->id);

                return [
                    'success' => true,
                    'upload' => $this->serializeUpload($existing->fresh()),
                ];
            }
        }

        $resolvedTitle = $this->resolveTitle($user, $dropboxName, $title);

        $upload = RecordingYoutubeUpload::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'dropbox_path_hash' => $pathHash,
            ],
            [
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
                'progress_stage' => RecordingYoutubeUpload::STAGE_QUEUED,
                'progress_percent' => 0,
            ],
        );

        PublishDropboxRecordingToYouTube::dispatch($upload->id);

        return [
            'success' => true,
            'upload' => $this->serializeUpload($upload),
        ];
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

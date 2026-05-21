<?php

namespace App\Jobs;

use App\Models\RecordingYoutubeUpload;
use App\Models\User;
use App\Services\DropboxOAuthService;
use App\Services\DropboxOrgApi;
use App\Services\YouTubeService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PublishDropboxRecordingToYouTube implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 7200;

    public int $tries = 2;

    public function __construct(
        public int $uploadId,
    ) {}

    public function handle(YouTubeService $youtubeService): void
    {
        $upload = RecordingYoutubeUpload::query()->with(['user.organization'])->find($this->uploadId);
        if ($upload === null || $upload->user === null) {
            return;
        }

        $dropboxToken = $this->resolveDropboxAccessToken($upload->user);
        if ($dropboxToken === null || $dropboxToken === '') {
            $upload->markFailed('Dropbox is not connected or the access token expired. Reconnect Dropbox under Integrations and try again.');

            return;
        }

        if ($upload->status === RecordingYoutubeUpload::STATUS_PUBLISHED) {
            return;
        }

        $upload->increment('attempts');
        $upload->markUploading();

        $tempDir = storage_path('app/temp/youtube-uploads');
        if (! is_dir($tempDir) && ! mkdir($tempDir, 0755, true) && ! is_dir($tempDir)) {
            $upload->markFailed('Server could not prepare a temporary folder for upload.');

            return;
        }

        $safeName = preg_replace('/[^a-zA-Z0-9._-]+/', '_', $upload->dropbox_name) ?: 'recording.bin';
        $localPath = $tempDir.'/'.$upload->id.'_'.$safeName;

        try {
            $upload->updateProgress(RecordingYoutubeUpload::STAGE_DOWNLOADING, 8);

            $api = new DropboxOrgApi($dropboxToken);
            if (! $api->downloadToPath($upload->dropbox_path, $localPath)) {
                $upload->markFailed(
                    'Could not download the recording from Dropbox. The file may have been moved or deleted, or Dropbox denied access. Try reconnecting Dropbox, then use Retry upload.',
                );

                return;
            }

            $upload->updateProgress(RecordingYoutubeUpload::STAGE_UPLOADING, 18);

            $fileSize = is_file($localPath) ? filesize($localPath) : 0;
            $uploadId = $upload->id;

            $result = $youtubeService->uploadVideoFileForUser(
                $upload->user,
                $localPath,
                (string) $upload->title,
                (string) ($upload->description ?? ''),
                (string) $upload->privacy_status,
                function (int $percent) use ($uploadId): void {
                    $row = RecordingYoutubeUpload::query()->find($uploadId);
                    if ($row !== null) {
                        $row->updateProgress(
                            RecordingYoutubeUpload::STAGE_UPLOADING,
                            min(95, max(18, $percent)),
                        );
                    }
                },
            );

            if (($result['success'] ?? false) && ($result['video_id'] ?? null)) {
                $upload->updateProgress(RecordingYoutubeUpload::STAGE_PROCESSING, 98);
            }

            if (! ($result['success'] ?? false)) {
                $upload->markFailed((string) ($result['error'] ?? 'YouTube upload failed.'));

                return;
            }

            $upload->markPublished(
                (string) $result['video_id'],
                (string) $result['watch_url'],
            );

            Log::info('Dropbox recording published to YouTube', [
                'upload_id' => $upload->id,
                'video_id' => $result['video_id'],
            ]);
        } catch (\Throwable $e) {
            Log::error('PublishDropboxRecordingToYouTube failed', [
                'upload_id' => $upload->id,
                'message' => $e->getMessage(),
            ]);
            $upload->markFailed('Upload failed unexpectedly. Please try again.');
        } finally {
            if (is_file($localPath)) {
                @unlink($localPath);
            }
        }
    }

    private function resolveDropboxAccessToken(User $user): ?string
    {
        $tokens = app(DropboxOAuthService::class);

        if (! empty($user->dropbox_refresh_token)) {
            return $tokens->getAccessTokenForUser($user);
        }

        $organization = $user->organization;
        if ($organization !== null && ! empty($organization->dropbox_refresh_token)) {
            return $tokens->getAccessTokenForOrganization($organization);
        }

        return null;
    }
}

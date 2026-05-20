<?php

namespace App\Jobs;

use App\Models\RecordingYoutubeUpload;
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
        public string $dropboxAccessToken,
    ) {}

    public function handle(YouTubeService $youtubeService): void
    {
        $upload = RecordingYoutubeUpload::query()->with('user')->find($this->uploadId);
        if ($upload === null || $upload->user === null) {
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
            $api = new DropboxOrgApi($this->dropboxAccessToken);
            if (! $api->downloadToPath($upload->dropbox_path, $localPath)) {
                $upload->markFailed('Could not download the recording from Dropbox.');

                return;
            }

            $result = $youtubeService->uploadVideoFileForUser(
                $upload->user,
                $localPath,
                (string) $upload->title,
                (string) ($upload->description ?? ''),
                (string) $upload->privacy_status,
            );

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
}

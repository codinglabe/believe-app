<?php

namespace App\Services;

use App\Models\AiVideo;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * After fal.ai returns a video URL, optionally copy the file into the org or creator’s Dropbox
 * (same OAuth tokens as Integrations / Unity Meet).
 */
class AiMediaStudioDropboxService
{
    public function __construct(
        protected DropboxOAuthService $dropboxOAuth
    ) {}

    /**
     * Download from fal, upload under …/{dropbox_subfolder}/, create a shared link for in-app playback.
     * Skips quietly when no Dropbox is linked (caller keeps fal URL only).
     *
     * @throws \RuntimeException on hard failures when Dropbox was expected (optional — job catches)
     */
    public function mirrorFalVideoToDropbox(AiVideo $video, string $falVideoUrl): void
    {
        $tmp = tempnam(sys_get_temp_dir(), 'ams_fal_');
        if ($tmp === false) {
            throw new \RuntimeException('Could not allocate a temp file for the fal.ai video download.');
        }

        try {
            $download = Http::timeout(600)
                ->connectTimeout(45)
                ->sink($tmp)
                ->get($falVideoUrl);

            if (! $download->successful()) {
                throw new \RuntimeException('Could not download rendered video from fal (HTTP '.$download->status().').');
            }

            $size = filesize($tmp);
            if ($size === false || $size < 500) {
                throw new \RuntimeException('Downloaded video from fal is empty or too small.');
            }

            $this->mirrorLocalVideoToDropbox($video, $tmp);
        } finally {
            if (is_file($tmp)) {
                @unlink($tmp);
            }
        }
    }

    /**
     * Upload a finished MP4 from disk (e.g. BIU-branded file) into Dropbox.
     */
    public function mirrorLocalVideoToDropbox(AiVideo $video, string $localPath): void
    {
        if (! is_file($localPath)) {
            throw new \RuntimeException('Local video file does not exist for Dropbox upload.');
        }

        $size = filesize($localPath);
        if ($size === false || $size < 500) {
            throw new \RuntimeException('Local video file is empty or too small.');
        }

        $video->loadMissing(['user', 'organization']);

        $ctx = $this->resolveTokenAndBaseFolder($video);
        if ($ctx === null) {
            Log::info('ai_media_studio.dropbox_skipped', [
                'ai_video_id' => $video->id,
                'reason' => 'no_dropbox_token',
            ]);

            return;
        }

        $api = new DropboxOrgApi($ctx['token']);
        $base = rtrim($ctx['base_folder'], '/');
        $sub = trim((string) config('services.ai_media_studio.dropbox_subfolder', 'AI Media Studio'), '/');
        if ($sub === '') {
            $sub = 'AI Media Studio';
        }

        $subPath = $base.'/'.$sub;
        $api->createFolder($base);
        $api->createFolder($subPath);

        $filename = $this->safeFilename($video);
        $dropPath = $subPath.'/'.$filename;

        $uploaded = $api->uploadFromLocalPath($dropPath, $localPath);
        if ($uploaded === null) {
            throw new \RuntimeException('Dropbox upload failed for AI Media Studio video.');
        }

        $finalPath = $uploaded['path_display'];
        $shared = $api->createSharedLink($finalPath);

        $video->forceFill([
            'dropbox_path' => $finalPath,
            'dropbox_shared_link' => $shared,
        ])->save();
    }

    /**
     * Short-lived direct URL for download / external players (Dropbox file on user or org account).
     */
    public function temporaryDownloadUrl(AiVideo $video): ?string
    {
        $video->loadMissing(['user', 'organization']);
        if (! is_string($video->dropbox_path) || $video->dropbox_path === '') {
            return null;
        }

        $ctx = $this->resolveTokenAndBaseFolder($video);
        if ($ctx === null) {
            return null;
        }

        $api = new DropboxOrgApi($ctx['token']);

        return $api->getTemporaryLink($video->dropbox_path);
    }

    /**
     * @return array{token: string, base_folder: string}|null
     */
    protected function resolveTokenAndBaseFolder(AiVideo $video): ?array
    {
        if ($video->organization_id) {
            $org = $video->organization ?? Organization::query()->find($video->organization_id);
            if ($org instanceof Organization) {
                $token = $this->dropboxOAuth->getAccessTokenForOrganization($org);
                if (is_string($token) && $token !== '') {
                    return [
                        'token' => $token,
                        'base_folder' => $this->recordingBaseForOrganization($org),
                    ];
                }
            }
        }

        $user = $video->user;
        if ($user instanceof User) {
            $token = $this->dropboxOAuth->getAccessTokenForUser($user);
            if (is_string($token) && $token !== '') {
                return [
                    'token' => $token,
                    'base_folder' => $this->recordingBaseForUser($user),
                ];
            }
        }

        return null;
    }

    protected function recordingBaseForOrganization(Organization $organization): string
    {
        $folderName = $organization->dropbox_folder_name ? trim((string) $organization->dropbox_folder_name) : 'BIU Meeting Recordings';
        $folderName = trim(preg_replace('/[\\\\\/:*?"<>|]+/', ' ', $folderName));
        $folderName = trim($folderName, " \t\n\r\0\x0B.") ?: 'BIU Meeting Recordings';

        return '/'.$folderName;
    }

    protected function recordingBaseForUser(User $user): string
    {
        $folderName = $user->dropbox_folder_name ? trim((string) $user->dropbox_folder_name) : 'BIU Meeting Recordings';
        $folderName = trim(preg_replace('/[\\\\\/:*?"<>|]+/', ' ', $folderName));
        $folderName = trim($folderName, " \t\n\r\0\x0B.") ?: 'BIU Meeting Recordings';

        return '/'.$folderName;
    }

    protected function safeFilename(AiVideo $video): string
    {
        $slug = Str::slug(Str::limit((string) $video->title, 60, ''));
        if ($slug === '') {
            $slug = 'video';
        }

        return $slug.'-'.$video->id.'.mp4';
    }
}

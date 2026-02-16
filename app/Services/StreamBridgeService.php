<?php

namespace App\Services;

use App\Models\OrganizationLivestream;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class StreamBridgeService
{
    /**
     * Start the server-side bridge: FFmpeg pulls from MediaMTX at $path and pushes to YouTube.
     * Returns the browser publish URL so the user can open it and stream without OBS.
     */
    public function startBridge(OrganizationLivestream $livestream): ?array
    {
        $publishBase = config('services.mediamtx.publish_url');
        $rtmpInternal = config('services.mediamtx.rtmp_internal');
        if (empty($publishBase) || empty($rtmpInternal)) {
            Log::warning('StreamBridge: MEDIAMTX_PUBLISH_URL or MEDIAMTX_RTMP_INTERNAL not set');
            return null;
        }

        $streamKey = $livestream->getDecryptedStreamKey();
        $settings = $livestream->settings ?? [];
        $rtmpUrl = $settings['rtmp_url'] ?? null;
        if (!$streamKey || !$rtmpUrl) {
            Log::warning('StreamBridge: livestream missing stream key or rtmp_url');
            return null;
        }

        $path = 'live_' . $livestream->id . '_' . substr(md5(uniqid((string) mt_rand(), true)), 0, 8);
        $rtmpInput = rtrim($rtmpInternal, '/') . '/' . $path;
        $youtubeOutput = rtrim($rtmpUrl, '/') . '/' . $streamKey;

        $ffmpeg = $this->findFfmpeg();
        if (!$ffmpeg) {
            Log::warning('StreamBridge: FFmpeg not found');
            return null;
        }

        $cmd = [
            $ffmpeg,
            '-i', $rtmpInput,
            '-c', 'copy',
            '-f', 'flv',
            '-flvflags', 'no_duration_filesize',
            $youtubeOutput,
        ];

        try {
            $process = new Process($cmd);
            $process->setTimeout(null);
            $process->start();
            Log::info('StreamBridge: started FFmpeg', ['path' => $path, 'pid' => $process->getPid()]);
        } catch (\Throwable $e) {
            Log::error('StreamBridge: failed to start FFmpeg', ['error' => $e->getMessage()]);
            return null;
        }

        $publishUrl = rtrim($publishBase, '/') . '/' . $path . '/publish';
        return [
            'publish_url' => $publishUrl,
            'path' => $path,
        ];
    }

    private function findFfmpeg(): ?string
    {
        if (PHP_OS_FAMILY === 'Windows') {
            return 'ffmpeg';
        }
        $paths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
        foreach ($paths as $path) {
            if (is_executable($path)) {
                return $path;
            }
        }
        return 'ffmpeg';
    }
}

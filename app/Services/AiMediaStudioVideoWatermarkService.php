<?php

namespace App\Services;

use App\Models\AiVideo;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

/**
 * Burn the Believe In Unity logo into AI Media Studio MP4s (top-right).
 */
class AiMediaStudioVideoWatermarkService
{
    public function isEnabled(): bool
    {
        return filter_var(config('services.ai_media_studio.watermark_enabled', true), FILTER_VALIDATE_BOOLEAN);
    }

    /** True when FFmpeg is available and watermarking is enabled (required to burn logo into MP4). */
    public function canApplyWatermark(): bool
    {
        return $this->isEnabled() && $this->findFfmpeg() !== null && is_file($this->logoPath());
    }

    public function logoPath(): string
    {
        $configured = config('services.ai_media_studio.watermark_logo_path');
        if (is_string($configured) && $configured !== '' && is_file($configured)) {
            return $configured;
        }

        $candidates = [
            public_path('favicon-96x96.png'),
            public_path('web-app-manifest-192x192.png'),
            public_path('web-app-manifest-512x512.png'),
        ];

        foreach ($candidates as $path) {
            if (is_file($path)) {
                return $path;
            }
        }

        return public_path('favicon-96x96.png');
    }

    public function storageRelativePath(AiVideo $video): string
    {
        return 'ai-media-studio/'.$video->id.'.mp4';
    }

    public function localAbsolutePath(AiVideo $video): string
    {
        return storage_path('app/public/'.$this->storageRelativePath($video));
    }

    public function publicUrl(AiVideo $video): string
    {
        return Storage::disk('public')->url($this->storageRelativePath($video));
    }

    public function hasBrandedFile(AiVideo $video): bool
    {
        return Storage::disk('public')->exists($this->storageRelativePath($video));
    }

    /**
     * Download fal output, overlay logo, store on the public disk.
     *
     * @return array{public_url: string, local_path: string}|null
     */
    public function downloadAndBrand(AiVideo $video, string $remoteUrl): ?array
    {
        if (! $this->isEnabled()) {
            return null;
        }

        $ffmpeg = $this->findFfmpeg();
        if ($ffmpeg === null) {
            Log::warning('ai_media_studio.watermark_skipped', [
                'ai_video_id' => $video->id,
                'reason' => 'ffmpeg_not_found',
            ]);

            return null;
        }

        $logo = $this->logoPath();
        if (! is_file($logo)) {
            Log::warning('ai_media_studio.watermark_skipped', [
                'ai_video_id' => $video->id,
                'reason' => 'logo_missing',
                'logo' => $logo,
            ]);

            return null;
        }

        $inputTmp = tempnam(sys_get_temp_dir(), 'ams_in_');
        if ($inputTmp === false) {
            throw new \RuntimeException('Could not allocate a temp file for the fal.ai video download.');
        }

        $outputTmp = $inputTmp.'_branded.mp4';

        try {
            $download = Http::timeout(600)
                ->connectTimeout(45)
                ->sink($inputTmp)
                ->get($remoteUrl);

            if (! $download->successful()) {
                throw new \RuntimeException('Could not download rendered video from fal (HTTP '.$download->status().').');
            }

            $size = filesize($inputTmp);
            if ($size === false || $size < 500) {
                throw new \RuntimeException('Downloaded video from fal is empty or too small.');
            }

            if (! $this->brandLocalFile($ffmpeg, $inputTmp, $logo, $outputTmp)) {
                return null;
            }

            $relative = $this->storageRelativePath($video);
            Storage::disk('public')->makeDirectory('ai-media-studio');
            Storage::disk('public')->put($relative, file_get_contents($outputTmp) ?: '');

            $absolute = $this->localAbsolutePath($video);
            if (! is_file($absolute) || filesize($absolute) < 500) {
                throw new \RuntimeException('Branded video was not written to public storage.');
            }

            return [
                'public_url' => $this->publicUrl($video),
                'local_path' => $absolute,
            ];
        } finally {
            if (is_file($inputTmp)) {
                @unlink($inputTmp);
            }
            if (is_file($outputTmp)) {
                @unlink($outputTmp);
            }
        }
    }

    protected function brandLocalFile(string $ffmpeg, string $inputPath, string $logoPath, string $outputPath): bool
    {
        $margin = max(8, (int) config('services.ai_media_studio.watermark_margin_px', 24));
        $widthFraction = (float) config('services.ai_media_studio.watermark_width_fraction', 0.14);
        $widthFraction = max(0.06, min(0.25, $widthFraction));

        // Scale logo to a fraction of frame width (top-right padding); re-encode video, copy audio.
        $filter = sprintf(
            '[1:v][0:v]scale2ref=w=rw*%.4f:h=-1[logo][base];[base][logo]overlay=W-w-%d:%d:format=auto',
            $widthFraction,
            $margin,
            $margin,
        );

        $process = new Process([
            $ffmpeg,
            '-y',
            '-i', $inputPath,
            '-i', $logoPath,
            '-filter_complex', $filter,
            '-c:v', 'libx264',
            '-preset', (string) config('services.ai_media_studio.watermark_x264_preset', 'fast'),
            '-crf', (string) config('services.ai_media_studio.watermark_crf', 23),
            '-c:a', 'copy',
            '-movflags', '+faststart',
            $outputPath,
        ]);
        $process->setTimeout((int) config('services.ai_media_studio.watermark_timeout_seconds', 600));

        try {
            $process->mustRun();
        } catch (\Throwable $e) {
            Log::warning('ai_media_studio.watermark_ffmpeg_failed', [
                'error' => $e->getMessage(),
                'stderr' => $process->getErrorOutput(),
            ]);

            return false;
        }

        if (! is_file($outputPath) || filesize($outputPath) < 500) {
            Log::warning('ai_media_studio.watermark_ffmpeg_empty_output');

            return false;
        }

        return true;
    }

    public function bundledFfmpegPath(): string
    {
        return storage_path('app/bin/ffmpeg');
    }

    protected function findFfmpeg(): ?string
    {
        $configured = config('services.ai_media_studio.ffmpeg_path');
        if (is_string($configured) && $configured !== '' && is_executable($configured)) {
            return $configured;
        }

        $bundled = $this->bundledFfmpegPath();
        if (is_executable($bundled)) {
            return $bundled;
        }

        if (PHP_OS_FAMILY === 'Windows') {
            return is_executable('ffmpeg') ? 'ffmpeg' : null;
        }

        foreach (['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/bin/ffmpeg'] as $path) {
            if (is_executable($path)) {
                return $path;
            }
        }

        $which = trim((string) shell_exec('command -v ffmpeg 2>/dev/null'));
        if ($which !== '' && is_executable($which)) {
            return $which;
        }

        return null;
    }
}

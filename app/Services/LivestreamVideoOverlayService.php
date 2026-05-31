<?php

namespace App\Services;

use App\Support\LivestreamOverlayConfig;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

/**
 * Burn logo + bottom CTA banner into recorded Unity Live clips (FFmpeg).
 */
class LivestreamVideoOverlayService
{
    public function canApply(): bool
    {
        return $this->findFfmpeg() !== null;
    }

    /**
     * Apply logo (top-right) and bottom banner to a local video file.
     *
     * @param  array<string, mixed>  $overlayConfig  Raw overlay settings from LivestreamOverlayConfig
     * @return string|null Absolute path to branded output temp file (caller must unlink)
     */
    public function brandLocalFile(string $inputPath, array $overlayConfig): ?string
    {
        $payload = LivestreamOverlayConfig::toVideoPayload($overlayConfig);
        if ($payload === null) {
            return null;
        }

        $ffmpeg = $this->findFfmpeg();
        if ($ffmpeg === null) {
            return null;
        }

        $outputPath = tempnam(sys_get_temp_dir(), 'unity_overlay_');
        if ($outputPath === false) {
            return null;
        }
        $outputPath .= '.mp4';

        $logoPath = $this->resolveLocalLogoPath($overlayConfig);
        $filters = $this->buildFilterComplex($payload, $logoPath);

        $args = [
            $ffmpeg,
            '-y',
            '-i', $inputPath,
        ];

        if ($logoPath !== null) {
            $args[] = '-i';
            $args[] = $logoPath;
        }

        $args = array_merge($args, [
            '-filter_complex', $filters,
            '-map', '[vout]',
            '-map', '0:a?',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'copy',
            '-movflags', '+faststart',
            $outputPath,
        ]);

        $process = new Process($args);
        $process->setTimeout(1800);

        try {
            $process->mustRun();
        } catch (\Throwable $e) {
            Log::warning('livestream_overlay.ffmpeg_failed', [
                'error' => $e->getMessage(),
                'stderr' => $process->getErrorOutput(),
            ]);
            @unlink($outputPath);

            return null;
        }

        if (! is_file($outputPath) || filesize($outputPath) < 500) {
            @unlink($outputPath);

            return null;
        }

        return $outputPath;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function buildFilterComplex(array $payload, ?string $logoPath): string
    {
        $bannerMessage = $this->escapeDrawtext((string) ($payload['bannerMessage'] ?? ''));
        $bannerCta = $this->escapeDrawtext((string) ($payload['bannerCta'] ?? ''));
        $accent = ltrim((string) ($payload['accentColor'] ?? LivestreamOverlayConfig::DEFAULT_ACCENT), '#');

        $parts = ['[0:v]format=rgba[base]'];
        $current = 'base';

        if ($logoPath !== null) {
            $margin = 24;
            $parts[] = sprintf(
                '[1:v][%s]scale2ref=w=rw*0.12:h=-1[logo][%s2];[%s2][logo]overlay=W-w-%d:%d:format=auto[%s3]',
                $current,
                $current,
                $current,
                $margin,
                $margin,
                $current,
            );
            $current .= '3';
        }

        $hasBanner = $bannerMessage !== '' || $bannerCta !== '';
        if ($hasBanner) {
            $boxColor = '0x'.$accent.'@0.92';
            $parts[] = sprintf('[%s]drawbox=x=0:y=ih-72:w=iw:h=72:color=%s:t=fill[%s_b]', $current, $boxColor, $current);

            $textParts = [];
            if ($bannerMessage !== '') {
                $textParts[] = sprintf(
                    "drawtext=text='%s':fontsize=26:fontcolor=white:x=24:y=h-52",
                    $bannerMessage,
                );
            }
            if ($bannerCta !== '') {
                $ctaText = '👉 '.$bannerCta;
                $textParts[] = sprintf(
                    "drawtext=text='%s':fontsize=22:fontcolor=yellow:x=w-tw-24:y=h-48",
                    $this->escapeDrawtext($ctaText),
                );
            }

            $parts[] = sprintf('[%s_b]%s[%s_out]', $current, implode(',', $textParts), $current);
            $current = $current.'_out';
        }

        $parts[] = sprintf('[%s]format=yuv420p[vout]', $current);

        return implode(';', $parts);
    }

    /**
     * @param  array<string, mixed>  $config
     */
    protected function resolveLocalLogoPath(array $config): ?string
    {
        $path = $config['logo_path'] ?? null;
        if (! is_string($path) || $path === '') {
            return null;
        }

        $absolute = storage_path('app/public/'.$path);

        return is_file($absolute) ? $absolute : null;
    }

    protected function escapeDrawtext(string $text): string
    {
        $text = str_replace(['\\', "'", ':', '%'], ['\\\\', "\\'", '\\:', '\\%'], $text);

        return $text;
    }

    protected function findFfmpeg(): ?string
    {
        $configured = config('services.ai_media_studio.ffmpeg_path');
        if (is_string($configured) && $configured !== '' && is_executable($configured)) {
            return $configured;
        }

        $bundled = storage_path('app/bin/ffmpeg');
        if (is_executable($bundled)) {
            return $bundled;
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

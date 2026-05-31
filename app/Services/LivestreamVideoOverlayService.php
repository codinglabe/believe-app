<?php

namespace App\Services;

use App\Support\LivestreamOverlayConfig;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

/**
 * Burn Unity Live overlay branding into recorded clips (FFmpeg).
 * Logo, speaker lower-third, sponsor, and bottom CTA banner.
 */
class LivestreamVideoOverlayService
{
    public function canApply(): bool
    {
        return $this->findFfmpeg() !== null;
    }

    /**
     * Apply overlay branding to a local video file.
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

        $logoPath = $this->resolveLocalAssetPath($overlayConfig['logo_path'] ?? null);
        $sponsorPath = $this->resolveLocalAssetPath($overlayConfig['sponsor_image_path'] ?? null);

        $args = [$ffmpeg, '-y', '-i', $inputPath];
        $logoInputIndex = null;
        $sponsorInputIndex = null;
        $nextInput = 1;

        if ($logoPath !== null) {
            $args[] = '-i';
            $args[] = $logoPath;
            $logoInputIndex = $nextInput;
            $nextInput++;
        }

        if ($sponsorPath !== null) {
            $args[] = '-i';
            $args[] = $sponsorPath;
            $sponsorInputIndex = $nextInput;
        }

        $filters = $this->buildFilterComplex($payload, $logoInputIndex, $sponsorInputIndex);

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
    protected function buildFilterComplex(array $payload, ?int $logoInputIndex, ?int $sponsorInputIndex): string
    {
        $bannerMessage = $this->escapeDrawtext((string) ($payload['bannerMessage'] ?? ''));
        $bannerCta = $this->escapeDrawtext((string) ($payload['bannerCta'] ?? ''));
        $speakerName = $this->escapeDrawtext((string) ($payload['speakerName'] ?? ''));
        $accent = ltrim((string) ($payload['accentColor'] ?? LivestreamOverlayConfig::DEFAULT_ACCENT), '#');

        $parts = ['[0:v]format=rgba[base]'];
        $current = 'base';

        if ($logoInputIndex !== null) {
            $margin = 24;
            $parts[] = sprintf(
                '[%d:v][%s]scale2ref=w=rw*0.12:h=-1[logo][%s2];[%s2][logo]overlay=W-w-%d:%d:format=auto[%s3]',
                $logoInputIndex,
                $current,
                $current,
                $current,
                $margin,
                $margin,
                $current,
            );
            $current .= '3';
        }

        if ($sponsorInputIndex !== null) {
            $parts[] = sprintf(
                '[%d:v]scale=w=iw*0.35:-1[sponsor_scaled]',
                $sponsorInputIndex,
            );
            $parts[] = sprintf(
                '[%s][sponsor_scaled]overlay=(W-w)/2:H-h-160:format=auto[%s_sponsor]',
                $current,
                $current,
            );
            $current .= '_sponsor';
        }

        $hasBanner = $bannerMessage !== '' || $bannerCta !== '';
        $bannerHeight = 72;
        $speakerOffset = $hasBanner ? $bannerHeight + 16 : 24;

        if ($speakerName !== '') {
            $parts[] = sprintf(
                '[%s]drawtext=text=\'%s\':fontsize=22:fontcolor=white:x=24:y=h-%d:box=1:boxcolor=black@0.55:boxborderw=8[%s_sp]',
                $current,
                $speakerName,
                $speakerOffset + 28,
                $current,
            );
            $current .= '_sp';
        }

        if ($hasBanner) {
            $boxColor = '0x'.$accent.'@0.92';
            $parts[] = sprintf('[%s]drawbox=x=0:y=ih-%d:w=iw:h=%d:color=%s:t=fill[%s_b]', $current, $bannerHeight, $bannerHeight, $boxColor, $current);

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

    protected function resolveLocalAssetPath(mixed $path): ?string
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        $absolute = storage_path('app/public/'.$path);

        return is_file($absolute) ? $absolute : null;
    }

    protected function escapeDrawtext(string $text): string
    {
        return str_replace(['\\', "'", ':', '%'], ['\\\\', "\\'", '\\:', '\\%'], $text);
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

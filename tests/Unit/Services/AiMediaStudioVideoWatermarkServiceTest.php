<?php

namespace Tests\Unit\Services;

use App\Services\AiMediaStudioVideoWatermarkService;
use Tests\TestCase;

class AiMediaStudioVideoWatermarkServiceTest extends TestCase
{
    public function test_detects_bundled_ffmpeg_when_present(): void
    {
        $service = app(AiMediaStudioVideoWatermarkService::class);
        $bundled = $service->bundledFfmpegPath();

        if (! is_executable($bundled)) {
            $this->markTestSkipped('Bundled FFmpeg not installed; run php artisan ai-media-studio:install-ffmpeg');
        }

        config(['services.ai_media_studio.ffmpeg_path' => null]);

        $this->assertTrue($service->canApplyWatermark());
    }

    public function test_prefers_configured_ffmpeg_path(): void
    {
        $service = app(AiMediaStudioVideoWatermarkService::class);
        $bundled = $service->bundledFfmpegPath();

        if (! is_executable($bundled)) {
            $this->markTestSkipped('Bundled FFmpeg not installed');
        }

        config(['services.ai_media_studio.ffmpeg_path' => $bundled]);

        $this->assertTrue($service->canApplyWatermark());
    }
}

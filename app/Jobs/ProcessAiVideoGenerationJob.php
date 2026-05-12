<?php

namespace App\Jobs;

use App\Models\AiVideo;
use App\Models\User;
use App\Services\FalVideoService;
use App\Services\OpenAiService;
use App\Support\AiMediaStudioTemplates;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Async pipeline: OpenAI (script + fal-ready prompt) → fal.ai queue (video URL) → optional Dropbox later.
 */
class ProcessAiVideoGenerationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $aiVideoId) {}

    public function handle(OpenAiService $openAi, FalVideoService $fal): void
    {
        $video = AiVideo::query()->find($this->aiVideoId);
        if (! $video) {
            return;
        }

        try {
            $video->update(['status' => AiVideo::STATUS_GENERATING]);

            $templateLabel = null;
            if (is_string($video->template_key) && $video->template_key !== '') {
                $templates = AiMediaStudioTemplates::all();
                foreach ($templates as $t) {
                    if (($t['key'] ?? '') === $video->template_key) {
                        $templateLabel = $t['label'] ?? null;
                        break;
                    }
                }
            }

            $package = $openAi->generateAiMediaStudioPackage([
                'title' => $video->title,
                'user_prompt' => $video->prompt,
                'template_key' => $video->template_key,
                'template_label' => $templateLabel,
                'template_inputs' => is_array($video->template_inputs) ? $video->template_inputs : [],
                'orientation' => $video->orientation,
                'duration_seconds' => $video->duration_seconds,
            ]);

            $tokens = (int) ($package['total_tokens'] ?? 0);
            if ($tokens > 0) {
                User::query()->whereKey($video->user_id)->increment('ai_tokens_used', $tokens);
            }

            $video->update([
                'ai_script' => $package['ai_script'],
                'fal_prompt' => $package['fal_video_prompt'],
                'caption' => $package['caption'] ?: null,
                'hashtags' => $package['hashtags'] ?: null,
            ]);

            $modelId = is_string($video->fal_model) && trim($video->fal_model) !== ''
                ? trim($video->fal_model, '/')
                : $fal->defaultModelId();

            $video->update([
                'fal_provider' => 'fal',
                'fal_model' => $modelId,
            ]);

            $queueInput = $fal->buildQueueInput($package['fal_video_prompt']);
            $falOut = $fal->generateVideoUrl($modelId, $queueInput);

            $video->update([
                'fal_job_id' => $falOut['request_id'],
                'video_source_url' => $falOut['video_url'],
                'status' => AiVideo::STATUS_VIDEO_GENERATED,
            ]);

            // Dropbox upload step comes later; go straight to review when asset is only on fal CDN.
            $video->update(['status' => AiVideo::STATUS_READY_FOR_REVIEW]);
        } catch (\Throwable $e) {
            Log::error('ai_video.pipeline.failed', [
                'ai_video_id' => $video->id,
                'error' => $e->getMessage(),
            ]);

            $video->update([
                'status' => AiVideo::STATUS_FAILED,
                'failure_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Refund AI Media Studio credits if the pipeline ultimately failed (after retries).
     */
    public function failed(?\Throwable $e): void
    {
        $video = AiVideo::query()->find($this->aiVideoId);
        if (! $video || $video->media_studio_credits_refunded_at) {
            return;
        }

        $charged = (int) ($video->media_studio_credits_charged ?? 0);
        if ($charged < 1) {
            return;
        }

        User::query()->whereKey($video->user_id)->increment('ai_media_studio_credits', $charged);
        $video->forceFill(['media_studio_credits_refunded_at' => now()])->save();
    }
}

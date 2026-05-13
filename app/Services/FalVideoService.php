<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * fal.ai queue API: https://queue.fal.run/{model_id} — submit, poll status, fetch result.
 *
 * @see https://docs.fal.ai/model-endpoints/queue/
 */
class FalVideoService
{
    /**
     * JSON POST client (queue submit). Do not use for GET polling — fal returns HTTP 405 if GET
     * carries Content-Type: application/json (common CDN / API gateway behavior).
     */
    protected function http(): \Illuminate\Http\Client\PendingRequest
    {
        return $this->httpBase()
            ->withHeaders([
                'Content-Type' => 'application/json',
            ]);
    }

    /**
     * GET polling / result fetch: Authorization only + Accept JSON (no Content-Type on GET).
     */
    protected function httpRead(): \Illuminate\Http\Client\PendingRequest
    {
        return $this->httpBase()->acceptJson();
    }

    protected function httpBase(): \Illuminate\Http\Client\PendingRequest
    {
        $verify = config('services.fal.verify_ssl', true);

        return Http::withOptions(['verify' => $verify])
            ->withHeaders([
                'Authorization' => 'Key '.$this->apiKey(),
            ])
            ->timeout(120)
            ->connectTimeout(30);
    }

    protected function apiKey(): string
    {
        $key = config('services.fal.api_key');
        if (! is_string($key) || $key === '') {
            throw new RuntimeException('FAL_API_KEY is not configured.');
        }

        return $key;
    }

    /**
     * Normalize model id from env (e.g. fal-ai/minimax/video-01).
     */
    public function defaultModelId(): string
    {
        $id = trim((string) config('services.fal.default_model', ''));
        $id = trim($id, '/');
        if ($id === '') {
            throw new RuntimeException('FAL_VIDEO_MODEL is not set. Use the model path from the fal.ai model API page (e.g. fal-ai/minimax/video-01).');
        }

        return $id;
    }

    /**
     * Merge prompt with optional extras from FAL_VIDEO_INPUT_EXTRAS (JSON object).
     * Duration is sent when `services.ai_media_studio.fal_duration_param` is non-empty (model-specific).
     *
     * @return array<string, mixed>
     */
    public function buildQueueInput(string $prompt, ?int $durationSeconds = null): array
    {
        $input = [
            'prompt' => $prompt,
            'prompt_optimizer' => true,
        ];

        $param = trim((string) config('services.ai_media_studio.fal_duration_param', 'duration'));
        if ($param !== '' && $durationSeconds !== null) {
            $min = (int) config('services.ai_media_studio.video_duration_min', 5);
            $max = (int) config('services.ai_media_studio.video_duration_max', 10);
            if ($max < $min) {
                $max = $min;
            }
            $d = max($min, min($max, $durationSeconds));
            $input[$param] = filter_var(config('services.ai_media_studio.fal_duration_as_string', false), FILTER_VALIDATE_BOOLEAN)
                ? (string) $d
                : $d;
        }

        $extrasRaw = config('services.fal.video_input_extras');
        if (is_string($extrasRaw) && $extrasRaw !== '') {
            $decoded = json_decode($extrasRaw, true);
            if (is_array($decoded)) {
                $input = array_merge($input, $decoded);
            }
        }

        return $input;
    }

    /**
     * Submit to queue, poll until COMPLETED, return video URL and request id.
     *
     * @return array{request_id: string, video_url: string, raw: array}
     */
    public function generateVideoUrl(string $modelId, array $queueInput): array
    {
        $modelId = trim($modelId, '/');
        $submitUrl = 'https://queue.fal.run/'.$modelId;

        $submit = $this->http()->post($submitUrl, $queueInput);
        if ($submit->failed()) {
            Log::error('fal.ai queue submit failed', [
                'status' => $submit->status(),
                'body' => $submit->body(),
            ]);
            throw new RuntimeException('fal.ai submit failed: HTTP '.$submit->status());
        }

        $submitBody = $submit->json();
        if (! is_array($submitBody)) {
            throw new RuntimeException('fal.ai submit response was not JSON.');
        }

        $requestId = $submitBody['request_id'] ?? null;
        if (! is_string($requestId) || $requestId === '') {
            throw new RuntimeException('fal.ai submit response missing request_id.');
        }

        $pollInterval = (int) config('services.ai_media_studio.fal_poll_interval_seconds', 3);
        $maxWait = (int) config('services.ai_media_studio.fal_max_wait_seconds', 900);
        $deadline = microtime(true) + $maxWait;

        $requestBase = 'https://queue.fal.run/'.$modelId.'/requests/'.rawurlencode($requestId);
        $statusPollUrl = isset($submitBody['status_url']) && is_string($submitBody['status_url']) && $submitBody['status_url'] !== ''
            ? $submitBody['status_url']
            : $requestBase.'/status';
        $resultFetchUrl = isset($submitBody['response_url']) && is_string($submitBody['response_url']) && $submitBody['response_url'] !== ''
            ? $submitBody['response_url']
            : $requestBase;

        while (microtime(true) < $deadline) {
            $statusRes = $this->httpRead()->get($statusPollUrl);
            if ($statusRes->failed()) {
                Log::warning('fal.ai status poll failed', ['status' => $statusRes->status(), 'body' => $statusRes->body()]);
                sleep($pollInterval);

                continue;
            }

            $status = $statusRes->json('status');
            if ($status === 'FAILED') {
                $err = $statusRes->json('error') ?? $statusRes->body();
                throw new RuntimeException('fal.ai status FAILED: '.(is_string($err) ? $err : json_encode($err)));
            }
            if ($status === 'COMPLETED') {
                $err = $statusRes->json('error');
                if (is_string($err) && $err !== '') {
                    throw new RuntimeException('fal.ai generation failed: '.$err);
                }

                break;
            }

            sleep($pollInterval);
        }

        if (microtime(true) >= $deadline) {
            throw new RuntimeException('fal.ai generation timed out after '.$maxWait.'s (request_id: '.$requestId.').');
        }

        $resultRes = $this->httpRead()->get($resultFetchUrl);
        if ($resultRes->failed()) {
            Log::error('fal.ai result fetch failed', [
                'status' => $resultRes->status(),
                'body' => $resultRes->body(),
            ]);
            throw new RuntimeException('fal.ai result fetch failed: HTTP '.$resultRes->status());
        }

        $raw = $resultRes->json();
        if (! is_array($raw)) {
            throw new RuntimeException('fal.ai result is not JSON.');
        }

        $videoUrl = $this->extractVideoUrl($raw);
        if ($videoUrl === null) {
            Log::error('fal.ai result missing video url', ['keys' => array_keys($raw)]);

            throw new RuntimeException('fal.ai result did not contain a recognizable video URL. Check FAL_VIDEO_MODEL output schema.');
        }

        return [
            'request_id' => $requestId,
            'video_url' => $videoUrl,
            'raw' => $raw,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function extractVideoUrl(array $payload): ?string
    {
        // Direct URL string (some models / wrappers)
        if (isset($payload['video']) && is_string($payload['video']) && str_starts_with($payload['video'], 'http')) {
            return $payload['video'];
        }

        $candidates = [
            ['video', 'url'],
            ['video', 'file', 'url'],
            ['output', 'video', 'url'],
            ['output', 'video', 'file', 'url'],
            ['data', 'video', 'url'],
            ['result', 'video', 'url'],
        ];

        foreach ($candidates as $path) {
            $v = $payload;
            foreach ($path as $segment) {
                if (! is_array($v) || ! array_key_exists($segment, $v)) {
                    $v = null;
                    break;
                }
                $v = $v[$segment];
            }
            if (is_string($v) && str_starts_with($v, 'http')) {
                return $v;
            }
        }

        if (isset($payload['video_url']) && is_string($payload['video_url']) && str_starts_with($payload['video_url'], 'http')) {
            return $payload['video_url'];
        }

        // First entry in a `videos` array (some endpoints)
        if (isset($payload['videos']) && is_array($payload['videos']) && $payload['videos'] !== []) {
            $first = $payload['videos'][0] ?? null;
            if (is_string($first) && str_starts_with($first, 'http')) {
                return $first;
            }
            if (is_array($first)) {
                $nested = $this->extractVideoUrl($first);
                if ($nested !== null) {
                    return $nested;
                }
            }
        }

        // Some models nest under "data"
        if (isset($payload['data']) && is_array($payload['data'])) {
            $nested = $this->extractVideoUrl($payload['data']);
            if ($nested !== null) {
                return $nested;
            }
        }

        if (isset($payload['output']) && is_array($payload['output'])) {
            $nested = $this->extractVideoUrl($payload['output']);
            if ($nested !== null) {
                return $nested;
            }
        }

        // Last resort: shallow scan for a hosted media URL (WAN / fal file CDN shapes)
        return $this->findHttpVideoUrlInPayload($payload, 0);
    }

    /**
     * Breadth-first search for a plausible video file URL (bounded depth/size).
     *
     * @param  array<string, mixed>  $payload
     */
    protected function findHttpVideoUrlInPayload(array $payload, int $depth): ?string
    {
        if ($depth > 6) {
            return null;
        }

        foreach ($payload as $value) {
            if (is_string($value) && str_starts_with($value, 'http')) {
                if (preg_match('#\.(mp4|webm)(\?|/|$)#i', $value)
                    || str_contains($value, 'fal.media')
                    || str_contains($value, 'fal-cdn')
                    || str_contains($value, 'falserverless')) {
                    return $value;
                }
            }
        }

        foreach ($payload as $value) {
            if (is_array($value)) {
                $found = $this->findHttpVideoUrlInPayload($value, $depth + 1);
                if ($found !== null) {
                    return $found;
                }
            }
        }

        return null;
    }
}

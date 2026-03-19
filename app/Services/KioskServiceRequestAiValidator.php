<?php

namespace App\Services;

class KioskServiceRequestAiValidator
{
    public function __construct(
        protected OpenAiService $openAiService
    ) {}

    /**
     * @param  array<string,mixed>  $payload
     * @return array{decision:string,reason:string,suggested_url:?string,tokens_used:int}
     */
    public function validate(array $payload): array
    {
        $messages = [
            [
                'role' => 'system',
                'content' => <<<'SYS'
You validate kiosk service submissions.
Return ONLY valid JSON with keys:
- decision: one of APPROVED, PENDING, REJECTED
- reason: short reason
- suggested_url: best corrected URL or null

Rules:
1) APPROVED => information is coherent and URL clearly matches requested service.
2) PENDING => information seems valid but URL is missing or does not clearly match. User can submit corrected URL.
3) REJECTED => information appears invalid/spam/off-topic/non-service, or URL is clearly malicious/irrelevant.
Keep reason concise and actionable.
SYS,
            ],
            [
                'role' => 'user',
                'content' => json_encode([
                    'service_name' => $payload['display_name'] ?? null,
                    'category_slug' => $payload['category_slug'] ?? null,
                    'subcategory' => $payload['subcategory'] ?? null,
                    'state' => $payload['state'] ?? null,
                    'city' => $payload['city'] ?? null,
                    'url' => $payload['url'] ?? null,
                    'details' => $payload['details'] ?? null,
                ], JSON_UNESCAPED_UNICODE),
            ],
        ];

        try {
            $res = $this->openAiService->chatCompletion($messages);
            $raw = trim($res['content'] ?? '');
            $json = $this->extractJson($raw);
            $parsed = json_decode($json, true);

            if (! is_array($parsed)) {
                return $this->fallbackPending('AI response could not be parsed.', (int) ($res['total_tokens'] ?? 0));
            }

            $decisionRaw = strtoupper(trim((string) ($parsed['decision'] ?? '')));
            $decision = in_array($decisionRaw, ['APPROVED', 'PENDING', 'REJECTED'], true) ? $decisionRaw : 'PENDING';
            $suggested = $this->normalizeUrl($parsed['suggested_url'] ?? null);

            return [
                'decision' => $decision,
                'reason' => trim((string) ($parsed['reason'] ?? 'Validation completed.')),
                'suggested_url' => $suggested,
                'tokens_used' => (int) ($res['total_tokens'] ?? 0),
            ];
        } catch (\Throwable $e) {
            return $this->fallbackPending('AI validation unavailable. Please review and update URL.', 0);
        }
    }

    protected function fallbackPending(string $reason, int $tokens): array
    {
        return [
            'decision' => 'PENDING',
            'reason' => $reason,
            'suggested_url' => null,
            'tokens_used' => $tokens,
        ];
    }

    protected function extractJson(string $raw): string
    {
        $clean = trim($raw);
        $clean = preg_replace('/^```json\s*/i', '', $clean) ?? $clean;
        $clean = preg_replace('/^```\s*/i', '', $clean) ?? $clean;
        $clean = preg_replace('/\s*```$/i', '', $clean) ?? $clean;
        $clean = trim($clean);

        if (preg_match('/\{[\s\S]*\}/', $clean, $m)) {
            return $m[0];
        }

        return '{}';
    }

    protected function normalizeUrl(mixed $url): ?string
    {
        if ($url === null) {
            return null;
        }
        $value = trim((string) $url);
        if ($value === '') {
            return null;
        }
        if (! preg_match('/^https?:\/\//i', $value)) {
            $value = 'https://' . ltrim($value, '/');
        }
        return filter_var($value, FILTER_VALIDATE_URL) ? $value : null;
    }
}


<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebRtcIceService
{
    private const CACHE_KEY = 'webrtc:ice_servers:v1';

    /**
     * @return array<int, array<string, mixed>>
     */
    public function iceServers(): array
    {
        return Cache::remember(self::CACHE_KEY, now()->addHours(12), function () {
            $servers = $this->stunServers();

            $turn = $this->turnFromEnvCredentials()
                ?? $this->turnFromMeteredApi()
                ?? ($this->shouldUseThirdPartyFallback() ? $this->turnOpenRelayStaticFallback() : []);

            $merged = array_values(array_filter(
                array_merge($servers, $turn),
                fn ($entry) => is_array($entry) && ! empty($entry['urls']),
            ));

            if ($this->turnEntryCount($merged) === 0) {
                Log::warning('WebRTC ICE has no TURN servers — cross-NAT audio may fail. Set WEBRTC_TURN_URL on the server.');
            }

            return $merged;
        });
    }

    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * @return array{has_turn_api_key: bool, has_turn_env: bool, server_count: int, turn_count: int, source: string}
     */
    public function diagnostics(): array
    {
        $servers = $this->iceServers();
        $turnCount = count(array_filter(
            $servers,
            fn (array $entry) => $this->entryIncludesTurn($entry),
        ));

        $source = 'none';
        if (filled(config('webrtc.turn_username')) && filled(config('webrtc.turn_credential'))) {
            $source = 'self_hosted';
        } elseif (filled(config('webrtc.turn_api_key'))) {
            $source = 'metered_api';
        } elseif ($this->shouldUseThirdPartyFallback()) {
            $source = 'static_fallback';
        }

        return [
            'has_turn_api_key' => filled(config('webrtc.turn_api_key')),
            'has_turn_env' => filled(config('webrtc.turn_username')) && filled(config('webrtc.turn_credential')),
            'server_count' => count($servers),
            'turn_count' => $turnCount,
            'source' => $source,
        ];
    }

    private function shouldUseThirdPartyFallback(): bool
    {
        return (bool) config('webrtc.use_third_party_turn_fallback', false);
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function stunServers(): array
    {
        $servers = [
            ['urls' => 'stun:stun.l.google.com:19302'],
            ['urls' => 'stun:stun1.l.google.com:19302'],
            ['urls' => 'stun:stun.cloudflare.com:3478'],
        ];

        $publicIp = config('webrtc.turn_public_ip');
        if (is_string($publicIp) && trim($publicIp) !== '') {
            $servers[] = ['urls' => 'stun:'.trim($publicIp).':3478'];
        }

        return $servers;
    }

    /**
     * @return array<int, array<string, mixed>>|null
     */
    private function turnFromMeteredApi(): ?array
    {
        $apiKey = config('webrtc.turn_api_key');
        if (! is_string($apiKey) || trim($apiKey) === '') {
            return null;
        }

        $baseUrl = rtrim((string) config('webrtc.turn_api_url'), '/');
        if ($baseUrl === '') {
            $baseUrl = 'https://openrelayproject.metered.ca';
        }

        try {
            $response = Http::timeout(8)
                ->acceptJson()
                ->get("{$baseUrl}/api/v1/turn/credentials", [
                    'apiKey' => trim($apiKey),
                ]);

            if (! $response->successful()) {
                Log::warning('WebRTC Metered TURN API request failed', [
                    'status' => $response->status(),
                    'url' => $baseUrl,
                ]);

                return null;
            }

            $payload = $response->json();
            $raw = null;

            if (is_array($payload['iceServers'] ?? null)) {
                $raw = $payload['iceServers'];
            } elseif (is_array($payload) && isset($payload[0]) && is_array($payload[0]) && ! empty($payload[0]['urls'])) {
                $raw = $payload;
            }

            if (! is_array($raw)) {
                Log::warning('WebRTC Metered TURN API returned unexpected payload shape');

                return null;
            }

            $normalized = $this->normalizeIceEntries($raw);
            if ($normalized === []) {
                return null;
            }

            Log::info('WebRTC TURN credentials loaded from Metered API', [
                'entries' => count($normalized),
            ]);

            return $normalized;
        } catch (\Throwable $exception) {
            Log::warning('WebRTC Metered TURN API error', [
                'message' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * @return array<int, array<string, mixed>>|null
     */
    private function turnFromEnvCredentials(): ?array
    {
        $username = config('webrtc.turn_username');
        $credential = config('webrtc.turn_credential');
        $urlList = $this->parseUrls(config('webrtc.turn_urls'));

        if (! is_string($username) || trim($username) === '' || ! is_string($credential) || trim($credential) === '') {
            return null;
        }

        if ($urlList === []) {
            return null;
        }

        return array_map(fn (string $url) => [
            'urls' => $url,
            'username' => trim($username),
            'credential' => trim($credential),
        ], $this->filterTurnUrls($urlList));
    }

    /**
     * Skip TURNS URLs unless TLS is configured on coturn (broken TURNS breaks ICE discovery).
     *
     * @param  array<int, string>  $urls
     * @return array<int, string>
     */
    private function filterTurnUrls(array $urls): array
    {
        if ((bool) config('webrtc.turn_tls_enabled', false)) {
            return $urls;
        }

        return array_values(array_filter(
            $urls,
            fn (string $url) => ! str_starts_with(strtolower($url), 'turns:'),
        ));
    }

    /**
     * Public Open Relay static credentials — often rate-limited or disabled. Prefer WEBRTC_TURN_API_KEY.
     *
     * @return array<int, array<string, string>>
     */
    private function turnOpenRelayStaticFallback(): array
    {
        Log::notice('WebRTC using deprecated static Open Relay TURN fallback');

        $username = 'openrelayproject';
        $credential = 'openrelayproject';

        return [
            ['urls' => 'turn:openrelay.metered.ca:80', 'username' => $username, 'credential' => $credential],
            ['urls' => 'turn:openrelay.metered.ca:443', 'username' => $username, 'credential' => $credential],
            ['urls' => 'turn:openrelay.metered.ca:443?transport=tcp', 'username' => $username, 'credential' => $credential],
            ['urls' => 'turns:openrelay.metered.ca:443?transport=tcp', 'username' => $username, 'credential' => $credential],
        ];
    }

    /**
     * @param  array<int, mixed>  $entries
     * @return array<int, array<string, mixed>>
     */
    private function normalizeIceEntries(array $entries): array
    {
        $normalized = [];

        foreach ($entries as $entry) {
            if (! is_array($entry) || empty($entry['urls'])) {
                continue;
            }

            $urls = $entry['urls'];
            if (is_array($urls)) {
                $urls = array_values(array_filter($urls, fn ($url) => is_string($url) && $url !== ''));
                if ($urls === []) {
                    continue;
                }
            } elseif (! is_string($urls) || $urls === '') {
                continue;
            }

            $item = ['urls' => $urls];

            if (! empty($entry['username']) && is_string($entry['username'])) {
                $item['username'] = $entry['username'];
            }

            if (! empty($entry['credential']) && is_string($entry['credential'])) {
                $item['credential'] = $entry['credential'];
            }

            $normalized[] = $item;
        }

        return $normalized;
    }

    /**
     * @return array<int, string>
     */
    private function parseUrls(mixed $urls): array
    {
        if (is_string($urls) && trim($urls) !== '') {
            $trimmed = trim($urls);
            if (str_starts_with($trimmed, '[')) {
                $decoded = json_decode($trimmed, true);

                return is_array($decoded)
                    ? array_values(array_filter($decoded, fn ($url) => is_string($url) && $url !== ''))
                    : [];
            }

            return array_values(array_filter(
                array_map('trim', explode(',', $trimmed)),
                fn (string $url) => $url !== '',
            ));
        }

        if (is_array($urls)) {
            return array_values(array_filter($urls, fn ($url) => is_string($url) && $url !== ''));
        }

        return [];
    }

    /**
     * @param  array<int, array<string, mixed>>  $entries
     */
    private function turnEntryCount(array $entries): int
    {
        return count(array_filter($entries, fn (array $entry) => $this->entryIncludesTurn($entry)));
    }

    /**
     * @param  array<string, mixed>  $entry
     */
    private function entryIncludesTurn(array $entry): bool
    {
        $urls = $entry['urls'] ?? '';
        $candidates = is_array($urls) ? $urls : [$urls];

        foreach ($candidates as $url) {
            if (is_string($url) && (str_starts_with($url, 'turn:') || str_starts_with($url, 'turns:'))) {
                return true;
            }
        }

        return false;
    }
}

<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Ephemeral live chat messages for Unity Live watch pages.
 */
final class UnityLiveChat
{
    private const MAX_MESSAGES = 120;

    private const TTL_SECONDS = 86_400;

    private static function cacheKey(string $kind, int $livestreamId): string
    {
        return "unity_live_chat:{$kind}:{$livestreamId}";
    }

    /**
     * @return list<array{
     *     id: string,
     *     name: string,
     *     message: string,
     *     avatarUrl: string|null,
     *     userId: int|null,
     *     createdAt: string
     * }>
     */
    public static function messages(string $kind, int $livestreamId, int $limit = 50): array
    {
        $key = self::cacheKey($kind, $livestreamId);
        /** @var list<array<string, mixed>> $rows */
        $rows = Cache::get($key, []);

        return array_values(array_slice($rows, -$limit));
    }

    /**
     * Messages strictly after a known message id (for incremental polling).
     *
     * @return list<array<string, mixed>>
     */
    public static function messagesAfter(string $kind, int $livestreamId, string $afterId, int $limit = 50): array
    {
        $rows = self::messages($kind, $livestreamId, self::MAX_MESSAGES);
        if ($afterId === '') {
            return array_slice($rows, -$limit);
        }

        $found = false;
        $result = [];

        foreach ($rows as $row) {
            if ($found) {
                $result[] = $row;
                continue;
            }

            if (($row['id'] ?? '') === $afterId) {
                $found = true;
            }
        }

        if (! $found) {
            return array_slice($rows, -$limit);
        }

        return array_values(array_slice($result, -$limit));
    }

    /**
     * Messages newer than an ISO8601 timestamp (fallback cursor).
     *
     * @return list<array<string, mixed>>
     */
    public static function messagesSince(string $kind, int $livestreamId, string $sinceIso, int $limit = 50): array
    {
        $since = Carbon::parse($sinceIso);
        $rows = self::messages($kind, $livestreamId, self::MAX_MESSAGES);

        $filtered = array_values(array_filter(
            $rows,
            static fn (array $row): bool => Carbon::parse((string) ($row['createdAt'] ?? ''))->gt($since),
        ));

        return array_values(array_slice($filtered, -$limit));
    }

    /**
     * @return array{
     *     id: string,
     *     name: string,
     *     message: string,
     *     avatarUrl: string|null,
     *     userId: int|null,
     *     createdAt: string
     * }
     */
    public static function add(
        string $kind,
        int $livestreamId,
        string $name,
        string $message,
        ?int $userId = null,
        ?string $avatarUrl = null,
    ): array {
        $key = self::cacheKey($kind, $livestreamId);
        /** @var list<array<string, mixed>> $rows */
        $rows = Cache::get($key, []);

        $entry = [
            'id' => (string) Str::uuid(),
            'name' => $name,
            'message' => $message,
            'avatarUrl' => $avatarUrl,
            'userId' => $userId,
            'createdAt' => now()->utc()->toIso8601String(),
        ];

        $rows[] = $entry;
        if (count($rows) > self::MAX_MESSAGES) {
            $rows = array_values(array_slice($rows, -self::MAX_MESSAGES));
        }

        Cache::put($key, $rows, now()->addSeconds(self::TTL_SECONDS));

        return $entry;
    }

    public static function clear(string $kind, int $livestreamId): void
    {
        Cache::forget(self::cacheKey($kind, $livestreamId));
    }
}

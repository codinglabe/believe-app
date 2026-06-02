<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Ephemeral viewer presence for Unity Live watch pages (not in-meeting guests).
 */
final class UnityLiveViewerPresence
{
    private const TTL_SECONDS = 90;

    private static function cacheKey(string $kind, int $livestreamId): string
    {
        return "unity_live_viewers:{$kind}:{$livestreamId}";
    }

    /**
     * @param  array{sessionId: string, userId?: int|null, name?: string|null}  $viewer
     */
    public static function join(string $kind, int $livestreamId, array $viewer): void
    {
        self::upsert($kind, $livestreamId, $viewer);
    }

    public static function heartbeat(string $kind, int $livestreamId, string $sessionId): void
    {
        $key = self::cacheKey($kind, $livestreamId);
        /** @var array<string, array<string, mixed>> $sessions */
        $sessions = Cache::get($key, []);
        if (! isset($sessions[$sessionId])) {
            return;
        }

        $sessions[$sessionId]['expiresAt'] = time() + self::TTL_SECONDS;
        self::store($key, $sessions);
    }

    public static function leave(string $kind, int $livestreamId, string $sessionId): void
    {
        $key = self::cacheKey($kind, $livestreamId);
        /** @var array<string, array<string, mixed>> $sessions */
        $sessions = Cache::get($key, []);
        unset($sessions[$sessionId]);
        self::store($key, $sessions);
    }

    public static function count(string $kind, int $livestreamId): int
    {
        return count(self::present($kind, $livestreamId));
    }

    /**
     * @return list<array{sessionId: string, userId: int|null, name: string|null}>
     */
    public static function present(string $kind, int $livestreamId): array
    {
        $key = self::cacheKey($kind, $livestreamId);
        /** @var array<string, array<string, mixed>> $sessions */
        $sessions = Cache::get($key, []);
        $now = time();

        $present = [];
        foreach ($sessions as $sessionId => $row) {
            if (($row['expiresAt'] ?? 0) <= $now) {
                continue;
            }

            $present[] = [
                'sessionId' => (string) ($row['sessionId'] ?? $sessionId),
                'userId' => isset($row['userId']) ? (int) $row['userId'] : null,
                'name' => isset($row['name']) ? (string) $row['name'] : null,
            ];
        }

        return $present;
    }

    /**
     * @param  array{sessionId: string, userId?: int|null, name?: string|null}  $viewer
     */
    private static function upsert(string $kind, int $livestreamId, array $viewer): void
    {
        $sessionId = $viewer['sessionId'];
        $key = self::cacheKey($kind, $livestreamId);
        /** @var array<string, array<string, mixed>> $sessions */
        $sessions = Cache::get($key, []);

        $sessions[$sessionId] = [
            'sessionId' => $sessionId,
            'userId' => isset($viewer['userId']) ? (int) $viewer['userId'] : null,
            'name' => isset($viewer['name']) ? (string) $viewer['name'] : null,
            'joinedAt' => $sessions[$sessionId]['joinedAt'] ?? now()->toIso8601String(),
            'expiresAt' => time() + self::TTL_SECONDS,
        ];

        self::store($key, $sessions);
    }

    /**
     * @param  array<string, array<string, mixed>>  $sessions
     */
    private static function store(string $key, array $sessions): void
    {
        $now = time();
        $sessions = array_filter(
            $sessions,
            static fn (array $row): bool => ($row['expiresAt'] ?? 0) > $now,
        );

        if ($sessions === []) {
            Cache::forget($key);

            return;
        }

        Cache::put($key, $sessions, now()->addSeconds(self::TTL_SECONDS + 30));
    }
}

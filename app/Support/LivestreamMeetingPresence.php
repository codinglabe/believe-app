<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

/**
 * Ephemeral in-meeting presence for Unity Meet (guest join / leave).
 */
final class LivestreamMeetingPresence
{
    private const TTL_SECONDS = 45;

    private static function cacheKey(string $kind, int $livestreamId): string
    {
        return "unity_meet_presence:{$kind}:{$livestreamId}";
    }

    /**
     * @param  array{
     *     sessionId: string,
     *     name: string,
     *     email?: string|null,
     *     userId?: int|null
     * }  $participant
     */
    public static function join(string $kind, int $livestreamId, array $participant): void
    {
        self::upsert($kind, $livestreamId, $participant);
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

    public static function clear(string $kind, int $livestreamId): void
    {
        Cache::forget(self::cacheKey($kind, $livestreamId));
    }

    /**
     * @return list<array{
     *     sessionId: string,
     *     name: string,
     *     email: string|null,
     *     userId: int|null,
     *     joinedAt: string
     * }>
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
                'name' => (string) ($row['name'] ?? 'Guest'),
                'email' => isset($row['email']) && $row['email'] !== '' ? strtolower((string) $row['email']) : null,
                'userId' => isset($row['userId']) ? (int) $row['userId'] : null,
                'joinedAt' => (string) ($row['joinedAt'] ?? now()->toIso8601String()),
            ];
        }

        return $present;
    }

    /**
     * @param  array{
     *     sessionId: string,
     *     name: string,
     *     email?: string|null,
     *     userId?: int|null
     * }  $participant
     */
    private static function upsert(string $kind, int $livestreamId, array $participant): void
    {
        $sessionId = $participant['sessionId'];
        $key = self::cacheKey($kind, $livestreamId);
        /** @var array<string, array<string, mixed>> $sessions */
        $sessions = Cache::get($key, []);

        $email = isset($participant['email']) && $participant['email'] !== ''
            ? strtolower(trim((string) $participant['email']))
            : null;

        $sessions[$sessionId] = [
            'sessionId' => $sessionId,
            'name' => trim((string) $participant['name']) ?: 'Guest',
            'email' => $email,
            'userId' => isset($participant['userId']) ? (int) $participant['userId'] : null,
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

        Cache::put($key, $sessions, now()->addSeconds(self::TTL_SECONDS + 60));
    }

    /**
     * Drop active sessions for an email (e.g. host removed them from the invite list).
     */
    public static function leaveByEmail(string $kind, int $livestreamId, string $email): void
    {
        $normalized = strtolower(trim($email));
        if ($normalized === '') {
            return;
        }

        $key = self::cacheKey($kind, $livestreamId);
        /** @var array<string, array<string, mixed>> $sessions */
        $sessions = Cache::get($key, []);
        if ($sessions === []) {
            return;
        }

        foreach ($sessions as $sessionId => $row) {
            $rowEmail = isset($row['email']) ? strtolower((string) $row['email']) : '';
            if ($rowEmail === $normalized) {
                unset($sessions[$sessionId]);
            }
        }

        self::store($key, $sessions);
    }

    /**
     * @param  list<array{
     *     id: int|null,
     *     email: string,
     *     name: string,
     *     image: string|null,
     *     slug: string|null,
     *     role: string,
     *     isHost: bool,
     *     canReceiveGift: bool
     * }>  $roster
     * @param  list<array{
     *     sessionId: string,
     *     name: string,
     *     email: string|null,
     *     userId: int|null,
     *     joinedAt: string
     * }>  $presence
     * @return list<array{
     *     id: int|null,
     *     email: string,
     *     name: string,
     *     image: string|null,
     *     slug: string|null,
     *     role: string,
     *     isHost: bool,
     *     canReceiveGift: bool
     * }>
     */
    public static function mergeIntoRoster(array $roster, array $presence): array
    {
        if ($presence === []) {
            return $roster;
        }

        $byEmail = [];
        $byUserId = [];
        foreach ($roster as $index => $entry) {
            if ($entry['email'] !== '') {
                $byEmail[strtolower($entry['email'])] = $index;
            }
            if ($entry['id'] !== null) {
                $byUserId[$entry['id']] = $index;
            }
        }

        $userIds = array_values(array_filter(array_map(
            static fn (array $row): ?int => $row['userId'],
            $presence,
        )));
        $usersById = $userIds !== []
            ? User::query()->whereIn('id', $userIds)->get()->keyBy('id')
            : collect();

        foreach ($presence as $row) {
            $index = null;
            if ($row['userId'] !== null && isset($byUserId[$row['userId']])) {
                $index = $byUserId[$row['userId']];
            } elseif ($row['email'] !== null && isset($byEmail[$row['email']])) {
                $index = $byEmail[$row['email']];
            }

            if ($index !== null) {
                if (! $roster[$index]['isHost']) {
                    $roster[$index]['role'] = 'In meeting';
                }

                continue;
            }

            $user = $row['userId'] !== null ? $usersById->get($row['userId']) : null;
            if ($user instanceof User) {
                $entry = LivestreamParticipantRoster::entryFromUser($user, 'In meeting', false);
                $roster[] = $entry;
                $byUserId[$user->id] = count($roster) - 1;
                if ($entry['email'] !== '') {
                    $byEmail[strtolower($entry['email'])] = count($roster) - 1;
                }

                continue;
            }

            $email = $row['email'] ?? ('guest:'.$row['sessionId']);
            $roster[] = [
                'id' => null,
                'email' => $email,
                'name' => $row['name'],
                'image' => null,
                'slug' => null,
                'role' => 'In meeting',
                'isHost' => false,
                'canReceiveGift' => false,
                'sessionId' => $row['sessionId'],
            ];
        }

        return $roster;
    }
}

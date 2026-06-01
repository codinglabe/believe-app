<?php

namespace App\Support;

use App\Models\OrganizationLivestream;
use App\Models\UserLivestream;
use Illuminate\Validation\ValidationException;

/**
 * Resolve a Unity Live watch slug to the same livestream record used on the public show page.
 */
final class UnityLiveStreamResolver
{
    /**
     * @return array{0: 'user'|'organization', 1: UserLivestream|OrganizationLivestream}
     */
    public static function resolve(string $slug): array
    {
        $orgStream = OrganizationLivestream::query()
            ->where('room_name', $slug)
            ->orderByDesc('id')
            ->first();

        if ($orgStream) {
            return ['organization', $orgStream];
        }

        $userStream = self::resolveUserStream($slug);

        if ($userStream) {
            return ['user', $userStream];
        }

        abort(404, 'Stream not found.');
    }

    public static function resolveUserStream(string $slug): ?UserLivestream
    {
        $direct = UserLivestream::query()
            ->where('room_name', $slug)
            ->orderByDesc('id')
            ->first();

        if ($direct) {
            return $direct;
        }

        if (preg_match('/^uni-.+-(\d+)$/', $slug, $matches) !== 1) {
            return null;
        }

        $userId = (int) ($matches[1] ?? 0);
        if ($userId < 1) {
            return null;
        }

        return UserLivestream::query()
            ->where('user_id', $userId)
            ->orderByDesc('updated_at')
            ->first();
    }

    /**
     * @return array{0: 'user'|'organization', 1: UserLivestream|OrganizationLivestream}
     */
    public static function resolveWatchable(string $slug): array
    {
        [$kind, $livestream] = self::resolve($slug);

        if ($livestream->status !== 'live' || ! $livestream->is_public) {
            throw ValidationException::withMessages([
                'stream' => 'This stream is not live on Unity Live right now.',
            ]);
        }

        return [$kind, $livestream];
    }
}

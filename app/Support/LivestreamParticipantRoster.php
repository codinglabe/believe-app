<?php

namespace App\Support;

use App\Models\OrganizationLivestream;
use App\Models\User;
use App\Models\UserLivestream;

final class LivestreamParticipantRoster
{
    /**
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
    public static function forUserLivestream(UserLivestream $livestream): array
    {
        $livestream->loadMissing('user');
        $settings = is_array($livestream->settings) ? $livestream->settings : [];
        $emails = LivestreamParticipantEmails::fromSettings($settings);

        $roster = self::build($livestream->user, $emails);

        return LivestreamMeetingPresence::mergeIntoRoster(
            $roster,
            LivestreamMeetingPresence::present('user', $livestream->id),
        );
    }

    /**
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
    public static function forOrganizationLivestream(OrganizationLivestream $livestream): array
    {
        $livestream->loadMissing('organization');
        $settings = is_array($livestream->settings) ? $livestream->settings : [];
        $emails = LivestreamParticipantEmails::fromSettings($settings);
        $hostUser = $livestream->organization?->user;

        $roster = self::build($hostUser, $emails);

        return LivestreamMeetingPresence::mergeIntoRoster(
            $roster,
            LivestreamMeetingPresence::present('organization', $livestream->id),
        );
    }

    /**
     * @param  list<string>  $emails
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
    private static function build(?User $host, array $emails): array
    {
        $roster = [];
        $seenUserIds = [];

        if ($host instanceof User) {
            $roster[] = self::entryFromUser($host, 'Host', true);
            $seenUserIds[$host->id] = true;
        }

        if ($emails === []) {
            return $roster;
        }

        $usersByEmail = User::query()
            ->whereIn('email', $emails)
            ->get()
            ->keyBy(static fn (User $user) => strtolower($user->email));

        foreach ($emails as $email) {
            $normalized = strtolower(trim($email));
            if ($normalized === '') {
                continue;
            }

            $user = $usersByEmail->get($normalized);
            if ($user instanceof User) {
                if (isset($seenUserIds[$user->id])) {
                    continue;
                }
                $seenUserIds[$user->id] = true;
                $roster[] = self::entryFromUser($user, 'Participant', false);

                continue;
            }

            $roster[] = [
                'id' => null,
                'email' => $normalized,
                'name' => self::nameFromEmail($normalized),
                'image' => null,
                'slug' => null,
                'role' => 'Invited',
                'isHost' => false,
                'canReceiveGift' => false,
            ];
        }

        return $roster;
    }

    /**
     * @return array{
     *     id: int|null,
     *     email: string,
     *     name: string,
     *     image: string|null,
     *     slug: string|null,
     *     role: string,
     *     isHost: bool,
     *     canReceiveGift: bool
     * }
     */
    public static function entryFromUser(User $user, string $role, bool $isHost): array
    {
        return [
            'id' => $user->id,
            'email' => strtolower((string) $user->email),
            'name' => (string) ($user->name ?: self::nameFromEmail((string) $user->email)),
            'image' => $user->image ? '/storage/'.$user->image : null,
            'slug' => $user->slug,
            'role' => $role,
            'isHost' => $isHost,
            'canReceiveGift' => true,
        ];
    }

    private static function nameFromEmail(string $email): string
    {
        $local = explode('@', $email)[0] ?? $email;

        return ucwords(str_replace(['.', '_', '-'], ' ', $local));
    }
}

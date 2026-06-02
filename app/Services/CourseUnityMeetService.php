<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Organization;
use App\Models\OrganizationLivestream;
use App\Models\User;
use App\Models\UserLivestream;
use App\Support\UnityMeetUrls;
use Carbon\Carbon;
use Illuminate\Support\Facades\Crypt;
use InvalidArgumentException;

class CourseUnityMeetService
{
    public const KIND_ORGANIZATION = 'organization';

    public const KIND_USER = 'user';

    public function usesUnityMeet(string $format): bool
    {
        return in_array($format, ['online', 'hybrid'], true);
    }

    /**
     * @param  array{
     *   name: string,
     *   description?: string|null,
     *   start_date: string,
     *   start_time: string,
     *   session_duration_minutes: int|string,
     *   max_participants: int|string,
     * }  $input
     * @return array{
     *   livestream_kind: string,
     *   livestream_id: int,
     *   join_link: string,
     *   host_link: string,
     *   room_name: string,
     *   meeting_id: string,
     *   requires_passcode: bool,
     *   passcode: string|null,
     *   scheduled_at: string,
     * }
     */
    public function prepareScheduledMeeting(
        User $user,
        array $input,
        ?string $existingKind = null,
        ?int $existingId = null,
    ): array {
        $organization = Organization::forAuthUser($user);
        $kind = self::KIND_USER;

        $scheduledAt = Carbon::createFromFormat(
            'Y-m-d H:i',
            $input['start_date'].' '.$input['start_time'],
            config('app.timezone')
        );

        if (! $scheduledAt) {
            throw new InvalidArgumentException('Schedule time is invalid.');
        }

        $isUpdate = $existingKind && $existingId;
        if (! $isUpdate && $scheduledAt->isPast()) {
            throw new InvalidArgumentException('Schedule time must be in the future.');
        }

        $title = trim((string) ($input['name'] ?? ''));
        if ($title === '') {
            throw new InvalidArgumentException('Listing name is required to create a Unity Meet.');
        }

        $description = isset($input['description'])
            ? trim(strip_tags((string) $input['description']))
            : null;

        $settings = [
            'record_meeting' => true,
            'require_passcode' => false,
            'max_participants' => (int) ($input['max_participants'] ?? 20),
            'duration_minutes' => (int) ($input['session_duration_minutes'] ?? 60),
            'connection_hub_draft' => true,
            'unity_meet' => true,
            'source' => 'connection_hub',
        ];

        [$existingKind, $existingId] = $this->normalizeExistingLivestream(
            $user,
            $organization,
            $existingKind,
            $existingId,
        );

        if ($existingKind === $kind && $existingId) {
            $livestream = $this->findOwnedLivestream($user, $kind, $existingId);
            if ($livestream instanceof UserLivestream) {
                return $this->persistLivestream(
                    $livestream,
                    $title,
                    $description !== '' ? $description : null,
                    $scheduledAt,
                    $settings,
                    $organization,
                    $user,
                );
            }
        }

        $displayName = $organization?->name ?: ($user->name ?? 'Host');
        $settings['display_name'] = (string) $displayName;

        $livestream = UserLivestream::create([
            'user_id' => $user->id,
            'room_name' => UserLivestream::generateRoomName(),
            'room_password' => Crypt::encryptString(''),
            'status' => 'scheduled',
            'is_public' => true,
            'title' => $title,
            'description' => $description !== '' ? $description : null,
            'scheduled_at' => $scheduledAt,
            'settings' => $settings,
        ]);

        return $this->formatPayload($livestream);
    }

    /**
     * Link a prepared livestream to a saved course listing.
     *
     * @return array{
     *   join_link: string,
     *   host_link: string,
     *   livestream_kind: string,
     *   livestream_id: int,
     * }
     */
    public function finalizeForCourse(User $user, Course $course, string $kind, int $livestreamId): array
    {
        [$kind, $livestreamId] = $this->normalizeExistingLivestream(
            $user,
            Organization::forAuthUser($user),
            $kind,
            $livestreamId,
        );

        $livestream = $this->findOwnedLivestream($user, $kind, $livestreamId);

        if (! $livestream instanceof UserLivestream) {
            throw new InvalidArgumentException('Unity Meet meeting not found.');
        }

        $settings = is_array($livestream->settings) ? $livestream->settings : [];
        unset($settings['connection_hub_draft']);
        $settings['course_id'] = $course->id;
        $settings['course_slug'] = $course->slug;
        $settings['connection_hub_type'] = $course->type;

        $livestream->title = $course->name;
        $livestream->description = strip_tags((string) $course->description);
        $livestream->settings = $settings;

        if ($course->start_date && $course->start_time) {
            $scheduledAt = Carbon::parse(
                $course->start_date->format('Y-m-d').' '.$course->start_time,
                config('app.timezone')
            );
            $livestream->scheduled_at = $scheduledAt;
        }

        $livestream->status = 'scheduled';
        $livestream->save();

        $payload = $this->formatPayload($livestream);

        return [
            'join_link' => $payload['join_link'],
            'host_link' => $payload['host_link'],
            'livestream_kind' => self::KIND_USER,
            'livestream_id' => (int) $livestream->id,
        ];
    }

    /**
     * @return array{0: string|null, 1: int|null}
     */
    private function normalizeExistingLivestream(
        User $user,
        ?Organization $organization,
        ?string $existingKind,
        ?int $existingId,
    ): array {
        if (! $existingKind || ! $existingId) {
            return [null, null];
        }

        if ($existingKind === self::KIND_USER) {
            return [$existingKind, $existingId];
        }

        if ($existingKind !== self::KIND_ORGANIZATION || ! $organization) {
            return [null, null];
        }

        $orgStream = OrganizationLivestream::query()
            ->where('organization_id', $organization->id)
            ->find($existingId);

        if (! $orgStream) {
            return [null, null];
        }

        $userStream = UserLivestream::query()
            ->where('user_id', $user->id)
            ->where('room_name', $orgStream->room_name)
            ->first();

        if ($userStream) {
            return [self::KIND_USER, (int) $userStream->id];
        }

        $settings = is_array($orgStream->settings) ? $orgStream->settings : [];
        $settings['source'] = 'connection_hub';
        $settings['unity_meet'] = true;

        $userStream = UserLivestream::create([
            'user_id' => $user->id,
            'room_name' => $orgStream->room_name,
            'room_password' => $orgStream->room_password,
            'status' => $orgStream->status,
            'is_public' => $orgStream->is_public,
            'title' => $orgStream->title,
            'description' => $orgStream->description,
            'scheduled_at' => $orgStream->scheduled_at,
            'settings' => $settings,
        ]);

        return [self::KIND_USER, (int) $userStream->id];
    }

    /**
     * @return array{
     *   livestream_kind: string,
     *   livestream_id: int,
     *   join_link: string,
     *   host_link: string,
     *   room_name: string,
     *   meeting_id: string,
     *   requires_passcode: bool,
     *   passcode: string|null,
     *   scheduled_at: string,
     * }
     */
    private function persistLivestream(
        UserLivestream $livestream,
        string $title,
        ?string $description,
        Carbon $scheduledAt,
        array $settings,
        ?Organization $organization,
        User $user,
    ): array {
        $settings['display_name'] = (string) ($organization?->name ?: ($user->name ?? 'Host'));

        $livestream->title = $title;
        $livestream->description = $description;
        $livestream->scheduled_at = $scheduledAt;
        $livestream->status = 'scheduled';
        $livestream->settings = $settings;
        $livestream->save();

        return $this->formatPayload($livestream);
    }

    private function findOwnedLivestream(
        User $user,
        string $kind,
        int $livestreamId,
    ): ?UserLivestream {
        if ($kind !== self::KIND_USER) {
            return null;
        }

        return UserLivestream::query()
            ->where('user_id', $user->id)
            ->find($livestreamId);
    }

    /**
     * @return array{
     *   livestream_kind: string,
     *   livestream_id: int,
     *   join_link: string,
     *   host_link: string,
     *   room_name: string,
     *   meeting_id: string,
     *   requires_passcode: bool,
     *   passcode: string|null,
     *   scheduled_at: string,
     * }
     */
    private function formatPayload(UserLivestream $livestream): array
    {
        $urls = UnityMeetUrls::linksForConnectionHub($livestream);
        $passcode = $livestream->requiresPasscode() ? $livestream->getDecryptedPassword() : null;

        return [
            'livestream_kind' => self::KIND_USER,
            'livestream_id' => (int) $livestream->id,
            'join_link' => $urls['join_link'],
            'host_link' => $urls['host_link'],
            'room_name' => $livestream->room_name,
            'meeting_id' => $livestream->room_name,
            'requires_passcode' => $livestream->requiresPasscode(),
            'passcode' => $passcode !== '' ? $passcode : null,
            'scheduled_at' => $livestream->scheduled_at?->toIso8601String() ?? '',
        ];
    }
}

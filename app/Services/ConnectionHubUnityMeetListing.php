<?php

namespace App\Services;

use App\Models\Course;
use App\Models\OrganizationLivestream;
use App\Models\User;
use App\Models\UserLivestream;
use App\Support\ConnectionHubType;
use App\Support\UnityMeetUrls;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ConnectionHubUnityMeetListing
{
    /**
     * @return Collection<int, array{
     *   id: int,
     *   listKey: string,
     *   source: string,
     *   title: string|null,
     *   roomName: string,
     *   status: string,
     *   isPublic: bool,
     *   scheduledAt: string|null,
     *   startedAt: string|null,
     *   endedAt: string|null,
     *   createdAt: string,
     *   joinUrl: string,
     *   hostUrl: string,
     *   directorUrl: string|null,
     *   courseId: int,
     *   courseSlug: string,
     *   courseType: string,
     *   connectionHubLabel: string,
     *   livestreamKind: string,
     *   livestreamId: int,
     * }>
     */
    public static function forUser(User $user, ?string $tab = null): Collection
    {
        $courses = Course::query()
            ->where('organization_id', $user->id)
            ->whereNotNull('unity_meet_livestream_id')
            ->whereNotNull('unity_meet_livestream_kind')
            ->whereIn('format', ['online', 'hybrid'])
            ->orderBy('start_date')
            ->orderBy('start_time')
            ->get();

        $rows = $courses
            ->map(fn (Course $course) => self::mapCourse($course, $user))
            ->filter()
            ->values();

        if ($tab === 'past') {
            return $rows->filter(fn (array $row) => self::isPastRow($row))->values();
        }

        if ($tab === 'upcoming') {
            return $rows->filter(fn (array $row) => ! self::isPastRow($row))->values();
        }

        return $rows;
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function mapCourse(Course $course, User $user): ?array
    {
        $livestream = self::resolveLivestream($course, $user);
        if (! $livestream) {
            return null;
        }

        $urls = UnityMeetUrls::linksForConnectionHub($livestream);
        $scheduledAt = $livestream->scheduled_at ?? self::courseScheduledAt($course);

        return [
            // Negative id avoids collision with UserLivestream primary keys in merged lists.
            'id' => -1 * (int) $course->id,
            'listKey' => 'course-'.$course->id,
            'source' => 'connection_hub',
            'title' => $course->name,
            'roomName' => $livestream->room_name,
            'status' => (string) $livestream->status,
            'isPublic' => (bool) $livestream->is_public,
            'scheduledAt' => $scheduledAt?->toIso8601String(),
            'startedAt' => $livestream->started_at?->toIso8601String(),
            'endedAt' => $livestream->ended_at?->toIso8601String(),
            'createdAt' => $course->created_at?->toIso8601String() ?? now()->toIso8601String(),
            'joinUrl' => $urls['join_link'],
            'hostUrl' => $urls['host_link'],
            'directorUrl' => $livestream->getDirectorUrl(false),
            'courseId' => (int) $course->id,
            'courseSlug' => (string) $course->slug,
            'courseType' => (string) $course->type,
            'connectionHubLabel' => ConnectionHubType::label((string) $course->type),
            'courseShowUrl' => route('admin.courses.show', $course->slug),
            'livestreamKind' => UnityMeetUrls::HOST_KIND_USER,
            'livestreamId' => (int) $livestream->id,
        ];
    }

    private static function resolveLivestream(Course $course, User $user): ?UserLivestream
    {
        $id = (int) $course->unity_meet_livestream_id;
        if ($id <= 0) {
            return null;
        }

        if ((string) $course->unity_meet_livestream_kind === UnityMeetUrls::HOST_KIND_USER) {
            return UserLivestream::query()
                ->where('user_id', $user->id)
                ->find($id);
        }

        $orgStream = OrganizationLivestream::query()->find($id);
        if (! $orgStream) {
            return null;
        }

        return UserLivestream::query()
            ->where('user_id', $user->id)
            ->where('room_name', $orgStream->room_name)
            ->first();
    }

    private static function courseScheduledAt(Course $course): ?Carbon
    {
        if ($course->start_date === null || $course->start_time === null || $course->start_time === '') {
            return null;
        }

        $date = $course->start_date instanceof Carbon
            ? $course->start_date->format('Y-m-d')
            : (string) $course->start_date;

        return Carbon::parse($date.' '.$course->start_time, TimezoneService::requestTimezone());
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private static function isPastRow(array $row): bool
    {
        $status = (string) ($row['status'] ?? '');

        if (in_array($status, ['ended', 'cancelled'], true)) {
            return true;
        }

        if ($status === 'scheduled' && ! empty($row['scheduledAt'])) {
            $scheduled = Carbon::parse((string) $row['scheduledAt']);

            return $scheduled->isPast();
        }

        return false;
    }
}

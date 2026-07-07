<?php

namespace App\Services;

use App\Models\Course;
use App\Models\User;
use App\Support\ConnectionHubType;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Connection Hub listing enrollment eligibility (capacity, start date, host rules).
 */
final class ConnectionHubEnrollmentService
{
    public static function allowsOpenEnrollmentAfterStart(Course $course): bool
    {
        return (bool) ($course->allow_enrollment_after_start ?? false);
    }

    public static function parseStartDateTime(Course $course): Carbon
    {
        $date = $course->start_date;
        $time = $course->start_time ?? '00:00';

        try {
            if (is_string($date) && str_contains($date, ' ')) {
                $datePart = explode(' ', $date)[0];
            } elseif ($date instanceof \Carbon\CarbonInterface) {
                $datePart = $date->format('Y-m-d');
            } else {
                $datePart = Carbon::parse($date)->format('Y-m-d');
            }

            $timePart = strlen((string) $time) > 5 ? substr((string) $time, 0, 5) : (string) $time;

            return Carbon::createFromFormat('Y-m-d H:i', $datePart.' '.$timePart);
        } catch (\Exception $e) {
            Log::error('Connection Hub start datetime parse failed', [
                'course_id' => $course->id,
                'start_date' => $date,
                'start_time' => $time,
                'error' => $e->getMessage(),
            ]);

            return Carbon::now();
        }
    }

    public static function hasListingStarted(Course $course): bool
    {
        return self::parseStartDateTime($course)->isPast();
    }

    public static function enrollmentBlockedByStartDate(Course $course): bool
    {
        if (! self::hasListingStarted($course)) {
            return false;
        }

        return ! self::allowsOpenEnrollmentAfterStart($course);
    }

    public static function startDateEnrollmentBlockMessage(Course $course): string
    {
        return ConnectionHubType::usesEventSemantics((string) ($course->type ?? ''))
            ? 'This meetup has already started.'
            : 'This course has already started.';
    }

    /**
     * Listing capacity / lifecycle status for UI. Does not imply enrollment is closed for open-enrollment types.
     */
    public static function resolveListingStatus(Course $course, int $enrolledCount, ?User $viewer = null): string
    {
        if ($course->isCancelled()) {
            return 'cancelled';
        }

        if (! self::allowsOpenEnrollmentAfterStart($course) && self::hasListingStarted($course)) {
            return 'started';
        }

        if ($course->max_participants > 0 && $enrolledCount >= $course->max_participants) {
            return 'full';
        }

        if ($course->max_participants > 0 && ($enrolledCount / $course->max_participants) >= 0.8) {
            return 'almost_full';
        }

        if ($viewer !== null && (int) $viewer->id === (int) $course->user_id) {
            return 'unavailable';
        }

        if (self::allowsOpenEnrollmentAfterStart($course) && self::hasListingStarted($course)) {
            return 'in_progress';
        }

        return 'available';
    }

    public static function canUserEnroll(Course $course, bool $hasActiveEnrollment, string $status): bool
    {
        if ($hasActiveEnrollment) {
            return false;
        }

        if (in_array($status, ['full', 'unavailable', 'cancelled', 'started'], true)) {
            return false;
        }

        return ! self::enrollmentBlockedByStartDate($course);
    }
}

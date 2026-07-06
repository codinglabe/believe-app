<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Enrollment;
use App\Support\ConnectionHubType;

/**
 * Connection Hub course / event enrollment fees (Believe Points checkout).
 *
 * Buyer pays listing fee + platform fee (added on top). Platform fee is never refunded on host cancellation.
 */
final class CourseEnrollmentFeeService
{
    /**
     * @return array{
     *   course_fee: float,
     *   platform_fee: float,
     *   platform_fee_percentage: float,
     *   total_bp: float,
     *   refundable_bp: float
     * }
     */
    public static function purchaseBreakdown(Course $course): array
    {
        $base = round(max(0, (float) ($course->course_fee ?? 0)), 2);
        $pct = BiuPlatformFeeService::getConnectionHubPlatformFeePercentage($course);
        $platformFee = round($base * ($pct / 100), 2);

        return [
            'course_fee' => $base,
            'platform_fee' => $platformFee,
            'platform_fee_percentage' => $pct,
            'total_bp' => round($base + $platformFee, 2),
            'refundable_bp' => $base,
        ];
    }

    public static function platformFeeForListingBase(Course $course, ?float $listingBaseUsd = null): float
    {
        $base = $listingBaseUsd ?? round(max(0, (float) ($course->course_fee ?? 0)), 2);

        return BiuPlatformFeeService::connectionHubPlatformFeeFromAmount($course, $base);
    }

    public static function listingBaseFromEnrollment(Course $course, Enrollment $enrollment): float
    {
        $amountPaid = round(max(0, (float) ($enrollment->amount_paid ?? 0)), 2);
        if ($amountPaid <= 0) {
            return round(max(0, (float) ($course->course_fee ?? 0)), 2);
        }

        if ($enrollment->platform_fee_paid !== null && $enrollment->platform_fee_paid !== '') {
            return round(max(0, $amountPaid - (float) $enrollment->platform_fee_paid), 2);
        }

        $expectedPlatform = self::platformFeeForListingBase($course);
        $listingBase = round(max(0, (float) ($course->course_fee ?? 0)), 2);

        if ($expectedPlatform > 0 && $amountPaid >= $listingBase + $expectedPlatform - 0.0001) {
            return $listingBase;
        }

        return $amountPaid;
    }

    public static function refundableBelievePoints(Course $course, float $amountPaid, ?float $platformFeePaid = null): float
    {
        $amountPaid = round(max(0, $amountPaid), 2);
        if ($amountPaid <= 0) {
            return 0.0;
        }

        if ($platformFeePaid !== null && $platformFeePaid !== '') {
            return round(max(0, $amountPaid - (float) $platformFeePaid), 2);
        }

        $listingBase = round(max(0, (float) ($course->course_fee ?? 0)), 2);
        $expectedPlatform = self::platformFeeForListingBase($course, $listingBase);

        if ($expectedPlatform > 0 && $amountPaid >= $listingBase + $expectedPlatform - 0.0001) {
            return $listingBase;
        }

        return $amountPaid;
    }

    public static function usesEventPlatformFee(Course $course): bool
    {
        return ConnectionHubType::usesEventSemantics((string) ($course->type ?? ''));
    }
}

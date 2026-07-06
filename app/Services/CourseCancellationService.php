<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Host-initiated Connection Hub listing cancellation with BP refunds for enrolled supporters.
 */
final class CourseCancellationService
{
    public function cancelByHost(Course $course, User $host): Course
    {
        if (! $this->hostCanCancel($course, $host)) {
            abort(403, 'Only the listing host can cancel this course.');
        }

        if ($course->isCancelled()) {
            return $course->fresh();
        }

        return DB::transaction(function () use ($course) {
            $course->refresh();

            $course->update([
                'status' => Course::STATUS_CANCELLED,
                'cancelled_at' => now(),
                'meeting_link' => null,
                'host_meeting_link' => null,
            ]);

            $enrollments = Enrollment::query()
                ->where('course_id', $course->id)
                ->whereIn('status', ['active', 'completed', 'pending'])
                ->with(['user', 'course'])
                ->get();

            foreach ($enrollments as $enrollment) {
                $this->cancelEnrollmentWithRefund($enrollment, $course, 'host_cancelled_listing');
            }

            $activeCount = Enrollment::query()
                ->where('course_id', $course->id)
                ->whereIn('status', ['active', 'completed', 'pending'])
                ->count();

            $course->update(['enrolled' => $activeCount]);

            Log::info('Connection Hub listing cancelled by host', [
                'course_id' => $course->id,
                'slug' => $course->slug,
            ]);

            return $course->fresh();
        });
    }

    public function hostCanCancel(Course $course, User $host): bool
    {
        $hostId = (int) $host->id;

        return (int) $course->organization_id === $hostId
            || (int) $course->user_id === $hostId;
    }

    public function cancelEnrollmentWithRefund(
        Enrollment $enrollment,
        Course $course,
        string $reason = 'host_cancelled_listing',
    ): void {
        if (in_array($enrollment->status, ['cancelled', 'refunded'], true)) {
            return;
        }

        $refundAmount = 0.0;
        $platformFeeKept = 0.0;

        if ($enrollment->amount_paid > 0
            && (string) ($enrollment->payment_method ?? '') === 'believe_points') {
            $platformFeeKept = $enrollment->platform_fee_paid !== null && $enrollment->platform_fee_paid !== ''
                ? round((float) $enrollment->platform_fee_paid, 2)
                : null;

            $refundAmount = CourseEnrollmentFeeService::refundableBelievePoints(
                $course,
                (float) $enrollment->amount_paid,
                $platformFeeKept
            );

            if ($platformFeeKept === null) {
                $platformFeeKept = round(max(0, (float) $enrollment->amount_paid - $refundAmount), 2);
            }

            if ($refundAmount > 0 && $enrollment->user !== null) {
                $enrollment->user->addBelievePoints($refundAmount);
            }

            $this->recordRefundTransaction($enrollment, $course, $refundAmount, $platformFeeKept, $reason);
        }

        $enrollment->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);
    }

    private function recordRefundTransaction(
        Enrollment $enrollment,
        Course $course,
        float $refundAmount,
        float $platformFeeKept,
        string $reason,
    ): void {
        if ($refundAmount <= 0 && $platformFeeKept <= 0) {
            return;
        }

        $user = $enrollment->user;
        if ($user === null) {
            return;
        }

        $refundTx = Transaction::record([
            'user_id' => $user->id,
            'related_id' => $enrollment->id,
            'related_type' => Enrollment::class,
            'type' => 'refund',
            'status' => Transaction::STATUS_COMPLETED,
            'amount' => $refundAmount,
            'fee' => 0,
            'currency' => 'USD',
            'payment_method' => 'believe_points',
            'meta' => array_merge(
                EnrollmentLedgerService::metaFor($course, $enrollment),
                [
                    'refund_reason' => $reason,
                    'original_amount_paid' => (float) $enrollment->amount_paid,
                    'platform_fee_not_refunded' => $platformFeeKept,
                    'believe_points_refunded' => $refundAmount,
                    'refund_destination' => 'available_believe_points',
                ]
            ),
            'processed_at' => now(),
        ]);

        EnrollmentLedgerService::syncTransaction($refundTx, $enrollment->fresh(), $course);
    }
}

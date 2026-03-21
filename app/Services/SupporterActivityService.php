<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\FundMeDonation;
use App\Models\Order;
use App\Models\Organization;
use App\Models\SupporterActivity;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;

class SupporterActivityService
{
    /**
     * Resolve organizations.id from a course's organization_id (user id of org account).
     */
    public function organizationIdForCourse(Course $course): ?int
    {
        return Organization::where('user_id', $course->organization_id)->value('id');
    }

    public function record(
        int $supporterId,
        int $organizationId,
        string $eventType,
        ?int $referenceId = null,
        ?\DateTimeInterface $at = null,
        ?int $amountCents = null,
        ?int $believePoints = null
    ): ?SupporterActivity {
        if (!in_array($eventType, SupporterActivity::EVENT_TYPES, true)) {
            return null;
        }

        $timestamp = $at ? \Carbon\Carbon::instance($at) : now();

        try {
            return SupporterActivity::create([
                'supporter_id' => $supporterId,
                'organization_id' => $organizationId,
                'event_type' => $eventType,
                'reference_id' => $referenceId,
                'amount_cents' => $amountCents,
                'believe_points' => $believePoints,
                'created_at' => $timestamp,
            ]);
        } catch (QueryException $e) {
            // Duplicate (event_type, reference_id)
            if ($e->getCode() === '23000' || str_contains($e->getMessage(), 'Duplicate')) {
                return null;
            }
            Log::warning('SupporterActivityService::record failed', [
                'supporter_id' => $supporterId,
                'organization_id' => $organizationId,
                'event_type' => $eventType,
                'reference_id' => $referenceId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    public function recordDonationCompletedForFundMe(FundMeDonation $donation): void
    {
        if (!$donation->user_id) {
            return;
        }

        $this->record(
            $donation->user_id,
            $donation->organization_id,
            SupporterActivity::EVENT_DONATION_COMPLETED,
            $donation->id,
            null,
            $donation->amount,
            null
        );
    }

    public function recordPurchasesForOrder(Order $order): void
    {
        if (!$order->user_id) {
            return;
        }

        $order->loadMissing('items');

        if ($order->items->isEmpty()) {
            if ($order->organization_id) {
                $cents = (int) round(((float) $order->total_amount) * 100);
                $this->record(
                    $order->user_id,
                    $order->organization_id,
                    SupporterActivity::EVENT_PURCHASE_COMPLETED,
                    $order->id,
                    null,
                    $cents > 0 ? $cents : null,
                    null
                );
            }

            return;
        }

        foreach ($order->items as $item) {
            if (!$item->organization_id) {
                continue;
            }
            $lineCents = (int) round(((float) $item->subtotal) * 100);
            $this->record(
                $order->user_id,
                $item->organization_id,
                SupporterActivity::EVENT_PURCHASE_COMPLETED,
                $item->id,
                null,
                $lineCents > 0 ? $lineCents : null,
                null
            );
        }
    }

    public function recordEnrollmentCompleted(Enrollment $enrollment): void
    {
        $enrollment->loadMissing('course');
        $course = $enrollment->course;
        if (!$course) {
            return;
        }

        $orgId = $this->organizationIdForCourse($course);
        if (!$orgId) {
            return;
        }

        $eventType = $course->type === 'event'
            ? SupporterActivity::EVENT_EVENTS_COMPLETED
            : SupporterActivity::EVENT_COURSES_COMPLETED;

        $this->record(
            $enrollment->user_id,
            $orgId,
            $eventType,
            $enrollment->id,
            $enrollment->completed_at ?? $enrollment->updated_at ?? null
        );
    }
}

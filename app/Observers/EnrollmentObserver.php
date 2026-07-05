<?php

namespace App\Observers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Services\ParticipationActivityService;
use App\Services\SupporterActivityService;
use App\Support\BrpParticipationModule;

class EnrollmentObserver
{
    public function created(Enrollment $enrollment): void
    {
        $this->handleEnrollment($enrollment);
    }

    public function updated(Enrollment $enrollment): void
    {
        if (! $enrollment->wasChanged('status')) {
            return;
        }

        $this->handleEnrollment($enrollment);
    }

    private function handleEnrollment(Enrollment $enrollment): void
    {
        if ($enrollment->status === Enrollment::STATUS_ACTIVE) {
            $this->awardOnActivation($enrollment);
        }

        if ($enrollment->status === Enrollment::STATUS_COMPLETED) {
            app(SupporterActivityService::class)->recordEnrollmentCompleted($enrollment);
            $this->awardOnCompletion($enrollment);
        }
    }

    private function awardOnActivation(Enrollment $enrollment): void
    {
        $enrollment->loadMissing(['user', 'course']);
        $user = $enrollment->user;
        $course = $enrollment->course;

        if ($user === null || $course === null) {
            return;
        }

        if ($course->type === 'events') {
            if ($this->isPaidEnrollment($enrollment, $course)) {
                ParticipationActivityService::complete(
                    $user,
                    BrpParticipationModule::EVENT_REGISTRATION_PAID,
                    $enrollment->id,
                    'Participation reward for paid event registration',
                    [
                        'enrollment_id' => $enrollment->id,
                        'course_id' => $course->id,
                        'event_name' => $course->name,
                    ],
                );
            }

            return;
        }

        if ($this->isPaidEnrollment($enrollment, $course)) {
            ParticipationActivityService::complete(
                $user,
                BrpParticipationModule::COURSE_PURCHASE,
                $enrollment->id,
                'Participation reward for paid course purchase',
                [
                    'enrollment_id' => $enrollment->id,
                    'course_id' => $course->id,
                    'course_name' => $course->name,
                ],
            );
        }
    }

    private function awardOnCompletion(Enrollment $enrollment): void
    {
        $enrollment->loadMissing(['user', 'course']);
        $user = $enrollment->user;
        $course = $enrollment->course;

        if ($user === null || $course === null || $course->type !== 'events') {
            return;
        }

        ParticipationActivityService::complete(
            $user,
            BrpParticipationModule::EVENT_ATTENDANCE_FREE,
            $enrollment->id,
            'Participation reward for verified event attendance',
            [
                'enrollment_id' => $enrollment->id,
                'course_id' => $course->id,
                'event_name' => $course->name,
            ],
        );
    }

    private function isPaidEnrollment(Enrollment $enrollment, Course $course): bool
    {
        if ($course->pricing_type === 'paid') {
            return true;
        }

        return (float) ($enrollment->amount_paid ?? 0) > 0;
    }
}

<?php

namespace App\Observers;

use App\Models\Enrollment;
use App\Services\SupporterActivityService;

class EnrollmentObserver
{
    public function created(Enrollment $enrollment): void
    {
        if ($enrollment->status === Enrollment::STATUS_COMPLETED) {
            app(SupporterActivityService::class)->recordEnrollmentCompleted($enrollment);
        }
    }

    public function updated(Enrollment $enrollment): void
    {
        if (!$enrollment->wasChanged('status')) {
            return;
        }
        if ($enrollment->status !== Enrollment::STATUS_COMPLETED) {
            return;
        }

        app(SupporterActivityService::class)->recordEnrollmentCompleted($enrollment);
    }
}

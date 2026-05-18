<?php

namespace App\Observers;

use App\Models\JobApplication;
use App\Models\SupporterActivity;
use App\Services\SupporterActivityService;

class JobApplicationObserver
{
    public function updated(JobApplication $application): void
    {
        if (!$application->wasChanged('status')) {
            return;
        }
        if ($application->status !== 'accepted') {
            return;
        }

        $application->loadMissing('jobPost');
        $post = $application->jobPost;
        if (!$post || $post->type !== 'volunteer' || !$post->organization_id) {
            return;
        }

        app(SupporterActivityService::class)->record(
            $application->user_id,
            $post->organization_id,
            SupporterActivity::EVENT_VOLUNTEER_SIGNUP,
            $application->id
        );
    }
}

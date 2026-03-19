<?php

namespace App\Observers;

use App\Models\Donation;
use App\Models\SupporterActivity;
use App\Services\SupporterActivityService;

class DonationObserver
{
    public function updated(Donation $donation): void
    {
        if (!$donation->wasChanged('status')) {
            return;
        }
        if ($donation->status !== 'completed') {
            return;
        }
        if (!$donation->user_id || !$donation->organization_id) {
            return;
        }

        app(SupporterActivityService::class)->record(
            $donation->user_id,
            $donation->organization_id,
            SupporterActivity::EVENT_DONATION_COMPLETED,
            $donation->id,
            $donation->donation_date
        );
    }
}

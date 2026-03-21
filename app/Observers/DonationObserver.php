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

        $amountCents = (int) round(((float) $donation->amount) * 100);
        $believePoints = $donation->payment_method === 'believe_points'
            ? (int) round((float) $donation->amount)
            : null;

        app(SupporterActivityService::class)->record(
            $donation->user_id,
            $donation->organization_id,
            SupporterActivity::EVENT_DONATION_COMPLETED,
            $donation->id,
            $donation->donation_date,
            $amountCents > 0 ? $amountCents : null,
            $believePoints !== null && $believePoints > 0 ? $believePoints : null
        );
    }
}

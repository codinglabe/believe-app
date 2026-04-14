<?php

namespace App\Observers;

use App\Models\FundMeDonation;
use App\Services\FundMeLedgerTransactionService;
use App\Services\SupporterActivityService;

class FundMeDonationObserver
{
    public function updated(FundMeDonation $donation): void
    {
        if (! $donation->wasChanged('status')) {
            return;
        }
        if ($donation->status !== FundMeDonation::STATUS_SUCCEEDED) {
            return;
        }

        app(FundMeLedgerTransactionService::class)->ensureTransactionForSucceededDonation($donation);
        app(SupporterActivityService::class)->recordDonationCompletedForFundMe($donation);
    }
}

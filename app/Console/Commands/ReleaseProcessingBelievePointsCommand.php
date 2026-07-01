<?php

namespace App\Console\Commands;

use App\Services\BelievePointPurchaseSettlementReconciliationService;
use App\Services\BelievePointPurchaseSettlementService;
use Illuminate\Console\Command;

class ReleaseProcessingBelievePointsCommand extends Command
{
    protected $signature = 'believe-points:release-processing';

    protected $description = 'Sync missed Stripe/Bridge settlement signals, then move due Processing BP to Available';

    public function handle(): int
    {
        BelievePointPurchaseSettlementReconciliationService::reconcilePendingPurchases();

        $released = BelievePointPurchaseSettlementService::releaseDueProcessingPoints();

        $this->info("Released processing Believe Points for {$released} purchase(s).");

        return self::SUCCESS;
    }
}

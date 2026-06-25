<?php

namespace App\Console\Commands;

use App\Services\BelievePointBridgeReserveSettlementService;
use App\Services\BelievePointPurchaseSettlementService;
use Illuminate\Console\Command;

class ReconcileBelievePointBridgeReserveSettlementCommand extends Command
{
    protected $signature = 'believe-points:reconcile-bridge-reserve';

    protected $description = 'Poll Bridge reserve wallet history and release Processing BP when Stripe + Bridge are both confirmed';

    public function handle(): int
    {
        $credits = BelievePointBridgeReserveSettlementService::reconcileFromBridgeApi();
        $released = BelievePointPurchaseSettlementService::releaseDueProcessingPoints();

        $this->info("Ingested {$credits} new reserve credit(s); released {$released} purchase(s) to Available BP.");

        return self::SUCCESS;
    }
}

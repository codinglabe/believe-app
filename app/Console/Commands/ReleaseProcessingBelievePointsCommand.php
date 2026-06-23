<?php

namespace App\Console\Commands;

use App\Services\BelievePointPurchaseSettlementService;
use Illuminate\Console\Command;

class ReleaseProcessingBelievePointsCommand extends Command
{
    protected $signature = 'believe-points:release-processing';

    protected $description = 'Move held Processing BP to available balance after card hold period';

    public function handle(): int
    {
        $released = BelievePointPurchaseSettlementService::releaseDueProcessingPoints();

        $this->info("Released processing Believe Points for {$released} purchase(s).");

        return self::SUCCESS;
    }
}

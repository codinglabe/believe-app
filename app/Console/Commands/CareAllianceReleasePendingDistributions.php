<?php

namespace App\Console\Commands;

use App\Services\CareAllianceGeneralDonationDistributionService;
use Illuminate\Console\Command;

class CareAllianceReleasePendingDistributions extends Command
{
    protected $signature = 'care-alliance:release-pending-distributions';

    protected $description = 'Release pooled Care Alliance general donations to wallets when weekly/monthly/quarterly windows elapse.';

    public function handle(CareAllianceGeneralDonationDistributionService $svc): int
    {
        $n = $svc->releaseAllDuePendingDistributions();
        if ($n > 0) {
            $this->info("Released {$n} scheduled distribution(s).");
        }

        return self::SUCCESS;
    }
}

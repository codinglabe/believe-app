<?php

namespace App\Console\Commands;

use App\Services\BelievePointsToBridgeWalletService;
use Illuminate\Console\Command;

class ProcessPendingBelievePointWalletTransfersCommand extends Command
{
    protected $signature = 'believe-points:process-wallet-transfers';

    protected $description = 'Retry pending Believe Points → wallet transfers and expire overdue requests';

    public function handle(BelievePointsToBridgeWalletService $service): int
    {
        $result = $service->processDuePendingTransfers();

        $this->info(sprintf(
            'Processed %d pending transfer(s); %d expired and refunded; %d submitted transfer(s) reconciled.',
            $result['processed'],
            $result['expired'],
            $result['reconciled'],
        ));

        return self::SUCCESS;
    }
}

<?php

namespace App\Console\Commands;

use App\Models\BelievePointWalletTransfer;
use App\Services\BelievePointsWalletTransferLedgerService;
use Illuminate\Console\Command;

class SyncBelievePointWalletTransferLedgerCommand extends Command
{
    protected $signature = 'believe-points:sync-wallet-transfer-ledger';

    protected $description = 'Upsert admin ledger (transactions) rows for every BP → Bridge wallet transfer';

    public function handle(): int
    {
        $count = 0;
        BelievePointWalletTransfer::query()->orderBy('id')->chunk(200, function ($chunk) use (&$count) {
            foreach ($chunk as $transfer) {
                BelievePointsWalletTransferLedgerService::syncAdminLedgerRow($transfer);
                $count++;
            }
        });

        $this->info("Synced {$count} believe_point_wallet_transfer row(s) to the transactions ledger.");

        return self::SUCCESS;
    }
}

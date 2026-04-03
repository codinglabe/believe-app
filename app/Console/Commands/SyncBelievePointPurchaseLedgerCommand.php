<?php

namespace App\Console\Commands;

use App\Models\BelievePointPurchase;
use App\Services\BelievePointPurchaseSettlementService;
use Illuminate\Console\Command;

class SyncBelievePointPurchaseLedgerCommand extends Command
{
    protected $signature = 'believe-points:sync-ledger';

    protected $description = 'Upsert admin ledger (transactions) rows for every Believe Point purchase, all statuses';

    public function handle(): int
    {
        $count = 0;
        BelievePointPurchase::query()->orderBy('id')->chunk(200, function ($chunk) use (&$count) {
            foreach ($chunk as $purchase) {
                BelievePointPurchaseSettlementService::syncAdminLedgerPurchaseRow($purchase);
                $count++;
            }
        });

        $this->info("Synced {$count} believe_point_purchase row(s) to the transactions ledger.");

        return self::SUCCESS;
    }
}

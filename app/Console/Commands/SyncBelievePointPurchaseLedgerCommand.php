<?php

namespace App\Console\Commands;

use App\Models\BelievePointPurchase;
use App\Models\BelievePointWalletTransfer;
use App\Services\BelievePointPurchaseSettlementService;
use App\Services\BelievePointsWalletTransferLedgerService;
use Illuminate\Console\Command;

class SyncBelievePointPurchaseLedgerCommand extends Command
{
    protected $signature = 'believe-points:sync-ledger';

    protected $description = 'Upsert admin ledger (transactions) rows for every Believe Point purchase and BP → Bridge wallet transfer';

    public function handle(): int
    {
        $purchaseCount = 0;
        BelievePointPurchase::query()->orderBy('id')->chunk(200, function ($chunk) use (&$purchaseCount) {
            foreach ($chunk as $purchase) {
                BelievePointPurchaseSettlementService::syncAdminLedgerPurchaseRow($purchase);
                if ((float) ($purchase->reward_points_awarded ?? 0) > 0) {
                    \App\Services\Admin\UnifiedLedgerTransactionWriter::syncBrpPurchaseRewardRow($purchase);
                }
                $purchaseCount++;
            }
        });

        $transferCount = 0;
        BelievePointWalletTransfer::query()->orderBy('id')->chunk(200, function ($chunk) use (&$transferCount) {
            foreach ($chunk as $transfer) {
                BelievePointsWalletTransferLedgerService::syncAdminLedgerRow($transfer);
                $transferCount++;
            }
        });

        $this->info("Synced {$purchaseCount} believe_point_purchase row(s) and {$transferCount} wallet transfer row(s) to the transactions ledger.");

        return self::SUCCESS;
    }
}

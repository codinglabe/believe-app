<?php

namespace App\Console\Commands;

use App\Services\BelievePointBridgeReserveSettlementService;
use App\Services\BelievePointPurchaseSettlementReconciliationService;
use Illuminate\Console\Command;

class ReconcileBelievePointBridgeReserveSettlementCommand extends Command
{
    protected $signature = 'believe-points:reconcile-bridge-reserve';

    protected $description = 'Poll Bridge reserve wallet history and release Processing BP when Stripe + Bridge are both confirmed (alias for reconcile-settlement)';

    public function handle(): int
    {
        $bridgeGateEnabled = BelievePointBridgeReserveSettlementService::requiresBridgeReserveConfirmation();

        if (! $bridgeGateEnabled) {
            $this->comment('Bridge reserve gate disabled — running Stripe-only settlement reconciliation.');
        }

        $stats = BelievePointPurchaseSettlementReconciliationService::reconcilePendingPurchases();

        if (! $bridgeGateEnabled) {
            $this->info(sprintf(
                'Examined %d purchase(s). Stripe synced: %d. Stripe-only prepared: %d. Released: %d.',
                $stats['examined'],
                $stats['stripe_synced'],
                $stats['stripe_only_prepared'],
                $stats['released'],
            ));
        } else {
            $this->info(sprintf(
                'Examined %d purchase(s). Stripe synced: %d. Bridge credits ingested: %d. Bridge allocations: %d. Released: %d.',
                $stats['examined'],
                $stats['stripe_synced'],
                $stats['bridge_credits_ingested'],
                $stats['bridge_allocated'],
                $stats['released'],
            ));
        }

        return self::SUCCESS;
    }
}

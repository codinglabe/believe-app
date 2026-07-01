<?php

namespace App\Console\Commands;

use App\Services\BelievePointPurchaseSettlementReconciliationService;
use Illuminate\Console\Command;

class ReconcileBelievePointSettlementCommand extends Command
{
    protected $signature = 'believe-points:reconcile-settlement {--dry-run : Report stuck purchases without updating Stripe, Bridge, or BP balances}';

    protected $description = 'Backfill missed Stripe/Bridge settlement webhooks and release Processing BP to Available';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        if ($dryRun) {
            $this->warn('Dry run — no purchases will be updated.');
        }

        $stats = BelievePointPurchaseSettlementReconciliationService::reconcilePendingPurchases($dryRun);

        $this->info(sprintf(
            'Examined %d stuck purchase(s). Stripe synced: %d. Bridge credits ingested: %d. Bridge allocations: %d. Released to Available: %d.',
            $stats['examined'],
            $stats['stripe_synced'],
            $stats['bridge_credits_ingested'],
            $stats['bridge_allocated'],
            $stats['released'],
        ));

        return self::SUCCESS;
    }
}

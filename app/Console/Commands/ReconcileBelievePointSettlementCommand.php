<?php

namespace App\Console\Commands;

use App\Services\BelievePointPurchaseSettlementReconciliationService;
use Illuminate\Console\Command;

class ReconcileBelievePointSettlementCommand extends Command
{
    protected $signature = 'believe-points:reconcile-settlement
                            {--dry-run : Report stuck purchases without updating Stripe, Bridge, or BP balances}
                            {--with-bridge : On local, also poll Bridge reserve API (default local is Stripe-only)}';

    protected $description = 'Backfill missed Stripe/Bridge settlement webhooks and release Processing BP to Available';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $stripeOnly = app()->environment('local') && ! (bool) $this->option('with-bridge');

        if ($dryRun) {
            $this->warn('Dry run — no purchases will be updated.');
        }

        if ($stripeOnly) {
            $this->comment('Local: Stripe settlement only (skipped Bridge API). Pass --with-bridge to include Bridge.');
        }

        $stats = BelievePointPurchaseSettlementReconciliationService::reconcilePendingPurchases($dryRun, $stripeOnly);

        if ($stripeOnly) {
            $this->info(sprintf(
                'Examined %d stuck purchase(s). Stripe synced: %d. Released to Available: %d.',
                $stats['examined'],
                $stats['stripe_synced'],
                $stats['released'],
            ));
        } else {
            $this->info(sprintf(
                'Examined %d stuck purchase(s). Stripe synced: %d. Bridge credits ingested: %d. Bridge allocations: %d. Released to Available: %d.',
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

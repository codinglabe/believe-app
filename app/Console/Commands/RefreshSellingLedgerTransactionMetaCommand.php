<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\ServiceOrder;
use App\Models\Transaction;
use App\Services\MarketplaceOrderLedgerService;
use App\Services\ServiceOrderLedgerService;
use Illuminate\Console\Command;

/**
 * Rebuilds persisted ledger fields on transactions from canonical Order / ServiceOrder rows
 * (aligns old rows with current MarketplaceOrderLedgerService / ServiceOrderLedgerService math).
 */
class RefreshSellingLedgerTransactionMetaCommand extends Command
{
    protected $signature = 'ledger:refresh-selling-meta
                            {--dry-run : List counts and IDs without writing}
                            {--marketplace-only : Only Order-linked transactions}
                            {--service-only : Only ServiceOrder-linked transactions}';

    protected $description = 'Backfill transactions.meta payout/fee fields from orders (workbook-aligned ledger)';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $marketplaceOnly = (bool) $this->option('marketplace-only');
        $serviceOnly = (bool) $this->option('service-only');

        if ($marketplaceOnly && $serviceOnly) {
            $this->error('Use only one of --marketplace-only or --service-only.');

            return self::FAILURE;
        }

        $ordersUpdated = 0;
        $ordersSkipped = 0;
        $serviceUpdated = 0;
        $serviceSkipped = 0;

        if (! $serviceOnly) {
            $q = Transaction::query()
                ->where('related_type', Order::class)
                ->whereNotNull('related_id');

            $total = (clone $q)->count();
            $this->info("Marketplace (Order) transactions: {$total}");

            if ($dryRun && $total > 0) {
                $sample = (clone $q)->orderBy('id')->limit(10)->pluck('id');
                $this->line('Sample transaction ids: '.$sample->implode(', '));
            }

            if (! $dryRun) {
                $q->orderBy('id')->chunkById(100, function ($rows) use (&$ordersUpdated, &$ordersSkipped) {
                    foreach ($rows as $t) {
                        $order = Order::query()->with('orderSplit')->find((int) $t->related_id);
                        if (! $order) {
                            $ordersSkipped++;

                            continue;
                        }

                        $stripeUsd = max((float) $t->fee, (float) ($t->meta['stripe_fee'] ?? 0));

                        try {
                            $fresh = MarketplaceOrderLedgerService::transactionMeta($order, $stripeUsd);
                            $newMeta = array_merge($t->meta ?? [], $fresh);

                            Transaction::query()->whereKey($t->id)->update([
                                'meta' => $newMeta,
                                'updated_at' => now(),
                            ]);
                            $ordersUpdated++;
                        } catch (\Throwable $e) {
                            $this->warn("Transaction id={$t->id}: ".$e->getMessage());
                            $ordersSkipped++;
                        }
                    }
                });
            }
        }

        if (! $marketplaceOnly) {
            $q = Transaction::query()
                ->where('related_type', ServiceOrder::class)
                ->whereNotNull('related_id');

            $total = (clone $q)->count();
            $this->info("Service Hub (ServiceOrder) transactions: {$total}");

            if ($dryRun && $total > 0) {
                $sample = (clone $q)->orderBy('id')->limit(10)->pluck('id');
                $this->line('Sample transaction ids: '.$sample->implode(', '));
            }

            if (! $dryRun) {
                $q->orderBy('id')->chunkById(100, function ($rows) use (&$serviceUpdated, &$serviceSkipped) {
                    foreach ($rows as $t) {
                        $so = ServiceOrder::query()->find((int) $t->related_id);
                        if (! $so) {
                            $serviceSkipped++;

                            continue;
                        }

                        try {
                            $patch = ServiceOrderLedgerService::mergeLedgerFinancials($so, $t, [
                                'gross_amount' => 0.0,
                                'stripe_fee' => 0.0,
                                'biu_fee' => 0.0,
                                'split_deduction' => 0.0,
                                'refund_amount' => 0.0,
                                'net_to_organization' => null,
                            ]);
                            $allowed = [
                                'gross_amount', 'stripe_fee', 'supplier_payout', 'organization_payout',
                                'platform_payout', 'net_to_organization', 'subtotal_amount',
                                'sales_tax_amount', 'shipping_amount',
                            ];
                            $slice = array_intersect_key($patch, array_flip($allowed));
                            $newMeta = array_merge($t->meta ?? [], $slice);
                            $newMeta['source'] = $newMeta['source'] ?? 'service_order';

                            Transaction::query()->whereKey($t->id)->update([
                                'meta' => $newMeta,
                                'updated_at' => now(),
                            ]);
                            $serviceUpdated++;
                        } catch (\Throwable $e) {
                            $this->warn("Transaction id={$t->id}: ".$e->getMessage());
                            $serviceSkipped++;
                        }
                    }
                });
            }
        }

        if ($dryRun) {
            $this->newLine();
            $this->info('Dry run: no rows updated. Run without --dry-run to apply.');

            return self::SUCCESS;
        }

        $this->newLine();
        if (! $serviceOnly) {
            $this->info("Marketplace: updated {$ordersUpdated}, skipped (missing order / error) {$ordersSkipped}.");
        }
        if (! $marketplaceOnly) {
            $this->info("Service Hub: updated {$serviceUpdated}, skipped (missing order / error) {$serviceSkipped}.");
        }

        return self::SUCCESS;
    }
}

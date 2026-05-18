<?php

namespace App\Console\Commands;

use App\Models\Donation;
use App\Models\Transaction;
use App\Services\DonationLedgerSyncService;
use Illuminate\Console\Command;

/**
 * Updates persisted meta on org recipient deposit rows to match donation fee coverage rules.
 */
class RefreshDonationDepositLedgerMetaCommand extends Command
{
    protected $signature = 'ledger:refresh-donation-deposit-meta
                            {--dry-run : Count only, no writes}';

    protected $description = 'Backfill net/gross/donor_covers on donation recipient deposit transactions';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $q = Transaction::query()
            ->where('type', 'deposit')
            ->where('related_type', Donation::class)
            ->whereNotNull('related_id');

        $total = (clone $q)->count();
        $this->info("Donation recipient deposit transactions: {$total}");

        if ($dryRun) {
            if ($total > 0) {
                $sample = (clone $q)->orderBy('id')->limit(15)->get(['id', 'related_id']);
                foreach ($sample as $row) {
                    $this->line("  txn id={$row->id} donation_id={$row->related_id}");
                }
            }
            $this->info('Dry run: no updates. Run without --dry-run to apply.');

            return self::SUCCESS;
        }

        $updated = 0;
        $skipped = 0;

        $q->orderBy('id')->chunkById(100, function ($rows) use (&$updated, &$skipped) {
            foreach ($rows as $t) {
                $donation = Donation::query()->find((int) $t->related_id);
                if (! $donation) {
                    $skipped++;

                    continue;
                }

                $patch = DonationLedgerSyncService::organizationDonationFinancialMeta($donation);
                $newMeta = array_merge($t->meta ?? [], $patch);

                Transaction::query()->whereKey($t->id)->update([
                    'meta' => $newMeta,
                    'updated_at' => now(),
                ]);
                $updated++;
            }
        });

        $this->info("Updated {$updated}, skipped (missing donation) {$skipped}.");

        return self::SUCCESS;
    }
}

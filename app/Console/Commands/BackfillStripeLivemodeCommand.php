<?php

namespace App\Console\Commands;

use App\Models\Transaction;
use App\Support\StripeReferenceMode;
use Illuminate\Console\Command;

class BackfillStripeLivemodeCommand extends Command
{
    protected $signature = 'stripe:backfill-livemode
                            {--dry-run : Report rows that would be updated}';

    protected $description = 'Resolve Stripe livemode for pi_/sub_ ledger rows and store meta.stripe_livemode';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $updated = 0;
        $live = 0;
        $test = 0;
        $skipped = 0;

        Transaction::query()
            ->whereNull('meta->stripe_livemode')
            ->orderBy('id')
            ->chunkById(100, function ($transactions) use ($dryRun, &$updated, &$live, &$test, &$skipped) {
                foreach ($transactions as $transaction) {
                    if (! StripeReferenceMode::hasAmbiguousStripeReference($transaction)) {
                        $skipped++;

                        continue;
                    }

                    $meta = is_array($transaction->meta) ? $transaction->meta : [];
                    $resolved = null;

                    foreach (StripeReferenceMode::collectReferences($transaction->transaction_id, $meta) as $reference) {
                        $resolved = StripeReferenceMode::resolveLivemode($reference, $meta);
                        if ($resolved !== null) {
                            break;
                        }
                    }

                    if ($resolved === null) {
                        $skipped++;

                        continue;
                    }

                    $resolved ? $live++ : $test++;
                    $updated++;

                    if ($dryRun) {
                        $this->line(sprintf(
                            '#%d %s → %s',
                            $transaction->id,
                            $transaction->transaction_id,
                            $resolved ? 'live' : 'test',
                        ));

                        continue;
                    }

                    $meta['stripe_livemode'] = $resolved;
                    $transaction->update(['meta' => $meta]);
                }
            });

        $this->info('Rows updated: '.$updated.' (live: '.$live.', test: '.$test.')');
        $this->info('Skipped: '.$skipped);

        if ($dryRun) {
            $this->comment('Dry run only. Re-run without --dry-run to persist meta.stripe_livemode.');
        }

        return self::SUCCESS;
    }
}

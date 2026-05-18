<?php

namespace App\Console\Commands;

use App\Models\FundMeDonation;
use App\Models\Transaction;
use App\Services\FundMeLedgerTransactionService;
use Illuminate\Console\Command;

class SyncFundMeLedgerTransactionsCommand extends Command
{
    protected $signature = 'fundme:sync-ledger';

    protected $description = 'Create missing transactions ledger rows for succeeded FundMe (Support a project) donations with a user_id';

    public function handle(FundMeLedgerTransactionService $ledger): int
    {
        $n = 0;
        FundMeDonation::query()
            ->where('status', FundMeDonation::STATUS_SUCCEEDED)
            ->whereNotNull('user_id')
            ->orderBy('id')
            ->chunk(200, function ($chunk) use ($ledger, &$n) {
                foreach ($chunk as $donation) {
                    $before = Transaction::query()
                        ->where('related_type', FundMeDonation::class)
                        ->where('related_id', $donation->id)
                        ->exists();
                    $ledger->ensureTransactionForSucceededDonation($donation);
                    $after = Transaction::query()
                        ->where('related_type', FundMeDonation::class)
                        ->where('related_id', $donation->id)
                        ->exists();
                    if (! $before && $after) {
                        $n++;
                    }
                }
            });

        $this->info("Created {$n} new transaction row(s) for FundMe donations.");

        return self::SUCCESS;
    }
}

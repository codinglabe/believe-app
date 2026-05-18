<?php

namespace App\Console\Commands;

use App\Models\Donation;
use App\Services\DonationLedgerSyncService;
use Illuminate\Console\Command;

/**
 * Explains why `donations` count can differ from ledger (`transactions`) rows, and optionally backfills missing rows.
 */
class AuditDonationsLedgerCommand extends Command
{
    protected $signature = 'donations:ledger-audit
                            {--fix : Create missing recipient deposit ledger rows for completed donations (no double balance credit)}';

    protected $description = 'Report donations vs ledger coverage; optionally backfill missing transaction rows';

    public function handle(): int
    {
        $totalDonations = Donation::query()->count();

        $withLedger = 0;
        $withoutLedger = [];

        foreach (Donation::query()->orderBy('id')->cursor() as $donation) {
            if (DonationLedgerSyncService::donationHasLedgerReference($donation->id)) {
                $withLedger++;
            } else {
                $withoutLedger[] = $donation;
            }
        }

        $missing = count($withoutLedger);

        $this->info('Donations table: '.$totalDonations.' rows.');
        $this->info('Donations referenced on the ledger (any transaction with donation id): '.$withLedger.'.');
        $this->info('Donations with no ledger row at all: '.$missing.'.');
        $this->newLine();
        $this->comment('The ledger is the `transactions` table, not `donations`. A standard gift creates one recipient deposit row; Care Alliance may add split rows; pending/scheduled flows may have none yet.');
        $this->newLine();

        if ($missing > 0) {
            $this->warn('Donations missing any ledger reference:');
            foreach ($withoutLedger as $d) {
                $ca = DonationLedgerSyncService::donationUsesCareAllianceDistribution($d) ? 'yes (splits/pool)' : 'no';
                $this->line(sprintf(
                    '  id=%d status=%s care_alliance_distribution=%s amount=%s',
                    $d->id,
                    $d->status,
                    $ca,
                    $d->amount
                ));
            }
        }

        if (! $this->option('fix')) {
            if ($missing > 0) {
                $this->newLine();
                $this->info('Run with --fix to add missing recipient deposit rows without incrementing balance again (where safe).');
            }

            return self::SUCCESS;
        }

        $fixed = 0;
        foreach ($withoutLedger as $donation) {
            if (! in_array($donation->status, ['completed', 'active'], true)) {
                $this->line('Skip id='.$donation->id.' (status not completed/active).');

                continue;
            }

            try {
                if (! DonationLedgerSyncService::donationUsesCareAllianceDistribution($donation)) {
                    DonationLedgerSyncService::recordRecipientDepositIfMissing($donation, false);
                    $fixed++;
                } else {
                    $this->line('Skip recipient backfill id='.$donation->id.' (Care Alliance distribution — use split rows / release job).');
                }
            } catch (\Throwable $e) {
                $this->error('Failed id='.$donation->id.': '.$e->getMessage());
            }
        }

        $this->newLine();
        $this->info('Processed '.$fixed.' donation(s) (recipient deposit backfill when not Care Alliance distribution).');

        return self::SUCCESS;
    }
}

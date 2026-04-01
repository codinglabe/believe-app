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
                            {--fix : Create missing donor/recipient ledger rows for completed donations (no double balance credit)}';

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
        $this->comment('The ledger is the `transactions` table, not `donations`. One donation can create multiple rows (donor + recipient + splits), or none yet (pending payment, scheduled Care Alliance pool, or legacy data before ledger logging).');
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
                $this->info('Run with --fix to add missing donor audit rows and (where safe) recipient deposit rows without incrementing balance again.');
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
                DonationLedgerSyncService::recordDonorAuditIfMissing($donation);
                $fixed++;

                if (! DonationLedgerSyncService::donationUsesCareAllianceDistribution($donation)) {
                    DonationLedgerSyncService::recordRecipientDepositIfMissing($donation, false);
                } else {
                    $this->line('Skip recipient backfill id='.$donation->id.' (Care Alliance distribution — use split rows / release job).');
                }
            } catch (\Throwable $e) {
                $this->error('Failed id='.$donation->id.': '.$e->getMessage());
            }
        }

        $this->newLine();
        $this->info('Processed '.$fixed.' donation(s) (donor audit attempted for each; recipient only when not CA distribution).');

        return self::SUCCESS;
    }
}

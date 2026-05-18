<?php

namespace App\Console\Commands;

use App\Models\OrganizationInvite;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessOrganizationInviteBelievePointSchedule extends Command
{
    protected $signature = 'organizations:process-invite-believe-point-schedule';

    protected $description = 'Credit due Believe Points installments for organization-invite referrers (months 2–24 after verification)';

    public function handle(): int
    {
        $total = 0;

        OrganizationInvite::query()
            ->where('status', 'accepted')
            ->whereNotNull('believe_points_schedule_started_at')
            ->where('believe_points_installments_credited', '<', 24)
            ->with('inviter')
            ->orderBy('id')
            ->chunkById(200, function ($invites) use (&$total) {
                foreach ($invites as $invite) {
                    $total += $this->creditDueInstallments($invite);
                }
            });

        if ($total > 0) {
            $this->info("Credited {$total} Believe Points installment(s).");
        }

        return self::SUCCESS;
    }

    private function creditDueInstallments(OrganizationInvite $invite): int
    {
        $inviter = $invite->inviter;
        if ($inviter === null || $invite->believe_points_schedule_started_at === null) {
            return 0;
        }

        $creditedCount = 0;

        while ($invite->believe_points_installments_credited < 24) {
            $credited = (int) $invite->believe_points_installments_credited;
            $due = $invite->believe_points_schedule_started_at->copy()->addMonths($credited);

            if (now()->lt($due)) {
                break;
            }

            $nextInstallment = $credited + 1;
            $amount = $nextInstallment <= 12 ? 10.0 : 5.0;

            DB::transaction(function () use ($invite, $inviter, $amount) {
                $inviter->increment('believe_points', $amount);
                $invite->increment('believe_points_installments_credited');
            });

            $invite->refresh();
            $inviter->refresh();

            Log::info('Organization invite Believe Points installment credited', [
                'invite_id' => $invite->id,
                'installment' => $nextInstallment,
                'amount' => $amount,
                'inviter_id' => $inviter->id,
            ]);

            $creditedCount++;
        }

        return $creditedCount;
    }
}

<?php

namespace App\Console\Commands;

use App\Jobs\ProcessSmsWalletAutoRechargeJob;
use App\Models\User;
use Illuminate\Console\Command;

class SmsAutoRechargeScanCommand extends Command
{
    protected $signature = 'sms:auto-recharge-scan';

    protected $description = 'Dispatch SMS wallet auto-recharge jobs for users with low balance (Cashier off-session).';

    public function handle(): int
    {
        User::query()
            ->where('sms_auto_recharge_enabled', true)
            ->whereNotNull('sms_auto_recharge_pm_id')
            ->whereNotNull('stripe_id')
            ->select(['id', 'sms_included', 'sms_used', 'sms_auto_recharge_threshold'])
            ->chunkById(100, function ($users): void {
                foreach ($users as $user) {
                    $threshold = $user->sms_auto_recharge_threshold !== null
                        ? (int) $user->sms_auto_recharge_threshold
                        : 50;
                    $left = max(0, (int) ($user->sms_included ?? 0) - (int) ($user->sms_used ?? 0));
                    if ($left <= $threshold) {
                        ProcessSmsWalletAutoRechargeJob::dispatch($user->id);
                    }
                }
            });

        $this->info('SMS auto-recharge scan dispatched eligible jobs.');

        return self::SUCCESS;
    }
}

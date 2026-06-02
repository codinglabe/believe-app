<?php

namespace App\Console\Commands;

use App\Jobs\SendDailyEngagementPushJob;
use App\Models\User;
use App\Models\UserPushToken;
use App\Support\DailyEngagementMessages;
use Illuminate\Console\Command;

class SendDailyEngagementNotifications extends Command
{
    protected $signature = 'engagement:send-daily
                            {--date= : Y-m-d date to use for message rotation (defaults to today, app timezone)}
                            {--dry-run : Show counts only, do not queue notifications}';

    protected $description = 'Queue daily rotating push notifications for supporters and organization accounts';

    /**
     * @return array<int, string>
     */
    private function eligibleRoles(): array
    {
        return ['user', 'organization', 'organization_pending'];
    }

    public function handle(): int
    {
        if (! config('daily_engagement.enabled', true)) {
            $this->warn('Daily engagement push is disabled (DAILY_ENGAGEMENT_PUSH_ENABLED=false).');

            return self::SUCCESS;
        }

        $dateInput = $this->option('date');
        $date = $dateInput
            ? now()->parse($dateInput)->startOfDay()
            : now()->startOfDay();
        $sentOn = $date->toDateString();
        $dryRun = (bool) $this->option('dry-run');

        $message = DailyEngagementMessages::forDate($date);
        $title = (string) config('daily_engagement.title', config('app.name'));

        $this->line('Date: '.$sentOn);
        $this->line('Title: '.$title);
        $this->line('Message #'.($message['index'] + 1).': '.$message['body']);

        $query = User::query()
            ->whereIn('role', $this->eligibleRoles())
            ->where('login_status', true)
            ->whereHas('pushTokens', function ($q) {
                $q->where('is_active', true)
                    ->where('status', UserPushToken::STATUS_ACTIVE);
            });

        $total = (clone $query)->count();
        $this->line('Eligible users with active push tokens: '.$total);

        if ($total === 0) {
            $this->comment('No users to notify. Users must be supporters or organizations with login enabled and a registered push device.');

            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->warn('Dry run: no jobs were queued.');

            return self::SUCCESS;
        }

        $queued = 0;

        $query->select('id')->orderBy('id')->chunkById(200, function ($users) use (&$queued, $message, $sentOn) {
            foreach ($users as $user) {
                SendDailyEngagementPushJob::dispatch(
                    (int) $user->id,
                    $message['body'],
                    $message['index'],
                    $sentOn,
                );
                $queued++;
            }
        });

        $this->info("Queued {$queued} daily engagement push job(s).");

        return self::SUCCESS;
    }
}

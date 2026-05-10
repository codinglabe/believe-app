<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule IRS BMF monthly import (update-only mode)
Schedule::command('irs:bmf:import --update-only --chunk=1000')
    ->monthly()
    ->at('02:00')
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('rss:warm-nonprofit')->everyFifteenMinutes();

// Followers: in-app + push when someone they follow has a birthday (once per follower–celebrant per year)
Schedule::command('supporters:notify-birthdays')
    ->dailyAt('08:00')
    ->withoutOverlapping()
    ->runInBackground();

// Warm Unity Videos cache so /unity-videos loads quickly on first visit
Schedule::command('unity-videos:warm-cache')->everyFiveMinutes();

Schedule::command('model:prune', ['--model' => [\App\Models\SendJob::class]])->daily()->at('03:00')->withoutOverlapping()->runInBackground();

Schedule::command('drops:dispatch-due')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

// Process scheduled Facebook posts
Schedule::command('facebook:process-scheduled')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

// Process scheduled newsletters
Schedule::command('newsletter:process-scheduled')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

// SMS wallet: Cashier off-session auto-recharge when balance is low (also dispatched after each SMS send)
Schedule::command('sms:auto-recharge-scan')
    ->everyFifteenMinutes()
    ->withoutOverlapping()
    ->runInBackground();

// Clean up old send jobs (optional)
Schedule::command('sendJobs:cleanup')
    ->daily()
    ->at('02:00');

// Send daily payment reminders for Form 1023 applications
Schedule::command('form1023:send-payment-reminders')
    ->daily()
    ->at('09:00')
    ->withoutOverlapping()
    ->runInBackground();

// Check IRS Form 990 filings monthly and send notifications
Schedule::command('irs:check-form990-filings --notify')
    ->monthly()
    ->at('03:00')
    ->withoutOverlapping()
    ->runInBackground();

// Sync IRS Form 990 board/officer members (for org claim matching). Monthly is enough — IRS data updates annually.
// Uses --queue so it only dispatches jobs; a queue worker (--queue=irs-import) must be running to process them.
Schedule::command('irs:sync-board-members --queue')
    ->monthly()
    ->at('04:00')
    ->withoutOverlapping()
    ->runInBackground();

// Kiosk: forced AI re-ingest per geo (updated links + new providers). Requires queue worker + OPENAI_API_KEY.
if (config('services.kiosk_provider_ingest.monthly_refresh_enabled', true)) {
    Schedule::command('kiosk:refresh-provider-ingest')
        ->monthlyOn(1, '5:00')
        ->withoutOverlapping()
        ->runInBackground();
}

// Clean Laravel log file when it exceeds 10MB (runs hourly)
Schedule::command('log:clean --size=10')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('service-orders:auto-complete')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();

// Care Alliance: flush pooled general-donation splits to member org owner wallets after weekly / monthly / quarterly windows
Schedule::command('care-alliance:release-pending-distributions')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();

// Organization directory invites: Believe Points installments 2–24 for referrers (month 1 credits on email verification)
Schedule::command('organizations:process-invite-believe-point-schedule')
    ->dailyAt('06:05')
    ->withoutOverlapping()
    ->runInBackground();

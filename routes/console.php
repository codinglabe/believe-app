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

Schedule::command("model:prune", ['--model' => [\App\Models\SendJob::class]])->daily()->at("03:00")->withoutOverlapping()->runInBackground();


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

// Clean Laravel log file when it exceeds 10MB (runs hourly)
Schedule::command('log:clean --size=10')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();


Schedule::command('service-orders:auto-complete')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();

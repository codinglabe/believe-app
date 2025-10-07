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

// Clean up old send jobs (optional)
Schedule::command('sendJobs:cleanup')
    ->daily()
    ->at('02:00');

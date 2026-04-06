<?php

namespace App\Console\Commands;

use App\Models\SendJob;
use Illuminate\Console\Command;

class CleanupSendJobs extends Command
{
    protected $signature = 'sendJobs:cleanup {--days=30 : Number of days to keep}';
    protected $description = 'Clean up old send jobs';

    public function handle()
    {
        $days = $this->option('days');
        $date = now()->subDays($days);

        $deleted = SendJob::where('created_at', '<', $date)
            ->where('status', 'sent')
            ->delete();

        $this->info("Cleaned up {$deleted} old send jobs older than {$days} days.");

        return Command::SUCCESS;
    }
}

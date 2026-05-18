<?php

namespace App\Console\Commands;

use App\Services\Streaming\StreamingLifecycleService;
use Illuminate\Console\Command;

class StreamingReconcileLifecycle extends Command
{
    protected $signature = 'streaming:reconcile-lifecycle';

    protected $description = 'Fail or stop stuck streaming jobs (ECS DescribeTasks, timeouts, heartbeats, orphaned rows)';

    public function handle(StreamingLifecycleService $lifecycle): int
    {
        $count = $lifecycle->reconcileAll();

        $this->info("Reconciled {$count} streaming job(s).");

        return self::SUCCESS;
    }
}

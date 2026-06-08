<?php

namespace App\Console\Commands;

use App\Services\UnityCallService;
use Illuminate\Console\Command;

class ExpireUnityCalls extends Command
{
    protected $signature = 'unity-calls:expire-ringing';

    protected $description = 'Mark expired ringing chat audio calls as missed and tear down rooms';

    public function handle(UnityCallService $calls): int
    {
        $count = $calls->expireRingingCalls();
        if ($count > 0) {
            $this->info("Expired {$count} ringing call(s).");
        }

        return self::SUCCESS;
    }
}

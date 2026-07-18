<?php

namespace App\Console\Commands;

use App\Services\BelievePointGiftInviteService;
use Illuminate\Console\Command;

class ExpireBelievePointGiftInvitesCommand extends Command
{
    protected $signature = 'believe-points:expire-gift-invites {--limit=200 : Max invites to process}';

    protected $description = 'Refund Holding Believe Points for expired gift invites that were never claimed';

    public function handle(BelievePointGiftInviteService $service): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $count = $service->expireDueInvites($limit);
        $this->info("Expired {$count} Believe Point gift invite(s).");

        return self::SUCCESS;
    }
}

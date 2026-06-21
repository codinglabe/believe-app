<?php

namespace App\Console\Commands;

use App\Enums\GiftCardStatus;
use App\Jobs\FulfillGiftCardRedemptionJob;
use App\Models\GiftCard;
use Illuminate\Console\Command;

class ProcessDueGiftCardFulfillmentsCommand extends Command
{
    protected $signature = 'gift-cards:fulfill-due {--limit=100 : Maximum redemptions to queue per run}';

    protected $description = 'Queue Believe Points gift card redemptions that are due for Phaze fulfillment';

    public function handle(): int
    {
        $limit = max(1, (int) $this->option('limit'));

        $dueIds = GiftCard::query()
            ->where('payment_method', 'believe_points')
            ->where('status', GiftCardStatus::PendingFulfillment->value)
            ->whereNotNull('scheduled_fulfillment_at')
            ->where('scheduled_fulfillment_at', '<=', now())
            ->orderBy('scheduled_fulfillment_at')
            ->limit($limit)
            ->pluck('id');

        $queued = 0;

        foreach ($dueIds as $giftCardId) {
            FulfillGiftCardRedemptionJob::dispatch((int) $giftCardId);
            $queued++;
        }

        $this->info("Queued {$queued} gift card fulfillment job(s).");

        return self::SUCCESS;
    }
}

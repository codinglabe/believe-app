<?php

namespace App\Jobs;

use App\Services\GiftCardRedemptionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class FulfillGiftCardRedemptionJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $uniqueFor = 3600;

    public function __construct(
        public int $giftCardId,
        public bool $adminRetry = false,
    ) {}

    public function uniqueId(): string
    {
        return 'fulfill-gift-card-'.$this->giftCardId;
    }

    public function handle(GiftCardRedemptionService $redemptionService): void
    {
        try {
            $redemptionService->fulfill($this->giftCardId, $this->adminRetry);
        } catch (\Throwable $e) {
            Log::error('FulfillGiftCardRedemptionJob failed', [
                'gift_card_id' => $this->giftCardId,
                'message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}

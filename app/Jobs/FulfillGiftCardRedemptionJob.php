<?php

namespace App\Jobs;

use App\Services\GiftCardRedemptionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Concurrency is enforced in GiftCardRedemptionService via lockForUpdate +
 * fulfillment_locked_at. Do not use ShouldBeUnique here — it silently drops
 * admin "Fulfill now" dispatches while a delayed job lock is still held.
 */
class FulfillGiftCardRedemptionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $giftCardId,
        public bool $adminRetry = false,
    ) {}

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

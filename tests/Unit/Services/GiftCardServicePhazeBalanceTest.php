<?php

namespace Tests\Unit\Services;

use App\Services\GiftCardService;
use Tests\TestCase;

class GiftCardServicePhazeBalanceTest extends TestCase
{
    public function test_purchase_successful_when_phaze_returns_pending_without_error(): void
    {
        $service = new GiftCardService;

        $this->assertTrue($service->isPurchaseSuccessful([
            'id' => 'phaze-txn-1',
            'status' => 'pending',
        ]));
    }

    public function test_purchase_not_successful_when_phaze_returns_http_error(): void
    {
        $service = new GiftCardService;

        $this->assertFalse($service->isPurchaseSuccessful([
            'httpStatusCode' => 402,
            'error' => 'Insufficient funds',
        ]));
    }
}

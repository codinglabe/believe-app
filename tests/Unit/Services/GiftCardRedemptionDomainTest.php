<?php

namespace Tests\Unit\Services;

use App\Enums\GiftCardStatus;
use App\Exceptions\GiftCardRedemptionCapacityReachedException;
use Tests\TestCase;

class GiftCardRedemptionDomainTest extends TestCase
{
    public function test_gift_card_status_labels(): void
    {
        $this->assertSame('Pending Fulfillment', GiftCardStatus::PendingFulfillment->label());
        $this->assertSame('Capacity Reached', GiftCardStatus::CapacityReached->label());
        $this->assertSame('Completed', GiftCardStatus::Completed->label());
    }

    public function test_legacy_active_is_treated_as_fulfilled(): void
    {
        $this->assertTrue(GiftCardStatus::isFulfilled('active'));
        $this->assertTrue(GiftCardStatus::isFulfilled(GiftCardStatus::Completed->value));
        $this->assertFalse(GiftCardStatus::isFulfilled(GiftCardStatus::PendingFulfillment->value));
    }

    public function test_retry_eligible_statuses(): void
    {
        $this->assertTrue(GiftCardStatus::isRetryEligible(GiftCardStatus::Failed->value));
        $this->assertTrue(GiftCardStatus::isRetryEligible(GiftCardStatus::CapacityReached->value));
        $this->assertFalse(GiftCardStatus::isRetryEligible(GiftCardStatus::PendingFulfillment->value));
    }

    public function test_force_fulfill_eligible_statuses(): void
    {
        $this->assertTrue(GiftCardStatus::isForceFulfillEligible(GiftCardStatus::PendingFulfillment->value));
        $this->assertTrue(GiftCardStatus::isForceFulfillEligible(GiftCardStatus::Processing->value));
        $this->assertFalse(GiftCardStatus::isForceFulfillEligible(GiftCardStatus::Failed->value));
        $this->assertFalse(GiftCardStatus::isForceFulfillEligible(GiftCardStatus::Completed->value));
    }

    public function test_capacity_reached_exception_user_message(): void
    {
        $exception = new GiftCardRedemptionCapacityReachedException(25.0, 10.0);

        $this->assertStringContainsString('gift card redemption capacity', strtolower($exception->userMessage()));
        $this->assertSame('Gift Card Redemption Capacity Reached', $exception->userTitle());
    }
}

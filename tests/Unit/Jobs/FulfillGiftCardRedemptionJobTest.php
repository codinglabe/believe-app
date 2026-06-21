<?php

namespace Tests\Unit\Jobs;

use App\Jobs\FulfillGiftCardRedemptionJob;
use App\Services\GiftCardRedemptionService;
use Mockery;
use Tests\TestCase;

class FulfillGiftCardRedemptionJobTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_job_delegates_to_redemption_service(): void
    {
        $service = Mockery::mock(GiftCardRedemptionService::class);
        $service->shouldReceive('fulfill')
            ->once()
            ->with(99, false);

        $this->app->instance(GiftCardRedemptionService::class, $service);

        (new FulfillGiftCardRedemptionJob(99))->handle($service);

        $this->addToAssertionCount(1);
    }

    public function test_job_passes_admin_retry_flag(): void
    {
        $service = Mockery::mock(GiftCardRedemptionService::class);
        $service->shouldReceive('fulfill')
            ->once()
            ->with(42, true);

        (new FulfillGiftCardRedemptionJob(42, adminRetry: true))->handle($service);

        $this->addToAssertionCount(1);
    }
}

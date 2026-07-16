<?php

namespace Tests\Unit\Services;

use App\Models\PhazeBalanceWallet;
use App\Services\GiftCardService;
use App\Services\PhazeBalanceService;
use Mockery;
use Tests\TestCase;

class PhazeBalanceServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_summary_includes_live_phaze_balance_with_variance(): void
    {
        $giftCardService = Mockery::mock(GiftCardService::class);
        $giftCardService->shouldReceive('getLivePrefundedBalance')
            ->once()
            ->with(100.0)
            ->andReturn([
                'available' => 95.0,
                'currency' => 'USD',
                'fetched_at' => now()->toIso8601String(),
                'error' => null,
                'variance' => -5.0,
            ]);

        $wallet = new PhazeBalanceWallet([
            'slug' => PhazeBalanceWallet::DEFAULT_SLUG,
            'available_balance' => 100,
            'total_funded' => 100,
            'total_consumed' => 0,
            'currency' => 'USD',
        ]);

        $service = Mockery::mock(PhazeBalanceService::class, [$giftCardService])->makePartial();
        $service->shouldReceive('getWallet')->andReturn($wallet);

        $summary = $service->getSummary(fetchLivePhazeBalance: true);

        $this->assertEqualsWithDelta(100.0, $summary['available_balance'], 0.01);
        $this->assertEqualsWithDelta(95.0, $summary['phaze_live']['available'], 0.01);
        $this->assertEqualsWithDelta(-5.0, $summary['phaze_live']['variance'], 0.01);
    }

    public function test_gift_card_service_extracts_live_balance_from_nested_account_status(): void
    {
        $service = new GiftCardService;

        $method = new \ReflectionMethod(GiftCardService::class, 'extractBalanceFromAccountStatus');
        $method->setAccessible(true);

        $balance = $method->invoke($service, [
            'account' => [
                'availableBalance' => 5000.25,
            ],
        ]);

        $this->assertEqualsWithDelta(5000.25, $balance, 0.01);

        // Production Phaze accountstatus shape: account.balance as numeric string.
        $productionShape = $method->invoke($service, [
            'account' => [
                'organizationName' => 'Stuttie Learning Inc',
                'baseCurrency' => 'USD',
                'balance' => '100.00',
            ],
        ]);

        $this->assertEqualsWithDelta(100.0, $productionShape, 0.01);
    }
}

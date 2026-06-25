<?php

namespace Tests\Unit\Services;

use App\Models\AdminSetting;
use App\Models\User;
use App\Services\BelievePointsPurchaseCalculationService;
use App\Services\BelievePointsPurchaseSettingsService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class BelievePointsPurchaseCalculationServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('admin_settings');
        Schema::create('admin_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string');
            $table->timestamps();
        });

        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_BRP_VALUE, 0.005, 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_PLATFORM_FEE_PERCENT, 1, 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_CARD_BRP_RATE, 2, 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_ACH_BRP_RATE, 1, 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_CARD_HOLD_HOURS, 0, 'integer');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_FREE_BRP_REWARD, 5, 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_PRIME_BRP_REWARD, 10, 'float');
    }

    public function test_platform_fee_is_percent_of_bp_amount(): void
    {
        $this->assertSame(1.0, BelievePointsPurchaseCalculationService::platformFeeUsd(100));
        $this->assertSame(0.5, BelievePointsPurchaseCalculationService::platformFeeUsd(50));
    }

    public function test_brp_earned_uses_flat_participation_rewards_by_tier(): void
    {
        $this->assertSame(5.0, BelievePointsPurchaseCalculationService::brpEarned(100, 'card'));
        $this->assertSame(5.0, BelievePointsPurchaseCalculationService::brpEarned(100, 'bank'));
    }

    public function test_card_checkout_breakdown_includes_platform_fee_and_processing_fee(): void
    {
        $breakdown = BelievePointsPurchaseCalculationService::checkoutBreakdown(100, 'card', true);

        $this->assertSame(100.0, $breakdown['bp_amount_usd']);
        $this->assertSame(1.0, $breakdown['platform_fee_usd']);
        $this->assertGreaterThan(0, $breakdown['processing_fee_usd']);
        $this->assertSame(
            round($breakdown['bp_amount_usd'] + $breakdown['platform_fee_usd'] + $breakdown['processing_fee_usd'], 2),
            $breakdown['checkout_total_usd']
        );
        $this->assertSame(5.0, $breakdown['brp_earned']);
        $this->assertStringContainsString('Processing BP', $breakdown['bp_availability']);
    }

    public function test_ach_checkout_breakdown_uses_ach_settlement_availability_label(): void
    {
        $breakdown = BelievePointsPurchaseCalculationService::checkoutBreakdown(100, 'bank', true);

        $this->assertSame(5.0, $breakdown['brp_earned']);
        $this->assertStringContainsString('Processing BP', $breakdown['bp_availability']);
    }

    public function test_fee_preview_payload_exposes_configured_brp_value(): void
    {
        $preview = BelievePointsPurchaseCalculationService::feePreviewPayload(100, 'card');

        $this->assertSame(0.005, $preview['brp_value']);
        $this->assertSame(1.0, $preview['platform_fee_percent']);
        $this->assertSame(5.0, $preview['brp_earned']);
        $this->assertSame(5.0, $preview['participation_brp_reward']);
    }
}

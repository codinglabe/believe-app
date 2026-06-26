<?php

namespace Tests\Unit\Services;

use App\Models\AdminSetting;
use App\Services\BelievePointsPurchaseCalculationService;
use App\Services\BelievePointsPurchaseSettingsService;
use App\Services\StripeProcessingFeeEstimator;
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
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_PROCESSING_FEE_PERCENT, 1, 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_FREE_BRP_AWARD, 5, 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_PRIME_BRP_AWARD, 10, 'float');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_CARD_HOLD_HOURS, 24, 'integer');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_ACH_HOLD_HOURS, 0, 'integer');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_SUPPORTER_PAYS_PROCESSING_FEE, '1', 'boolean');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_SUPPORTER_PAYS_PLATFORM_FEE, '1', 'boolean');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_CARD_SETTLEMENT_BUSINESS_DAYS, 1, 'integer');
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_ACH_SETTLEMENT_BUSINESS_DAYS, 3, 'integer');

        StripeProcessingFeeEstimator::forgetRatesCache();
    }

    public function test_platform_fee_is_percent_of_bp_amount_when_enabled(): void
    {
        $this->assertSame(1.0, BelievePointsPurchaseCalculationService::platformFeeUsd(100));
        $this->assertSame(0.5, BelievePointsPurchaseCalculationService::platformFeeUsd(50));
    }

    public function test_platform_fee_is_zero_when_supporter_does_not_pay_it(): void
    {
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_SUPPORTER_PAYS_PLATFORM_FEE, '0', 'boolean');

        $this->assertSame(0.0, BelievePointsPurchaseCalculationService::platformFeeUsd(100));
    }

    public function test_processing_fee_is_a_stripe_gross_up_over_the_funded_amount(): void
    {
        $expected = round(
            StripeProcessingFeeEstimator::grossUpCardChargeUsdForNetGiftUsd(101) - 101,
            2
        );

        $this->assertGreaterThan(0, $expected);
        $this->assertSame($expected, BelievePointsPurchaseCalculationService::processingFeeUsd(101, 'card'));
    }

    public function test_processing_fee_is_zero_when_supporter_does_not_pay_it(): void
    {
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_SUPPORTER_PAYS_PROCESSING_FEE, '0', 'boolean');

        $this->assertSame(0.0, BelievePointsPurchaseCalculationService::processingFeeUsd(101, 'card'));
    }

    public function test_brp_earned_scales_per_dollar_for_free_supporters(): void
    {
        $this->assertSame(500.0, BelievePointsPurchaseCalculationService::brpEarned(100));
        $this->assertSame(250.0, BelievePointsPurchaseCalculationService::brpEarned(50, null));
        $this->assertSame(0.0, BelievePointsPurchaseCalculationService::brpEarned(0));
    }

    public function test_brp_award_settings_expose_free_and_prime_per_dollar_rates(): void
    {
        $this->assertSame(5.0, BelievePointsPurchaseSettingsService::freeBrpAward());
        $this->assertSame(10.0, BelievePointsPurchaseSettingsService::primeBrpAward());
        $this->assertSame(5.0, BelievePointsPurchaseSettingsService::brpAwardForUser(null));
    }

    public function test_card_checkout_breakdown_includes_platform_fee_and_processing_gross_up(): void
    {
        $breakdown = BelievePointsPurchaseCalculationService::checkoutBreakdown(100, 'card');

        $expectedProcessing = round(
            StripeProcessingFeeEstimator::grossUpCardChargeUsdForNetGiftUsd(101) - 101,
            2
        );

        $this->assertSame(100.0, $breakdown['bp_amount_usd']);
        $this->assertSame(1.0, $breakdown['platform_fee_usd']);
        $this->assertSame($expectedProcessing, $breakdown['processing_fee_usd']);
        $this->assertSame(
            round($breakdown['bp_amount_usd'] + $breakdown['platform_fee_usd'] + $breakdown['processing_fee_usd'], 2),
            $breakdown['checkout_total_usd']
        );
        $this->assertSame(500.0, $breakdown['brp_earned']);
        $this->assertStringContainsString('Processing BP', $breakdown['bp_availability']);
        $this->assertStringContainsString('24-hour security hold', $breakdown['bp_availability']);
    }

    public function test_trusted_card_checkout_breakdown_is_available_immediately(): void
    {
        $breakdown = BelievePointsPurchaseCalculationService::checkoutBreakdown(100, 'card', null, true);

        $this->assertSame('Available immediately', $breakdown['bp_availability']);
    }

    public function test_ach_checkout_breakdown_uses_ach_settlement_availability_label(): void
    {
        $breakdown = BelievePointsPurchaseCalculationService::checkoutBreakdown(100, 'bank');

        $this->assertSame(500.0, $breakdown['brp_earned']);
        $this->assertStringContainsString('Processing BP', $breakdown['bp_availability']);
        $this->assertStringContainsString('3 business days', $breakdown['bp_availability']);
    }

    public function test_ach_checkout_breakdown_includes_configured_ach_hold(): void
    {
        AdminSetting::set(BelievePointsPurchaseSettingsService::KEY_ACH_HOLD_HOURS, 48, 'integer');

        $breakdown = BelievePointsPurchaseCalculationService::checkoutBreakdown(100, 'bank');

        $this->assertStringContainsString('48-hour hold', $breakdown['bp_availability']);
    }

    public function test_fee_preview_payload_exposes_configured_settings(): void
    {
        $preview = BelievePointsPurchaseCalculationService::feePreviewPayload(100, 'card');

        $this->assertSame(0.005, $preview['brp_value']);
        $this->assertSame(1.0, $preview['platform_fee_percent']);
        $this->assertSame(5.0, $preview['free_brp_award']);
        $this->assertSame(10.0, $preview['prime_brp_award']);
        $this->assertSame(5.0, $preview['brp_award']);
        $this->assertSame(24, $preview['card_hold_hours']);
        $this->assertSame(24, $preview['new_card_hold_hours']);
        $this->assertSame(0, $preview['ach_hold_hours']);
        $this->assertTrue($preview['supporter_pays_processing_fee']);
        $this->assertTrue($preview['supporter_pays_platform_fee']);
        $this->assertSame(1, $preview['card_settlement_business_days']);
        $this->assertSame(3, $preview['ach_settlement_business_days']);
        $this->assertSame(500.0, $preview['brp_earned']);
    }
}

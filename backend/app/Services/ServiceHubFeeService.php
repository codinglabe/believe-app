<?php

namespace App\Services;

use App\Models\AdminSetting;
use App\Models\StateSalesTax;
use App\Models\NonprofitExemptionCertificate;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class ServiceHubFeeService
{
    /**
     * Get platform fee percentage (default 5.5%)
     * Checks admin settings first, then falls back to env
     */
    public static function getPlatformFeePercentage(): float
    {
        $setting = AdminSetting::get('service_hub_platform_fee_percentage');

        if ($setting !== null) {
            return (float) $setting;
        }

        return (float) config('services.service_hub.platform_fee_percentage', 5.5);
    }

    /**
     * Get Stripe transaction fee percentage (default 3%)
     */
    public static function getStripeTransactionFeePercentage(): float
    {
        $setting = AdminSetting::get('service_hub_stripe_transaction_fee_percentage');

        if ($setting !== null) {
            return (float) $setting;
        }

        return (float) config('services.service_hub.stripe_transaction_fee_percentage', 3.0);
    }

    /**
     * Get Believe Points transaction fee percentage (default 1%)
     */
    public static function getBelievePointsTransactionFeePercentage(): float
    {
        $setting = AdminSetting::get('service_hub_believe_points_transaction_fee_percentage');

        if ($setting !== null) {
            return (float) $setting;
        }

        return (float) config('services.service_hub.believe_points_transaction_fee_percentage', 1.0);
    }

    /**
     * Get monthly advertising fee (default $2)
     */
    public static function getMonthlyAdvertisingFee(): float
    {
        $setting = AdminSetting::get('service_hub_monthly_advertising_fee');

        if ($setting !== null) {
            return (float) $setting;
        }

        return (float) config('services.service_hub.monthly_advertising_fee', 2.00);
    }

    /**
     * Get sales tax rate for a state
     */
    public static function getSalesTaxRate(?string $stateCode): float
    {
        if (!$stateCode) {
            return 0.0;
        }

        $stateTax = StateSalesTax::where('state_code', strtoupper($stateCode))->first();

        if ($stateTax) {
            return (float) $stateTax->base_sales_tax_rate;
        }

        return 0.0;
    }

    /**
     * Check if a buyer qualifies for nonprofit sales tax exemption
     *
     * @param User|null $buyer The buyer user
     * @param string|null $buyerState The buyer's state code
     * @param bool $isCharitableUse Whether the purchase is for charitable use
     * @param bool $isService Whether the purchase is a service (vs tangible goods)
     * @return bool True if exempt, false otherwise
     */
    public static function qualifiesForExemption(
        ?User $buyer,
        ?string $buyerState,
        bool $isCharitableUse = true,
        bool $isService = true
    ): bool {
        // If no buyer or state, no exemption
        if (!$buyer || !$buyerState) {
            return false;
        }

        // Check if buyer has an organization (nonprofit)
        $organization = $buyer->organization;
        if (!$organization) {
            return false;
        }

        // Get state tax info
        $stateTax = StateSalesTax::where('state_code', strtoupper($buyerState))->first();
        if (!$stateTax) {
            return false;
        }

        // Check if state has exemption status
        $hasExemptionStatus = in_array($stateTax->sales_tax_status, [
            'exempt',
            'exempt_limited',
            'refund_based'
        ]);

        if (!$hasExemptionStatus) {
            return false;
        }

        // Check if purchase qualifies as charitable use
        if (!$isCharitableUse) {
            return false;
        }

        // Check if purchase type is eligible
        // Services are typically eligible, but check state rules
        if ($isService) {
            // Services are generally eligible if state allows
            // For tangible goods only states, services might still be exempt
            if ($stateTax->services_vs_goods === 'tangible_goods_only' && !$isService) {
                return false;
            }
        } else {
            // For tangible goods, check if state allows exemption
            if ($stateTax->services_vs_goods === 'tangible_goods_only') {
                // Goods are taxable, but might still be exempt for nonprofits
            }
        }

        // Check if exemption certificate is required and exists
        if ($stateTax->requires_exemption_certificate) {
            $certificate = NonprofitExemptionCertificate::where('user_id', $buyer->id)
                ->where('state_code', strtoupper($buyerState))
                ->where('status', 'approved')
                ->where(function ($query) {
                    $query->whereNull('expiry_date')
                        ->orWhere('expiry_date', '>=', now());
                })
                ->first();

            if (!$certificate || !$certificate->isValid()) {
                return false;
            }
        }

        // All conditions met
        return true;
    }

    /**
     * Calculate all fees for a service order
     *
     * @param float $orderAmount Base order amount
     * @param string $paymentMethod 'stripe' or 'believe_points'
     * @param string|null $sellerState State code for sales tax (seller's state)
     * @param bool $gigAcceptsBelievePoints Whether the gig accepts Believe Points
     * @param User|null $buyer The buyer user (for exemption check)
     * @param bool $isCharitableUse Whether the purchase is for charitable use (default: true for services)
     * @return array ['platform_fee', 'transaction_fee', 'sales_tax', 'sales_tax_rate', 'total_buyer_pays', 'seller_earnings', 'is_exempt']
     */
    public static function calculateFees(
        float $orderAmount,
        string $paymentMethod,
        ?string $sellerState = null,
        bool $gigAcceptsBelievePoints = false,
        ?User $buyer = null,
        bool $isCharitableUse = true
    ): array {
        // Platform fee (deducted from seller)
        $platformFeePercentage = self::getPlatformFeePercentage();
        $platformFee = ($orderAmount * $platformFeePercentage) / 100;

        // Transaction fee (deducted from seller)
        if ($paymentMethod === 'believe_points') {
            if (!$gigAcceptsBelievePoints) {
                throw new \Exception('This gig does not accept Believe Points payments.');
            }
            $transactionFeePercentage = self::getBelievePointsTransactionFeePercentage();
        } else {
            $transactionFeePercentage = self::getStripeTransactionFeePercentage();
        }
        $transactionFee = ($orderAmount * $transactionFeePercentage) / 100;

        // Check if buyer qualifies for nonprofit exemption
        $isExempt = false;
        $salesTaxRate = 0.0;
        $salesTax = 0.0;

        if ($buyer && $sellerState) {
            // Check exemption (using seller's state for sales tax calculation)
            $isExempt = self::qualifiesForExemption(
                $buyer,
                $sellerState,
                $isCharitableUse,
                true // Services are typically eligible
            );

            if (!$isExempt) {
                // Apply sales tax if not exempt
                $salesTaxRate = self::getSalesTaxRate($sellerState);
                $salesTax = ($orderAmount * $salesTaxRate) / 100;
            }
        } else if ($sellerState) {
            // No buyer info, apply sales tax
            $salesTaxRate = self::getSalesTaxRate($sellerState);
            $salesTax = ($orderAmount * $salesTaxRate) / 100;
        }

        // Calculate totals
        // Buyer pays only the service amount (no fees, no sales tax)
        $totalBuyerPays = $orderAmount;
        // Seller pays: platform fee + transaction fee + sales tax (all deducted from earnings)
        $sellerEarnings = $orderAmount - $platformFee - $transactionFee - $salesTax;

        return [
            'platform_fee' => round($platformFee, 2),
            'platform_fee_percentage' => $platformFeePercentage,
            'transaction_fee' => round($transactionFee, 2),
            'transaction_fee_percentage' => $transactionFeePercentage,
            'sales_tax' => round($salesTax, 2),
            'sales_tax_rate' => $salesTaxRate,
            'total_buyer_pays' => round($totalBuyerPays, 2),
            'seller_earnings' => round($sellerEarnings, 2),
            'is_exempt' => $isExempt,
        ];
    }

    /**
     * Get fee breakdown for display
     */
    public static function getFeeBreakdown(
        float $orderAmount,
        string $paymentMethod,
        ?string $sellerState = null,
        bool $gigAcceptsBelievePoints = false,
        ?User $buyer = null,
        bool $isCharitableUse = true
    ): array {
        $fees = self::calculateFees(
            $orderAmount,
            $paymentMethod,
            $sellerState,
            $gigAcceptsBelievePoints,
            $buyer,
            $isCharitableUse
        );

        return [
            'order_amount' => $orderAmount,
            'platform_fee' => $fees['platform_fee'],
            'platform_fee_percentage' => $fees['platform_fee_percentage'],
            'transaction_fee' => $fees['transaction_fee'],
            'transaction_fee_percentage' => $fees['transaction_fee_percentage'],
            'transaction_fee_discount' => $paymentMethod === 'believe_points'
                ? ($fees['transaction_fee_percentage'] - self::getStripeTransactionFeePercentage())
                : 0,
            'sales_tax' => $fees['sales_tax'],
            'sales_tax_rate' => $fees['sales_tax_rate'],
            'total_buyer_pays' => $fees['total_buyer_pays'],
            'seller_earnings' => $fees['seller_earnings'],
            'payment_method' => $paymentMethod,
            'is_exempt' => $fees['is_exempt'] ?? false,
        ];
    }
}


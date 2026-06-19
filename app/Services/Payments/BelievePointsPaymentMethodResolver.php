<?php

namespace App\Services\Payments;

use App\Enums\DonationPaymentMethod;
use App\Models\BelievePointsPaymentSetting;
use App\Models\PaymentMethod;

class BelievePointsPaymentMethodResolver
{
    public static function stripePlatformConfigured(): bool
    {
        return OrganizationPaymentMethodResolver::stripePlatformConfigured();
    }

    public static function paypalPlatformConfigured(): bool
    {
        return OrganizationPaymentMethodResolver::paypalPlatformConfigured();
    }

    /**
     * @return array<string, bool>
     */
    public static function availableMethods(): array
    {
        $settings = BelievePointsPaymentSetting::instance();
        $enabled = $settings->enabledMethodsMap();

        $stripeConfigured = self::stripePlatformConfigured();
        $paypalConfigured = self::paypalPlatformConfigured();

        return [
            'stripe_card' => $enabled['stripe_card'] && $stripeConfigured,
            'stripe_ach' => $enabled['stripe_ach'] && $stripeConfigured,
            'venmo' => $enabled['venmo'] && $stripeConfigured,
            'venmo_manual' => $enabled['venmo_manual'] && filled($settings->venmo_username),
            'cash_app_pay' => $enabled['cash_app_pay'] && $stripeConfigured,
            'paypal' => $enabled['paypal'] && $paypalConfigured,
            'cashapp' => $enabled['cashapp'] && (
                filled($settings->cashapp_qr_image) || filled($settings->cashapp_cashtag)
            ),
            'zelle' => $enabled['zelle'] && (
                filled($settings->zelle_email) && filled($settings->zelle_phone)
            ),
        ];
    }

    public static function assertMethodAllowed(string $method): void
    {
        $available = self::availableMethods();
        if (! ($available[$method] ?? false)) {
            abort(422, "Payment method \"{$method}\" is not available for Believe Points purchases.");
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function manualPaymentInstructions(string $method): array
    {
        $settings = BelievePointsPaymentSetting::instance();

        if ($method === 'cashapp') {
            return [
                'type' => 'cashapp',
                'cashtag' => $settings->cashapp_cashtag,
                'qr_image_url' => $settings->cashapp_qr_image
                    ? asset('storage/'.$settings->cashapp_qr_image)
                    : null,
                'wallet_info' => $settings->payment_instructions,
            ];
        }

        if ($method === 'zelle') {
            return [
                'type' => 'zelle',
                'email' => $settings->zelle_email,
                'phone' => $settings->zelle_phone,
                'wallet_info' => $settings->payment_instructions,
            ];
        }

        if ($method === 'venmo_manual') {
            return [
                'type' => 'venmo_manual',
                'username' => $settings->venmo_username,
                'wallet_info' => $settings->payment_instructions,
            ];
        }

        return [];
    }

    public static function isManualMethod(string $method): bool
    {
        $enum = DonationPaymentMethod::tryFromInput($method);

        return $enum?->isManual() ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public static function settingsPayload(BelievePointsPaymentSetting $settings): array
    {
        return [
            'stripe_card_enabled' => $settings->stripe_card_enabled,
            'stripe_ach_enabled' => $settings->stripe_ach_enabled,
            'stripe_venmo_enabled' => $settings->stripe_venmo_enabled,
            'venmo_manual_enabled' => $settings->venmo_manual_enabled,
            'venmo_username' => $settings->venmo_username,
            'stripe_cash_app_pay_enabled' => $settings->stripe_cash_app_pay_enabled,
            'paypal_enabled' => $settings->paypal_enabled,
            'cashapp_manual_enabled' => $settings->cashapp_manual_enabled,
            'zelle_enabled' => $settings->zelle_enabled,
            'cashapp_cashtag' => $settings->cashapp_cashtag,
            'cashapp_qr_image_url' => $settings->cashapp_qr_image
                ? asset('storage/'.$settings->cashapp_qr_image)
                : null,
            'zelle_email' => $settings->zelle_email,
            'zelle_phone' => $settings->zelle_phone,
            'payment_instructions' => $settings->payment_instructions,
        ];
    }
}

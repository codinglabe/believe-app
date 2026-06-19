<?php

namespace App\Services\Payments;

use App\Models\Organization;
use App\Models\OrganizationPaymentSetting;
use App\Models\PaymentMethod;

class OrganizationPaymentMethodResolver
{
    public static function stripePlatformConfigured(): bool
    {
        $stripe = PaymentMethod::getConfig('stripe');
        if ($stripe === null) {
            return false;
        }

        return filled($stripe->test_secret_key) || filled($stripe->live_secret_key);
    }

    public static function paypalPlatformConfigured(): bool
    {
        $paypal = PaymentMethod::getConfig('paypal');

        return $paypal !== null
            && filled($paypal->client_id)
            && filled($paypal->client_secret);
    }

    /**
     * @return array<string, bool>
     */
    public static function availableMethodsForOrganization(Organization $organization): array
    {
        $settings = OrganizationPaymentSetting::forOrganization($organization->id);
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
            'believe_points' => true,
        ];
    }

    public static function assertMethodAllowed(Organization $organization, string $method): void
    {
        $available = self::availableMethodsForOrganization($organization);
        if (! ($available[$method] ?? false)) {
            abort(422, "Payment method \"{$method}\" is not available for this organization.");
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function manualPaymentInstructions(Organization $organization, string $method): array
    {
        $settings = OrganizationPaymentSetting::forOrganization($organization->id);

        if ($method === 'cashapp') {
            return [
                'type' => 'cashapp',
                'cashtag' => $settings->cashapp_cashtag,
                'qr_image_url' => $settings->cashapp_qr_image
                    ? asset('storage/'.$settings->cashapp_qr_image)
                    : null,
                'wallet_info' => $settings->donation_wallet_info,
            ];
        }

        if ($method === 'zelle') {
            return [
                'type' => 'zelle',
                'email' => $settings->zelle_email,
                'phone' => $settings->zelle_phone,
                'wallet_info' => $settings->donation_wallet_info,
            ];
        }

        if ($method === 'venmo_manual') {
            return [
                'type' => 'venmo_manual',
                'username' => $settings->venmo_username,
                'wallet_info' => $settings->donation_wallet_info,
            ];
        }

        return [];
    }
}

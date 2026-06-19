<?php

namespace App\Support;

use App\Models\PaymentMethod;
use Srmklive\PayPal\Services\PayPal as PayPalClient;

class PayPalClientBuilder
{
    /**
     * Build PayPal SDK credentials from admin payment method settings.
     *
     * Credentials must be passed to the PayPal client constructor. Instantiating
     * PayPalClient with no config loads empty values from config/paypal.php (.env),
     * which throws before setApiCredentials() can run.
     *
     * @return array<string, mixed>
     */
    public static function credentials(PaymentMethod $paypalConfig): array
    {
        $clientId = trim((string) $paypalConfig->client_id);
        $clientSecret = trim((string) $paypalConfig->client_secret);
        $mode = in_array($paypalConfig->mode_environment, ['sandbox', 'live'], true)
            ? $paypalConfig->mode_environment
            : 'sandbox';

        $environmentCredentials = [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'app_id' => $clientId,
        ];

        return [
            'mode' => $mode,
            'sandbox' => $environmentCredentials,
            'live' => $environmentCredentials,
            'payment_action' => config('paypal.payment_action', 'Sale'),
            'currency' => config('paypal.currency', 'USD'),
            'notify_url' => config('paypal.notify_url', ''),
            'locale' => config('paypal.locale', 'en_US'),
            'validate_ssl' => (bool) config('paypal.validate_ssl', true),
        ];
    }

    public static function make(PaymentMethod $paypalConfig): PayPalClient
    {
        $provider = new PayPalClient(self::credentials($paypalConfig));
        $tokenResponse = $provider->getAccessToken();

        if (! isset($tokenResponse['access_token'])) {
            $description = $tokenResponse['error_description']
                ?? $tokenResponse['error']['error_description']
                ?? 'PayPal authentication failed. Check Client ID, Secret, and Environment (Sandbox vs Live).';

            throw new \RuntimeException($description);
        }

        return $provider;
    }
}

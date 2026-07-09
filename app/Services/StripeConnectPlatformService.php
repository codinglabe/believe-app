<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;
use Throwable;

/**
 * Verifies whether the platform Stripe account has Connect enabled.
 *
 * Stripe does not expose an API to *enable* Connect — the platform admin must complete
 * the one-time Connect setup in the Stripe Dashboard. We can probe readiness by
 * attempting a throwaway Standard account create (then deleting it).
 */
final class StripeConnectPlatformService
{
    public static function connectDashboardUrl(string $environment): string
    {
        return StripeConfigService::isLiveEnvironment($environment)
            ? 'https://dashboard.stripe.com/connect'
            : 'https://dashboard.stripe.com/test/connect';
    }

    public static function connectTasklistUrl(string $environment): string
    {
        return StripeConfigService::isLiveEnvironment($environment)
            ? 'https://dashboard.stripe.com/connect/tasklist'
            : 'https://dashboard.stripe.com/test/connect/tasklist';
    }

    /**
     * @return array{ready: bool, error: string|null, probe_account_id: string|null}
     */
    public static function probeConnectReady(string $secretKey, string $environment): array
    {
        $secretKey = trim($secretKey);
        if ($secretKey === '') {
            return ['ready' => false, 'error' => 'Stripe secret key is missing.', 'probe_account_id' => null];
        }

        $country = strtoupper((string) config('donations.stripe_connect_default_country', 'US'));
        if ($country === '' || strlen($country) !== 2) {
            $country = 'US';
        }

        try {
            $stripe = new StripeClient(['api_key' => $secretKey]);
            $account = $stripe->accounts->create([
                'type' => 'standard',
                'country' => $country,
                'email' => 'connect-probe+'.time().'@believeinunity.invalid',
                'capabilities' => [
                    'card_payments' => ['requested' => true],
                    'transfers' => ['requested' => true],
                ],
                'metadata' => [
                    'biu_connect_probe' => '1',
                    'environment' => $environment,
                ],
            ]);

            $probeAccountId = (string) ($account->id ?? '');
            if ($probeAccountId !== '') {
                try {
                    $stripe->accounts->delete($probeAccountId);
                } catch (Throwable $deleteError) {
                    Log::warning('Stripe Connect probe account could not be deleted', [
                        'environment' => $environment,
                        'account_id' => $probeAccountId,
                        'error' => $deleteError->getMessage(),
                    ]);
                }
            }

            return ['ready' => true, 'error' => null, 'probe_account_id' => $probeAccountId !== '' ? $probeAccountId : null];
        } catch (ApiErrorException $e) {
            return [
                'ready' => false,
                'error' => self::humanizeConnectProbeError($e, $environment),
                'probe_account_id' => null,
            ];
        } catch (Throwable $e) {
            return [
                'ready' => false,
                'error' => 'Could not verify Stripe Connect: '.$e->getMessage(),
                'probe_account_id' => null,
            ];
        }
    }

    public static function humanizeConnectProbeError(ApiErrorException $e, string $environment): string
    {
        $msg = (string) $e->getMessage();
        $lower = strtolower($msg);
        $dashboardUrl = self::connectDashboardUrl($environment);

        if (str_contains($lower, 'signed up for connect') || str_contains($lower, 'enable connect')) {
            return 'Stripe Connect is not enabled on this platform account. Open '.$dashboardUrl.' and click Get started under “For platforms”, then complete your platform profile (one-time setup in Stripe).';
        }

        if (str_contains($lower, 'platform profile') || str_contains($lower, 'complete your')) {
            return 'Stripe Connect platform profile is incomplete. Finish setup at '.self::connectTasklistUrl($environment).' then save these settings again.';
        }

        if (str_contains($lower, 'branding') || str_contains($lower, 'icon')) {
            return 'Stripe Connect branding is incomplete (business name/icon required). Add branding at https://dashboard.stripe.com/settings/connect then save again.';
        }

        return $msg;
    }

    /**
     * @param  array<string, mixed>|null  $stored
     * @return array{ready: bool, error: string|null, dashboard_url: string, tasklist_url: string, checked_at: string|null}
     */
    public static function summaryForEnvironment(?array $stored, string $environment): array
    {
        return [
            'ready' => (bool) ($stored['ready'] ?? false),
            'error' => isset($stored['error']) && is_string($stored['error']) && $stored['error'] !== ''
                ? $stored['error']
                : null,
            'dashboard_url' => self::connectDashboardUrl($environment),
            'tasklist_url' => self::connectTasklistUrl($environment),
            'checked_at' => isset($stored['checked_at']) && is_string($stored['checked_at'])
                ? $stored['checked_at']
                : null,
        ];
    }
}

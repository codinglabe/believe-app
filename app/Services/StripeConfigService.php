<?php

namespace App\Services;

use App\Models\PaymentMethod;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use Laravel\Cashier\Cashier;

class StripeConfigService
{
    /**
     * Resolve the credential bucket for a Stripe environment.
     */
    public static function credentialPrefix(string $environment): string
    {
        return match (strtolower(trim($environment))) {
            'live' => 'live',
            'test' => 'test',
            default => 'sandbox',
        };
    }

    public static function isLiveEnvironment(string $environment): bool
    {
        return self::credentialPrefix($environment) === 'live';
    }

    /**
     * Get Stripe credentials from database based on environment
     *
     * @param string $environment 'sandbox', 'test', or 'live'
     * @return array|null Returns ['publishable_key' => ..., 'secret_key' => ..., 'webhook_secret' => ...] or null
     */
    public static function getCredentials(string $environment = 'sandbox'): ?array
    {
        try {
            $stripe = PaymentMethod::getConfig('stripe');

            if (!$stripe) {
                return null;
            }

            $prefix = self::credentialPrefix($environment);
            $publishableKey = $stripe->{"{$prefix}_publishable_key"};
            $secretKey = $stripe->{"{$prefix}_secret_key"};
            $webhookSecret = $stripe->{"{$prefix}_webhook_secret"};

            // Legacy: sandbox mode previously stored keys under test_* columns.
            if ($prefix === 'sandbox' && (empty($publishableKey) || empty($secretKey))) {
                $publishableKey = $publishableKey ?: $stripe->test_publishable_key;
                $secretKey = $secretKey ?: $stripe->test_secret_key;
                $webhookSecret = $webhookSecret ?: $stripe->test_webhook_secret;
            }

            // If no credentials found, return null (will fallback to .env)
            if (empty($publishableKey) || empty($secretKey)) {
                return null;
            }

            return [
                'publishable_key' => $publishableKey,
                'secret_key' => $secretKey,
                'webhook_secret' => $webhookSecret,
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get Stripe credentials from database', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Get the current Stripe environment from database
     *
     * @return string 'sandbox', 'test', or 'live'
     */
    public static function getEnvironment(): string
    {
        try {
            $stripe = PaymentMethod::getConfig('stripe');
            $environment = strtolower(trim((string) ($stripe->mode_environment ?? 'sandbox')));

            return in_array($environment, ['sandbox', 'test', 'live'], true) ? $environment : 'sandbox';
        } catch (\Exception $e) {
            return 'sandbox';
        }
    }

    /**
     * Donation product column for the given environment.
     */
    public static function donationProductColumn(string $environment): string
    {
        return self::credentialPrefix($environment).'_donation_product_id';
    }

    /**
     * Read stored donation product id, with legacy sandbox → test fallback.
     */
    public static function getStoredDonationProductId(PaymentMethod $stripe, string $environment): ?string
    {
        $column = self::donationProductColumn($environment);
        $productId = $stripe->{$column};

        if ($column === 'sandbox_donation_product_id' && empty($productId)) {
            $productId = $stripe->test_donation_product_id;
        }

        return $productId ?: null;
    }

    /**
     * Account ID column for the given environment.
     */
    public static function accountIdColumn(string $environment): string
    {
        return self::credentialPrefix($environment).'_account_id';
    }

    /**
     * Resolve Stripe platform account ID (acct_...) using stored credentials.
     */
    public static function resolveAccountId(string $environment): ?string
    {
        $credentials = self::getCredentials($environment);

        if (! $credentials || empty($credentials['secret_key'])) {
            return null;
        }

        return self::resolveAccountIdWithSecretKey($credentials['secret_key']);
    }

    /**
     * Resolve Stripe platform account ID directly from a secret key.
     */
    public static function resolveAccountIdWithSecretKey(string $secretKey): ?string
    {
        $secretKey = trim($secretKey);

        if ($secretKey === '') {
            return null;
        }

        try {
            $stripe = new \Stripe\StripeClient(['api_key' => $secretKey]);
            $account = $stripe->accounts->retrieve();

            $accountId = $account->id ?? null;

            return is_string($accountId) && str_starts_with($accountId, 'acct_') ? $accountId : null;
        } catch (\Throwable $e) {
            Log::warning('Failed to resolve Stripe account ID', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Configure Stripe API with database credentials using Laravel Cashier
     * 
     * @param string|null $environment Optional environment override
     * @return bool Returns true if configured, false otherwise
     */
    public static function configureStripe(?string $environment = null): bool
    {
        $env = $environment ?? self::getEnvironment();
        $credentials = self::getCredentials($env);

        if ($credentials && !empty($credentials['secret_key'])) {
            try {
                // Use Cashier's configuration system instead of direct Stripe API
                Config::set('cashier.secret', $credentials['secret_key']);
                Config::set('cashier.key', $credentials['publishable_key'] ?? '');
                
                // Override webhook secret if available
                if (!empty($credentials['webhook_secret'])) {
                    Config::set('cashier.webhook.secret', $credentials['webhook_secret']);
                }
                
                return true;
            } catch (\Exception $e) {
                Log::error('Failed to configure Stripe via Cashier', [
                    'error' => $e->getMessage(),
                ]);
                return false;
            }
        }

        return false;
    }

    /**
     * Get Stripe publishable key for frontend
     * 
     * @param string|null $environment Optional environment override
     * @return string|null
     */
    public static function getPublishableKey(?string $environment = null): ?string
    {
        $env = $environment ?? self::getEnvironment();
        $credentials = self::getCredentials($env);
        return $credentials['publishable_key'] ?? null;
    }

    /**
     * Get or create donation product ID for the given environment
     * 
     * @param string|null $environment Optional environment override
     * @return string|null
     */
    public static function getDonationProductId(?string $environment = null): ?string
    {
        try {
            $env = $environment ?? self::getEnvironment();
            $stripe = PaymentMethod::getConfig('stripe');
            
            if (!$stripe) {
                return null;
            }

            // Get product ID based on environment
            $productId = self::getStoredDonationProductId($stripe, $env);

            // If product ID exists, verify it's still valid
            if ($productId) {
                try {
                    // Configure Cashier with the correct credentials
                    self::configureStripe($env);
                    
                    // Use Cashier's Stripe client
                    $stripeClient = Cashier::stripe();
                    $stripeClient->products->retrieve($productId);
                        return $productId;
                } catch (\Exception $e) {
                    // Product doesn't exist, create new one
                    Log::warning("Donation product ID {$productId} is invalid, creating new one", [
                        'environment' => $env,
                    ]);
                }
            }

            // Create new donation product if it doesn't exist
            $credentials = self::getCredentials($env);
            if (!$credentials || empty($credentials['secret_key'])) {
                return null;
            }

            // Configure Cashier with the correct credentials
            self::configureStripe($env);
            
            // Use Cashier's Stripe client
            $stripeClient = Cashier::stripe();
            $product = $stripeClient->products->create([
                'name' => 'Donations',
                'description' => 'Recurring donations to organizations',
            ]);

            // Save the product ID
            $updateData = [self::donationProductColumn($env) => $product->id];
            
            $stripe->update($updateData);

            Log::info("Created new donation product for {$env} environment", [
                'product_id' => $product->id,
            ]);

            return $product->id;
        } catch (\Exception $e) {
            Log::error('Failed to get/create donation product ID', [
                'environment' => $environment ?? self::getEnvironment(),
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}


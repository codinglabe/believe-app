<?php

namespace App\Services;

use App\Models\PaymentMethod;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use Laravel\Cashier\Cashier;

class StripeConfigService
{
    /**
     * Get Stripe credentials from database based on environment
     * 
     * @param string $environment 'sandbox' or 'live'
     * @return array|null Returns ['publishable_key' => ..., 'secret_key' => ..., 'webhook_secret' => ...] or null
     */
    public static function getCredentials(string $environment = 'sandbox'): ?array
    {
        try {
            $stripe = PaymentMethod::getConfig('stripe');
            
            if (!$stripe) {
                return null;
            }

            // Determine which credentials to use based on environment
            if ($environment === 'sandbox' || $environment === 'test') {
                $publishableKey = $stripe->test_publishable_key;
                $secretKey = $stripe->test_secret_key;
                $webhookSecret = $stripe->test_webhook_secret;
            } else {
                $publishableKey = $stripe->live_publishable_key;
                $secretKey = $stripe->live_secret_key;
                $webhookSecret = $stripe->live_webhook_secret;
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
     * @return string 'sandbox' or 'live'
     */
    public static function getEnvironment(): string
    {
        try {
            $stripe = PaymentMethod::getConfig('stripe');
            return $stripe->mode_environment ?? 'sandbox';
        } catch (\Exception $e) {
            return 'sandbox';
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
            $productId = $env === 'sandbox' || $env === 'test' 
                ? $stripe->test_donation_product_id 
                : $stripe->live_donation_product_id;

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
            $updateData = $env === 'sandbox' || $env === 'test'
                ? ['test_donation_product_id' => $product->id]
                : ['live_donation_product_id' => $product->id];
            
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


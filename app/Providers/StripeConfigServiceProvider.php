<?php

namespace App\Providers;

use App\Services\StripeConfigService;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Config;
use Laravel\Cashier\Cashier;
use Stripe\Stripe;

class StripeConfigServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Don't access database here - it's not ready yet
        // We'll do it in boot() method instead
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Skip during console commands (migrations, artisan commands) to avoid memory issues
        // Only run for HTTP requests
        if ($this->app->runningInConsole()) {
            return;
        }

        // Override Cashier config with database credentials if available
        // This runs after database connection is established
        $this->overrideCashierConfig();
    }

    /**
     * Override Cashier config with database credentials
     */
    private function overrideCashierConfig(): void
    {
        // Use a static flag to prevent infinite loops or multiple calls
        static $attempted = false;
        if ($attempted) {
            return;
        }
        $attempted = true;

        // Override Cashier config with database credentials if available
        try {
            // Check if database connection is available
            try {
                $connection = \Illuminate\Support\Facades\DB::connection();
                if (!$connection) {
                    return;
                }
                // Try a simple query to ensure connection works
                $connection->getPdo();
            } catch (\Exception $e) {
                // Database connection not available yet, skip
                return;
            }

            // Check if payment_methods table exists
            try {
                if (!\Illuminate\Support\Facades\Schema::hasTable('payment_methods')) {
                    return;
                }
            } catch (\Exception $e) {
                // Can't check table, skip
                return;
            }

            // Use the service but with better error handling
            // Don't access encrypted fields during boot - let it fail gracefully
            $environment = StripeConfigService::getEnvironment();
            
            if (!$environment) {
                return;
            }

            $credentials = StripeConfigService::getCredentials($environment);

            if ($credentials && !empty($credentials['secret_key']) && !empty($credentials['publishable_key'])) {
                // Override Cashier config - use Config::set() which works at runtime
                // Cashier reads from config('cashier.secret') and config('cashier.key')
                Config::set('cashier.secret', $credentials['secret_key']);
                Config::set('cashier.key', $credentials['publishable_key']);
                
                // Override webhook secret if available
                if (!empty($credentials['webhook_secret'])) {
                    Config::set('cashier.webhook.secret', $credentials['webhook_secret']);
                }

                // Note: Cashier automatically uses config('cashier.secret') when calling Cashier::stripe()
                // The Stripe::setApiKey() call is kept for backward compatibility with direct Stripe SDK usage
                // but Cashier should be used via Cashier::stripe() instead
                Stripe::setApiKey($credentials['secret_key']);
            }
        } catch (\Illuminate\Database\QueryException $e) {
            // Database query failed (table might not exist, connection issue, etc.)
            // Silently fail - let .env values be used if database is not available
        } catch (\Illuminate\Contracts\Encryption\DecryptException $e) {
            // Encryption/decryption failed - skip, use .env values
        } catch (\Exception $e) {
            // Other exceptions - silently fail - let .env values be used
        }
    }
}

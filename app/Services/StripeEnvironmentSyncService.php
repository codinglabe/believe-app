<?php

namespace App\Services;

use App\Models\LivestockUser;
use App\Models\Plan;
use App\Models\User;
use App\Services\StripeConfigService;
use Illuminate\Support\Facades\Log;
use Stripe\Customer;
use Stripe\Price;
use Stripe\Product;
use Stripe\Stripe;
use Stripe\Exception\ApiErrorException;

class StripeEnvironmentSyncService
{
    /**
     * Sync all Stripe IDs (users, livestock_users, plans) for the given environment
     * 
     * @param string $environment 'sandbox' or 'live'
     * @return array Results summary
     */
    public static function syncAll(string $environment): array
    {
        $results = [
            'users' => ['synced' => 0, 'failed' => 0],
            'livestock_users' => ['synced' => 0, 'failed' => 0],
            'plans' => ['synced' => 0, 'failed' => 0],
        ];

        try {
            $credentials = StripeConfigService::getCredentials($environment);
            
            if (!$credentials || empty($credentials['secret_key'])) {
                throw new \Exception("No Stripe credentials found for {$environment} environment");
            }

            Stripe::setApiKey($credentials['secret_key']);

            // Sync Users
            $results['users'] = self::syncUsers($environment);
            
            // Sync Livestock Users
            $results['livestock_users'] = self::syncLivestockUsers($environment);
            
            // Sync Plans
            $results['plans'] = self::syncPlans($environment);
            
            // Sync Donation Product
            $results['donation_product'] = self::syncDonationProduct($environment);

            Log::info("Stripe environment sync completed for {$environment}", $results);
            
            return $results;
        } catch (\Exception $e) {
            Log::error("Failed to sync Stripe environment", [
                'environment' => $environment,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Sync Stripe customer IDs for all users
     */
    private static function syncUsers(string $environment): array
    {
        $synced = 0;
        $failed = 0;

        $users = User::whereNotNull('email')->get();

        foreach ($users as $user) {
            try {
                $customerId = self::createOrFetchCustomer($user->email, $user->name, $user->id, 'user');
                
                if ($customerId) {
                    $user->update(['stripe_id' => $customerId]);
                    $synced++;
                } else {
                    $failed++;
                }
            } catch (\Exception $e) {
                Log::error("Failed to sync Stripe customer for user {$user->id}", [
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                ]);
                $failed++;
            }
        }

        return ['synced' => $synced, 'failed' => $failed];
    }

    /**
     * Sync Stripe customer IDs for all livestock users
     */
    private static function syncLivestockUsers(string $environment): array
    {
        $synced = 0;
        $failed = 0;

        $livestockUsers = LivestockUser::whereNotNull('email')->get();

        foreach ($livestockUsers as $livestockUser) {
            try {
                $customerId = self::createOrFetchCustomer($livestockUser->email, $livestockUser->name, $livestockUser->id, 'livestock_user');
                
                if ($customerId) {
                    $livestockUser->update(['stripe_id' => $customerId]);
                    $synced++;
                } else {
                    $failed++;
                }
            } catch (\Exception $e) {
                Log::error("Failed to sync Stripe customer for livestock user {$livestockUser->id}", [
                    'email' => $livestockUser->email,
                    'error' => $e->getMessage(),
                ]);
                $failed++;
            }
        }

        return ['synced' => $synced, 'failed' => $failed];
    }

    /**
     * Sync Stripe product and price IDs for all plans
     */
    private static function syncPlans(string $environment): array
    {
        $synced = 0;
        $failed = 0;

        $plans = Plan::all();

        foreach ($plans as $plan) {
            try {
                // Create or fetch product
                $productId = self::createOrFetchProduct($plan);
                
                // Create or fetch price
                $priceId = self::createOrFetchPrice($plan, $productId);
                
                if ($productId && $priceId) {
                    $plan->update([
                        'stripe_product_id' => $productId,
                        'stripe_price_id' => $priceId,
                    ]);
                    $synced++;
                } else {
                    $failed++;
                }
            } catch (\Exception $e) {
                Log::error("Failed to sync Stripe product/price for plan {$plan->id}", [
                    'plan_name' => $plan->name,
                    'error' => $e->getMessage(),
                ]);
                $failed++;
            }
        }

        return ['synced' => $synced, 'failed' => $failed];
    }

    /**
     * Create or fetch Stripe customer by email
     */
    private static function createOrFetchCustomer(string $email, ?string $name, int $userId, string $userType): ?string
    {
        try {
            // Try to find existing customer by email
            $customers = Customer::all([
                'email' => $email,
                'limit' => 1,
            ]);

            if (count($customers->data) > 0) {
                $customerId = $customers->data[0]->id;
                Log::info("Found existing Stripe customer", [
                    'customer_id' => $customerId,
                    'email' => $email,
                    'user_type' => $userType,
                    'user_id' => $userId,
                ]);
                return $customerId;
            }

            // Create new customer
            $customer = Customer::create([
                'email' => $email,
                'name' => $name,
                'metadata' => [
                    'user_id' => $userId,
                    'user_type' => $userType,
                ],
            ]);

            Log::info("Created new Stripe customer", [
                'customer_id' => $customer->id,
                'email' => $email,
                'user_type' => $userType,
                'user_id' => $userId,
            ]);

            return $customer->id;
        } catch (ApiErrorException $e) {
            Log::error("Failed to create/fetch Stripe customer", [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Create or fetch Stripe product for plan
     */
    private static function createOrFetchProduct(Plan $plan): ?string
    {
        try {
            // If plan already has a product ID, try to retrieve it
            if ($plan->stripe_product_id) {
                try {
                    $product = Product::retrieve($plan->stripe_product_id);
                    // If product exists and name matches, use it
                    if ($product && $product->name === $plan->name) {
                        return $product->id;
                    }
                } catch (\Exception $e) {
                    // Product doesn't exist, create new one
                }
            }

            // Search for existing product by name
            $products = Product::all([
                'limit' => 100,
            ]);

            foreach ($products->data as $product) {
                if ($product->name === $plan->name) {
                    return $product->id;
                }
            }

            // Create new product
            $product = Product::create([
                'name' => $plan->name,
                'description' => $plan->description ?? '',
            ]);

            Log::info("Created new Stripe product for plan", [
                'product_id' => $product->id,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
            ]);

            return $product->id;
        } catch (ApiErrorException $e) {
            Log::error("Failed to create/fetch Stripe product for plan", [
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Create or fetch Stripe price for plan
     */
    private static function createOrFetchPrice(Plan $plan, string $productId): ?string
    {
        try {
            // If plan already has a price ID, try to retrieve it
            if ($plan->stripe_price_id) {
                try {
                    $price = Price::retrieve($plan->stripe_price_id);
                    // If price exists and matches the plan, use it
                    if ($price && $price->product === $productId) {
                        // Check if amount matches
                        $planAmount = (int)($plan->price * 100);
                        if ($price->unit_amount == $planAmount) {
                            return $price->id;
                        }
                    }
                } catch (\Exception $e) {
                    // Price doesn't exist, create new one
                }
            }

            // Search for existing price by product and amount
            $planAmount = (int)($plan->price * 100);
            $prices = Price::all([
                'product' => $productId,
                'limit' => 100,
            ]);

            foreach ($prices->data as $price) {
                if ($price->unit_amount == $planAmount && $price->active) {
                    // Check if recurring interval matches
                    if ($plan->frequency === 'one-time') {
                        if (!$price->recurring) {
                            return $price->id;
                        }
                    } else {
                        if ($price->recurring) {
                            $interval = self::getStripeInterval($plan->frequency);
                            if ($price->recurring->interval === $interval) {
                                return $price->id;
                            }
                        }
                    }
                }
            }

            // Create new price
            $priceData = [
                'product' => $productId,
                'unit_amount' => $planAmount,
                'currency' => 'usd',
            ];

            // Add recurring interval for subscription plans
            if ($plan->frequency !== 'one-time') {
                $priceData['recurring'] = [
                    'interval' => self::getStripeInterval($plan->frequency),
                ];
            }

            $price = Price::create($priceData);

            Log::info("Created new Stripe price for plan", [
                'price_id' => $price->id,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
            ]);

            return $price->id;
        } catch (ApiErrorException $e) {
            Log::error("Failed to create/fetch Stripe price for plan", [
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Sync donation product for the environment
     */
    private static function syncDonationProduct(string $environment): array
    {
        try {
            $productId = self::createOrFetchDonationProduct($environment);
            
            if ($productId) {
                // Update payment_methods table with the product ID
                $stripe = \App\Models\PaymentMethod::getConfig('stripe');
                if ($stripe) {
                    $updateData = $environment === 'sandbox' || $environment === 'test'
                        ? ['test_donation_product_id' => $productId]
                        : ['live_donation_product_id' => $productId];
                    
                    $stripe->update($updateData);
                    
                    Log::info("Synced donation product for {$environment}", [
                        'product_id' => $productId,
                    ]);
                }
                
                return ['synced' => 1, 'failed' => 0];
            }
            
            return ['synced' => 0, 'failed' => 1];
        } catch (\Exception $e) {
            Log::error("Failed to sync donation product for {$environment}", [
                'error' => $e->getMessage(),
            ]);
            return ['synced' => 0, 'failed' => 1];
        }
    }

    /**
     * Create or fetch donation product
     */
    private static function createOrFetchDonationProduct(string $environment): ?string
    {
        try {
            $stripe = \App\Models\PaymentMethod::getConfig('stripe');
            
            if (!$stripe) {
                return null;
            }

            // Check if product ID already exists
            $existingProductId = $environment === 'sandbox' || $environment === 'test'
                ? $stripe->test_donation_product_id
                : $stripe->live_donation_product_id;

            if ($existingProductId) {
                try {
                    $product = Product::retrieve($existingProductId);
                    if ($product && $product->name === 'Donations') {
                        return $product->id;
                    }
                } catch (\Exception $e) {
                    // Product doesn't exist, create new one
                }
            }

            // Search for existing product by name
            $products = Product::all([
                'limit' => 100,
            ]);

            foreach ($products->data as $product) {
                if ($product->name === 'Donations') {
                    return $product->id;
                }
            }

            // Create new donation product
            $product = Product::create([
                'name' => 'Donations',
                'description' => 'Recurring donations to organizations',
            ]);

            Log::info("Created new donation product for {$environment}", [
                'product_id' => $product->id,
            ]);

            return $product->id;
        } catch (ApiErrorException $e) {
            Log::error("Failed to create/fetch donation product for {$environment}", [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Get Stripe interval from plan frequency
     */
    private static function getStripeInterval(string $frequency): string
    {
        return match($frequency) {
            'yearly' => 'year',
            'weekly' => 'week',
            'daily' => 'day',
            default => 'month',
        };
    }
}


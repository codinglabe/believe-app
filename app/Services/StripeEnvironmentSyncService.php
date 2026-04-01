<?php

namespace App\Services;

use App\Models\LivestockUser;
use App\Models\Merchant;
use App\Models\MerchantSubscriptionPlan;
use App\Models\Organization;
use App\Models\PaymentMethod;
use App\Models\Plan;
use App\Models\User;
use App\Models\WalletPlan;
use App\Services\StripeConfigService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Laravel\Cashier\Cashier;
use Stripe\Exception\ApiErrorException;

class StripeEnvironmentSyncService
{
    /**
     * After Stripe API keys or account change: remove local IDs tied to the old Stripe account
     * so sync can recreate customers, prices, and products on the new account.
     */
    public static function resetLocalStripeLinkage(): void
    {
        DB::transaction(function (): void {
            if (Schema::hasTable('subscription_items')) {
                DB::table('subscription_items')->delete();
            }
            if (Schema::hasTable('subscriptions')) {
                DB::table('subscriptions')->delete();
            }

            $userStripeCols = array_values(array_filter([
                Schema::hasColumn('users', 'stripe_id') ? 'stripe_id' : null,
                Schema::hasColumn('users', 'pm_type') ? 'pm_type' : null,
                Schema::hasColumn('users', 'pm_last_four') ? 'pm_last_four' : null,
                Schema::hasColumn('users', 'trial_ends_at') ? 'trial_ends_at' : null,
            ]));
            if ($userStripeCols !== []) {
                $nulls = array_fill_keys($userStripeCols, null);
                User::query()->update($nulls);
            }

            if (Schema::hasTable('livestock_users')) {
                $cols = array_values(array_filter([
                    Schema::hasColumn('livestock_users', 'stripe_id') ? 'stripe_id' : null,
                    Schema::hasColumn('livestock_users', 'pm_type') ? 'pm_type' : null,
                    Schema::hasColumn('livestock_users', 'pm_last_four') ? 'pm_last_four' : null,
                    Schema::hasColumn('livestock_users', 'trial_ends_at') ? 'trial_ends_at' : null,
                ]));
                if ($cols !== []) {
                    DB::table('livestock_users')->update(array_fill_keys($cols, null));
                }
            }

            if (Schema::hasTable('merchants')) {
                $cols = array_values(array_filter([
                    Schema::hasColumn('merchants', 'stripe_id') ? 'stripe_id' : null,
                    Schema::hasColumn('merchants', 'pm_type') ? 'pm_type' : null,
                    Schema::hasColumn('merchants', 'pm_last_four') ? 'pm_last_four' : null,
                    Schema::hasColumn('merchants', 'trial_ends_at') ? 'trial_ends_at' : null,
                ]));
                if ($cols !== []) {
                    DB::table('merchants')->update(array_fill_keys($cols, null));
                }
            }

            Plan::query()->update([
                'stripe_product_id' => null,
                'stripe_price_id' => null,
            ]);

            MerchantSubscriptionPlan::query()->update([
                'stripe_product_id' => null,
                'stripe_price_id' => null,
            ]);

            if (Schema::hasTable('wallet_plans')) {
                WalletPlan::query()->update([
                    'stripe_product_id' => null,
                    'stripe_price_id' => null,
                ]);
            }

            if (Schema::hasColumn('organizations', 'stripe_product_id')) {
                Organization::query()->update(['stripe_product_id' => null]);
            }
        });

        Log::info('Stripe local linkage reset (subscriptions cleared, Stripe IDs nulled)');
    }

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
            'merchants' => ['synced' => 0, 'failed' => 0],
            'merchant_subscription_plans' => ['synced' => 0, 'failed' => 0],
            'wallet_plans' => ['synced' => 0, 'failed' => 0],
        ];

        try {
            $credentials = StripeConfigService::getCredentials($environment);
            
            if (!$credentials || empty($credentials['secret_key'])) {
                throw new \Exception("No Stripe credentials found for {$environment} environment");
            }

            // Configure Cashier with the correct credentials
            if (!StripeConfigService::configureStripe($environment)) {
                throw new \Exception("Failed to configure Stripe for {$environment} environment");
            }

            // Sync Users (full: recreate linkage after reset or first-time account sync)
            $results['users'] = self::syncUsers($environment, false);
            
            // Sync Livestock Users
            $results['livestock_users'] = self::syncLivestockUsers($environment, false);
            
            // Sync Plans
            $results['plans'] = self::syncPlans($environment);
            
            // Sync Merchants
            $results['merchants'] = self::syncMerchants($environment, false);
            
            // Sync Merchant Subscription Plans
            $results['merchant_subscription_plans'] = self::syncMerchantSubscriptionPlans($environment);

            // Wallet subscription plans (Stripe products/prices for /wallet plans)
            $results['wallet_plans'] = self::syncWalletPlans($environment);
            
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
     * Ensure Stripe customers exist for users, livestock users, and merchants that are missing stripe_id.
     * Use after routine payment-settings saves when a full catalog sync is not required.
     *
     * @return array<string, array{synced: int, failed: int}>
     */
    public static function syncBillableCustomersOnly(string $environment): array
    {
        $credentials = StripeConfigService::getCredentials($environment);

        if (! $credentials || empty($credentials['secret_key'])) {
            throw new \Exception("No Stripe credentials found for {$environment} environment");
        }

        if (! StripeConfigService::configureStripe($environment)) {
            throw new \Exception("Failed to configure Stripe for {$environment} environment");
        }

        return [
            'users' => self::syncUsers($environment, true),
            'livestock_users' => self::syncLivestockUsers($environment, true),
            'merchants' => self::syncMerchants($environment, true),
        ];
    }

    /**
     * Ensure the user has a Stripe customer id that exists on the currently configured Stripe account.
     * Clears stale ids (e.g. after switching API keys) and creates/fetches by email.
     */
    public static function ensureUserStripeCustomer(User $user, ?string $environment = null): bool
    {
        $environment = $environment ?? StripeConfigService::getEnvironment();
        $credentials = StripeConfigService::getCredentials($environment);

        if (! $credentials || empty($credentials['secret_key'])) {
            return false;
        }

        if (! StripeConfigService::configureStripe($environment)) {
            return false;
        }

        if ($user->stripe_id && self::stripeCustomerExistsInCurrentAccount($user->stripe_id)) {
            return true;
        }

        if ($user->stripe_id) {
            $user->forceFill(['stripe_id' => null])->save();
        }

        $customerId = self::createOrFetchCustomer($user->email, $user->name, $user->id, 'user');

        if (! $customerId) {
            return false;
        }

        $user->forceFill(['stripe_id' => $customerId])->save();

        return true;
    }

    /**
     * Whether this customer id exists on the Stripe account Cashier is configured for.
     */
    private static function stripeCustomerExistsInCurrentAccount(?string $customerId): bool
    {
        if ($customerId === null || $customerId === '') {
            return false;
        }

        try {
            Cashier::stripe()->customers->retrieve($customerId);

            return true;
        } catch (ApiErrorException $e) {
            if ($e->getStripeCode() === 'resource_missing') {
                return false;
            }

            Log::warning('Stripe customer retrieve inconclusive; keeping local stripe_id', [
                'customer_id' => $customerId,
                'error' => $e->getMessage(),
            ]);

            return true;
        }
    }

    /**
     * Sync Stripe customer IDs for all users
     *
     * @param  bool  $onlyMissingStripeIds  When true, only fix rows missing id or with an id invalid on the current account.
     */
    private static function syncUsers(string $environment, bool $onlyMissingStripeIds = false): array
    {
        $synced = 0;
        $failed = 0;

        $users = User::query()->whereNotNull('email')->get();

        foreach ($users as $user) {
            try {
                if ($onlyMissingStripeIds && $user->stripe_id) {
                    if (self::stripeCustomerExistsInCurrentAccount($user->stripe_id)) {
                        continue;
                    }
                    $user->forceFill(['stripe_id' => null])->save();
                }

                $customerId = self::createOrFetchCustomer($user->email, $user->name, $user->id, 'user');

                if ($customerId) {
                    $user->forceFill(['stripe_id' => $customerId])->save();
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
     *
     * @param  bool  $onlyMissingStripeIds  When true, only fix rows missing id or with an id invalid on the current account.
     */
    private static function syncLivestockUsers(string $environment, bool $onlyMissingStripeIds = false): array
    {
        $synced = 0;
        $failed = 0;

        $livestockUsers = LivestockUser::query()->whereNotNull('email')->get();

        foreach ($livestockUsers as $livestockUser) {
            try {
                if ($onlyMissingStripeIds && $livestockUser->stripe_id) {
                    if (self::stripeCustomerExistsInCurrentAccount($livestockUser->stripe_id)) {
                        continue;
                    }
                    $livestockUser->forceFill(['stripe_id' => null])->save();
                }

                $customerId = self::createOrFetchCustomer($livestockUser->email, $livestockUser->name, $livestockUser->id, 'livestock_user');

                if ($customerId) {
                    $livestockUser->forceFill(['stripe_id' => $customerId])->save();
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
            // Use Cashier's Stripe client
            $stripe = Cashier::stripe();

            $existingId = StripeCustomerLookupService::findExistingCustomerId(
                $stripe,
                $email,
                $userId,
                $userType
            );

            if ($existingId !== null) {
                Log::info('Found existing Stripe customer', [
                    'customer_id' => $existingId,
                    'email' => $email,
                    'user_type' => $userType,
                    'user_id' => $userId,
                ]);

                return $existingId;
            }

            // Create new customer only when none exists for this email / metadata on this account
            $customer = $stripe->customers->create([
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
            $stripe = Cashier::stripe();
            $source = StripeCatalogLookupService::SOURCE_PLATFORM_PLAN;
            $planId = (string) $plan->id;

            if ($plan->stripe_product_id) {
                try {
                    $product = $stripe->products->retrieve($plan->stripe_product_id);
                    if ($product && ! ($product->deleted ?? false) && $product->name === $plan->name) {
                        return $product->id;
                    }
                } catch (\Exception $e) {
                    // Product doesn't exist, resolve below
                }
            }

            $existingId = StripeCatalogLookupService::findExistingProductId($stripe, $plan->name, $source, $planId);
            if ($existingId !== null) {
                Log::info('Using existing Stripe product for plan', [
                    'product_id' => $existingId,
                    'plan_id' => $plan->id,
                    'plan_name' => $plan->name,
                ]);

                return $existingId;
            }

            $product = $stripe->products->create([
                'name' => $plan->name,
                'description' => $plan->description ?? '',
                'metadata' => [
                    'plan_id' => $planId,
                    'source' => $source,
                ],
            ]);

            Log::info('Created new Stripe product for plan', [
                'product_id' => $product->id,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
            ]);

            return $product->id;
        } catch (ApiErrorException $e) {
            Log::error('Failed to create/fetch Stripe product for plan', [
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
            $stripe = Cashier::stripe();
            $planAmount = (int) ($plan->price * 100);
            $isOneTime = $plan->frequency === 'one-time';
            $interval = $isOneTime ? null : self::getStripeInterval($plan->frequency);

            if ($plan->stripe_price_id) {
                try {
                    $price = $stripe->prices->retrieve($plan->stripe_price_id);
                    if ($price && $price->product === $productId && (int) $price->unit_amount === $planAmount) {
                        if ($isOneTime && ! $price->recurring) {
                            return $price->id;
                        }
                        if (! $isOneTime && $price->recurring && $interval && $price->recurring->interval === $interval) {
                            return $price->id;
                        }
                    }
                } catch (\Exception $e) {
                    // Price missing — resolve below
                }
            }

            $existingId = StripeCatalogLookupService::findExistingPriceId(
                $stripe,
                $productId,
                $planAmount,
                'usd',
                $isOneTime,
                $interval
            );

            if ($existingId !== null) {
                Log::info('Using existing Stripe price for plan', [
                    'price_id' => $existingId,
                    'plan_id' => $plan->id,
                    'plan_name' => $plan->name,
                ]);

                return $existingId;
            }

            $priceData = [
                'product' => $productId,
                'unit_amount' => $planAmount,
                'currency' => 'usd',
                'metadata' => [
                    'plan_id' => (string) $plan->id,
                    'source' => StripeCatalogLookupService::SOURCE_PLATFORM_PLAN,
                ],
            ];

            if (! $isOneTime) {
                $priceData['recurring'] = [
                    'interval' => $interval,
                ];
            }

            $price = $stripe->prices->create($priceData);

            Log::info('Created new Stripe price for plan', [
                'price_id' => $price->id,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
            ]);

            return $price->id;
        } catch (ApiErrorException $e) {
            Log::error('Failed to create/fetch Stripe price for plan', [
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
                $stripe = PaymentMethod::getConfig('stripe');
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
            $paymentMethodRow = PaymentMethod::getConfig('stripe');

            if (! $paymentMethodRow) {
                return null;
            }

            $existingProductId = $environment === 'sandbox' || $environment === 'test'
                ? $paymentMethodRow->test_donation_product_id
                : $paymentMethodRow->live_donation_product_id;

            $stripe = Cashier::stripe();
            $donationName = 'Donations';
            $source = StripeCatalogLookupService::SOURCE_DONATION;
            $planKey = 'donation';

            if ($existingProductId) {
                try {
                    $product = $stripe->products->retrieve($existingProductId);
                    if ($product && ! ($product->deleted ?? false) && $product->name === $donationName) {
                        return $product->id;
                    }
                } catch (\Exception $e) {
                    // Product missing — resolve below
                }
            }

            $existingId = StripeCatalogLookupService::findExistingProductId($stripe, $donationName, $source, $planKey);
            if ($existingId !== null) {
                Log::info("Using existing donation Stripe product for {$environment}", [
                    'product_id' => $existingId,
                ]);

                return $existingId;
            }

            $product = $stripe->products->create([
                'name' => $donationName,
                'description' => 'Recurring donations to organizations',
                'metadata' => [
                    'plan_id' => $planKey,
                    'source' => $source,
                ],
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
     * Sync Stripe customer IDs for all merchants
     *
     * @param  bool  $onlyMissingStripeIds  When true, only fix rows missing id or with an id invalid on the current account.
     */
    private static function syncMerchants(string $environment, bool $onlyMissingStripeIds = false): array
    {
        $synced = 0;
        $failed = 0;

        $merchants = Merchant::query()->whereNotNull('email')->get();

        foreach ($merchants as $merchant) {
            try {
                if ($onlyMissingStripeIds && $merchant->stripe_id) {
                    if (self::stripeCustomerExistsInCurrentAccount($merchant->stripe_id)) {
                        continue;
                    }
                    $merchant->forceFill(['stripe_id' => null])->save();
                }

                $customerId = self::createOrFetchCustomer($merchant->email, $merchant->name ?? $merchant->business_name, $merchant->id, 'merchant');

                if ($customerId) {
                    $merchant->forceFill(['stripe_id' => $customerId])->save();
                    $synced++;
                } else {
                    $failed++;
                }
            } catch (\Exception $e) {
                Log::error("Failed to sync Stripe customer for merchant {$merchant->id}", [
                    'email' => $merchant->email,
                    'error' => $e->getMessage(),
                ]);
                $failed++;
            }
        }

        return ['synced' => $synced, 'failed' => $failed];
    }

    /**
     * Sync Stripe product and price IDs for all merchant subscription plans
     */
    private static function syncMerchantSubscriptionPlans(string $environment): array
    {
        $synced = 0;
        $failed = 0;

        $plans = MerchantSubscriptionPlan::all();

        foreach ($plans as $plan) {
            try {
                // Create or fetch product
                $productId = self::createOrFetchMerchantProduct($plan);
                
                // Create or fetch price
                $priceId = self::createOrFetchMerchantPrice($plan, $productId);
                
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
                Log::error("Failed to sync Stripe product/price for merchant subscription plan {$plan->id}", [
                    'plan_name' => $plan->name,
                    'error' => $e->getMessage(),
                ]);
                $failed++;
            }
        }

        return ['synced' => $synced, 'failed' => $failed];
    }

    /**
     * Sync Stripe product and price IDs for all wallet plans (org wallet subscriptions).
     */
    private static function syncWalletPlans(string $environment): array
    {
        if (! Schema::hasTable('wallet_plans')) {
            return ['synced' => 0, 'failed' => 0];
        }

        $synced = 0;
        $failed = 0;

        foreach (WalletPlan::query()->orderBy('sort_order')->orderBy('id')->get() as $plan) {
            try {
                $productId = self::createOrFetchWalletProduct($plan);
                $priceId = $productId ? self::createOrFetchWalletPrice($plan, $productId) : null;

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
                Log::error("Failed to sync Stripe product/price for wallet plan {$plan->id}", [
                    'plan_name' => $plan->name,
                    'error' => $e->getMessage(),
                ]);
                $failed++;
            }
        }

        return ['synced' => $synced, 'failed' => $failed];
    }

    private static function walletPlanProductName(WalletPlan $plan): string
    {
        return $plan->name.' Wallet Plan';
    }

    private static function createOrFetchWalletProduct(WalletPlan $plan): ?string
    {
        try {
            $stripe = Cashier::stripe();
            $productName = self::walletPlanProductName($plan);
            $source = StripeCatalogLookupService::SOURCE_WALLET_PLAN;
            $planId = (string) $plan->id;

            if ($plan->stripe_product_id) {
                try {
                    $product = $stripe->products->retrieve($plan->stripe_product_id);
                    if ($product && ! ($product->deleted ?? false) && $product->name === $productName) {
                        return $product->id;
                    }
                } catch (\Exception $e) {
                    // Product missing — resolve below
                }
            }

            $existingId = StripeCatalogLookupService::findExistingProductId($stripe, $productName, $source, $planId);
            if ($existingId !== null) {
                Log::info('Using existing Stripe product for wallet plan', [
                    'product_id' => $existingId,
                    'plan_id' => $plan->id,
                ]);

                return $existingId;
            }

            $product = $stripe->products->create([
                'name' => $productName,
                'description' => $plan->description ?? 'Wallet subscription plan',
                'metadata' => [
                    'plan_id' => $planId,
                    'source' => $source,
                ],
            ]);

            Log::info('Created Stripe product for wallet plan', [
                'product_id' => $product->id,
                'plan_id' => $plan->id,
            ]);

            return $product->id;
        } catch (ApiErrorException $e) {
            Log::error('Failed to create/fetch Stripe product for wallet plan', [
                'plan_id' => $plan->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private static function createOrFetchWalletPrice(WalletPlan $plan, string $productId): ?string
    {
        try {
            $stripe = Cashier::stripe();
            $planAmount = (int) round((float) $plan->price * 100);
            $interval = self::getStripeInterval($plan->frequency ?? 'monthly');

            if ($plan->stripe_price_id) {
                try {
                    $price = $stripe->prices->retrieve($plan->stripe_price_id);
                    if ($price && $price->product === $productId && (int) $price->unit_amount === $planAmount) {
                        if ($price->recurring && $price->recurring->interval === $interval) {
                            return $price->id;
                        }
                    }
                } catch (\Exception $e) {
                    // Price missing — resolve below
                }
            }

            $existingId = StripeCatalogLookupService::findExistingPriceId(
                $stripe,
                $productId,
                $planAmount,
                'usd',
                false,
                $interval
            );

            if ($existingId !== null) {
                Log::info('Using existing Stripe price for wallet plan', [
                    'price_id' => $existingId,
                    'plan_id' => $plan->id,
                ]);

                return $existingId;
            }

            $price = $stripe->prices->create([
                'product' => $productId,
                'unit_amount' => $planAmount,
                'currency' => 'usd',
                'recurring' => [
                    'interval' => $interval,
                ],
                'metadata' => [
                    'plan_id' => (string) $plan->id,
                    'source' => StripeCatalogLookupService::SOURCE_WALLET_PLAN,
                ],
            ]);

            Log::info('Created Stripe price for wallet plan', [
                'price_id' => $price->id,
                'plan_id' => $plan->id,
            ]);

            return $price->id;
        } catch (ApiErrorException $e) {
            Log::error('Failed to create/fetch Stripe price for wallet plan', [
                'plan_id' => $plan->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Create or fetch Stripe product for merchant subscription plan
     */
    private static function createOrFetchMerchantProduct(MerchantSubscriptionPlan $plan): ?string
    {
        try {
            $stripe = Cashier::stripe();
            $productName = "Merchant: {$plan->name}";
            $source = StripeCatalogLookupService::SOURCE_MERCHANT_PLAN;
            $planId = (string) $plan->id;

            if ($plan->stripe_product_id) {
                try {
                    $product = $stripe->products->retrieve($plan->stripe_product_id);
                    if ($product && ! ($product->deleted ?? false) && $product->name === $productName) {
                        return $product->id;
                    }
                } catch (\Exception $e) {
                    // Product missing — resolve below
                }
            }

            $existingId = StripeCatalogLookupService::findExistingProductId($stripe, $productName, $source, $planId);
            if ($existingId !== null) {
                Log::info('Using existing Stripe product for merchant subscription plan', [
                    'product_id' => $existingId,
                    'plan_id' => $plan->id,
                    'plan_name' => $plan->name,
                ]);

                return $existingId;
            }

            $product = $stripe->products->create([
                'name' => $productName,
                'description' => $plan->description ?? '',
                'metadata' => [
                    'plan_id' => $planId,
                    'source' => $source,
                ],
            ]);

            Log::info('Created new Stripe product for merchant subscription plan', [
                'product_id' => $product->id,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
            ]);

            return $product->id;
        } catch (ApiErrorException $e) {
            Log::error('Failed to create/fetch Stripe product for merchant subscription plan', [
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Create or fetch Stripe price for merchant subscription plan
     */
    private static function createOrFetchMerchantPrice(MerchantSubscriptionPlan $plan, string $productId): ?string
    {
        try {
            $stripe = Cashier::stripe();
            $planAmount = (int) ($plan->price * 100);
            $interval = self::getStripeInterval($plan->frequency);

            if ($plan->stripe_price_id) {
                try {
                    $price = $stripe->prices->retrieve($plan->stripe_price_id);
                    if ($price && $price->product === $productId && (int) $price->unit_amount === $planAmount) {
                        if ($price->recurring && $price->recurring->interval === $interval) {
                            return $price->id;
                        }
                    }
                } catch (\Exception $e) {
                    // Price missing — resolve below
                }
            }

            $existingId = StripeCatalogLookupService::findExistingPriceId(
                $stripe,
                $productId,
                $planAmount,
                'usd',
                false,
                $interval
            );

            if ($existingId !== null) {
                Log::info('Using existing Stripe price for merchant subscription plan', [
                    'price_id' => $existingId,
                    'plan_id' => $plan->id,
                    'plan_name' => $plan->name,
                ]);

                return $existingId;
            }

            $price = $stripe->prices->create([
                'product' => $productId,
                'unit_amount' => $planAmount,
                'currency' => 'usd',
                'recurring' => [
                    'interval' => $interval,
                ],
                'metadata' => [
                    'plan_id' => (string) $plan->id,
                    'source' => StripeCatalogLookupService::SOURCE_MERCHANT_PLAN,
                ],
            ]);

            Log::info('Created new Stripe price for merchant subscription plan', [
                'price_id' => $price->id,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
            ]);

            return $price->id;
        } catch (ApiErrorException $e) {
            Log::error('Failed to create/fetch Stripe price for merchant subscription plan', [
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
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
        return match ($frequency) {
            'yearly', 'annually' => 'year',
            'weekly' => 'week',
            'daily' => 'day',
            default => 'month',
        };
    }
}


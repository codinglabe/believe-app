<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\WalletPlan;
use Laravel\Cashier\Cashier;
use Illuminate\Support\Facades\Log;
use App\Services\StripeConfigService;
use Stripe\Stripe;

class UpdateWalletPlansStripeIds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'wallet-plans:update-stripe-ids';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update wallet plans with Stripe product and price IDs if missing';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Configure Stripe from database
        $environment = StripeConfigService::getEnvironment();
        $credentials = StripeConfigService::getCredentials($environment);

        if (!$credentials || empty($credentials['secret_key'])) {
            $this->error('Stripe is not configured. Please configure Stripe in Payment Method Settings.');
            return 1;
        }

        // Set Stripe API key
        Stripe::setApiKey($credentials['secret_key']);

        $plans = WalletPlan::whereNull('stripe_price_id')
            ->orWhereNull('stripe_product_id')
            ->get();

        if ($plans->isEmpty()) {
            $this->info('All wallet plans already have Stripe IDs configured.');
            return 0;
        }

        $this->info("Found {$plans->count()} wallet plan(s) without Stripe IDs. Updating...");
        $this->info("Using Stripe environment: {$environment}");

        // Create Stripe client with API key directly
        $stripe = new \Stripe\StripeClient($credentials['secret_key']);
        $updated = 0;
        $failed = 0;
        
        foreach ($plans as $plan) {
            try {
                // Create product if not exists
                if (!$plan->stripe_product_id) {
                    $product = $stripe->products->create([
                        'name' => $plan->name . ' Wallet Plan',
                        'description' => $plan->description ?? 'Wallet Subscription Plan',
                    ]);
                    $plan->stripe_product_id = $product->id;
                    $this->info("Created Stripe product for: {$plan->name}");
                }

                // Create price if not exists
                if (!$plan->stripe_price_id) {
                    $interval = $plan->frequency === 'annually' ? 'year' : 'month';
                    
                    $price = $stripe->prices->create([
                        'product' => $plan->stripe_product_id,
                        'unit_amount' => (int)($plan->price * 100), // Convert to cents
                        'currency' => 'usd',
                        'recurring' => [
                            'interval' => $interval,
                        ],
                    ]);
                    $plan->stripe_price_id = $price->id;
                    $this->info("Created Stripe price for: {$plan->name}");
                }

                $plan->save();
                $updated++;
                $this->info("✓ Updated: {$plan->name}");

            } catch (\Exception $e) {
                $failed++;
                $this->error("✗ Failed to update {$plan->name}: " . $e->getMessage());
                Log::error("Failed to update wallet plan Stripe IDs", [
                    'plan_id' => $plan->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        $this->newLine();
        $this->info("Summary: {$updated} updated, {$failed} failed");

        return $failed > 0 ? 1 : 0;
    }
}

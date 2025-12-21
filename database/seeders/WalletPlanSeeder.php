<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\WalletPlan;
use Laravel\Cashier\Cashier;
use Illuminate\Support\Facades\Log;

class WalletPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if plans already exist
        if (WalletPlan::count() > 0) {
            $this->command->info('Wallet plans already exist. Skipping seeder.');
            return;
        }

        $plans = [
            [
                'name' => 'Monthly',
                'frequency' => 'monthly',
                'price' => 3.00,
                'description' => 'Monthly wallet subscription plan with full access to digital wallet features.',
                'trial_days' => 14,
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Annual',
                'frequency' => 'annually',
                'price' => 30.00,
                'description' => 'Annual wallet subscription plan with full access to digital wallet features. Save $6 per year!',
                'trial_days' => 14,
                'is_active' => true,
                'sort_order' => 2,
            ],
        ];

        foreach ($plans as $planData) {
            try {
                // Create Stripe product and price if Stripe is configured
                if (config('cashier.key')) {
                    try {
                        $stripe = Cashier::stripe();
                        
                        // Create product
                        $product = $stripe->products->create([
                            'name' => $planData['name'] . ' Wallet Plan',
                            'description' => $planData['description'] ?? 'Wallet Subscription Plan',
                        ]);
                        $planData['stripe_product_id'] = $product->id;

                        // Create price
                        $interval = $planData['frequency'] === 'annually' ? 'year' : 'month';
                        
                        $price = $stripe->prices->create([
                            'product' => $product->id,
                            'unit_amount' => (int)($planData['price'] * 100), // Convert to cents
                            'currency' => 'usd',
                            'recurring' => [
                                'interval' => $interval,
                            ],
                        ]);
                        $planData['stripe_price_id'] = $price->id;

                        $this->command->info("Created Stripe product and price for {$planData['name']} plan.");
                    } catch (\Exception $e) {
                        Log::warning("Failed to create Stripe product/price for {$planData['name']}: " . $e->getMessage());
                        $this->command->warn("Stripe integration skipped for {$planData['name']} plan. You can add Stripe IDs later from admin panel.");
                    }
                } else {
                    $this->command->info("Stripe not configured. Creating plan without Stripe IDs. You can add them later from admin panel.");
                }

                // Create the wallet plan
                $plan = WalletPlan::create($planData);
                
                $this->command->info("Created wallet plan: {$plan->name} - \${$plan->price}/{$plan->frequency} (Trial: {$plan->trial_days} days)");
            } catch (\Exception $e) {
                $this->command->error("Failed to create wallet plan {$planData['name']}: " . $e->getMessage());
                Log::error("WalletPlanSeeder error: " . $e->getMessage());
            }
        }

        $this->command->info('Wallet plans seeded successfully!');
    }
}

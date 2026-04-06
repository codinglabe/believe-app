<?php

namespace Database\Seeders;

use App\Models\MerchantSubscriptionPlan;
use App\Services\StripeConfigService;
use Illuminate\Database\Seeder;
use Laravel\Cashier\Cashier;

class MerchantSubscriptionPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Delete existing plans to refresh with landing page plans
        MerchantSubscriptionPlan::truncate();
        $this->command->info('Cleared existing merchant subscription plans.');

        $plans = [
            [
                'name' => 'Monthly',
                'price' => 9.00,
                'frequency' => 'monthly',
                'description' => 'per month',
                'is_active' => true,
                'is_popular' => false,
                'sort_order' => 1,
                'trial_days' => 30,
                'custom_fields' => [
                    [
                        'key' => 'merchant_hub_listing',
                        'label' => 'Merchant Hub listing',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'unlimited_items',
                        'label' => 'Unlimited eligible items',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'monthly_discount',
                        'label' => 'Monthly discount enforcement',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'qr_redemption',
                        'label' => 'QR-code redemption',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'redemption_tracking',
                        'label' => 'Redemption tracking & controls',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'verification',
                        'label' => 'Nonprofit & volunteer verification',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'support',
                        'label' => 'Ongoing platform support',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                ],
            ],
            [
                'name' => 'Annual',
                'price' => 100.00,
                'frequency' => 'yearly',
                'description' => 'per year (save $8 annually)',
                'is_active' => true,
                'is_popular' => true,
                'sort_order' => 2,
                'trial_days' => 30,
                'custom_fields' => [
                    [
                        'key' => 'merchant_hub_listing',
                        'label' => 'Merchant Hub listing',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'unlimited_items',
                        'label' => 'Unlimited eligible items',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'monthly_discount',
                        'label' => 'Monthly discount enforcement',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'qr_redemption',
                        'label' => 'QR-code redemption',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'redemption_tracking',
                        'label' => 'Redemption tracking & controls',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'verification',
                        'label' => 'Nonprofit & volunteer verification',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'support',
                        'label' => 'Ongoing platform support',
                        'value' => 'Included',
                        'type' => 'text',
                    ],
                    [
                        'key' => 'savings',
                        'label' => 'Annual Savings',
                        'value' => '$8 per year',
                        'type' => 'text',
                    ],
                ],
            ],
        ];

        foreach ($plans as $planData) {
            $this->command->info("Creating merchant subscription plan: {$planData['name']}");

            // Create Stripe product and price using Cashier
            $stripeProductId = null;
            $stripePriceId = null;

            // Configure Stripe from database using StripeConfigService
            $stripeConfigured = StripeConfigService::configureStripe();
            
            if (!$stripeConfigured) {
                $this->command->warn("  ⚠ Stripe not configured in database. Plan will be created without Stripe IDs.");
            } else {
                // Always try to create Stripe products/prices using Cashier
                try {
                    // Use Cashier's Stripe client (now configured with database credentials)
                    $stripe = Cashier::stripe();

                    // Create Stripe product using Cashier
                    $product = $stripe->products->create([
                        'name' => "Merchant: {$planData['name']}",
                        'description' => $planData['description'] ?? '',
                    ]);
                    $stripeProductId = $product->id;
                    $this->command->info("  ✓ Created Stripe product: {$stripeProductId}");

                    // Create Stripe price using Cashier
                    $interval = 'month';
                    if ($planData['frequency'] === 'yearly') {
                        $interval = 'year';
                    } elseif ($planData['frequency'] === 'weekly') {
                        $interval = 'week';
                    }

                    $price = $stripe->prices->create([
                        'product' => $product->id,
                        'unit_amount' => (int)($planData['price'] * 100), // Convert to cents
                        'currency' => 'usd',
                        'recurring' => [
                            'interval' => $interval,
                        ],
                    ]);
                    $stripePriceId = $price->id;
                    $this->command->info("  ✓ Created Stripe price: {$stripePriceId}");
                } catch (\Exception $e) {
                    $this->command->error("  ✗ Failed to create Stripe product/price: " . $e->getMessage());
                    $this->command->warn("  ⚠ Plan will be created without Stripe IDs. Please check Stripe credentials in database.");
                }
            }

            // Create plan
            MerchantSubscriptionPlan::create([
                'name' => $planData['name'],
                'frequency' => $planData['frequency'],
                'price' => $planData['price'],
                'description' => $planData['description'],
                'is_active' => $planData['is_active'],
                'is_popular' => $planData['is_popular'],
                'sort_order' => $planData['sort_order'],
                'trial_days' => $planData['trial_days'],
                'custom_fields' => $planData['custom_fields'],
                'stripe_product_id' => $stripeProductId,
                'stripe_price_id' => $stripePriceId,
            ]);

            $this->command->info("  ✓ Created plan");
        }

        $this->command->info('Merchant subscription plans seeded successfully!');
    }
}

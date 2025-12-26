<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\PlanFeature;
use Illuminate\Database\Seeder;
use Laravel\Cashier\Cashier;

class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if plans already exist
        if (Plan::count() > 0) {
            $this->command->info('Plans already exist. Skipping seeder.');
            return;
        }

        $plans = [
            [
                'name' => 'Starter',
                'price' => 9.00,
                'frequency' => 'monthly',
                'description' => 'Perfect for small nonprofits getting started',
                'is_active' => true,
                'is_popular' => false,
                'sort_order' => 1,
                'custom_fields' => [
                    [
                        'key' => 'emails_included',
                        'label' => 'Emails Included',
                        'value' => '200',
                        'type' => 'number',
                        'icon' => 'Mail',
                    ],
                    [
                        'key' => 'ai_tokens',
                        'label' => 'AI Assistant',
                        'value' => 'Token Re-ups ($5 per 50K tokens)',
                        'type' => 'text',
                        'icon' => 'Bot',
                    ],
                    [
                        'key' => 'ein_setup_fee',
                        'label' => 'EIN Setup Fee',
                        'value' => '10.00',
                        'type' => 'currency',
                        'icon' => 'DollarSign',
                    ],
                    [
                        'key' => 'support_level',
                        'label' => 'Support Level',
                        'value' => 'Email support',
                        'type' => 'text',
                        'icon' => 'Shield',
                    ],
                ],
                'features' => [
                    ['name' => 'Unlimited Events', 'description' => 'Create unlimited events', 'icon' => 'Calendar', 'is_unlimited' => true, 'sort_order' => 1],
                    ['name' => 'Unlimited Courses', 'description' => 'Create unlimited courses', 'icon' => 'GraduationCap', 'is_unlimited' => true, 'sort_order' => 2],
                    ['name' => 'Unlimited Donations', 'description' => 'Accept unlimited donations', 'icon' => 'Heart', 'is_unlimited' => true, 'sort_order' => 3],
                    ['name' => 'Unlimited Marketplace', 'description' => 'Create unlimited marketplace items', 'icon' => 'ShoppingCart', 'is_unlimited' => true, 'sort_order' => 4],
                    ['name' => 'Unlimited Campaign Pages', 'description' => 'Create unlimited campaign pages', 'icon' => 'FileText', 'is_unlimited' => true, 'sort_order' => 5],
                    ['name' => 'Unlimited Push Newsletter Alerts', 'description' => 'Send unlimited push notifications (FREE)', 'icon' => 'Bell', 'is_unlimited' => true, 'sort_order' => 6],
                    ['name' => 'Unlimited Volunteer Management', 'description' => 'Manage unlimited volunteers and groups', 'icon' => 'Users', 'is_unlimited' => true, 'sort_order' => 7],
                ],
            ],
            [
                'name' => 'Community',
                'price' => 19.00,
                'frequency' => 'monthly',
                'description' => 'Ideal for growing organizations',
                'is_active' => true,
                'is_popular' => true,
                'sort_order' => 2,
                'custom_fields' => [
                    [
                        'key' => 'emails_included',
                        'label' => 'Emails Included',
                        'value' => '1,000',
                        'type' => 'number',
                        'icon' => 'Mail',
                    ],
                    [
                        'key' => 'ai_tokens',
                        'label' => 'AI Assistant',
                        'value' => 'Token Re-ups ($5 per 50K tokens)',
                        'type' => 'text',
                        'icon' => 'Bot',
                    ],
                    [
                        'key' => 'ein_setup_fee',
                        'label' => 'EIN Setup Fee',
                        'value' => '10.00',
                        'type' => 'currency',
                        'icon' => 'DollarSign',
                    ],
                    [
                        'key' => 'support_level',
                        'label' => 'Support Level',
                        'value' => 'Priority support',
                        'type' => 'text',
                        'icon' => 'Shield',
                    ],
                ],
                'features' => [
                    ['name' => 'Unlimited Events', 'description' => 'Create unlimited events', 'icon' => 'Calendar', 'is_unlimited' => true, 'sort_order' => 1],
                    ['name' => 'Unlimited Courses', 'description' => 'Create unlimited courses', 'icon' => 'GraduationCap', 'is_unlimited' => true, 'sort_order' => 2],
                    ['name' => 'Unlimited Donations', 'description' => 'Accept unlimited donations', 'icon' => 'Heart', 'is_unlimited' => true, 'sort_order' => 3],
                    ['name' => 'Unlimited Marketplace', 'description' => 'Create unlimited marketplace items', 'icon' => 'ShoppingCart', 'is_unlimited' => true, 'sort_order' => 4],
                    ['name' => 'Unlimited Campaign Pages', 'description' => 'Create unlimited campaign pages', 'icon' => 'FileText', 'is_unlimited' => true, 'sort_order' => 5],
                    ['name' => 'Unlimited Push Newsletter Alerts', 'description' => 'Send unlimited push notifications (FREE)', 'icon' => 'Bell', 'is_unlimited' => true, 'sort_order' => 6],
                    ['name' => 'Unlimited Volunteer Management', 'description' => 'Manage unlimited volunteers and groups', 'icon' => 'Users', 'is_unlimited' => true, 'sort_order' => 7],
                ],
            ],
            [
                'name' => 'Impact Pro',
                'price' => 25.00,
                'frequency' => 'monthly',
                'description' => 'For organizations making a big impact',
                'is_active' => true,
                'is_popular' => false,
                'sort_order' => 3,
                'custom_fields' => [
                    [
                        'key' => 'emails_included',
                        'label' => 'Emails Included',
                        'value' => '5,000',
                        'type' => 'number',
                        'icon' => 'Mail',
                    ],
                    [
                        'key' => 'ai_tokens',
                        'label' => 'AI Assistant',
                        'value' => 'Token Re-ups ($5 per 50K tokens) + Auto Re-Up',
                        'type' => 'text',
                        'icon' => 'Bot',
                    ],
                    [
                        'key' => 'ein_setup_fee',
                        'label' => 'EIN Setup Fee',
                        'value' => '10.00',
                        'type' => 'currency',
                        'icon' => 'DollarSign',
                    ],
                    [
                        'key' => 'support_level',
                        'label' => 'Support Level',
                        'value' => 'Success onboarding',
                        'type' => 'text',
                        'icon' => 'Shield',
                    ],
                ],
                'features' => [
                    ['name' => 'Unlimited Events', 'description' => 'Create unlimited events', 'icon' => 'Calendar', 'is_unlimited' => true, 'sort_order' => 1],
                    ['name' => 'Unlimited Courses', 'description' => 'Create unlimited courses', 'icon' => 'GraduationCap', 'is_unlimited' => true, 'sort_order' => 2],
                    ['name' => 'Unlimited Donations', 'description' => 'Accept unlimited donations', 'icon' => 'Heart', 'is_unlimited' => true, 'sort_order' => 3],
                    ['name' => 'Unlimited Marketplace', 'description' => 'Create unlimited marketplace items', 'icon' => 'ShoppingCart', 'is_unlimited' => true, 'sort_order' => 4],
                    ['name' => 'Unlimited Campaign Pages', 'description' => 'Create unlimited campaign pages', 'icon' => 'FileText', 'is_unlimited' => true, 'sort_order' => 5],
                    ['name' => 'Unlimited Push Newsletter Alerts', 'description' => 'Send unlimited push notifications (FREE)', 'icon' => 'Bell', 'is_unlimited' => true, 'sort_order' => 6],
                    ['name' => 'Unlimited Volunteer Management', 'description' => 'Manage unlimited volunteers and groups', 'icon' => 'Users', 'is_unlimited' => true, 'sort_order' => 7],
                ],
            ],
        ];

        foreach ($plans as $planData) {
            $this->command->info("Creating plan: {$planData['name']}");

            // Create Stripe product and price if Cashier is configured
            $stripeProductId = null;
            $stripePriceId = null;

            if (config('cashier.key')) {
                try {
                    $stripe = Cashier::stripe();

                    // Create Stripe product
                    $product = $stripe->products->create([
                        'name' => $planData['name'],
                        'description' => $planData['description'] ?? '',
                    ]);
                    $stripeProductId = $product->id;

                    // Create Stripe price
                    $priceData = [
                        'product' => $product->id,
                        'unit_amount' => (int)($planData['price'] * 100), // Convert to cents
                        'currency' => 'usd',
                    ];

                    // Add recurring interval for subscription plans
                    if ($planData['frequency'] !== 'one-time') {
                        $interval = 'month';
                        if ($planData['frequency'] === 'yearly') {
                            $interval = 'year';
                        } elseif ($planData['frequency'] === 'weekly') {
                            $interval = 'week';
                        }

                        $priceData['recurring'] = [
                            'interval' => $interval,
                        ];
                    }

                    $price = $stripe->prices->create($priceData);
                    $stripePriceId = $price->id;

                    $this->command->info("  ✓ Created Stripe product and price");
                } catch (\Exception $e) {
                    $this->command->warn("  ⚠ Failed to create Stripe product/price: " . $e->getMessage());
                }
            } else {
                $this->command->warn("  ⚠ Stripe not configured, skipping Stripe product/price creation");
            }

            // Create plan
            $features = $planData['features'];
            unset($planData['features']);

            $plan = Plan::create([
                ...$planData,
                'stripe_product_id' => $stripeProductId,
                'stripe_price_id' => $stripePriceId,
            ]);

            // Create plan features
            foreach ($features as $featureData) {
                PlanFeature::create([
                    'plan_id' => $plan->id,
                    'name' => $featureData['name'],
                    'description' => $featureData['description'] ?? null,
                    'icon' => $featureData['icon'] ?? null,
                    'is_unlimited' => $featureData['is_unlimited'] ?? false,
                    'sort_order' => $featureData['sort_order'] ?? 0,
                ]);
            }

            $this->command->info("  ✓ Created plan with " . count($features) . " features");
        }

        $this->command->info('Plans seeded successfully!');
    }
}































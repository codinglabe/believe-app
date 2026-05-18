<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\LivestockUser;
use Stripe\Stripe;
use Stripe\Customer;
use Stripe\Exception\InvalidRequestException;

class CreateStripeCustomerForLivestockUsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Set Stripe secret key from your .env
        Stripe::setApiKey(config('cashier.secret'));

        $this->command->info('Starting to create/verify Stripe customers for livestock users...');

        // Get all livestock users
        $users = LivestockUser::all();

        if ($users->isEmpty()) {
            $this->command->warn('No livestock users found.');
            return;
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($users as $user) {
            try {
                // If user already has a stripe_id, verify it exists in Stripe
                if ($user->stripe_id) {
                    try {
                        // Try to retrieve the customer from Stripe
                        $existingCustomer = Customer::retrieve($user->stripe_id);
                        
                        // If customer exists, update it with current information
                        Customer::update($user->stripe_id, [
                            'name' => $user->name,
                            'email' => $user->email,
                        ]);

                        $this->command->info("✅ Verified and updated Stripe customer for: {$user->email} ({$user->stripe_id})");
                        $updated++;
                        
                    } catch (InvalidRequestException $e) {
                        // Customer doesn't exist in Stripe, create a new one
                        $this->command->warn("⚠️  Stripe customer {$user->stripe_id} not found in Stripe. Creating new customer...");
                        
                        $customer = Customer::create([
                            'name' => $user->name,
                            'email' => $user->email,
                        ]);

                        $user->update([
                            'stripe_id' => $customer->id,
                        ]);

                        $this->command->info("✅ Created new Stripe customer for: {$user->email} ({$customer->id})");
                        $created++;
                    }
                } else {
                    // User doesn't have a stripe_id, create a new Stripe customer
                    $customer = Customer::create([
                        'name' => $user->name,
                        'email' => $user->email,
                    ]);

                    $user->update([
                        'stripe_id' => $customer->id,
                    ]);

                    $this->command->info("✅ Created Stripe customer for: {$user->email} ({$customer->id})");
                    $created++;
                }
                
            } catch (\Exception $e) {
                $this->command->error("❌ Failed for {$user->email}: " . $e->getMessage());
                $errors++;
            }
        }

        $this->command->info("\n=== Summary ===");
        $this->command->info("Created: {$created}");
        $this->command->info("Updated: {$updated}");
        $this->command->info("Skipped: {$skipped}");
        $this->command->info("Errors: {$errors}");
        $this->command->info("Total processed: " . $users->count());
    }
}

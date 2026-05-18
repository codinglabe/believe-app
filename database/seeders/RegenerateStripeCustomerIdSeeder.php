<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Stripe\Stripe;
use Stripe\Customer;

class RegenerateStripeCustomerIdSeeder extends Seeder
{
    public function run(): void
    {
        // Set Stripe secret key from your .env
        Stripe::setApiKey(config('cashier.secret'));

        // Get users who already have a stripe_id (you can adjust the condition)
        $users = User::whereNotNull('stripe_id')->get();

        foreach ($users as $user) {
            try {
                // Delete old Stripe customer (optional, but careful with live mode!)
                // Customer::delete($user->stripe_id);

                // Create new Stripe customer
                $customer = Customer::create([
                    'name' => $user->name,
                    'email' => $user->email,
                ]);

                // Update in database
                $user->update([
                    'stripe_id' => $customer->id,
                ]);

                $this->command->info("✅ Regenerated Stripe customer for: {$user->email} ({$customer->id})");

            } catch (\Exception $e) {
                $this->command->error("❌ Failed for {$user->email}: " . $e->getMessage());
            }
        }
    }
}

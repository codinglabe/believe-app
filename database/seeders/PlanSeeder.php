<?php

use App\Models\Organization;
use App\Models\Plan;
use Stripe\Stripe;
use Stripe\Product;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run()
    {
        Stripe::setApiKey(config('cashier.secret'));

        $organizations = Organization::all();

        if ($organizations->isEmpty()) {
            $this->command->warn("No organizations found!");
            return;
        }

        foreach ($organizations as $organization) {
            // Create a Stripe Product for the organization
            $stripeProduct = Product::create([
                'name' => $organization->name,
                'description' => "Donations for {$organization->name}",
            ]);
            $organization->stripe_product_id = $stripeProduct->id;
            $organization->save();
        }

        $this->command->info("Stripe products created for all organizations.");
    }
}

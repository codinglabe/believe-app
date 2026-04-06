<?php

namespace Database\Seeders;

use App\Models\Merchant;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class MerchantSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create a test merchant for login
        Merchant::create([
            'name' => 'Test Merchant',
            'email' => 'merchant@test.com',
            'password' => Hash::make('password'),
            'business_name' => 'Test Business',
            'business_description' => 'This is a test merchant account for development.',
            'phone' => '+1234567890',
            'address' => '123 Test Street',
            'city' => 'Test City',
            'state' => 'TS',
            'zip_code' => '12345',
            'country' => 'USA',
            'status' => 'active',
            'role' => 'merchant',
            'email_verified_at' => now(),
        ]);

        // Create an admin merchant
        Merchant::create([
            'name' => 'Admin Merchant',
            'email' => 'admin@merchant.com',
            'password' => Hash::make('password'),
            'business_name' => 'Admin Business',
            'status' => 'active',
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $this->command->info('Merchants seeded successfully!');
        $this->command->info('Test Merchant: merchant@test.com / password');
        $this->command->info('Admin Merchant: admin@merchant.com / password');
    }
}

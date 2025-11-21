<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TestOrganizationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get or create a test user for the organization
        $user = User::firstOrCreate(
            ['email' => 'org.test@example.com'],
            [
                'name' => 'Test Organization User',
                'email' => 'org.test@example.com',
                'email_verified_at' => now(),
                'password' => bcrypt('password'),
            ]
        );

        // Create test organization
        Organization::firstOrCreate(
            ['ein' => '12-3456789'],
            [
                'user_id' => $user->id,
                'ein' => '12-3456789',
                'name' => 'Test Nonprofit Organization',
                'ico' => null,
                'street' => '123 Main Street',
                'city' => 'New York',
                'state' => 'NY',
                'zip' => '10001',
                'classification' => '501(c)(3)',
                'ruling' => 'Public Charity',
                'deductibility' => 'Contributions are deductible',
                'organization' => 'Corporation',
                'status' => 'Active',
                'tax_period' => '2024',
                'filing_req' => '990',
                'ntee_code' => 'P20',
                'email' => 'contact@testnonprofit.org',
                'phone' => '(555) 123-4567',
                'contact_name' => 'John Doe',
                'contact_title' => 'Executive Director',
                'website' => 'https://testnonprofit.org',
                'description' => 'A test nonprofit organization dedicated to community service and social impact. We work to improve the lives of individuals and families through various programs and initiatives.',
                'mission' => 'Our mission is to create positive change in our community by providing essential services, supporting education, and fostering community engagement.',
                'registration_status' => 'approved',
                'has_edited_irs_data' => false,
                'balance' => 0.00,
                'tax_compliance_status' => 'compliant',
                'is_compliance_locked' => false,
                'social_accounts' => [
                    'facebook' => 'https://facebook.com/testnonprofit',
                    'twitter' => 'https://twitter.com/testnonprofit',
                    'instagram' => 'https://instagram.com/testnonprofit',
                ],
            ]
        );

        $this->command->info('Test organization created successfully!');
        $this->command->info('Email: org.test@example.com');
        $this->command->info('Password: password');
        $this->command->info('EIN: 12-3456789');
    }
}


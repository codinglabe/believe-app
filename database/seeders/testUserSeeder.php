<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class testUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            [
                'name' => 'Organization',
                'email' => 'organization@501c3ers.com',
                'password' => Hash::make('12345678'),
                'role' => 'organization',
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Supporter',
                'email' => 'supporter@501c3ers.com',
                'password' => Hash::make('12345678'),
                'role' => 'user',
                'email_verified_at' => now(),
            ]
        ];

        foreach ($data as $userData) {
            $user = \App\Models\User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );

            if (!$user->roles()->exists()) {
                $user->assignRole($userData['role']);
            }

            // If organization, create associated organization record
            if ($userData['role'] === 'organization') {
                Organization::updateOrCreate(
                    ['ein' => '001028397'],
                    [
                        'user_id' => $user->id,
                        'name' => 'TEST ORGANIZATION FOR SEEDING',
                        'ein' => '001028397',
                        'ico' => 'ICO123456',
                        'street' => '123 Test Lane',
                        'city' => 'Testville',
                        'state' => 'CA',
                        'zip' => '90001',
                        'classification' => 'Public Charity',
                        'ruling' => '2020',
                        'deductibility' => 'Yes',
                        'organization' => 'Corporation',
                        'status' => 'Active',
                        'tax_period' => '202312',
                        'filing_req' => '990',
                        'ntee_code' => 'B20',
                        'email' => $userData['email'],
                        'phone' => '1234567890',
                        'contact_name' => $userData['name'],
                        'contact_title' => 'Founder',
                        'website' => 'https://501c3ers.com',
                        'description' => 'Seeded organization for testing.',
                        'mission' => 'Support nonprofits with essential tools.',
                        'registration_status' => 'approved',
                        'has_edited_irs_data' => false,
                        'original_irs_data' => null,
                    ]
                );
            }
        }
    }
}

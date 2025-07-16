<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
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

        // Assuming you have a User model and a way to insert these records
        foreach ($data as $userData) {
            // This is a simple example; you might want to check for existing users based on email
            $user = \App\Models\User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );
            //if don't have any roles assing default role if the userData['role'] wise assign role
            //if the user don't have any roles assign default role if the userData['role'] wise assign role
            if (!$user->roles()->exists() && $userData['role'] === 'organization') {
                $user->assignRole('organization');
            } elseif (!$user->roles()->exists() && $userData['role'] === 'user') {
                $user->assignRole('user');
            }
        }
    }
}

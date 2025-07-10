<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class assignRole extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::create([
            "name"=> "Admin",
            "email" => "admin@501c3ers.com",
            "password" => Hash::make("12345678"),
            "email_verified_at" => now(),
            "role" => "admin"
        ]);
        $user->assignRole('admin');
    }
}

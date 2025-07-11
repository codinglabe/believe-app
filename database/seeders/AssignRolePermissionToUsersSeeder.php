<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class AssignRolePermissionToUsersSeeder extends Seeder
{
    public function run(): void
    {
        $roles = Role::pluck('name')->toArray(); // ['user', 'organization', 'admin']

        foreach ($roles as $roleName) {
            // Get users that have this role in their `role` column
            $users = User::where('role', $roleName)->get();

            foreach ($users as $user) {
                $user->syncRoles([$roleName]); // Assign role from DB
                $this->command->info("Assigned '{$roleName}' role to user ID {$user->id}");
            }
        }
    }
}

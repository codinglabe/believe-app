<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class LivestockPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define livestock management permissions
        $modules = [
            'admin.livestock' => ['read', 'create', 'edit', 'update', 'delete', 'manage', 'verify', 'reject', 'approve'],
            'livestock.seller' => ['read', 'create', 'edit', 'update', 'delete', 'manage'],
            'livestock.animal' => ['read', 'create', 'edit', 'update', 'delete', 'manage'],
            'livestock.listing' => ['read', 'create', 'edit', 'update', 'delete', 'manage', 'publish', 'unpublish'],
            'livestock.breeding' => ['read', 'create', 'edit', 'update', 'delete', 'manage'],
            'livestock.health' => ['read', 'create', 'edit', 'update', 'delete', 'manage'],
            'livestock.payout' => ['read', 'create', 'edit', 'update', 'delete', 'manage', 'approve', 'reject'],
            'livestock.marketplace' => ['read', 'purchase', 'manage'],
        ];

        $this->command->info("Seeding Livestock Management permissions...");

        // Create all permissions
        foreach ($modules as $module => $actions) {
            foreach ($actions as $action) {
                $permissionName = $module . '.' . $action;

                $permission = Permission::firstOrCreate([
                    'name' => $permissionName,
                    'guard_name' => 'web',
                ]);

                $this->command->info("Created permission: {$permissionName}");
            }
        }

        // Get or create admin role
        $adminRole = Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);

        // Assign all livestock permissions to admin
        $livestockPermissions = Permission::where('name', 'like', 'admin.livestock.%')
            ->orWhere('name', 'like', 'livestock.%')
            ->get();

        foreach ($livestockPermissions as $permission) {
            if (!$adminRole->hasPermissionTo($permission)) {
                $adminRole->givePermissionTo($permission);
                $this->command->info("Assigned permission {$permission->name} to admin role");
            }
        }

        // Country Management Permissions
        $countryPermissions = [
            'admin.countries.read',
            'admin.countries.create',
            'admin.countries.update',
            'admin.countries.delete',
        ];

        foreach ($countryPermissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        // Assign country permissions to admin role
        foreach ($countryPermissions as $permission) {
            if (!$adminRole->hasPermissionTo($permission)) {
                $adminRole->givePermissionTo($permission);
                $this->command->info("Assigned permission {$permission} to admin role");
            }
        }

        $this->command->info("Livestock permissions seeded successfully!");
    }
}




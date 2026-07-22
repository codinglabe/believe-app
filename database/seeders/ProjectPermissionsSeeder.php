<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Additive seeder for Project Management permissions on already-seeded environments.
 * Safe to re-run (firstOrCreate + givePermissionTo checks).
 */
class ProjectPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $actions = ['read', 'create', 'edit', 'update', 'delete', 'manage'];
        $permissionNames = [];

        foreach ($actions as $action) {
            $name = 'project.'.$action;
            Permission::firstOrCreate([
                'name' => $name,
                'guard_name' => 'web',
            ]);
            $permissionNames[] = $name;
        }

        foreach (['admin', 'organization', 'care_alliance'] as $roleName) {
            $role = Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => 'web',
            ]);

            foreach ($permissionNames as $permissionName) {
                if (! $role->hasPermissionTo($permissionName)) {
                    $role->givePermissionTo($permissionName);
                }
            }
        }
    }
}

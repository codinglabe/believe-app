<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class OrganizationPendingRoleSeeder extends Seeder
{
    public function run(): void
    {
        $permission = Permission::firstOrCreate([
            'name' => 'dashboard.read',
            'guard_name' => 'web',
        ]);

        $pendingRole = Role::firstOrCreate([
            'name' => 'organization_pending',
            'guard_name' => 'web',
        ]);

        $pendingRole->syncPermissions([$permission]);
    }
}

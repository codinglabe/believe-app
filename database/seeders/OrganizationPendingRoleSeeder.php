<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class OrganizationPendingRoleSeeder extends Seeder
{
    public function run(): void
    {
        $dashboard = Permission::firstOrCreate([
            'name' => 'dashboard.read',
            'guard_name' => 'web',
        ]);

        $aiMediaRead = Permission::firstOrCreate([
            'name' => 'ai.media.read',
            'guard_name' => 'web',
        ]);

        $aiMediaCreate = Permission::firstOrCreate([
            'name' => 'ai.media.create',
            'guard_name' => 'web',
        ]);

        $pendingRole = Role::firstOrCreate([
            'name' => 'organization_pending',
            'guard_name' => 'web',
        ]);

        $pendingRole->syncPermissions([$dashboard, $aiMediaRead, $aiMediaCreate]);
    }
}

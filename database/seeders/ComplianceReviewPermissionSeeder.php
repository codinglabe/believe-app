<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ComplianceReviewPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permission = Permission::firstOrCreate([
            'name' => 'compliance.review',
            'guard_name' => 'web',
        ]);

        $adminRole = Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);

        $adminRole->givePermissionTo($permission);
    }
}


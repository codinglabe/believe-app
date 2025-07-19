<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class permissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $bases = [
            'about',
            'impact',
            'details',
            'products',
            'contact',
            'donation',
            'favorite',
            'payment.method',
            'withdraw',
            'supporter',
            'rating',
            'review',
            'payments',
            'node.boss'
        ];
        $prefixes = ['.read','.create', '.edit', '.update', '.delete'];

        // Make sure the role exists
        $adminRole = Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);
        $organizationRole = Role::firstOrCreate([
            'name' => 'organization',
            'guard_name' => 'web',
        ]);
        foreach ($bases as $base) {
            foreach ($prefixes as $prefix) {
                $permissionName = $base . $prefix;

                $permission = Permission::firstOrCreate([
                    'name' => $permissionName,
                    'guard_name' => 'web',
                ]);

                // Assign to role
                if (!$adminRole->hasPermissionTo($permission)) {
                    $adminRole->givePermissionTo($permission);
                }
                if (!$organizationRole->hasPermissionTo($permission)) {
                    $organizationRole->givePermissionTo($permission);
                }
            }
        }
    }
}

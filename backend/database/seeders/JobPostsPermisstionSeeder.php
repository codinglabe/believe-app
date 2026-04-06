<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class JobPostsPermisstionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $bases = [
            'job.position.categories',
            'job.positions',
            'job.posts',
        ];
        $prefixes = ['.read', '.create', '.edit', '.update', '.delete'];

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

                if (!$organizationRole->hasPermissionTo($permission)) {
                    $organizationRole->givePermissionTo($permission);
                }
            }
        }
    }
}

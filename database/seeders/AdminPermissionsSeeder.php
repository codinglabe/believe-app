<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AdminPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $bases = [
            'dashbord.management',
            'user.management',
            'upload.data',
            'management.data',
            'code.management',
            'classificaiton.code',
            'status.code',
            'deductibility.code', // ✅ fixed typo
            'profile',
            'payment.management',
            'organization.management',
            'supporter.management',
            'permission.management',
            'role.management',
            'ntee.code',
            'chat'
        ];

        $prefixes = ['.read', '.create', '.edit', '.update', '.delete'];

        // Make sure the role exists
        $adminRole = Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);

        $this->command->info("Seeding permissions and assigning to 'admin' role...");

        foreach ($bases as $base) {
            foreach ($prefixes as $prefix) {
                $permissionName = $base . $prefix;

                $permission = Permission::firstOrCreate([
                    'name' => $permissionName,
                    'guard_name' => 'web',
                ]);

                if ($permission->wasRecentlyCreated) {
                    $this->command->info("✅ Created permission: {$permissionName}");
                } else {
                    $this->command->line("✔️  Permission exists: {$permissionName}");
                }

                if (!$adminRole->hasPermissionTo($permission)) {
                    $adminRole->givePermissionTo($permission);
                    $this->command->info("✅ Assigned '{$permissionName}' to 'admin' role");
                } else {
                    $this->command->line("✔️  'admin' role already has permission: {$permissionName}");
                }
            }
        }

        $this->command->info("✅ Admin permissions seeding completed!");
    }
}

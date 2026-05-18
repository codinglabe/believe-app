<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        $names = [
            'ai.media.read',
            'ai.media.create',
            'ai.media.edit',
            'ai.media.update',
            'ai.media.delete',
            'ai.media.manage',
        ];

        foreach ($names as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $grant = static function (Role $role, array $perms): void {
            $role->givePermissionTo($perms);
        };

        foreach (['organization', 'user', 'organization_pending'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', 'web')->first();
            if ($role) {
                $grant($role, ['ai.media.read', 'ai.media.create']);
            }
        }

        $admin = Role::query()->where('name', 'admin')->where('guard_name', 'web')->first();
        if ($admin) {
            $admin->givePermissionTo($names);
        }

        $care = Role::query()->where('name', 'care_alliance')->where('guard_name', 'web')->first();
        if ($care) {
            $grant($care, ['ai.media.read', 'ai.media.create']);
        }
    }

    public function down(): void
    {
        $names = [
            'ai.media.read',
            'ai.media.create',
            'ai.media.edit',
            'ai.media.update',
            'ai.media.delete',
            'ai.media.manage',
        ];

        foreach ($names as $name) {
            $perm = Permission::query()->where('name', $name)->where('guard_name', 'web')->first();
            if (! $perm) {
                continue;
            }
            $perm->roles()->detach();
            $perm->users()->detach();
            $perm->delete();
        }
    }
};

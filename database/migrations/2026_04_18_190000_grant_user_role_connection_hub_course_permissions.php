<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Supporters use the "user" role. Profile Connection Hub routes require course.create/edit/update/delete;
 * the seeder was updated accordingly — this applies the same grants to existing databases.
 */
return new class extends Migration
{
    private const PERMISSIONS = [
        'course.create',
        'course.edit',
        'course.update',
        'course.delete',
    ];

    public function up(): void
    {
        foreach (self::PERMISSIONS as $name) {
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
            );
        }

        $role = Role::query()
            ->where('name', 'user')
            ->where('guard_name', 'web')
            ->first();

        if ($role) {
            $role->givePermissionTo(self::PERMISSIONS);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $role = Role::query()
            ->where('name', 'user')
            ->where('guard_name', 'web')
            ->first();

        if ($role) {
            $role->revokePermissionTo(self::PERMISSIONS);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};

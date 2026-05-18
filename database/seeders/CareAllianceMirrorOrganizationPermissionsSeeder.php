<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

/**
 * Keeps the care_alliance Spatie role in lockstep with organization permissions.
 * Run after every seeder that assigns permissions to organization (see DatabaseSeeder order).
 */
class CareAllianceMirrorOrganizationPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $organization = Role::query()
            ->where('name', 'organization')
            ->where('guard_name', 'web')
            ->first();

        if (! $organization) {
            $this->command?->warn('Organization role not found; skipping care_alliance permission mirror.');

            return;
        }

        $careAlliance = Role::query()->firstOrCreate(
            ['name' => 'care_alliance', 'guard_name' => 'web'],
            ['name' => 'care_alliance', 'guard_name' => 'web']
        );

        $organization->load('permissions');
        $careAlliance->syncPermissions($organization->permissions);
    }
}

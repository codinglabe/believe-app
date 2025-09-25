<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ComprehensivePermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define all modules and their permissions
        $modules = [
            // Core modules
            'user' => ['read', 'create', 'edit', 'update', 'delete', 'manage'],
            'role' => ['read', 'create', 'edit', 'update', 'delete', 'manage'],
            'permission' => ['read', 'create', 'edit', 'update', 'delete', 'manage'],

            // Event management
            'event' => ['read', 'create', 'edit', 'update', 'delete', 'manage', 'publish', 'unpublish'],

            // Organization management
            'organization' => ['read', 'create', 'edit', 'update', 'delete', 'manage', 'verify', 'approve'],

            // Content management
            'about' => ['read', 'create', 'edit', 'update', 'delete'],
            'impact' => ['read', 'create', 'edit', 'update', 'delete'],
            'details' => ['read', 'create', 'edit', 'update', 'delete'],
            'products' => ['read', 'create', 'edit', 'update', 'delete'],
            'contact' => ['read', 'create', 'edit', 'update', 'delete'],

            // Financial modules
            'donation' => ['read', 'create', 'edit', 'update', 'delete', 'process', 'refund'],
            'payment.method' => ['read', 'create', 'edit', 'update', 'delete'],
            'withdraw' => ['read', 'create', 'edit', 'update', 'delete', 'approve', 'reject'],
            'payments' => ['read', 'create', 'edit', 'update', 'delete', 'process'],

            // Social features
            'favorite' => ['read', 'create', 'edit', 'update', 'delete'],
            'supporter' => ['read', 'create', 'edit', 'update', 'delete'],
            'rating' => ['read', 'create', 'edit', 'update', 'delete'],
            'review' => ['read', 'create', 'edit', 'update', 'delete'],

            // Educational modules
            'course' => ['read', 'create', 'edit', 'update', 'delete', 'enroll', 'manage'],
            'topic' => ['read', 'create', 'edit', 'update', 'delete'],
            'node.boss' => ['read', 'create', 'edit', 'update', 'delete'],

            // NTEE and Classification
            'ntee.code' => ['read', 'create', 'edit', 'update', 'delete'],
            'classification.code' => ['read', 'create', 'edit', 'update', 'delete'],
            'status.code' => ['read', 'create', 'edit', 'update', 'delete'],
            'deductibility.code' => ['read', 'create', 'edit', 'update', 'delete'],

            // Job Management
            'job.posts' => ['read', 'create', 'edit', 'update', 'delete'],
            'job.positions' => ['read', 'create', 'edit', 'update', 'delete'],
            'job.position.categories' => ['read', 'create', 'edit', 'update', 'delete'],

            // E-commerce
            'product' => ['read', 'create', 'edit', 'update', 'delete'],
            'category' => ['read', 'create', 'edit', 'update', 'delete'],
            'ecommerce' => ['read', 'create', 'edit', 'update', 'delete'],

            // Data Management
            'data.management' => ['read', 'create', 'edit', 'update', 'delete'],

            // Node Management
            'node.referral' => ['read', 'create', 'edit', 'update', 'delete'],
            'withdrawal' => ['read', 'create', 'edit', 'update', 'delete'],

            // Communication
            'communication' => ['read', 'create', 'edit', 'update', 'delete'],

            // Newsletter Management
            'newsletter' => ['read', 'create', 'edit', 'update', 'delete', 'send', 'manage'],
            'newsletter.template' => ['read', 'create', 'edit', 'update', 'delete', 'manage'],
            'newsletter.recipient' => ['read', 'create', 'edit', 'update', 'delete', 'manage'],

            // Role Management
            'role.management' => ['read', 'create', 'edit', 'update', 'delete'],

            // Dashboard and reports
            'dashboard' => ['read', 'admin', 'organization', 'user'],
            'reports' => ['read', 'create', 'export', 'manage'],

            // Settings
            'settings' => ['read', 'create', 'edit', 'update', 'delete'],

            // Profile management
            'profile' => ['read', 'edit', 'update'],

            // Raffle Management
            'raffle' => ['read', 'create', 'edit', 'update', 'delete', 'purchase', 'draw'],
        ];

        // Create all permissions
        foreach ($modules as $module => $actions) {
            foreach ($actions as $action) {
                $permissionName = $module . '.' . $action;

                Permission::firstOrCreate([
                    'name' => $permissionName,
                    'guard_name' => 'web',
                ]);
            }
        }

        // Create roles
        $adminRole = Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);

        $organizationRole = Role::firstOrCreate([
            'name' => 'organization',
            'guard_name' => 'web',
        ]);

        $userRole = Role::firstOrCreate([
            'name' => 'user',
            'guard_name' => 'web',
        ]);

        // Assign permissions to roles
        $this->assignAdminPermissions($adminRole);
        $this->assignOrganizationPermissions($organizationRole);
        $this->assignUserPermissions($userRole);
    }

    private function assignAdminPermissions(Role $role): void
    {
        // Admin gets all permissions
        $allPermissions = Permission::all();
        $role->syncPermissions($allPermissions);
    }

    private function assignOrganizationPermissions(Role $role): void
    {
        $permissions = [
            // Event Management - Full access
            'event.read', 'event.create', 'event.edit', 'event.update', 'event.delete', 'event.manage',

            // Course Management - Full access
            'course.read', 'course.create', 'course.edit', 'course.update', 'course.delete', 'course.manage',
            'topic.read', 'topic.create', 'topic.edit', 'topic.update', 'topic.delete',

            // Job Management - Full access
            'job.posts.read', 'job.posts.create', 'job.posts.edit', 'job.posts.update', 'job.posts.delete',
            'job.positions.read', 'job.positions.create', 'job.positions.edit', 'job.positions.update', 'job.positions.delete',
            'job.position.categories.read', 'job.position.categories.create', 'job.position.categories.edit', 'job.position.categories.update', 'job.position.categories.delete',

            // E-commerce - Full access
            'product.read', 'product.create', 'product.edit', 'product.update', 'product.delete',
            'category.read', 'category.create', 'category.edit', 'category.update', 'category.delete',
            'ecommerce.read', 'ecommerce.create', 'ecommerce.edit', 'ecommerce.update', 'ecommerce.delete',

            // Communication - Full access
            'communication.read', 'communication.create', 'communication.edit', 'communication.update', 'communication.delete',

            // Newsletter Management - Full access
            'newsletter.read', 'newsletter.create', 'newsletter.edit', 'newsletter.update', 'newsletter.delete', 'newsletter.send', 'newsletter.manage',
            'newsletter.template.read', 'newsletter.template.create', 'newsletter.template.edit', 'newsletter.template.update', 'newsletter.template.delete', 'newsletter.template.manage',
            'newsletter.recipient.read', 'newsletter.recipient.create', 'newsletter.recipient.edit', 'newsletter.recipient.update', 'newsletter.recipient.delete', 'newsletter.recipient.manage',

            // Raffle Management - Full access
            'raffle.read', 'raffle.create', 'raffle.edit', 'raffle.update', 'raffle.delete', 'raffle.draw',

            // Organization management - Limited access
            'organization.read', 'organization.edit', 'organization.update',

            // Dashboard and Profile
            'dashboard.read', 'dashboard.organization',
            'profile.read', 'profile.edit', 'profile.update',
        ];

        $role->syncPermissions($permissions);
    }

    private function assignUserPermissions(Role $role): void
    {
        $permissions = [
            // Event management (limited)
            'event.read', 'event.create', 'event.edit', 'event.update', 'event.delete',

            // Organization management (view only)
            'organization.read',

            // Content management (view only)
            'about.read', 'impact.read', 'details.read', 'products.read', 'contact.read',

            // Financial modules (limited)
            'donation.read', 'donation.create',
            'payment.method.read', 'payment.method.create',
            'withdraw.read', 'withdraw.create',
            'payments.read',

            // Social features
            'favorite.read', 'favorite.create', 'favorite.edit', 'favorite.update', 'favorite.delete',
            'supporter.read', 'supporter.create', 'supporter.edit', 'supporter.update', 'supporter.delete',
            'rating.read', 'rating.create', 'rating.edit', 'rating.update', 'rating.delete',
            'review.read', 'review.create', 'review.edit', 'review.update', 'review.delete',

            // Educational modules
            'course.read', 'course.enroll',
            'node.boss.read',

            // NTEE and Classification Codes (view only)
            'ntee.code.read',
            'classification.code.read',
            'status.code.read',
            'deductibility.code.read',

            // Job Management (view only)
            'job.posts.read',
            'job.positions.read',
            'job.position.categories.read',

            // E-commerce (view only)
            'product.read',
            'category.read',
            'ecommerce.read',

            // Raffle Management (purchase only)
            'raffle.read', 'raffle.purchase',

            // Newsletter Management (read only)
            'newsletter.read',

            // Dashboard
            'dashboard.read', 'dashboard.user',

            // Profile
            'profile.read', 'profile.edit', 'profile.update',
        ];

        $role->syncPermissions($permissions);
    }
}

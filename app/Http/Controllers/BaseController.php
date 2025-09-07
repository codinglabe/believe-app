<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as LaravelBaseController;

abstract class BaseController extends LaravelBaseController
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Check if user has permission
     */
    protected function hasPermission(Request $request, string $permission): bool
    {
        return $request->user()?->can($permission) ?? false;
    }

    /**
     * Check if user has any of the given permissions
     */
    protected function hasAnyPermission(Request $request, array $permissions): bool
    {
        $user = $request->user();
        if (!$user) return false;

        foreach ($permissions as $permission) {
            if ($user->can($permission)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if user has all of the given permissions
     */
    protected function hasAllPermissions(Request $request, array $permissions): bool
    {
        $user = $request->user();
        if (!$user) return false;

        foreach ($permissions as $permission) {
            if (!$user->can($permission)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if user has role
     */
    protected function hasRole(Request $request, string $role): bool
    {
        return $request->user()?->hasRole($role) ?? false;
    }

    /**
     * Check if user has any of the given roles
     */
    protected function hasAnyRole(Request $request, array $roles): bool
    {
        return $request->user()?->hasAnyRole($roles) ?? false;
    }

    /**
     * Check if user has all of the given roles
     */
    protected function hasAllRoles(Request $request, array $roles): bool
    {
        return $request->user()?->hasAllRoles($roles) ?? false;
    }

    /**
     * Authorize user has permission or throw exception
     */
    protected function authorizePermission(Request $request, string $permission): void
    {
        if (!$this->hasPermission($request, $permission)) {
            // If it's an AJAX request, return JSON response
            if ($request->expectsJson()) {
                abort(403, "You do not have permission to perform this action. Required permission: {$permission}");
            }

            // For web requests, show custom permission denied page
            abort(403, "You do not have permission to perform this action. Required permission: {$permission}");
        }
    }

    /**
     * Authorize user has role or throw exception
     */
    protected function authorizeRole(Request $request, string $role): void
    {
        if (!$this->hasRole($request, $role)) {
            abort(403, "You do not have the required role to perform this action. Required role: {$role}");
        }
    }

    /**
     * Authorize user has any of the given roles or throw exception
     */
    protected function authorizeAnyRole(Request $request, array $roles): void
    {
        if (!$this->hasAnyRole($request, $roles)) {
            abort(403, "You do not have any of the required roles to perform this action. Required roles: " . implode(', ', $roles));
        }
    }

    /**
     * Check if user is admin
     */
    protected function isAdmin(Request $request): bool
    {
        return $this->hasRole($request, 'admin');
    }

    /**
     * Check if user is organization
     */
    protected function isOrganization(Request $request): bool
    {
        return $this->hasRole($request, 'organization');
    }

    /**
     * Check if user is regular user
     */
    protected function isUser(Request $request): bool
    {
        return $this->hasRole($request, 'user');
    }

    /**
     * Get user's accessible modules
     */
    protected function getAccessibleModules(Request $request): array
    {
        $user = $request->user();
        if (!$user) return [];

        $permissions = $user->getAllPermissions()->pluck('name')->toArray();
        $modules = [];

        foreach ($permissions as $permission) {
            $parts = explode('.', $permission);
            if (count($parts) >= 2) {
                $modules[] = $parts[0];
            }
        }

        return array_unique($modules);
    }

    /**
     * Get user's permissions for a specific module
     */
    protected function getModulePermissions(Request $request, string $module): array
    {
        $user = $request->user();
        if (!$user) return [];

        $permissions = $user->getAllPermissions()->pluck('name')->toArray();
        return array_filter($permissions, function($permission) use ($module) {
            return str_starts_with($permission, $module . '.');
        });
    }

    /**
     * Check if user can perform CRUD operations on a module
     */
    protected function canCrud(Request $request, string $module): array
    {
        $permissions = $this->getModulePermissions($request, $module);
        
        return [
            'read' => in_array($module . '.read', $permissions),
            'create' => in_array($module . '.create', $permissions),
            'edit' => in_array($module . '.edit', $permissions),
            'update' => in_array($module . '.update', $permissions),
            'delete' => in_array($module . '.delete', $permissions),
            'manage' => in_array($module . '.manage', $permissions),
        ];
    }

    /**
     * Get user's role hierarchy level
     */
    protected function getRoleHierarchy(Request $request): int
    {
        $user = $request->user();
        if (!$user) return 0;

        $roleHierarchy = [
            'admin' => 3,
            'organization' => 2,
            'user' => 1,
        ];

        $userRole = $user->getRoleNames()->first();
        return $roleHierarchy[$userRole] ?? 0;
    }

    /**
     * Check if user has higher or equal role hierarchy
     */
    protected function hasHigherOrEqualRole(Request $request, string $requiredRole): bool
    {
        $userHierarchy = $this->getRoleHierarchy($request);
        
        $roleHierarchy = [
            'admin' => 3,
            'organization' => 2,
            'user' => 1,
        ];

        $requiredHierarchy = $roleHierarchy[$requiredRole] ?? 0;
        return $userHierarchy >= $requiredHierarchy;
    }
}

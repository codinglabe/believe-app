<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\User; // Assuming your User model is in App\Models
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission; // Import Spatie's Permission model
use Illuminate\Support\Facades\DB; // For database transactions

class RolePermissionController extends BaseController
{
    /**
     * Helper to get all permissions in the format expected by the frontend.
     */
    private function getAllPermissionsForFrontend()
    {
        return Permission::all()->map(function ($permission) {
            $parts = explode('.', $permission->name);
            $category = count($parts) > 1 ? ucfirst($parts[0]) : 'General';
            $name = ucwords(str_replace(['.', '_'], ' ', $permission->name));
            return [
                'id' => $permission->name,
                'name' => $name,
                'category' => $category,
            ];
        })->toArray();
    }

    /**
     * Display the dashboard overview.
     */
    public function index(Request $request): Response
    {
        // This page doesn't currently use dynamic data, but you could add stats here if needed.
        return Inertia::render('permission/permission-overview');
    }

    /**
     * Display the role management list.
     */
    public function roleManagement(Request $request): Response
    {
        $this->authorizePermission($request, 'role.management.read');
        
        $allPermissions = $this->getAllPermissionsForFrontend();
        $roles = Role::withCount('users')->paginate(9); // Eager load user count

        // Transform roles to match frontend structure
        $roles->getCollection()->transform(function ($role) {
            return [
                'id' => (string) $role->id,
                'name' => $role->name,
                'description' => $role->description ?? 'No description provided.', // Assuming 'description' column exists
                'permissions' => $role->permissions->pluck('name')->toArray(), // Get permission names
                'userCount' => $role->users_count,
                'color' => $role->color ?? 'bg-blue-500', // Use existing color or default
            ];
        });

        return Inertia::render('permission/roles/roles-list', [
            "roles" => $roles,
            "allPermissions" => $allPermissions, // Pass all available permissions
        ]);
    }

    /**
     * Display the user permission management list.
     */
    public function userPermission(Request $request): Response
    {
        $this->authorizePermission($request, 'role.management.read');
        
        $allPermissions = $this->getAllPermissionsForFrontend();

        $allRoles = Role::all()->map(fn($role) => [
            'id' => (string) $role->id,
            'name' => $role->name
        ])->toArray();

        $users = User::with('roles', 'permissions')->paginate(6);

        // Transform the paginator's collection:
        $users->getCollection()->transform(function ($user) {
            $primaryRole = $user->roles->first();

            return [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar ?? '/placeholder.svg?height=40&width=40',
                'role' => $primaryRole ? $primaryRole->name : 'No Role',
                'roleId' => $primaryRole ? (string) $primaryRole->id : null,
                'status' => $user->status ?? 'active',
                'lastLogin' => $user->last_login_at ? $user->last_login_at->toDateString() : 'N/A',
                'customPermissions' => $user->permissions->pluck('name')->toArray(),
                'joinedDate' => $user->created_at->toDateString(),
            ];
        });

        return Inertia::render('permission/users/users-list', [
            'users' => $users->withQueryString(),
            'allRoles' => $allRoles,
            'allPermissions' => $allPermissions,
        ]);
    }


    /**
     * Display the create role page.
     */
    public function createRole(Request $request): Response
    {
        $this->authorizePermission($request, 'role.management.create');
        
        $allPermissions = $this->getAllPermissionsForFrontend();
        return Inertia::render('permission/roles/create-role', [
            "allPermissions" => $allPermissions,
        ]);
    }

        /**
     * Store a newly created role in storage.
     */
public function storeRole(Request $request)
    {
        $this->authorizePermission($request, 'role.management.create');
        
        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'description' => 'nullable|string|max:1000',
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        DB::transaction(function () use ($request) {
            $role = Role::create([
                'name' => $request->name,
                'description' => $request->description,
                'guard_name' => 'web', // Or your desired guard
                'color' => 'bg-blue-500', // Default color, consider making this dynamic
            ]);
            
            // Debug: Log the permissions being synced
            \Log::info('Creating role with permissions: ' . $role->name, [
                'role_id' => $role->id,
                'permissions' => $request->permissions
            ]);
            
            $role->syncPermissions($request->permissions ?? []);
        });

        // Clear permission cache to ensure changes take effect immediately
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return redirect()->route('roles.list')->with('success', 'Role created successfully.');
    }

    /**
     * Display the edit role page.
     */
    public function editRole(Request $request, Role $role): Response
    {
        $this->authorizePermission($request, 'role.management.edit');
        
        $allPermissions = $this->getAllPermissionsForFrontend();
        $rolePermissions = $role->permissions->pluck('name')->toArray();

        return Inertia::render('permission/roles/edit-role', [
            "role" => [
                'id' => (string) $role->id,
                'name' => $role->name,
                'description' => $role->description ?? 'No description provided.',
                'permissions' => $rolePermissions,
            ],
            "allPermissions" => $allPermissions,
        ]);
    }

    /**
     * Update the specified role in storage.
     */
    public function updateRole(Request $request, Role $role)
    {
        $this->authorizePermission($request, 'role.management.update');
        
        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $role->id,
            'description' => 'nullable|string|max:1000',
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        DB::transaction(function () use ($request, $role) {
            $role->update([
                'name' => $request->name,
                'description' => $request->description,
            ]);
            
            // Debug: Log the permissions being synced
            \Log::info('Syncing permissions for role: ' . $role->name, [
                'role_id' => $role->id,
                'permissions' => $request->permissions
            ]);
            
            $role->syncPermissions($request->permissions ?? []);
        });

        // Clear permission cache to ensure changes take effect immediately
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return redirect()->route('roles.list')->with('success', 'Role updated successfully.');
    }

    /**
     * Remove the specified role from storage.
     */
    public function destroyRole(Request $request, Role $role)
    {
        $this->authorizePermission($request, 'role.management.delete');
        
        // Prevent deleting roles that have users assigned or are critical (e.g., 'Super Admin')
        if ($role->users()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete role with assigned users.');
        }

        DB::transaction(function () use ($role) {
            $role->delete();
        });

        return redirect()->route('roles.list')->with('success', 'Role deleted successfully.');
    }

    /**
     * Display the create user page.
     */
    public function createUser(Request $request): Response
    {
        $this->authorizePermission($request, 'role.management.create');
        
        $allPermissions = $this->getAllPermissionsForFrontend();
        $allRoles = Role::all()->map(fn($role) => ['id' => (string) $role->id, 'name' => $role->name])->toArray();
        return Inertia::render('permission/users/create-user', [
            "allPermissions" => $allPermissions,
            "allRoles" => $allRoles,
        ]);
    }

    /**
     * Store a newly created user in storage.
     */
    public function storeUser(Request $request)
    {
        $this->authorizePermission($request, 'role.management.create');
        
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8', // Add password validation
            'roleId' => 'nullable|exists:roles,id',
            'customPermissions' => 'array',
            'customPermissions.*' => 'string|exists:permissions,name',
        ]);

        DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => bcrypt($request->password), // Hash the password
                'status' => 'active', // Default status
                'last_login_at' => now(), // Set initial login time
            ]);

            if ($request->roleId) {
                $user->assignRole(Role::findById($request->roleId));
            }
            $user->givePermissionTo($request->customPermissions ?? []);
        });

        // Clear permission cache to ensure changes take effect immediately
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return to_route('users.list')->with('success', 'User created successfully.');
    }

    /**
     * Display the edit user page.
     */
    public function editUser(Request $request, User $user): Response
    {
        $this->authorizePermission($request, 'role.management.edit');
        
        $allPermissions = $this->getAllPermissionsForFrontend();
        $allRoles = Role::all()->map(fn($role) => [
            'id' => (string) $role->id,
            'name' => $role->name
        ])->toArray();

        $userPrimaryRole = $user->roles->first();

        // ✅ Get both direct and role-based permissions
        $userAllPermissions = $user->getAllPermissions()->pluck('name')->toArray();

        return Inertia::render('permission/users/edit-user', [
            "user" => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roleId' => $userPrimaryRole ? (string) $userPrimaryRole->id : null,
                'status' => $user->status ?? 'active',
                'customPermissions' => $userAllPermissions,
            ],
            "allPermissions" => $allPermissions,
            "allRoles" => $allRoles,
        ]);
    }


    /**
     * Update the specified user in storage.
     */
    public function updateUser(Request $request, User $user)
    {
        $this->authorizePermission($request, 'role.management.update');
        
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8', // Password is optional for update
            'roleId' => 'nullable|exists:roles,id',
            'status' => 'required|in:active,inactive',
            'customPermissions' => 'array',
            'customPermissions.*' => 'string|exists:permissions,name',
        ]);

        DB::transaction(function () use ($request, $user) {
            $user->update([
                'name' => $request->name,
                'email' => $request->email,
                'status' => $request->status,
                'password' => $request->password ? bcrypt($request->password) : $user->password,
            ]);

            // Debug: Log the role and permissions being synced
            \Log::info('Updating user permissions: ' . $user->name, [
                'user_id' => $user->id,
                'role_id' => $request->roleId,
                'custom_permissions' => $request->customPermissions
            ]);

            // Sync roles
            $user->syncRoles($request->roleId ? [Role::findById($request->roleId)] : []);

            // Sync direct permissions
            $user->syncPermissions($request->customPermissions ?? []);
        });

        // Clear permission cache to ensure changes take effect immediately
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return redirect()->route('users.list')->with('success', 'User updated successfully.');
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroyUser(Request $request, User $user)
    {
        $this->authorizePermission($request, 'role.management.delete');
        
        DB::transaction(function () use ($user) {
            $user->delete();
        });

        return redirect()->route('users.list')->with('success', 'User deleted successfully.');
    }
}

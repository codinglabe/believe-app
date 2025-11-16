<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\User; // Assuming your User model is in App\Models
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission; // Import Spatie's Permission model
use Illuminate\Support\Facades\DB; // For database transactions
use Illuminate\Support\Facades\Auth; // For authentication
use Illuminate\Support\Facades\Hash; // For password hashing

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
        // Get statistics
        $totalRoles = Role::count();
        $totalUsers = User::count();
        $totalPermissions = Permission::count();
        
        // Get unique permission categories
        $permissionCategories = Permission::all()
            ->map(function ($permission) {
                $parts = explode('.', $permission->name);
                return count($parts) > 1 ? ucfirst($parts[0]) : 'General';
            })
            ->unique()
            ->count();

        return Inertia::render('permission/permission-overview', [
            'statistics' => [
                'totalRoles' => $totalRoles,
                'activeUsers' => $totalUsers, // Using total users since status column doesn't exist
                'totalPermissions' => $totalPermissions,
                'categories' => $permissionCategories,
            ],
        ]);
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

        // Get search and filter parameters
        $search = $request->query('search', '');
        $roleFilter = $request->query('role', 'all');
        $statusFilter = $request->query('status', 'all');

        // Build query with filters
        // Exclude admin users from the list
        $query = User::with('roles', 'permissions')
            ->whereDoesntHave('roles', function ($q) {
                $q->where('name', 'admin');
            });

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($roleFilter !== 'all') {
            $query->whereHas('roles', function ($q) use ($roleFilter) {
                $q->where('roles.id', $roleFilter);
            });
        }

        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        $users = $query->latest()->paginate(12);

        // Transform the paginator's collection:
        $users->getCollection()->transform(function ($user) {
            $primaryRole = $user->roles->first();

            return [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->image ? asset('storage/' . $user->image) : null,
                'role' => $primaryRole ? $primaryRole->name : 'No Role',
                'roleId' => $primaryRole ? (string) $primaryRole->id : null,
                'status' => $user->status ?? 'active',
                'loginStatus' => $user->login_status ?? 1, // 1 = enabled, 0 = disabled
                'lastLogin' => $user->last_login_at ? $user->last_login_at->toDateString() : 'N/A',
                'customPermissions' => $user->permissions->pluck('name')->toArray(),
                'joinedDate' => $user->created_at->toDateString(),
                'emailVerifiedAt' => $user->email_verified_at ? $user->email_verified_at->toISOString() : null,
            ];
        });

        return Inertia::render('users/index', [
            'users' => $users->withQueryString(),
            'allRoles' => $allRoles,
            'allPermissions' => $allPermissions,
            'filters' => [
                'search' => $search,
                'role' => $roleFilter,
                'status' => $statusFilter,
            ],
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
        
        $allRoles = Role::all()->map(fn($role) => ['id' => (string) $role->id, 'name' => $role->name])->toArray();
        return Inertia::render('users/create', [
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
            'password' => 'required|string|min:8|confirmed',
            'roleId' => 'required|exists:roles,id',
            'status' => 'required|in:active,inactive',
        ]);

        DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'status' => $request->status,
                'last_login_at' => now(), // Set initial login time
            ]);

            $user->assignRole(Role::findById($request->roleId));
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
        
        $allRoles = Role::all()->map(fn($role) => [
            'id' => (string) $role->id,
            'name' => $role->name
        ])->toArray();

        $userPrimaryRole = $user->roles->first();

        return Inertia::render('users/edit', [
            "user" => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roleId' => $userPrimaryRole ? (string) $userPrimaryRole->id : null,
                'status' => $user->status ?? 'active',
                'loginStatus' => $user->login_status ?? 1, // 1 = enabled, 0 = disabled
                'customPermissions' => [], // Not used in simple form
                'rolePermissions' => [], // Not used in simple form
            ],
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
            'roleId' => 'required|exists:roles,id',
            'status' => 'required|in:active,inactive',
        ]);

        DB::transaction(function () use ($request, $user) {
            $updateData = [
                'name' => $request->name,
                'email' => $request->email,
                'status' => $request->status,
            ];

            if ($request->password) {
                $updateData['password'] = Hash::make($request->password);
            }

            $user->update($updateData);

            // Sync roles
            $user->syncRoles([Role::findById($request->roleId)]);
        });

        // Clear permission cache to ensure changes take effect immediately
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return redirect()->route('users.list')->with('success', 'User updated successfully.');
    }

    /**
     * Remove the specified user from storage.
     */
    /**
     * Impersonate a user.
     */
    public function impersonate(Request $request, User $user)
    {
        $this->authorizePermission($request, 'role.management.impersonate');
        
        // Prevent impersonating yourself
        if ($request->user()->id === $user->id) {
            return redirect()->back()->with('error', 'You cannot impersonate yourself.');
        }

        // Store the original user ID in session
        session()->put('impersonate_user_id', $request->user()->id);
        
        // Log in as the target user
        Auth::login($user);
        
        // Check if user has 'user' role and redirect to profile, otherwise dashboard
        $userRole = $user->roles->first();
        if ($userRole && strtolower($userRole->name) === 'user') {
            return redirect()->route('user.profile.index')->with('success', "You are now impersonating {$user->name}.");
        }
        
        return redirect()->route('dashboard')->with('success', "You are now impersonating {$user->name}.");
    }

    /**
     * Stop impersonating and return to original user.
     */
    public function stopImpersonate(Request $request)
    {
        $originalUserId = session()->pull('impersonate_user_id');
        
        if (!$originalUserId) {
            return redirect()->route('dashboard')->with('error', 'No impersonation session found.');
        }

        $originalUser = User::findOrFail($originalUserId);
        Auth::login($originalUser);
        
        return redirect()->route('users.list')->with('success', 'Impersonation stopped. You are now logged in as yourself.');
    }

    public function destroyUser(Request $request, User $user)
    {
        $this->authorizePermission($request, 'role.management.delete');
        
        // Prevent deleting yourself
        if ($request->user()->id === $user->id) {
            return redirect()->back()->with('error', 'You cannot delete yourself.');
        }

        DB::transaction(function () use ($user) {
            // Remove roles and permissions
            $user->roles()->detach();
            $user->permissions()->detach();
            $user->delete();
        });

        return redirect()->route('users.list')->with('success', 'User deleted successfully.');
    }

    /**
     * Reset user password.
     */
    public function resetPassword(Request $request, User $user)
    {
        $this->authorizePermission($request, 'role.management.resetPassword');
        
        $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return redirect()->back()->with('success', 'Password reset successfully.');
    }

    /**
     * Toggle login disable status for a user.
     */
    public function toggleLoginDisable(Request $request, User $user)
    {
        $this->authorizePermission($request, 'role.management.loginDisable');
        
        // Prevent disabling your own login
        if ($request->user()->id === $user->id) {
            return redirect()->back()->with('error', 'You cannot disable your own login.');
        }

        // Toggle login_status (assuming 0 = disabled, 1 = enabled)
        $user->update([
            'login_status' => $user->login_status == 1 ? 0 : 1,
        ]);

        $status = $user->login_status == 1 ? 'enabled' : 'disabled';
        return redirect()->back()->with('success', "User login {$status} successfully.");
    }

    /**
     * Verify user email.
     */
    public function verifyEmail(Request $request, User $user)
    {
        $this->authorizePermission($request, 'role.management.verifyEmail');
        
        if ($user->hasVerifiedEmail()) {
            return redirect()->back()->with('error', 'Email is already verified.');
        }

        if ($user->markEmailAsVerified()) {
            event(new \Illuminate\Auth\Events\Verified($user));
        }

        return redirect()->back()->with('success', 'Email verified successfully.');
    }
}

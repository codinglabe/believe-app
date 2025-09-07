# Comprehensive Permission System

This document outlines the comprehensive role-based permission system implemented in the application.

## Overview

The permission system provides:
- **Role-based access control (RBAC)** with three main roles: Admin, Organization, and User
- **Granular permissions** for each module and action
- **Frontend permission guards** for UI components
- **Backend permission middleware** for route protection
- **Animated permission denied pages** for better UX
- **Comprehensive testing tools** for permission verification

## Roles

### Admin
- **Full system access** with all permissions
- Can manage users, roles, and permissions
- Access to all modules and features
- System administration capabilities

### Organization
- **Organization management** access
- Can create and manage events, courses, donations
- Limited user management capabilities
- Content creation and management

### User
- **Basic user access** with limited permissions
- Can view and interact with public content
- Can create personal events and content
- Limited to their own data

## Permission Structure

Permissions follow the pattern: `{module}.{action}`

### Core Modules
- `user.*` - User management
- `role.*` - Role management  
- `permission.*` - Permission management
- `event.*` - Event management
- `organization.*` - Organization management
- `course.*` - Course management
- `donation.*` - Donation management

### Actions
- `read` - View/list resources
- `create` - Create new resources
- `edit` - Edit existing resources
- `update` - Update existing resources
- `delete` - Delete resources
- `manage` - Full management access
- `publish` - Publish content
- `approve` - Approve content
- `process` - Process transactions

## Backend Implementation

### Base Controller
All controllers extend `BaseController` which provides:
- Permission checking methods
- Role verification methods
- Authorization helpers
- CRUD permission utilities

```php
// Check permission
$this->authorizePermission($request, 'event.create');

// Check role
$this->authorizeRole($request, 'admin');

// Check CRUD permissions
$crud = $this->canCrud($request, 'event');
```

### Middleware
- `CheckPermission` - Validates specific permissions
- `CheckRole` - Validates user roles
- Integrated with Spatie Permission package

### Route Protection
Routes are protected with permission middleware:

```php
Route::resource('events', EventController::class)->middleware([
    'index' => 'permission:event.read',
    'create' => 'permission:event.create',
    'store' => 'permission:event.create',
    'show' => 'permission:event.read',
    'edit' => 'permission:event.edit',
    'update' => 'permission:event.update',
    'destroy' => 'permission:event.delete'
]);
```

## Frontend Implementation

### Permission Utilities
Located in `resources/js/lib/permission-utils.ts`:

```typescript
// Basic permission checking
const { hasPermission, hasRole, isAdmin } = usePermissions();

// Module-specific permissions
const eventPermissions = useEventPermissions();
const userPermissions = useUserPermissions();

// CRUD permissions
const crud = useCrudPermissions('event');
```

### Permission Components

#### PermissionGuard
Wraps content that requires specific permissions:

```tsx
<PermissionGuard permission="event.create">
  <CreateEventButton />
</PermissionGuard>
```

#### PermissionButton
Button that only renders if user has permission:

```tsx
<PermissionButton permission="event.create" onClick={handleCreate}>
  Create Event
</PermissionButton>
```

#### PermissionBadge
Badge that only renders if user has permission:

```tsx
<PermissionBadge permission="event.manage">
  <Badge>Event Manager</Badge>
</PermissionBadge>
```

### Permission Denied Page
Animated page shown when users lack required permissions:
- Shows current user role
- Displays required permissions/roles
- Provides navigation options
- Responsive design with dark mode support

## Setup and Usage

### 1. Run Permission Seeder
```bash
php artisan db:seed --class=ComprehensivePermissionsSeeder
```

### 2. Clear Permission Cache
```bash
php artisan permission:cache-reset
```

### 3. Assign Roles to Users
```php
$user->assignRole('admin');
$user->assignRole('organization');
$user->assignRole('user');
```

### 4. Grant Specific Permissions
```php
$user->givePermissionTo('event.create');
$user->givePermissionTo('user.manage');
```

## Testing

### Permission Testing Page
Access `/admin/permission-testing` to:
- View current user permissions
- Test permission components
- Verify role assignments
- Debug permission issues

### Permission Management Page
Access `/admin/permission-management` to:
- View all user permissions
- Check role assignments
- See accessible modules
- Monitor permission status

## Best Practices

### Backend
1. Always check permissions in controllers
2. Use middleware for route protection
3. Extend BaseController for consistent permission handling
4. Validate permissions before data access

### Frontend
1. Use PermissionGuard for conditional rendering
2. Use PermissionButton for action buttons
3. Check permissions before API calls
4. Provide fallback UI for denied permissions

### Security
1. Never trust frontend permission checks alone
2. Always validate permissions on the backend
3. Use middleware for route protection
4. Regularly audit permission assignments

## Troubleshooting

### Common Issues

1. **Permission not working**
   - Check if permission exists in database
   - Verify user has the permission
   - Clear permission cache
   - Check middleware registration

2. **Role not assigned**
   - Verify role exists in database
   - Check user role assignment
   - Ensure role has required permissions

3. **Frontend components not showing**
   - Check permission string matches exactly
   - Verify user has the permission
   - Check component implementation

### Debug Tools
- Permission testing page
- Permission management page
- Laravel debugbar
- Browser developer tools

## Migration and Updates

### Adding New Permissions
1. Update `ComprehensivePermissionsSeeder`
2. Run the seeder
3. Update frontend components
4. Test thoroughly

### Adding New Roles
1. Create role in seeder
2. Assign appropriate permissions
3. Update frontend role checks
4. Test role functionality

## Performance Considerations

- Permissions are cached for performance
- Use `permission:cache-reset` after changes
- Consider permission hierarchy for complex scenarios
- Monitor permission check performance

## Security Considerations

- All permission checks are server-side validated
- Frontend checks are for UX only
- Sensitive operations require explicit permissions
- Regular permission audits recommended


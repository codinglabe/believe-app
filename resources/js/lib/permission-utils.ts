import { usePage } from "@inertiajs/react"

interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  permissions: string[]
  roles: string[]
}

interface PageProps {
  auth: {
    user: AuthUser | null
    permissions: string[]
    roles: string[]
  }
}

// Enhanced permission checking utilities
export function usePermissions() {
  const { auth } = usePage<PageProps>().props
  
  return {
    user: auth.user,
    permissions: auth.permissions || [],
    roles: auth.roles || [],
    hasPermission: (permission: string) => auth.permissions?.includes(permission) ?? false,
    hasAnyPermission: (permissions: string[]) => permissions.some(p => auth.permissions?.includes(p) ?? false),
    hasAllPermissions: (permissions: string[]) => permissions.every(p => auth.permissions?.includes(p) ?? false),
    hasRole: (role: string | string[]) => {
      if (!auth.roles) return false
      const userRoles = Array.isArray(auth.roles) ? auth.roles : [auth.roles]
      
      if (Array.isArray(role)) {
        return role.some(r => userRoles.includes(r))
      }
      return userRoles.includes(role)
    },
    hasAnyRole: (roles: string[]) => roles.some(r => auth.roles?.includes(r) ?? false),
    hasAllRoles: (roles: string[]) => roles.every(r => auth.roles?.includes(r) ?? false),
    isAdmin: () => auth.roles?.includes('admin') ?? false,
    isOrganization: () => auth.roles?.includes('organization') ?? false,
    isUser: () => auth.roles?.includes('user') ?? false,
  }
}

// Permission checking for specific modules
export function useModulePermissions(module: string) {
  const { hasPermission } = usePermissions()
  
  return {
    canRead: () => hasPermission(`${module}.read`),
    canCreate: () => hasPermission(`${module}.create`),
    canEdit: () => hasPermission(`${module}.edit`),
    canUpdate: () => hasPermission(`${module}.update`),
    canDelete: () => hasPermission(`${module}.delete`),
    canManage: () => hasPermission(`${module}.manage`),
    canPublish: () => hasPermission(`${module}.publish`),
    canUnpublish: () => hasPermission(`${module}.unpublish`),
    canApprove: () => hasPermission(`${module}.approve`),
    canReject: () => hasPermission(`${module}.reject`),
    canProcess: () => hasPermission(`${module}.process`),
    canRefund: () => hasPermission(`${module}.refund`),
    canEnroll: () => hasPermission(`${module}.enroll`),
    canVerify: () => hasPermission(`${module}.verify`),
  }
}

// Event-specific permissions
export function useEventPermissions() {
  return useModulePermissions('event')
}

// User-specific permissions
export function useUserPermissions() {
  return useModulePermissions('user')
}

// Organization-specific permissions
export function useOrganizationPermissions() {
  return useModulePermissions('organization')
}

// Course-specific permissions
export function useCoursePermissions() {
  return useModulePermissions('course')
}

// Donation-specific permissions
export function useDonationPermissions() {
  return useModulePermissions('donation')
}

// Permission checking for CRUD operations
export function useCrudPermissions(module: string) {
  const modulePerms = useModulePermissions(module)
  
  return {
    canView: modulePerms.canRead,
    canCreate: modulePerms.canCreate,
    canEdit: modulePerms.canEdit,
    canUpdate: modulePerms.canUpdate,
    canDelete: modulePerms.canDelete,
    canManage: modulePerms.canManage,
  }
}

// Permission checking for dashboard access
export function useDashboardPermissions() {
  const { hasPermission, isAdmin, isOrganization, isUser } = usePermissions()
  
  return {
    canAccessAdminDashboard: () => isAdmin() && hasPermission('dashboard.admin'),
    canAccessOrganizationDashboard: () => isOrganization() && hasPermission('dashboard.organization'),
    canAccessUserDashboard: () => isUser() && hasPermission('dashboard.user'),
    canAccessDashboard: () => hasPermission('dashboard.read'),
  }
}

// Permission checking for reports
export function useReportPermissions() {
  return useModulePermissions('reports')
}

// Permission checking for settings
export function useSettingsPermissions() {
  return useModulePermissions('settings')
}

// Permission checking for profile
export function useProfilePermissions() {
  return useModulePermissions('profile')
}

// Utility function to check if user can perform action on resource
export function canPerformAction(
  action: string,
  module: string,
  permissions: string[]
): boolean {
  const permissionName = `${module}.${action}`
  return permissions.includes(permissionName)
}

// Utility function to get user's accessible modules
export function getAccessibleModules(permissions: string[]): string[] {
  const modules = new Set<string>()
  
  permissions.forEach(permission => {
    const parts = permission.split('.')
    if (parts.length >= 2) {
      modules.add(parts[0])
    }
  })
  
  return Array.from(modules)
}

// Utility function to get user's permissions for a specific module
export function getModulePermissions(module: string, permissions: string[]): string[] {
  return permissions.filter(permission => permission.startsWith(`${module}.`))
}

// Permission hierarchy checking
export function hasPermissionHierarchy(
  requiredPermission: string,
  userPermissions: string[]
): boolean {
  // Check exact permission
  if (userPermissions.includes(requiredPermission)) {
    return true
  }
  
  // Check if user has manage permission for the module
  const parts = requiredPermission.split('.')
  if (parts.length >= 2) {
    const module = parts[0]
    const managePermission = `${module}.manage`
    if (userPermissions.includes(managePermission)) {
      return true
    }
  }
  
  // Check if user is admin (admins have all permissions)
  if (userPermissions.includes('admin')) {
    return true
  }
  
  return false
}


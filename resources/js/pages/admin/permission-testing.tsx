"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  Edit,
  Trash2,
  Plus,
  Settings
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import { usePage } from "@inertiajs/react"
import { PermissionGuard, PermissionButton, PermissionBadge } from "@/components/ui/permission-guard"
import { usePermissions, useEventPermissions, useUserPermissions, useOrganizationPermissions } from "@/lib/permission-utils"

interface PageProps {
  auth: {
    user: {
      id: number
      name: string
      email: string
      role: string
    }
    permissions: string[]
    roles: string[]
  }
  [key: string]: any
}

export default function PermissionTesting() {
  const { auth } = usePage<PageProps>().props
  const { user, permissions, roles, hasPermission, hasRole, isAdmin, isOrganization, isUser } = usePermissions()
  const eventPermissions = useEventPermissions()
  const userPermissions = useUserPermissions()
  const organizationPermissions = useOrganizationPermissions()
  const [activeTab, setActiveTab] = useState("overview")

  const testPermissions = [
    'event.read',
    'event.create',
    'event.edit',
    'event.update',
    'event.delete',
    'event.manage',
    'user.read',
    'user.create',
    'user.edit',
    'user.update',
    'user.delete',
    'user.manage',
    'organization.read',
    'organization.create',
    'organization.edit',
    'organization.update',
    'organization.delete',
    'organization.manage',
    'course.read',
    'course.create',
    'course.edit',
    'course.update',
    'course.delete',
    'course.manage',
    'donation.read',
    'donation.create',
    'donation.edit',
    'donation.update',
    'donation.delete',
    'donation.manage',
    'permission.read',
    'permission.create',
    'permission.edit',
    'permission.update',
    'permission.delete',
    'permission.manage',
  ]

  const testRoles = ['admin', 'organization', 'user']

  const getPermissionIcon = (permission: string) => {
    const action = permission.split('.').pop()
    switch (action) {
      case 'read': return <Eye className="w-4 h-4" />
      case 'create': return <Plus className="w-4 h-4" />
      case 'edit': return <Edit className="w-4 h-4" />
      case 'update': return <Settings className="w-4 h-4" />
      case 'delete': return <Trash2 className="w-4 h-4" />
      case 'manage': return <Shield className="w-4 h-4" />
      default: return <Lock className="w-4 h-4" />
    }
  }

  const getPermissionColor = (hasPermission: boolean) => {
    return hasPermission 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
  }

  const getRoleColor = (hasRole: boolean) => {
    return hasRole 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
  }

  return (
    <PermissionGuard permission="permission.read">
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Permission Testing</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Test and verify permission system functionality
              </p>
            </div>
          </div>
        </div>

        {/* Current User Info */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-600" />
              Current User Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">User</p>
                <p className="font-semibold text-gray-900 dark:text-white">{user?.name}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
                <p className="font-semibold text-gray-900 dark:text-white">{user?.role}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Permissions</p>
                <p className="font-semibold text-gray-900 dark:text-white">{permissions.length}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Roles</p>
                <p className="font-semibold text-gray-900 dark:text-white">{roles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permission Testing Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="components" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Components
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {permissions.filter(p => hasPermission(p)).length}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Granted Permissions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {permissions.filter(p => !hasPermission(p)).length}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Denied Permissions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {testRoles.filter(r => hasRole(r)).length}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Active Roles</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Role Status */}
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Role Status</CardTitle>
                <CardDescription>Current role assignments and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {testRoles.map((role) => (
                    <motion.div
                      key={role}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`p-4 rounded-lg border-2 ${
                        hasRole(role) 
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {hasRole(role) ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                            {role}
                          </h4>
                          <Badge className={getRoleColor(hasRole(role))}>
                            {hasRole(role) ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Permission Testing</CardTitle>
                <CardDescription>
                  Test individual permissions and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testPermissions.map((permission) => {
                    const hasPerm = hasPermission(permission)
                    return (
                      <motion.div
                        key={permission}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                          hasPerm 
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {hasPerm ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          {getPermissionIcon(permission)}
                          <span className="font-mono text-sm text-gray-900 dark:text-white">
                            {permission}
                          </span>
                        </div>
                        <Badge className={getPermissionColor(hasPerm)}>
                          {hasPerm ? 'Granted' : 'Denied'}
                        </Badge>
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Role Testing</CardTitle>
                <CardDescription>
                  Test role-based access and functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-lg border-2 ${
                      isAdmin() 
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                    }`}>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Admin Role</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Full system access and management capabilities
                      </p>
                      <Badge className={getRoleColor(isAdmin())}>
                        {isAdmin() ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className={`p-4 rounded-lg border-2 ${
                      isOrganization() 
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                    }`}>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Organization Role</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Organization management and content creation
                      </p>
                      <Badge className={getRoleColor(isOrganization())}>
                        {isOrganization() ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className={`p-4 rounded-lg border-2 ${
                      isUser() 
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                    }`}>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">User Role</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Basic user access and limited functionality
                      </p>
                      <Badge className={getRoleColor(isUser())}>
                        {isUser() ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components" className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Permission Component Testing</CardTitle>
                <CardDescription>
                  Test permission-based component rendering
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Permission Button Testing */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Permission Buttons</h4>
                  <div className="flex flex-wrap gap-3">
                    <PermissionButton permission="event.create" className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Event (event.create)
                    </PermissionButton>
                    <PermissionButton permission="event.edit" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Event (event.edit)
                    </PermissionButton>
                    <PermissionButton permission="event.delete" className="bg-red-600 hover:bg-red-700 text-white">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Event (event.delete)
                    </PermissionButton>
                    <PermissionButton permission="user.manage" className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Shield className="w-4 h-4 mr-2" />
                      Manage Users (user.manage)
                    </PermissionButton>
                  </div>
                </div>

                {/* Permission Badge Testing */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Permission Badges</h4>
                  <div className="flex flex-wrap gap-3">
                    <PermissionBadge permission="event.read">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        <Eye className="w-3 h-3 mr-1" />
                        View Events
                      </Badge>
                    </PermissionBadge>
                    <PermissionBadge permission="event.create">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                        <Plus className="w-3 h-3 mr-1" />
                        Create Events
                      </Badge>
                    </PermissionBadge>
                    <PermissionBadge permission="event.delete">
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete Events
                      </Badge>
                    </PermissionBadge>
                  </div>
                </div>

                {/* Permission Guard Testing */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Permission Guards</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PermissionGuard permission="event.create">
                      <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-green-800 dark:text-green-300">
                              Event Creation Access
                            </span>
                          </div>
                          <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                            You have permission to create events.
                          </p>
                        </CardContent>
                      </Card>
                    </PermissionGuard>

                    <PermissionGuard permission="user.manage">
                      <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-purple-600" />
                            <span className="font-semibold text-purple-800 dark:text-purple-300">
                              User Management Access
                            </span>
                          </div>
                          <p className="text-sm text-purple-700 dark:text-purple-400 mt-2">
                            You have permission to manage users.
                          </p>
                        </CardContent>
                      </Card>
                    </PermissionGuard>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  )
}


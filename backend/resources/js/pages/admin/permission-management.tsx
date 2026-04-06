"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Shield, 
  Users, 
  Settings, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Lock,
  Unlock,
  UserCheck,
  UserX
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Switch } from "@/components/frontend/ui/switch"
import { usePage } from "@inertiajs/react"
import { PermissionGuard } from "@/components/ui/permission-guard"
import { usePermissions } from "@/lib/permission-utils"

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

export default function PermissionManagement() {
  const { auth } = usePage<PageProps>().props
  const { user, permissions, roles, hasPermission, hasRole, isAdmin } = usePermissions()
  const [activeTab, setActiveTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")

  // Filter permissions based on search
  const filteredPermissions = permissions.filter(permission =>
    permission.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group permissions by module
  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    const [module] = permission.split('.')
    if (!acc[module]) {
      acc[module] = []
    }
    acc[module].push(permission)
    return acc
  }, {} as Record<string, string[]>)

  const getPermissionIcon = (permission: string) => {
    const action = permission.split('.').pop()
    switch (action) {
      case 'read': return <Eye className="w-4 h-4 text-blue-500" />
      case 'create': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'edit': return <Settings className="w-4 h-4 text-yellow-500" />
      case 'update': return <Settings className="w-4 h-4 text-yellow-500" />
      case 'delete': return <XCircle className="w-4 h-4 text-red-500" />
      case 'manage': return <Shield className="w-4 h-4 text-purple-500" />
      default: return <Lock className="w-4 h-4 text-gray-500" />
    }
  }

  const getPermissionColor = (permission: string) => {
    const action = permission.split('.').pop()
    switch (action) {
      case 'read': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'create': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'edit': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'update': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'delete': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'manage': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'organization': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'user': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator'
      case 'organization': return 'Organization'
      case 'user': return 'User'
      default: return role
    }
  }

  return (
    <PermissionGuard permission="permission.read">
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Permission Management</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Manage user roles and permissions across the system
              </p>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-blue-600" />
              Current User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">User</Label>
                <p className="text-gray-900 dark:text-white font-medium">{user?.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Badge key={role} className={getRoleColor(role)}>
                      {getRoleDisplayName(role)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Permissions</Label>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{permissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permission Management Tabs */}
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
              <Users className="w-4 h-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Modules
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <Lock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{permissions.length}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Permissions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{roles.length}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Assigned Roles</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <Settings className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(groupedPermissions).length}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Accessible Modules</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Permission Summary */}
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Permission Summary by Module</CardTitle>
                <CardDescription>
                  Overview of your permissions organized by system modules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                    <motion.div
                      key={module}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                    >
                      <h4 className="font-semibold text-gray-900 dark:text-white capitalize mb-2">
                        {module.replace('.', ' ')}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {modulePermissions.length} permissions
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {modulePermissions.slice(0, 3).map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission.split('.').pop()}
                          </Badge>
                        ))}
                        {modulePermissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{modulePermissions.length - 3} more
                          </Badge>
                        )}
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Permissions</CardTitle>
                    <CardDescription>
                      Complete list of your assigned permissions
                    </CardDescription>
                  </div>
                  <div className="w-64">
                    <Input
                      placeholder="Search permissions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                    <motion.div
                      key={module}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <h4 className="font-semibold text-gray-900 dark:text-white capitalize mb-3 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        {module.replace('.', ' ')}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {modulePermissions.map((permission) => (
                          <div
                            key={permission}
                            className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md"
                          >
                            {getPermissionIcon(permission)}
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {permission.split('.').pop()}
                            </span>
                            <Badge className={`${getPermissionColor(permission)} text-xs`}>
                              {permission.split('.').pop()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Assigned Roles</CardTitle>
                <CardDescription>
                  Your current role assignments and their capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roles.map((role) => (
                    <motion.div
                      key={role}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {getRoleDisplayName(role)}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {role} role
                          </p>
                        </div>
                      </div>
                      <Badge className={getRoleColor(role)}>
                        Active
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Accessible Modules</CardTitle>
                <CardDescription>
                  System modules you have access to based on your permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                    <motion.div
                      key={module}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                          <Settings className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                            {module.replace('.', ' ')}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {modulePermissions.length} permissions
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {modulePermissions.map((permission) => (
                          <div key={permission} className="flex items-center gap-2">
                            {getPermissionIcon(permission)}
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {permission.split('.').pop()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  )
}


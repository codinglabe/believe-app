import { useState } from "react"
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination } from "@/components/ui/pagination"
import { Search, Plus, Edit, Trash2, Mail, Calendar, Shield, ArrowLeft, UserCog, LogOut } from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import { Link, router, usePage } from "@inertiajs/react"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface User {
  id: string
  name: string
  email: string
  avatar: string
  role: string
  roleId: string | null
  status: "active" | "inactive"
  lastLogin: string
  customPermissions: string[]
  joinedDate: string
}

interface UsersPaginator {
  data: User[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

interface UsersListProps {
  users: UsersPaginator
  allRoles: { id: string; name: string }[]
  allPermissions: { id: string; name: string; category: string }[]
  filters?: {
    search?: string
    role?: string
    status?: string
  }
  flash?: {
    success?: string
    error?: string
  }
}

export default function UsersList({ allRoles, allPermissions, filters = {} }: UsersListProps) {
  const { users, flash } = usePage<{ users: UsersPaginator; flash?: { success?: string; error?: string } }>().props
  const auth = usePage().props.auth as { user?: { id: string } }

  const [searchTerm, setSearchTerm] = useState(filters.search || "")
  const [filterRole, setFilterRole] = useState(filters.role || "all")
  const [filterStatus, setFilterStatus] = useState(filters.status || "all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false)
  const [userToImpersonate, setUserToImpersonate] = useState<string | null>(null)

  // Show flash messages
  React.useEffect(() => {
    if (flash?.success) {
      showSuccessToast(flash.success)
    }
    if (flash?.error) {
      showErrorToast(flash.error)
    }
  }, [flash])

  // Debounce search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== filters.search) {
        handleFilterChange()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleFilterChange = () => {
    router.get(route('users.list'), {
      page: 1,
      search: searchTerm,
      role: filterRole,
      status: filterStatus
    }, { preserveState: true, replace: true })
  }

  const handlePageChange = (page: number) => {
    router.get(route('users.list'), {
      page,
      search: searchTerm,
      role: filterRole,
      status: filterStatus
    }, { preserveState: true, replace: true })
  }

  const handleDeleteUser = (userId: string) => {
    setDeleteDialogOpen(true)
    setSelectedUserId(userId)
  }

  const confirmDeleteUser = () => {
    if (selectedUserId) {
      router.delete(route('users.destroy', selectedUserId), {
        onSuccess: () => {
          setDeleteDialogOpen(false)
          setSelectedUserId(null)
          showSuccessToast("User deleted successfully")
          router.get(route('users.list'), { 
            search: searchTerm,
            role: filterRole,
            status: filterStatus
          }, { preserveState: true, replace: true })
        },
        onError: (errors) => {
          showErrorToast(errors.message || "Failed to delete user")
        },
      })
    }
  }

  const handleImpersonate = (userId: string) => {
    setUserToImpersonate(userId)
    setImpersonateDialogOpen(true)
  }

  const confirmImpersonate = () => {
    if (userToImpersonate) {
      router.post(route('users.impersonate', userToImpersonate), {}, {
        onSuccess: () => {
          setImpersonateDialogOpen(false)
          setUserToImpersonate(null)
          showSuccessToast("Impersonating user...")
        },
        onError: (errors) => {
          showErrorToast(errors.message || "Failed to impersonate user")
        },
      })
    }
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 animate-in fade-in-0 slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4 mb-4">
            <Link href={route('permissions.overview')}>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Users</h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Manage users, assign roles, and set individual permissions
              </p>
            </div>
            <Link href={route('users.create')}>
              <Button
                onClick={() => onNavigate("create-user")}
                className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={filterRole}
              onValueChange={(value) => {
                setFilterRole(value)
                handleFilterChange()
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {allRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterStatus}
              onValueChange={(value) => {
                setFilterStatus(value)
                handleFilterChange()
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {users.data.map((user, index) => (
            <Card
              key={user.id}
              className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in fade-in-0 slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100 + 300}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                      <AvatarFallback>
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{user.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.status === "active" ? "default" : "secondary"} className="text-xs">
                          {user.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={route("users.edit", user.id)}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 transition-all duration-200 hover:scale-110"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    {auth.user?.id !== user.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleImpersonate(user.id)}
                        className="h-8 w-8 p-0 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20 transition-all duration-200 hover:scale-110"
                        title="Impersonate User"
                      >
                        <UserCog className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteUser(user.id)}
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all duration-200 hover:scale-110"
                      title="Delete User"
                      disabled={auth.user?.id === user.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>Last login: {user.lastLogin}</span>
                </div>
                {user.customPermissions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span className="text-sm font-medium">Custom Permissions</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {user.customPermissions.slice(0, 2).map((permissionId) => {
                        const permission = allPermissions.find((p) => p.id === permissionId)
                        return (
                          <Badge key={permissionId} variant="outline" className="text-xs">
                            {permission?.name}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={users.current_page}
          totalPages={users.last_page}
          totalItems={users.total}
          itemsPerPage={users.per_page}
          onPageChange={handlePageChange}
        />
      </div>
      <ConfirmationModal
        isOpen={deleteDialogOpen}
        onChange={setDeleteDialogOpen}
        title="Confirm Delete"
        description="Are you sure you want to delete this user? This action cannot be undone and will remove all associated permissions."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => confirmDeleteUser()}
      />
      <ConfirmationModal
        isOpen={impersonateDialogOpen}
        onChange={setImpersonateDialogOpen}
        title="Impersonate User"
        description="You are about to log in as this user. You will be able to see and interact with the system as them. Click 'Stop Impersonating' to return to your account."
        confirmLabel="Impersonate"
        cancelLabel="Cancel"
        onConfirm={() => confirmImpersonate()}
      />
    </AppLayout>
  )
}

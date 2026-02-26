import { useState } from "react"
import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination } from "@/components/ui/pagination"
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  UserCog, 
  Users,
  UserCheck,
  MoreVertical,
  Key,
  EyeOff,
  CheckCircle2
} from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import { Link, router, usePage, Head, useForm } from "@inertiajs/react"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import type { BreadcrumbItem } from "@/types"
import { useCan } from "@/lib/can"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface User {
  id: string
  name: string
  email: string
  avatar: string | null
  role: string
  roleId: string | null
  status: "active" | "inactive"
  loginStatus: number // 1 = enabled, 0 = disabled
  lastLogin: string
  customPermissions: string[]
  joinedDate: string
  emailVerifiedAt: string | null
}

interface UsersPaginator {
  data: User[]
  current_page: number
  last_page: number
  total: number
  per_page: number
  from?: number
  to?: number
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

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Users", href: "#" },
]

export default function UsersIndex({ allRoles, filters = {} }: UsersListProps) {
  const { users, flash } = usePage<{ users: UsersPaginator; flash?: { success?: string; error?: string } }>().props
  const auth = usePage().props.auth as { user?: { id: string }; permissions?: string[] }

  const [searchTerm, setSearchTerm] = useState(filters.search || "")
  const [filterRole, setFilterRole] = useState(filters.role || "all")
  const [filterStatus, setFilterStatus] = useState(filters.status || "all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false)
  const [userToImpersonate, setUserToImpersonate] = useState<string | null>(null)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [userToResetPassword, setUserToResetPassword] = useState<string | null>(null)
  const [loginDisableDialogOpen, setLoginDisableDialogOpen] = useState(false)
  const [userToToggleLogin, setUserToToggleLogin] = useState<string | null>(null)

  // Permission checks
  const canResetPassword = useCan('role.management.resetPassword')
  const canLoginDisable = useCan('role.management.loginDisable')
  const canVerifyEmail = useCan('role.management.verifyEmail')

  // Reset password form
  const resetPasswordForm = useForm({
    password: '',
    password_confirmation: '',
  })

  // Flash toasts are shown by app-layout from page props; do not duplicate here.

  // Debounce search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== (filters.search || '')) {
        const params: Record<string, string | number> = { page: 1 }
        if (searchTerm) params.search = searchTerm
        if (filterRole !== 'all') params.role = filterRole
        if (filterStatus !== 'all') params.status = filterStatus
        
        router.get(route('users.list'), params, { preserveState: true, replace: true })
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, filterRole, filterStatus, filters.search])

  const handleFilterChange = () => {
    const params: Record<string, string> = {}
    if (searchTerm) params.search = searchTerm
    if (filterRole !== 'all') params.role = filterRole
    if (filterStatus !== 'all') params.status = filterStatus
    
    router.get(route('users.list'), params, { preserveState: true, replace: true })
  }

  const handlePageChange = (page: number) => {
    const params: Record<string, string | number> = { page }
    if (searchTerm) params.search = searchTerm
    if (filterRole !== 'all') params.role = filterRole
    if (filterStatus !== 'all') params.status = filterStatus
    
    router.get(route('users.list'), params, { preserveState: true, replace: true })
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
          const params: Record<string, string> = {}
          if (searchTerm) params.search = searchTerm
          if (filterRole !== 'all') params.role = filterRole
          if (filterStatus !== 'all') params.status = filterStatus
          
          router.get(route('users.list'), params, { preserveState: true, replace: true })
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

  const handleResetPassword = (userId: string) => {
    setUserToResetPassword(userId)
    setResetPasswordDialogOpen(true)
    resetPasswordForm.reset()
  }

  const confirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (userToResetPassword) {
      resetPasswordForm.post(route('users.reset-password', userToResetPassword), {
        onSuccess: () => {
          setResetPasswordDialogOpen(false)
          setUserToResetPassword(null)
          resetPasswordForm.reset()
          showSuccessToast("Password reset successfully")
        },
        onError: (errors) => {
          showErrorToast(errors.message || "Failed to reset password")
        },
      })
    }
  }

  const handleToggleLoginDisable = (userId: string) => {
    setUserToToggleLogin(userId)
    setLoginDisableDialogOpen(true)
  }

  const confirmToggleLoginDisable = () => {
    if (userToToggleLogin) {
      router.post(route('users.toggle-login-disable', userToToggleLogin), {}, {
        onSuccess: () => {
          setLoginDisableDialogOpen(false)
          setUserToToggleLogin(null)
          showSuccessToast("Login status updated successfully")
          const params: Record<string, string> = {}
          if (searchTerm) params.search = searchTerm
          if (filterRole !== 'all') params.role = filterRole
          if (filterStatus !== 'all') params.status = filterStatus
          
          router.get(route('users.list'), params, { preserveState: true, replace: true })
        },
        onError: (errors) => {
          showErrorToast(errors.message || "Failed to update login status")
        },
      })
    }
  }

  const handleVerifyEmail = (userId: string) => {
    router.post(route('users.verify-email', userId), {}, {
      onSuccess: () => {
        showSuccessToast("Email verified successfully")
        const params: Record<string, string> = {}
        if (searchTerm) params.search = searchTerm
        if (filterRole !== 'all') params.role = filterRole
        if (filterStatus !== 'all') params.status = filterStatus
        
        router.get(route('users.list'), params, { preserveState: true, replace: true })
      },
      onError: (errors) => {
        showErrorToast(errors.message || "Failed to verify email")
      },
    })
  }

  const getStatusBadge = (loginStatus: number) => {
    if (loginStatus === 1) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
          <UserCheck className="h-3 w-3 mr-1" />
          Active
        </Badge>
      )
    }
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
        <EyeOff className="h-3 w-3 mr-1" />
        Login Disabled
      </Badge>
    )
  }

  const getEmailVerificationBadge = (emailVerifiedAt: string | null) => {
    if (emailVerifiedAt) {
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 mt-1">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      )
    }
    return (
      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800 mt-1">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Not Verified
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      'admin': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      'organization': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      'user': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    }
    return (
      <Badge className={roleColors[role.toLowerCase()] || roleColors['user']}>
        {role}
      </Badge>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="User Management" />
      <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">User Management</h1>
            <p className="text-muted-foreground">
              Manage users, assign roles, and set individual permissions
            </p>
          </div>
          <Link href={route('users.create')}>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New User
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground">
            Showing {users.from || 0} to {users.to || 0} of {users.total} users
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-initial lg:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
        {users.data.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
                ? "Try adjusting your search or filters"
                : "Get started by creating a new user"}
            </p>
            {!searchTerm && filterRole === 'all' && filterStatus === 'all' && (
              <Link href={route('users.create')}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New User
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {users.data.map((user) => (
                <Card
                  key={user.id}
                  className="group hover:shadow-lg transition-all duration-200 border rounded-lg relative"
                >
                  <CardContent className="p-5">
                    {/* Top Section - Badge and Dropdown */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="top-0 left-0">
                        {getRoleBadge(user.role)}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={route("users.edit", user.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                          {auth.user?.id !== user.id && (
                            <DropdownMenuItem onClick={() => handleImpersonate(user.id)}>
                              <UserCog className="h-4 w-4 mr-2" />
                              Login As User
                            </DropdownMenuItem>
                          )}
                          {canResetPassword && (
                            <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                              <Key className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                          )}
                          {canLoginDisable && auth.user?.id !== user.id && (
                            <DropdownMenuItem 
                              onClick={() => handleToggleLoginDisable(user.id)}
                              className={user.loginStatus === 0 ? "" : "text-destructive focus:text-destructive"}
                            >
                              {user.loginStatus === 0 ? (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Enable Login
                                </>
                              ) : (
                                <>
                                  <EyeOff className="h-4 w-4 mr-2" />
                                  Login Disable
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          {canVerifyEmail && !user.emailVerifiedAt && (
                            <DropdownMenuItem onClick={() => handleVerifyEmail(user.id)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Verified Now
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Center Section - Avatar, Name, Email */}
                    <div className="flex flex-col items-center mb-4">
                      <Avatar className="h-16 w-16 mb-3">
                        <AvatarImage src={user.avatar || undefined} alt={user.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <h3 className="font-semibold text-base text-center mb-1 line-clamp-1">{user.name}</h3>
                      <p className="text-sm text-muted-foreground text-center line-clamp-1">{user.email}</p>
                    </div>

                    {/* Bottom Section - Status and Verification Badge */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex flex-col">
                        {getStatusBadge(user.loginStatus)}
                      </div>
                      {getEmailVerificationBadge(user.emailVerifiedAt)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {users.last_page > 1 && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={users.current_page}
                  totalPages={users.last_page}
                  totalItems={users.total}
                  itemsPerPage={users.per_page}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={deleteDialogOpen}
        onChange={setDeleteDialogOpen}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone and will remove all associated permissions and data."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => confirmDeleteUser()}
      />
      <ConfirmationModal
        isOpen={impersonateDialogOpen}
        onChange={setImpersonateDialogOpen}
        title="Impersonate User"
        description="You are about to log in as this user. You will be able to see and interact with the system as them. Click 'Exit Impersonation' in the header to return to your account."
        confirmLabel="Impersonate"
        cancelLabel="Cancel"
        onConfirm={() => confirmImpersonate()}
      />

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <form onSubmit={confirmResetPassword}>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Enter a new password for this user. The password must be at least 8 characters long.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={resetPasswordForm.data.password}
                  onChange={(e) => resetPasswordForm.setData('password', e.target.value)}
                  required
                  minLength={8}
                />
                {resetPasswordForm.errors.password && (
                  <p className="text-sm text-destructive">{resetPasswordForm.errors.password}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password_confirmation">Confirm Password</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  value={resetPasswordForm.data.password_confirmation}
                  onChange={(e) => resetPasswordForm.setData('password_confirmation', e.target.value)}
                  required
                  minLength={8}
                />
                {resetPasswordForm.errors.password_confirmation && (
                  <p className="text-sm text-destructive">{resetPasswordForm.errors.password_confirmation}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setResetPasswordDialogOpen(false)
                  resetPasswordForm.reset()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={resetPasswordForm.processing}>
                {resetPasswordForm.processing ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Login Disable Confirmation Dialog */}
      <ConfirmationModal
        isOpen={loginDisableDialogOpen}
        onChange={setLoginDisableDialogOpen}
        title="Toggle Login Status"
        description="Are you sure you want to toggle this user's login status? This will enable or disable their ability to log in to the system."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={() => confirmToggleLoginDisable()}
      />
    </AppLayout>
  )
}


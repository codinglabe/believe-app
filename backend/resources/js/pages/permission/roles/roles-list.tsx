import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/pagination"
import { Search, Plus, Edit, Trash2, Shield, Users, ArrowLeft } from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import { Link, router, usePage } from "@inertiajs/react"
import { ConfirmationModal } from "@/components/confirmation-modal"

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
  color: string
}

interface RolesPaginator {
  data: Role[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

interface RolesListProps {
  roles: RolesPaginator
  allPermissions: { id: string; name: string; category: string }[]
  onNavigate: (page: string, id?: string) => void
}

export default function RolesList({ allPermissions, onNavigate }: RolesListProps) {
  const { roles } = usePage<{ roles: RolesPaginator }>().props
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)

  const handleSearch = () => {
    router.get(route('roles.list'), { search: searchTerm }, { preserveState: true, replace: true })
  }

  const handlePageChange = (page: number) => {
    router.get(route('roles.list'), { page, search: searchTerm }, { preserveState: true, replace: true })
  }

  const handleDeleteRole = (roleId: string) => {
    setDeleteDialogOpen(true)
    setSelectedRoleId(roleId)
  }

  const confirmDeleteRole = () => {
    if (selectedRoleId) {
      router.delete(route('roles.destroy', selectedRoleId), {
        onSuccess: () => {
          setDeleteDialogOpen(false)
          setSelectedRoleId(null)
          router.get(route('roles.list'), { search: searchTerm }, { preserveState: true, replace: true })
        },
        onError: (errors) => {
          console.error("Error deleting role:", errors)
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
                onClick={() => onNavigate("dashboard")}
                className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Roles</h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">Manage user roles and their permissions</p>
            </div>
            <Link href={route('roles.create')}>
              <Button
                onClick={() => onNavigate("create-role")}
                className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                Create Role
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-200">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch()
            }}
            className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {roles.data.map((role, index) => (
            <Card
              key={role.id}
              className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in fade-in-0 slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100 + 300}ms` }}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 ${role.color}`}></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={route('roles.edit', role.id)} className=" cursor-pointer">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-110"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRole(role.id)}
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all duration-200 hover:scale-110"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-sm">{role.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Users className="w-4 h-4" />
                  <span>{role.userCount} users assigned</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Permissions</span>
                    <Badge variant="secondary">{role.permissions.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 3).map((permissionId) => {
                      const permission = allPermissions.find((p) => p.id === permissionId)
                      return (
                        <Badge key={permissionId} variant="outline" className="text-xs">
                          {permission?.name}
                        </Badge>
                      )
                    })}
                    {role.permissions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{role.permissions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={roles.current_page}
          totalPages={roles.last_page}
          totalItems={roles.total}
          itemsPerPage={roles.per_page}
          onPageChange={handlePageChange}
        />
      </div>
      <ConfirmationModal
        isOpen={deleteDialogOpen}
        onChange={setDeleteDialogOpen}
        title="Confirm Delete"
        description="Are you sure you want to delete this role?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => confirmDeleteRole()}
      />
    </AppLayout>
  )
}

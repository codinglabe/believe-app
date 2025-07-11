import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination } from "@/components/ui/pagination"
import { Search, Plus, Edit, Trash2, Mail, Calendar, Shield, ArrowLeft } from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import { Link } from "@inertiajs/react"

interface UsersListProps {
  users: {
    data: {
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
    }[]
    current_page: number
    last_page: number
    total: number
    per_page: number
  }
  allRoles: { id: string; name: string }[]
  allPermissions: { id: string; name: string; category: string }[]
  onNavigate: (page: string, id?: string) => void
}

export default function UsersList({ users: initialUsersData, allRoles, allPermissions, onNavigate }: UsersListProps) {
  const [users, setUsers] = useState(initialUsersData.data)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [currentPage, setCurrentPage] = useState(initialUsersData.current_page)
  const itemsPerPage = initialUsersData.per_page
  const totalPages = initialUsersData.last_page
  const totalItems = initialUsersData.total

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === "all" || user.roleId === filterRole
    const matchesStatus = filterStatus === "all" || user.status === filterStatus

    return matchesSearch && matchesRole && matchesStatus
  })

  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId))
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
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={filterRole}
              onValueChange={(value) => {
                setFilterRole(value)
                setCurrentPage(1)
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
                setCurrentPage(1)
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
          {paginatedUsers.map((user, index) => (
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
                        onClick={() => onNavigate("edit-user", user.id)}
                        className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-110"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteUser(user.id)}
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all duration-200 hover:scale-110"
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
                      {/* <Badge variant="outline" className="text-xs">
                      +{user.customPermissions.length} custom
                    </Badge> */}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </AppLayout>
  )
}

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pagination } from "@/components/ui/pagination"
import { Search, Plus, Edit, Trash2, Mail, Calendar, Shield, ArrowLeft } from "lucide-react"
import AppLayout from "@/layouts/app-layout"

const permissions = [
  { id: "channels.create", name: "Create Channels", category: "Channels" },
  { id: "channels.delete", name: "Delete Channels", category: "Channels" },
  { id: "channels.edit", name: "Edit Channels", category: "Channels" },
  { id: "messages.create", name: "Create Messages", category: "Messages" },
  { id: "messages.delete", name: "Delete Messages", category: "Messages" },
  { id: "messages.edit", name: "Edit Messages", category: "Messages" },
  { id: "users.view", name: "View Users", category: "Users" },
  { id: "users.edit", name: "Edit Users", category: "Users" },
  { id: "users.delete", name: "Delete Users", category: "Users" },
  { id: "files.upload", name: "Upload Files", category: "Files" },
  { id: "files.delete", name: "Delete Files", category: "Files" },
  { id: "settings.view", name: "View Settings", category: "Settings" },
  { id: "settings.edit", name: "Edit Settings", category: "Settings" },
]

const roles = [
  { id: "1", name: "Super Admin", color: "bg-red-500" },
  { id: "2", name: "Admin", color: "bg-blue-500" },
  { id: "3", name: "Moderator", color: "bg-green-500" },
  { id: "4", name: "Editor", color: "bg-purple-500" },
  { id: "5", name: "Viewer", color: "bg-gray-500" },
]

const generateUsers = () => {
  const names = [
    "John Doe",
    "Jane Smith",
    "Mike Johnson",
    "Sarah Wilson",
    "David Brown",
    "Emily Davis",
    "Chris Miller",
    "Lisa Garcia",
    "Tom Anderson",
    "Amy Taylor",
    "Kevin White",
    "Maria Rodriguez",
    "James Wilson",
    "Jennifer Lee",
    "Robert Clark",
    "Michelle Lewis",
    "Daniel Walker",
    "Laura Hall",
    "Mark Allen",
    "Jessica Young",
    "Paul King",
    "Sandra Wright",
    "Steven Lopez",
    "Nancy Hill",
    "Brian Scott",
    "Karen Green",
    "Edward Adams",
    "Betty Baker",
    "Jason Gonzalez",
    "Helen Nelson",
    "Ryan Carter",
    "Donna Mitchell",
    "Gary Perez",
    "Carol Roberts",
    "Frank Turner",
  ]

  const domains = ["example.com", "company.com", "business.org", "enterprise.net"]

  return names.map((name, index) => ({
    id: (index + 1).toString(),
    name,
    email: `${name.toLowerCase().replace(" ", ".")}@${domains[index % domains.length]}`,
    avatar: `/placeholder.svg?height=40&width=40`,
    role: roles[index % roles.length].name,
    roleId: roles[index % roles.length].id,
    status: Math.random() > 0.2 ? "active" : ("inactive" as const),
    lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    customPermissions: Math.random() > 0.7 ? permissions.slice(0, Math.floor(Math.random() * 3)).map((p) => p.id) : [],
    joinedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  }))
}

interface UserManagementProps {
  onBack: () => void
}

export default function UserManagement({ onBack }: UserManagementProps) {
  const [users, setUsers] = useState(generateUsers())
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<(typeof users)[0] | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === "all" || user.roleId === filterRole
    const matchesStatus = filterStatus === "all" || user.status === filterStatus

    return matchesSearch && matchesRole && matchesStatus
  })

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

  const groupedPermissions = permissions.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    },
    {} as Record<string, typeof permissions>,
  )

  const handleCreateUser = (formData: FormData) => {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const roleId = formData.get("role") as string
    const role = roles.find((r) => r.id === roleId)?.name || "Viewer"
    const customPermissions = permissions.filter((p) => formData.get(p.id)).map((p) => p.id)

    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      avatar: "/placeholder.svg?height=40&width=40",
      role,
      roleId,
      status: "active" as const,
      lastLogin: new Date().toISOString().split("T")[0],
      customPermissions,
      joinedDate: new Date().toISOString().split("T")[0],
    }

    setUsers([...users, newUser])
    setIsCreateDialogOpen(false)
  }

  const handleEditUser = (formData: FormData) => {
    if (!selectedUser) return

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const roleId = formData.get("role") as string
    const role = roles.find((r) => r.id === roleId)?.name || "Viewer"
    const status = formData.get("status") as "active" | "inactive"
    const customPermissions = permissions.filter((p) => formData.get(p.id)).map((p) => p.id)

    setUsers(
      users.map((user) =>
        user.id === selectedUser.id ? { ...user, name, email, role, roleId, status, customPermissions } : user,
      ),
    )
    setIsEditDialogOpen(false)
    setSelectedUser(null)
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId))
  }

  return (
    <AppLayout>
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 animate-in fade-in-0 slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">User Management</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Manage users, assign roles, and set individual permissions
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 transition-all duration-200 hover:scale-105">
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new user account with role and custom permissions.</DialogDescription>
              </DialogHeader>
              <form action={handleCreateUser}>
                <Tabs defaultValue="basic" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="permissions">Permissions</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" name="name" placeholder="Enter full name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" name="email" type="email" placeholder="Enter email address" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select name="role" defaultValue="5">
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                  <TabsContent value="permissions" className="space-y-4">
                    <div className="space-y-4">
                      <Label>Additional Permissions</Label>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Grant additional permissions beyond the assigned role.
                      </p>
                      {Object.entries(groupedPermissions).map(([category, perms]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">{category}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                            {perms.map((permission) => (
                              <div key={permission.id} className="flex items-center space-x-2">
                                <Checkbox id={permission.id} name={permission.id} />
                                <Label htmlFor={permission.id} className="text-sm">
                                  {permission.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create User</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
              {roles.map((role) => (
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedUser(user)
                      setIsEditDialogOpen(true)
                    }}
                    className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-110"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
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
                      const permission = permissions.find((p) => p.id === permissionId)
                      return (
                        <Badge key={permissionId} variant="outline" className="text-xs">
                          {permission?.name}
                        </Badge>
                      )
                    })}
                    {user.customPermissions.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{user.customPermissions.length - 2} more
                      </Badge>
                    )}
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
        totalItems={filteredUsers.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Modify user details, role, and permissions.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form action={handleEditUser}>
              <Tabs defaultValue="basic" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="permissions">Permissions</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input id="edit-name" name="name" defaultValue={selectedUser.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email Address</Label>
                    <Input id="edit-email" name="email" type="email" defaultValue={selectedUser.email} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Role</Label>
                    <Select name="role" defaultValue={selectedUser.roleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select name="status" defaultValue={selectedUser.status}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                <TabsContent value="permissions" className="space-y-4">
                  <div className="space-y-4">
                    <Label>Additional Permissions</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Grant additional permissions beyond the assigned role.
                    </p>
                    {Object.entries(groupedPermissions).map(([category, perms]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">{category}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                          {perms.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-${permission.id}`}
                                name={permission.id}
                                defaultChecked={selectedUser.customPermissions.includes(permission.id)}
                              />
                              <Label htmlFor={`edit-${permission.id}`} className="text-sm">
                                {permission.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </AppLayout>
  )
}

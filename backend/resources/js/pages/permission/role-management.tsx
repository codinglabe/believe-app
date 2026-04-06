import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { TextArea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Pagination } from "@/components/ui/pagination"
import { Search, Plus, Edit, Trash2, Shield, Users, ArrowLeft } from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import { Link } from "@inertiajs/react"

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

const initialRoles = [
    {
        id: "1",
        name: "Super Admin",
        description: "Full system access with all permissions",
        permissions: permissions.map((p) => p.id),
        userCount: 2,
        color: "bg-red-500",
    },
    {
        id: "2",
        name: "Admin",
        description: "Administrative access with most permissions",
        permissions: [
            "channels.create",
            "channels.edit",
            "messages.create",
            "messages.edit",
            "users.view",
            "users.edit",
            "files.upload",
        ],
        userCount: 5,
        color: "bg-blue-500",
    },
    {
        id: "3",
        name: "Moderator",
        description: "Content moderation capabilities",
        permissions: ["messages.delete", "messages.edit", "users.view", "files.delete"],
        userCount: 12,
        color: "bg-green-500",
    },
    {
        id: "4",
        name: "Editor",
        description: "Content creation and editing",
        permissions: ["channels.create", "messages.create", "messages.edit", "files.upload"],
        userCount: 28,
        color: "bg-purple-500",
    },
    {
        id: "5",
        name: "Viewer",
        description: "Read-only access to content",
        permissions: ["users.view"],
        userCount: 77,
        color: "bg-gray-500",
    },
    {
        id: "6",
        name: "Content Manager",
        description: "Manage content across all channels",
        permissions: ["channels.create", "channels.edit", "messages.create", "messages.edit", "files.upload"],
        userCount: 15,
        color: "bg-indigo-500",
    },
    {
        id: "7",
        name: "Support Agent",
        description: "Customer support and user assistance",
        permissions: ["users.view", "messages.create", "files.upload"],
        userCount: 23,
        color: "bg-teal-500",
    },
    {
        id: "8",
        name: "Analyst",
        description: "Data analysis and reporting access",
        permissions: ["users.view", "settings.view"],
        userCount: 8,
        color: "bg-orange-500",
    },
]


export default function RoleManagement() {
    const [roles, setRoles] = useState(initialRoles)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedRole, setSelectedRole] = useState<(typeof initialRoles)[0] | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 6

    const filteredRoles = roles.filter(
        (role) =>
            role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            role.description.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    const totalPages = Math.ceil(filteredRoles.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedRoles = filteredRoles.slice(startIndex, startIndex + itemsPerPage)

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

    const handleCreateRole = (formData: FormData) => {
        const name = formData.get("name") as string
        const description = formData.get("description") as string
        const selectedPermissions = permissions.filter((p) => formData.get(p.id)).map((p) => p.id)

        const newRole = {
            id: Date.now().toString(),
            name,
            description,
            permissions: selectedPermissions,
            userCount: 0,
            color: "bg-indigo-500",
        }

        setRoles([...roles, newRole])
        setIsCreateDialogOpen(false)
    }

    const handleEditRole = (formData: FormData) => {
        if (!selectedRole) return

        const name = formData.get("name") as string
        const description = formData.get("description") as string
        const selectedPermissions = permissions.filter((p) => formData.get(p.id)).map((p) => p.id)

        setRoles(
            roles.map((role) =>
                role.id === selectedRole.id ? { ...role, name, description, permissions: selectedPermissions } : role,
            ),
        )
        setIsEditDialogOpen(false)
        setSelectedRole(null)
    }

    const handleDeleteRole = (roleId: string) => {
        setRoles(roles.filter((role) => role.id !== roleId))
    }

    return (
        <AppLayout>
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
                {/* Header */}
                <div className="mb-8 animate-in fade-in-0 slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/permission-management">
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
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Role Management</h1>
                            <p className="text-slate-600 dark:text-slate-400 text-lg">
                                Create and manage user roles with specific permissions
                            </p>
                        </div>
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="flex items-center gap-2 transition-all duration-200 hover:scale-105">
                                    <Plus className="w-4 h-4" />
                                    Create Role
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Create New Role</DialogTitle>
                                    <DialogDescription>Define a new role with specific permissions for your users.</DialogDescription>
                                </DialogHeader>
                                <form action={handleCreateRole}>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Role Name</Label>
                                            <Input id="name" name="name" placeholder="Enter role name" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description">Description</Label>
                                            <TextArea id="description" name="description" placeholder="Describe this role's purpose" />
                                        </div>
                                        <div className="space-y-4">
                                            <Label>Permissions</Label>
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
                                    </div>
                                    <DialogFooter className="mt-6">
                                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit">Create Role</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-200">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                        placeholder="Search roles..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1)
                        }}
                        className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Roles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {paginatedRoles.map((role, index) => (
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
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setSelectedRole(role)
                                                setIsEditDialogOpen(true)
                                            }}
                                            className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-110"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
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
                                            const permission = permissions.find((p) => p.id === permissionId)
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
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredRoles.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />

                {/* Edit Role Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Role</DialogTitle>
                            <DialogDescription>Modify the role permissions and details.</DialogDescription>
                        </DialogHeader>
                        {selectedRole && (
                            <form action={handleEditRole}>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-name">Role Name</Label>
                                        <Input id="edit-name" name="name" defaultValue={selectedRole.name} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-description">Description</Label>
                                        <TextArea id="edit-description" name="description" defaultValue={selectedRole.description} />
                                    </div>
                                    <div className="space-y-4">
                                        <Label>Permissions</Label>
                                        {Object.entries(groupedPermissions).map(([category, perms]) => (
                                            <div key={category} className="space-y-2">
                                                <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">{category}</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                                                    {perms.map((permission) => (
                                                        <div key={permission.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`edit-${permission.id}`}
                                                                name={permission.id}
                                                                defaultChecked={selectedRole.permissions.includes(permission.id)}
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
                                </div>
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

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, X } from "lucide-react" // Added UserCog icon
import { Link, router } from "@inertiajs/react" // Import Inertia router
import { usePage } from "@inertiajs/react" // To access Inertia props like errors
import PermissionSelector from "@/components/ui/permission-selector"
import AppLayout from "@/layouts/app-layout"

interface EditUserProps {
    user: {
        id: string
        name: string
        email: string
        roleId: string | null
        status: "active" | "inactive"
        customPermissions: string[]
    }
    allPermissions: { id: string; name: string; category: string }[]
    allRoles: { id: string; name: string }[]
}

export default function EditUser({ user: initialUserData, allPermissions, allRoles }: EditUserProps) {
    const { errors } = usePage().props as { errors: Record<string, string> } // Access Inertia errors
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "", // Added password field for optional update
        roleId: "",
        status: "active" as "active" | "inactive",
        customPermissions: [] as string[],
    })
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        if (initialUserData) {
            setFormData({
                name: initialUserData.name,
                email: initialUserData.email,
                password: "",
                roleId: initialUserData.roleId || "",
                status: initialUserData.status,
                customPermissions: initialUserData.customPermissions, // <-- This line is key!
            })
        }
        setLoading(false)
    }, [initialUserData])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        router.put(route("users.update", initialUserData.id), formData, {
            onSuccess: () => {
                router.visit(route('users.list'))
            },
            onError: (errors) => {
                console.error("Error updating user:", errors)
            },
        })
    }

    const handleCancel = () => {
        //onNavigate("users-list")
    }

    if (loading) {
        return (
            <AppLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <div className="min-h-screen">
                <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-full">
                    {/* Header */}
                    <div className="mb-8 animate-in fade-in-0 slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-4 mb-6">
                            <Link href={route('permissions.overview')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-2 hover:bg-white/80 dark:hover:bg-slate-800/80 backdrop-blur-sm transition-all duration-200"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Users
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        {/* Form Section */}
                        <div className="xl:col-span-1">
                            <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-200 sticky top-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-2xl">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                        User Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            Full Name *
                                        </Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Enter full name"
                                            required
                                            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            Email Address *
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="Enter email address"
                                            required
                                            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            New Password (optional)
                                        </Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="Leave blank to keep current password"
                                            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="role" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            Primary Role *
                                        </Label>
                                        <Select
                                            value={formData.roleId}
                                            onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                                        >
                                            <SelectTrigger className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 transition-all duration-200 focus:ring-2 focus:ring-purple-500">
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allRoles.map((role) => (
                                                    <SelectItem key={role.id} value={role.id}>
                                                        {role.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.roleId && <p className="text-red-500 text-xs mt-1">{errors.roleId}</p>}
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="status" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            Status *
                                        </Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}
                                        >
                                            <SelectTrigger className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 transition-all duration-200 focus:ring-2 focus:ring-purple-500">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
                                    </div>

                                    {/* Permission Summary */}
                                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Additional Permissions</h4>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-sm font-bold">{formData.customPermissions.length}</span>
                                            </div>
                                            <span className="text-sm text-slate-600 dark:text-slate-400">custom permissions</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-3 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                                        <Button
                                            type="submit"
                                            onClick={handleSubmit}
                                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 hover:scale-105 shadow-lg"
                                            disabled={!formData.name.trim() || !formData.email.trim() || !formData.roleId}
                                        >
                                            <Save className="w-4 h-4" />
                                            Save Changes
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCancel}
                                            className="flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
                                        >
                                            <X className="w-4 h-4" />
                                            Cancel
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Permissions Section */}
                        <div className="xl:col-span-3">
                            <div className="animate-in fade-in-0 slide-in-from-right-4 duration-500 delay-300">
                                <PermissionSelector
                                    permissions={allPermissions}
                                    selectedPermissions={formData.customPermissions}
                                    onChange={(permissions) => setFormData({ ...formData, customPermissions: permissions })}
                                    title="Additional Permissions"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}

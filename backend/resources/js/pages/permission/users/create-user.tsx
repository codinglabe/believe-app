import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, X } from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import PermissionSelector from "@/components/ui/permission-selector"

interface CreateUserProps {
    allPermissions: { id: string; name: string; category: string }[]
    allRoles: { id: string; name: string }[]
    onNavigate: (page: string) => void
}

export default function CreateUser({ allPermissions, allRoles, onNavigate }: CreateUserProps) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        roleId: "",
        customPermissions: [] as string[],
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Here you would typically save the user to your backend
        console.log("Creating user:", formData)
        onNavigate("users-list")
    }

    const handleCancel = () => {
        onNavigate("users-list")
    }

    return (
        <AppLayout>
            <div className="min-h-screen">
                <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-full">
                    {/* Header */}
                    <div className="animate-in fade-in-0 slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-4 mb-6">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onNavigate("users-list")}
                                className="flex items-center gap-2 hover:bg-white/80 dark:hover:bg-slate-800/80 backdrop-blur-sm transition-all duration-200"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Users
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        {/* Form Section */}
                        <div className="xl:col-span-1">
                            <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-200 sticky top-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-2xl">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
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
                                            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
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
                                            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="role" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            Primary Role *
                                        </Label>
                                        <Select
                                            value={formData.roleId}
                                            onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                                        >
                                            <SelectTrigger className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 transition-all duration-200 focus:ring-2 focus:ring-green-500">
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
                                    </div>

                                    {/* Permission Summary */}
                                    <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200/50 dark:border-green-700/50">
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Additional Permissions</h4>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
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
                                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 transition-all duration-200 hover:scale-105 shadow-lg"
                                            disabled={!formData.name.trim() || !formData.email.trim() || !formData.roleId}
                                        >
                                            <Save className="w-4 h-4" />
                                            Create User
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

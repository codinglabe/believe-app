import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, X } from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import { TextArea } from "@/components/ui/textarea"
import PermissionSelector from "@/components/ui/permission-selector"
import { Link } from "@inertiajs/react"

interface EditRoleProps {
    role: {
        id: string
        name: string
        description: string
        permissions: string[]
    }
    allPermissions: { id: string; name: string; category: string }[]
    onNavigate: (page: string) => void
}

export default function EditRole({ role: initialRoleData, allPermissions, onNavigate }: EditRoleProps) {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        permissions: [] as string[],
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (initialRoleData) {
            setFormData({
                name: initialRoleData.name,
                description: initialRoleData.description,
                permissions: initialRoleData.permissions,
            })
        }
        setLoading(false)
    }, [initialRoleData])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Here you would typically update the role in your backend
        console.log("Updating role:", formData)
        onNavigate("roles-list")
    }

    const handleCancel = () => {
        onNavigate("roles-list")
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <AppLayout>
            <div className="min-h-screen">
                <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-full">
                    {/* Header */}
                    <div className="animate-in fade-in-0 slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-4 mb-6">
                            <Link href={route('permissions.overview')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onNavigate("roles-list")}
                                    className="flex items-center gap-2 hover:bg-white/80 dark:hover:bg-slate-800/80 backdrop-blur-sm transition-all duration-200"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Roles
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        {/* Form Section */}
                        <div className="xl:col-span-1">
                            <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-200 sticky top-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-2xl">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                                        Role Configuration
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            Role Name *
                                        </Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., Content Manager"
                                            required
                                            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="description" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            Description
                                        </Label>
                                        <TextArea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Describe the role's purpose and responsibilities..."
                                            rows={4}
                                            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                                        />
                                    </div>

                                    {/* Permission Summary */}
                                    <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border border-orange-200/50 dark:border-orange-700/50">
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Permission Summary</h4>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-sm font-bold">{formData.permissions.length}</span>
                                            </div>
                                            <span className="text-sm text-slate-600 dark:text-slate-400">permissions selected</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-3 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                                        <Button
                                            type="submit"
                                            onClick={handleSubmit}
                                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 transition-all duration-200 hover:scale-105 shadow-lg"
                                            disabled={!formData.name.trim()}
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
                                    selectedPermissions={formData.permissions}
                                    onChange={(permissions) => setFormData({ ...formData, permissions })}
                                    title="Role Permissions"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}

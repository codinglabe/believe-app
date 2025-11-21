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
import { Link, router } from "@inertiajs/react"

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
        
        // Debug: Log the form data being sent
        console.log('Submitting role update:', {
            roleId: initialRoleData.id,
            formData: formData,
            permissions: formData.permissions
        })
        
        router.put(route("roles.update", initialRoleData.id), formData, {
            onSuccess: () => {
                router.visit(route('roles.list'))
            },
            onError: (errors) => {
                console.error("Error updating role:", errors)
            },
        })
    }

    const handleCancel = () => {
        router.visit(route('roles.list'))
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
            <div className="h-[calc(100vh-4rem)] flex flex-col">
                <div className="w-full p-4 md:p-6 flex-1 flex flex-col min-h-0">
                    {/* Header */}
                    <div className="mb-4 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <Link href={route('permissions.overview')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onNavigate("roles-list")}
                                    className="flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Roles
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Permissions Section */}
                    <div className="flex flex-col min-h-0 flex-1">
                        <PermissionSelector
                            permissions={allPermissions}
                            selectedPermissions={formData.permissions}
                            onChange={(permissions) => setFormData({ ...formData, permissions })}
                            title="Role Permissions"
                            userInfo={{
                                name: formData.name,
                                email: formData.description,
                                role: undefined,
                            }}
                        />
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 mt-4 p-4 bg-muted/50 rounded-lg border">
                            <Button
                                type="submit"
                                onClick={handleSubmit}
                                size="sm"
                                className="flex items-center justify-center gap-2"
                                disabled={!formData.name.trim()}
                            >
                                <Save className="w-4 h-4" />
                                Save Changes
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCancel}
                                className="flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}

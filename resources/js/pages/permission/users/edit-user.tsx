import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, X } from "lucide-react"
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
        rolePermissions?: string[] // Permissions from role (read-only reference)
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
            // Merge role permissions with custom permissions for initial display
            const rolePermissions = initialUserData.rolePermissions || []
            const customPermissions = initialUserData.customPermissions || []
            // Combine both - role permissions are shown as selected initially
            const allSelectedPermissions = [...new Set([...rolePermissions, ...customPermissions])]
            
            setFormData({
                name: initialUserData.name,
                email: initialUserData.email,
                password: "",
                roleId: initialUserData.roleId || "",
                status: initialUserData.status,
                customPermissions: allSelectedPermissions, // Show both role and custom permissions as selected
            })
        }
        setLoading(false)
    }, [initialUserData])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        
        // Get role permissions to exclude from custom permissions
        const rolePermissions = initialUserData.rolePermissions || []
        // Only send custom permissions (exclude role permissions)
        const customPermissionsOnly = formData.customPermissions.filter(
            perm => !rolePermissions.includes(perm)
        )
        
        // Debug: Log the form data being sent
        console.log('Submitting user update:', {
            userId: initialUserData.id,
            formData: formData,
            customPermissions: customPermissionsOnly
        })
        
        router.put(route("users.update", initialUserData.id), {
            ...formData,
            customPermissions: customPermissionsOnly, // Only send custom permissions, not role permissions
        }, {
            onSuccess: () => {
                router.visit(route('users.list'))
            },
            onError: (errors) => {
                console.error("Error updating user:", errors)
            },
        })
    }

    const handleCancel = () => {
        router.visit(route('users.list'))
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
            <div className="h-[calc(100vh-4rem)] flex flex-col">
                <div className="w-full p-4 md:p-6 flex-1 flex flex-col min-h-0">
                    {/* Header */}
                    <div className="mb-4 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <Link href={route('permissions.overview')}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Users
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Permissions Section */}
                    <div className="flex flex-col min-h-0 flex-1">
                        <PermissionSelector
                            permissions={allPermissions}
                            selectedPermissions={formData.customPermissions}
                            onChange={(permissions) => setFormData({ ...formData, customPermissions: permissions })}
                            title="User Permissions"
                            userInfo={{
                                name: formData.name,
                                email: formData.email,
                                role: formData.roleId,
                                roles: allRoles,
                            }}
                        />
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 mt-4 p-4 bg-muted/50 rounded-lg border">
                            <Button
                                type="submit"
                                onClick={handleSubmit}
                                size="sm"
                                className="flex items-center justify-center gap-2"
                                disabled={!formData.name.trim() || !formData.email.trim() || !formData.roleId}
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

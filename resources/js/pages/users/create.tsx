import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, X } from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import { Link, router, useForm, Head } from "@inertiajs/react"
import type { BreadcrumbItem } from "@/types"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface CreateUserProps {
  allRoles: { id: string; name: string }[]
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Users", href: "/users" },
  { title: "Create User", href: "#" },
]

export default function CreateUser({ allRoles }: CreateUserProps) {
  const { data, setData, post, processing, errors } = useForm({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    roleId: "",
    status: "active" as "active" | "inactive",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    post(route("users.store"), {
      onSuccess: () => {
        showSuccessToast("User created successfully")
      },
      onError: (errors) => {
        showErrorToast(errors.message || "Failed to create user")
      },
    })
  }

  const handleCancel = () => {
    router.visit(route('users.list'))
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Create User" />
      <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={route('users.list')}>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Users
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Create New User</h1>
            <p className="text-muted-foreground">
              Add a new user to the system
            </p>
          </div>
        </div>

        <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={data.name}
                      onChange={(e) => setData('name', e.target.value)}
                      placeholder="Enter full name"
                      required
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={data.email}
                      onChange={(e) => setData('email', e.target.value)}
                      placeholder="Enter email address"
                      required
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                    </div>
                  </div>

                  {/* Password Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Password</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={data.password}
                          onChange={(e) => setData('password', e.target.value)}
                          placeholder="Enter password (min 8 characters)"
                          required
                          minLength={8}
                          className={errors.password ? "border-destructive" : ""}
                        />
                        {errors.password && (
                          <p className="text-sm text-destructive">{errors.password}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password_confirmation">Confirm Password *</Label>
                        <Input
                          id="password_confirmation"
                          type="password"
                          value={data.password_confirmation}
                          onChange={(e) => setData('password_confirmation', e.target.value)}
                          placeholder="Confirm password"
                          required
                          minLength={8}
                          className={errors.password_confirmation ? "border-destructive" : ""}
                        />
                        {errors.password_confirmation && (
                          <p className="text-sm text-destructive">{errors.password_confirmation}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Role & Status */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Role & Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="role">Role *</Label>
                        <Select
                          value={data.roleId}
                          onValueChange={(value) => setData('roleId', value)}
                        >
                          <SelectTrigger className={errors.roleId ? "border-destructive" : ""}>
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
                        {errors.roleId && (
                          <p className="text-sm text-destructive">{errors.roleId}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Status *</Label>
                        <Select
                          value={data.status}
                          onValueChange={(value: "active" | "inactive") => setData('status', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.status && (
                          <p className="text-sm text-destructive">{errors.status}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={processing || !data.name.trim() || !data.email.trim() || !data.roleId || !data.password}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Create User
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
      </div>
    </AppLayout>
  )
}

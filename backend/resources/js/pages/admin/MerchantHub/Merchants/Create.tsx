"use client"

import React from "react"
import { Head, useForm, Link } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/admin/ImageUpload"
import {
    Save,
    ArrowLeft,
    Store,
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    // { title: 'Dashboard', href: '/dashboard' },
    { title: 'Merchant Hub', href: '/admin/merchant-hub' },
    { title: 'Merchants', href: '/admin/merchant-hub/merchants' },
    { title: 'Create Merchant', href: '/admin/merchant-hub/merchants/create' },
]

export default function AdminMerchantsCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        slug: '',
        logo: null as File | null,
        is_active: true,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post('/admin/merchant-hub/merchants', {
            forceFormData: true,
        })
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Merchant" />

            <div className="space-y-6 p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Merchant</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Add a new merchant to the Merchant Hub
                        </p>
                    </div>
                    <Link href="/admin/merchant-hub/merchants">
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Merchants
                        </Button>
                    </Link>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Merchant Details</CardTitle>
                            <CardDescription>
                                Enter the details for the new merchant
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">Merchant Name *</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="e.g., Retail Store, Fitness Center"
                                        className={errors.name ? 'border-red-500' : ''}
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-red-500">{errors.name}</p>
                                    )}
                                </div>

                                {/* Slug */}
                                <div className="space-y-2">
                                    <Label htmlFor="slug">Slug</Label>
                                    <Input
                                        id="slug"
                                        value={data.slug}
                                        onChange={(e) => setData('slug', e.target.value)}
                                        placeholder="Auto-generated from name if left empty"
                                        className={errors.slug ? 'border-red-500' : ''}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Leave empty to auto-generate from name
                                    </p>
                                    {errors.slug && (
                                        <p className="text-sm text-red-500">{errors.slug}</p>
                                    )}
                                </div>
                            </div>

                            {/* Logo Upload */}
                            <div className="space-y-2">
                                <ImageUpload
                                    label="Merchant Logo"
                                    value={null}
                                    onChange={(file) => setData('logo', file)}
                                    processing={processing}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Upload a logo image for the merchant (max 5MB)
                                </p>
                                {errors.logo && (
                                    <p className="text-sm text-red-500">{errors.logo}</p>
                                )}
                            </div>

                            {/* Is Active */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label htmlFor="is_active" className="text-base font-medium">Active</Label>
                                    <p className="text-sm text-muted-foreground">Merchant will be visible in the Merchant Hub</p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 mt-6">
                        <Link href="/admin/merchant-hub/merchants">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Creating...' : 'Create Merchant'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    )
}


"use client"

import React from "react"
import { Head, useForm, Link } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
    Save, 
    ArrowLeft,
    Mail
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Email Packages', href: '/admin/email-packages' },
    { title: 'Create Package', href: '/admin/email-packages/create' },
]

export default function AdminEmailPackagesCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        emails_count: 0,
        price: 0,
        is_active: true,
        sort_order: 0,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post('/admin/email-packages')
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Email Package" />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Email Package</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Create a new email package for users to purchase
                        </p>
                    </div>
                    <Link href="/admin/email-packages">
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Packages
                        </Button>
                    </Link>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Package Details</CardTitle>
                            <CardDescription>
                                Enter the details for the email package
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Name */}
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Package Name *</Label>
                                            <Input
                                                id="name"
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
                                                placeholder="e.g., Micro Pack, Value Pack"
                                                className={errors.name ? 'border-red-500' : ''}
                                            />
                                            {errors.name && (
                                                <p className="text-sm text-red-500">{errors.name}</p>
                                            )}
                                        </div>

                                        {/* Emails Count */}
                                        <div className="space-y-2">
                                            <Label htmlFor="emails_count">Number of Emails *</Label>
                                            <Input
                                                id="emails_count"
                                                type="number"
                                                min="1"
                                                value={data.emails_count}
                                                onChange={(e) => setData('emails_count', parseInt(e.target.value) || 0)}
                                                placeholder="e.g., 100, 1000"
                                                className={errors.emails_count ? 'border-red-500' : ''}
                                            />
                                            {errors.emails_count && (
                                                <p className="text-sm text-red-500">{errors.emails_count}</p>
                                            )}
                                        </div>
                                    </div>

                            {/* Description */}
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Optional description for the package"
                                    rows={4}
                                    className={errors.description ? 'border-red-500' : 'border-input rounded-md'}
                                />
                                {errors.description && (
                                    <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                                )}
                            </div>

                                    {/* Price */}
                                    <div className="space-y-2">
                                        <Label htmlFor="price">Price ($) *</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={data.price}
                                            onChange={(e) => setData('price', parseFloat(e.target.value) || 0)}
                                            placeholder="e.g., 0.20, 1.00"
                                            className={errors.price ? 'border-red-500' : ''}
                                        />
                                        {errors.price && (
                                            <p className="text-sm text-red-500">{errors.price}</p>
                                        )}
                                    </div>

                                    {/* Sort Order */}
                                    <div className="space-y-2">
                                        <Label htmlFor="sort_order">Sort Order</Label>
                                        <Input
                                            id="sort_order"
                                            type="number"
                                            min="0"
                                            value={data.sort_order}
                                            onChange={(e) => setData('sort_order', parseInt(e.target.value) || 0)}
                                            placeholder="0"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Lower numbers appear first
                                        </p>
                                    </div>

                                    {/* Is Active */}
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <Label htmlFor="is_active" className="text-base font-medium">Active</Label>
                                            <p className="text-sm text-muted-foreground">Package will be visible to users</p>
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
                        <Link href="/admin/email-packages">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Creating...' : 'Create Package'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    )
}


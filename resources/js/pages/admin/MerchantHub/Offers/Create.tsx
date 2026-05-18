"use client"

import React from "react"
import { Head, useForm, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUpload } from "@/components/admin/ImageUpload"
import {
    Save,
    ArrowLeft,
    Gift,
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface MerchantHubCategory {
    id: number
    name: string
    slug: string
}

interface MerchantHubMerchant {
    id: number
    name: string
    slug: string
}

interface OffersCreateProps {
    categories: MerchantHubCategory[]
    merchants: MerchantHubMerchant[]
}

const breadcrumbs: BreadcrumbItem[] = [
    // { title: 'Dashboard', href: '/dashboard' },
    { title: 'Merchant Hub', href: '/admin/merchant-hub' },
    { title: 'Offers', href: '/admin/merchant-hub/offers' },
    { title: 'Create Offer', href: '/admin/merchant-hub/offers/create' },
]

export default function AdminOffersCreate({ categories, merchants }: OffersCreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        merchant_hub_merchant_id: '',
        merchant_hub_category_id: '',
        title: '',
        short_description: '',
        description: '',
        image: null as File | null,
        points_required: 0,
        cash_required: '',
        currency: 'USD',
        inventory_qty: '',
        starts_at: '',
        ends_at: '',
        status: 'draft' as 'draft' | 'active' | 'paused' | 'expired',
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post('/admin/merchant-hub/offers', {
            forceFormData: true,
        })
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Offer" />

            <div className="space-y-6 p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Offer</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Add a new offer to the Merchant Hub
                        </p>
                    </div>
                    <Link href="/admin/merchant-hub/offers">
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Offers
                        </Button>
                    </Link>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Offer Details</CardTitle>
                            <CardDescription>
                                Enter the details for the new offer
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Merchant */}
                                <div className="space-y-2">
                                    <Label htmlFor="merchant_hub_merchant_id">Merchant *</Label>
                                    <Select
                                        value={data.merchant_hub_merchant_id}
                                        onValueChange={(value) => setData('merchant_hub_merchant_id', value)}
                                    >
                                        <SelectTrigger className={errors.merchant_hub_merchant_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select a merchant" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {merchants.map((merchant) => (
                                                <SelectItem key={merchant.id} value={merchant.id.toString()}>
                                                    {merchant.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.merchant_hub_merchant_id && (
                                        <p className="text-sm text-red-500">{errors.merchant_hub_merchant_id}</p>
                                    )}
                                </div>

                                {/* Category */}
                                <div className="space-y-2">
                                    <Label htmlFor="merchant_hub_category_id">Category *</Label>
                                    <Select
                                        value={data.merchant_hub_category_id}
                                        onValueChange={(value) => setData('merchant_hub_category_id', value)}
                                    >
                                        <SelectTrigger className={errors.merchant_hub_category_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={category.id.toString()}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.merchant_hub_category_id && (
                                        <p className="text-sm text-red-500">{errors.merchant_hub_category_id}</p>
                                    )}
                                </div>
                            </div>

                            {/* Title */}
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    placeholder="e.g., 50% Off Electronics"
                                    className={errors.title ? 'border-red-500' : ''}
                                    required
                                />
                                {errors.title && (
                                    <p className="text-sm text-red-500">{errors.title}</p>
                                )}
                            </div>

                            {/* Short Description */}
                            <div className="space-y-2">
                                <Label htmlFor="short_description">Short Description</Label>
                                <Input
                                    id="short_description"
                                    value={data.short_description}
                                    onChange={(e) => setData('short_description', e.target.value)}
                                    placeholder="Brief description (max 500 characters)"
                                    maxLength={500}
                                    className={errors.short_description ? 'border-red-500' : ''}
                                />
                                {errors.short_description && (
                                    <p className="text-sm text-red-500">{errors.short_description}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Full description of the offer"
                                    rows={6}
                                    className={errors.description ? 'border-red-500' : ''}
                                    required
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500">{errors.description}</p>
                                )}
                            </div>

                            {/* Image Upload */}
                            <div className="space-y-2">
                                <ImageUpload
                                    label="Offer Image"
                                    value={null}
                                    onChange={(file) => setData('image', file)}
                                    processing={processing}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Upload an image for the offer (max 5MB)
                                </p>
                                {errors.image && (
                                    <p className="text-sm text-red-500">{errors.image}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Points Required */}
                                <div className="space-y-2">
                                    <Label htmlFor="points_required">Points Required *</Label>
                                    <Input
                                        id="points_required"
                                        type="number"
                                        min="0"
                                        value={data.points_required}
                                        onChange={(e) => setData('points_required', parseInt(e.target.value) || 0)}
                                        className={errors.points_required ? 'border-red-500' : ''}
                                        required
                                    />
                                    {errors.points_required && (
                                        <p className="text-sm text-red-500">{errors.points_required}</p>
                                    )}
                                </div>

                                {/* Cash Required */}
                                <div className="space-y-2">
                                    <Label htmlFor="cash_required">Cash Required (Optional)</Label>
                                    <Input
                                        id="cash_required"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.cash_required}
                                        onChange={(e) => setData('cash_required', e.target.value)}
                                        placeholder="0.00"
                                        className={errors.cash_required ? 'border-red-500' : ''}
                                    />
                                    {errors.cash_required && (
                                        <p className="text-sm text-red-500">{errors.cash_required}</p>
                                    )}
                                </div>

                                {/* Currency */}
                                <div className="space-y-2">
                                    <Label htmlFor="currency">Currency</Label>
                                    <Select
                                        value={data.currency}
                                        onValueChange={(value) => setData('currency', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD">USD</SelectItem>
                                            <SelectItem value="EUR">EUR</SelectItem>
                                            <SelectItem value="GBP">GBP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Inventory Quantity */}
                                <div className="space-y-2">
                                    <Label htmlFor="inventory_qty">Inventory Quantity (Optional)</Label>
                                    <Input
                                        id="inventory_qty"
                                        type="number"
                                        min="0"
                                        value={data.inventory_qty}
                                        onChange={(e) => setData('inventory_qty', e.target.value)}
                                        placeholder="Leave empty for unlimited"
                                        className={errors.inventory_qty ? 'border-red-500' : ''}
                                    />
                                    {errors.inventory_qty && (
                                        <p className="text-sm text-red-500">{errors.inventory_qty}</p>
                                    )}
                                </div>

                                {/* Starts At */}
                                <div className="space-y-2">
                                    <Label htmlFor="starts_at">Starts At (Optional)</Label>
                                    <Input
                                        id="starts_at"
                                        type="datetime-local"
                                        value={data.starts_at}
                                        onChange={(e) => setData('starts_at', e.target.value)}
                                        className={errors.starts_at ? 'border-red-500' : ''}
                                    />
                                    {errors.starts_at && (
                                        <p className="text-sm text-red-500">{errors.starts_at}</p>
                                    )}
                                </div>

                                {/* Ends At */}
                                <div className="space-y-2">
                                    <Label htmlFor="ends_at">Ends At (Optional)</Label>
                                    <Input
                                        id="ends_at"
                                        type="datetime-local"
                                        value={data.ends_at}
                                        onChange={(e) => setData('ends_at', e.target.value)}
                                        className={errors.ends_at ? 'border-red-500' : ''}
                                    />
                                    {errors.ends_at && (
                                        <p className="text-sm text-red-500">{errors.ends_at}</p>
                                    )}
                                </div>
                            </div>

                            {/* Status */}
                            <div className="space-y-2">
                                <Label htmlFor="status">Status *</Label>
                                <Select
                                    value={data.status}
                                    onValueChange={(value) => setData('status', value as 'draft' | 'active' | 'paused' | 'expired')}
                                >
                                    <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="paused">Paused</SelectItem>
                                        <SelectItem value="expired">Expired</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status && (
                                    <p className="text-sm text-red-500">{errors.status}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 mt-6">
                        <Link href="/admin/merchant-hub/offers">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Creating...' : 'Create Offer'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    )
}


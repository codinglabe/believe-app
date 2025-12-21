"use client"

import React from "react"
import { Head, useForm, Link } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/admin/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
    Save, 
    ArrowLeft,
    Wallet
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import { route } from "ziggy-js"

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Wallet Plans Management', href: '/admin/wallet-plans' },
    { title: 'Create Wallet Plan', href: '#' },
]

export default function AdminWalletPlansCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        frequency: 'monthly',
        price: '',
        description: '',
        is_active: true,
        sort_order: 0,
        trial_days: 14,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post(route('admin.wallet-plans.store'))
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Wallet Plan" />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Wallet Plan</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Create a new wallet subscription plan for users
                        </p>
                    </div>
                    <Link href={route('admin.wallet-plans.index')}>
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Wallet Plans
                        </Button>
                    </Link>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Plan Details</CardTitle>
                                    <CardDescription>Basic information about the wallet plan</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Plan Name *</Label>
                                            <Input
                                                id="name"
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
                                                placeholder="e.g., Monthly, Annual"
                                                className={errors.name ? 'border-red-500' : ''}
                                            />
                                            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="frequency">Frequency *</Label>
                                            <Select value={data.frequency} onValueChange={(value) => setData('frequency', value)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="monthly">Monthly</SelectItem>
                                                    <SelectItem value="annually">Annual</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.frequency && <p className="text-sm text-red-500">{errors.frequency}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="price">Price ($) *</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={data.price}
                                            onChange={(e) => setData('price', e.target.value)}
                                            placeholder="0.00"
                                            className={errors.price ? 'border-red-500' : ''}
                                        />
                                        {errors.price && <p className="text-sm text-red-500">{errors.price}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Plan description..."
                                            rows={4}
                                            className={errors.description ? 'border-red-500' : ''}
                                        />
                                        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="trial_days">Trial Days</Label>
                                            <Input
                                                id="trial_days"
                                                type="number"
                                                min="0"
                                                max="365"
                                                value={data.trial_days}
                                                onChange={(e) => setData('trial_days', parseInt(e.target.value) || 0)}
                                                placeholder="14"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Number of free trial days (0 to disable trial)
                                            </p>
                                        </div>

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
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="is_active">Active</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Make this plan available for subscription
                                            </p>
                                        </div>
                                        <Switch
                                            id="is_active"
                                            checked={data.is_active}
                                            onCheckedChange={(checked) => setData('is_active', checked)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Stripe Integration</CardTitle>
                                    <CardDescription>
                                        Stripe product and price IDs will be automatically created when you save this plan.
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-center justify-end gap-4 pt-6 border-t">
                        <Link href={route('admin.wallet-plans.index')}>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing} className="bg-primary hover:bg-primary/90">
                            <Save className="h-4 w-4 mr-2" />
                            {processing ? 'Creating...' : 'Create Plan'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    )
}



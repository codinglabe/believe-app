"use client"

import React, { useState } from "react"
import { Head, useForm, router, Link } from "@inertiajs/react"
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
    Plus,
    Trash2,
    Sparkles
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Plans Management', href: '/admin/plans' },
    { title: 'Edit Plan', href: '#' },
]

interface PlanFeature {
    id: number
    name: string
    description: string | null
    icon: string | null
    is_unlimited: boolean
    sort_order: number
}

interface CustomField {
    key: string
    label: string
    value: string
    type: 'text' | 'number' | 'currency' | 'boolean'
    icon?: string
    description?: string
}

interface Plan {
    id: number
    name: string
    frequency: string
    price: number
    stripe_price_id: string | null
    stripe_product_id: string | null
    description: string | null
    is_active: boolean
    is_popular: boolean
    sort_order: number
    custom_fields: CustomField[]
    features: PlanFeature[]
}

interface EditPlanProps {
    plan: Plan
}

interface FeatureForm {
    id?: number
    name: string
    description: string
    icon: string
    is_unlimited: boolean
    sort_order: number
}

export default function AdminPlansEdit({ plan }: EditPlanProps) {
    const { data, setData, put, processing, errors } = useForm({
        name: plan.name,
        frequency: plan.frequency,
        price: plan.price.toString(),
        stripe_price_id: plan.stripe_price_id || '',
        stripe_product_id: plan.stripe_product_id || '',
        description: plan.description || '',
        is_active: plan.is_active,
        is_popular: plan.is_popular,
        sort_order: plan.sort_order,
        trial_days: plan.trial_days ?? 0,
        custom_fields: plan.custom_fields || [],
        features: plan.features.map(f => ({
            id: f.id,
            name: f.name,
            description: f.description || '',
            icon: f.icon || '',
            is_unlimited: f.is_unlimited,
            sort_order: f.sort_order,
        })) as FeatureForm[],
    })

    const addFeature = () => {
        setData('features', [
            ...data.features,
            {
                name: '',
                description: '',
                icon: '',
                is_unlimited: false,
                sort_order: data.features.length,
            }
        ])
    }

    const removeFeature = (index: number) => {
        setData('features', data.features.filter((_, i) => i !== index))
    }

    const updateFeature = (index: number, field: keyof FeatureForm, value: any) => {
        const updated = [...data.features]
        updated[index] = { ...updated[index], [field]: value }
        setData('features', updated)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        put(route('admin.plans.update', plan.id))
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Plan" />
            
            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Plan: {plan.name}</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Update plan details and settings
                        </p>
                    </div>
                    <Link href={route('admin.plans.index')}>
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Plans
                        </Button>
                    </Link>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Plan Details</CardTitle>
                                    <CardDescription>Basic information about the plan</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Plan Name *</Label>
                                            <Input
                                                id="name"
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
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
                                                    <SelectItem value="yearly">Yearly</SelectItem>
                                                    <SelectItem value="weekly">Weekly</SelectItem>
                                                    <SelectItem value="one-time">One-time</SelectItem>
                                                </SelectContent>
                                            </Select>
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
                                            className={errors.description ? 'border-red-500' : 'border-input rounded-md'}
                                        />
                                        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="sort_order">Sort Order</Label>
                                        <Input
                                            id="sort_order"
                                            type="number"
                                            min="0"
                                            value={data.sort_order}
                                            onChange={(e) => setData('sort_order', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
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
                                </CardContent>
                            </Card>

                            {/* Custom Fields Section */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Custom Fields</CardTitle>
                                            <CardDescription>Add dynamic custom fields to display on the plan card (e.g., Emails Included, AI Tokens, EIN Setup Fee, Support Level, etc.)</CardDescription>
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => {
                                                setData('custom_fields', [
                                                    ...data.custom_fields,
                                                    {
                                                        key: `field_${Date.now()}`,
                                                        label: '',
                                                        value: '',
                                                        type: 'text',
                                                        icon: '',
                                                        description: '',
                                                    }
                                                ])
                                            }}
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Field
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {data.custom_fields.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <p>No custom fields added yet</p>
                                            <p className="text-sm mt-2">Click "Add Field" to create custom fields for this plan</p>
                                        </div>
                                    ) : (
                                        data.custom_fields.map((field, index) => (
                                            <div key={field.key} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Label>Custom Field {index + 1}</Label>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setData('custom_fields', data.custom_fields.filter((_, i) => i !== index))
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Field Label *</Label>
                                                        <Input
                                                            value={field.label}
                                                            onChange={(e) => {
                                                                const updated = [...data.custom_fields]
                                                                updated[index].label = e.target.value
                                                                setData('custom_fields', updated)
                                                            }}
                                                            placeholder="e.g., Emails Included, AI Tokens, Support Level"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Field Value *</Label>
                                                        <Input
                                                            value={field.value}
                                                            onChange={(e) => {
                                                                const updated = [...data.custom_fields]
                                                                updated[index].value = e.target.value
                                                                setData('custom_fields', updated)
                                                            }}
                                                            placeholder="e.g., 200/mo, Token Re-ups, Email support"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Field Type</Label>
                                                        <Select 
                                                            value={field.type} 
                                                            onValueChange={(value: 'text' | 'number' | 'currency' | 'boolean') => {
                                                                const updated = [...data.custom_fields]
                                                                updated[index].type = value
                                                                setData('custom_fields', updated)
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="text">Text</SelectItem>
                                                                <SelectItem value="number">Number</SelectItem>
                                                                <SelectItem value="currency">Currency</SelectItem>
                                                                <SelectItem value="boolean">Boolean</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Icon (Lucide icon name)</Label>
                                                        <Input
                                                            value={field.icon || ''}
                                                            onChange={(e) => {
                                                                const updated = [...data.custom_fields]
                                                                updated[index].icon = e.target.value
                                                                setData('custom_fields', updated)
                                                            }}
                                                            placeholder="e.g., Mail, Bot, Shield, Users"
                                                        />
                                                    </div>
                                                </div>
                                                {field.type === 'number' && (
                                                    <div className="space-y-2">
                                                        <Label>Description (e.g., Token Re-ups ($1 per 50K tokens))</Label>
                                                        <Input
                                                            value={field.description || ''}
                                                            onChange={(e) => {
                                                                const updated = [...data.custom_fields]
                                                                updated[index].description = e.target.value
                                                                setData('custom_fields', updated)
                                                            }}
                                                            placeholder="e.g., Token Re-ups ($1 per 50K tokens)"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            {/* Features Section */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Plan Features</CardTitle>
                                            <CardDescription>Add features included in this plan</CardDescription>
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Feature
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {data.features.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <p>No features added yet</p>
                                            <p className="text-sm mt-2">Click "Add Feature" to get started</p>
                                        </div>
                                    ) : (
                                        data.features.map((feature, index) => (
                                            <div key={index} className="p-4 border rounded-lg space-y-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Label>Feature {index + 1}</Label>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeFeature(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Feature Name *</Label>
                                                        <Input
                                                            value={feature.name}
                                                            onChange={(e) => updateFeature(index, 'name', e.target.value)}
                                                            placeholder="e.g., Unlimited Events"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Icon (Lucide icon name)</Label>
                                                        <Input
                                                            value={feature.icon}
                                                            onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                                                            placeholder="e.g., Calendar"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Description</Label>
                                                    <Textarea
                                                        value={feature.description}
                                                        onChange={(e) => updateFeature(index, 'description', e.target.value)}
                                                        placeholder="Feature description..."
                                                        rows={2}
                                                        className="border-input rounded-md"
                                                    />
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        checked={feature.is_unlimited}
                                                        onCheckedChange={(checked) => updateFeature(index, 'is_unlimited', checked)}
                                                    />
                                                    <Label>Unlimited Feature</Label>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Active</Label>
                                            <p className="text-sm text-muted-foreground">Plan is visible to users</p>
                                        </div>
                                        <Switch
                                            checked={data.is_active}
                                            onCheckedChange={(checked) => setData('is_active', checked)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Popular</Label>
                                            <p className="text-sm text-muted-foreground">Mark as popular plan</p>
                                        </div>
                                        <Switch
                                            checked={data.is_popular}
                                            onCheckedChange={(checked) => setData('is_popular', checked)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex gap-2">
                                <Button type="submit" className="flex-1" disabled={processing}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {processing ? 'Updating...' : 'Update Plan'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    )
}

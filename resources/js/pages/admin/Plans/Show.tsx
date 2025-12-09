"use client"

import React, { useState } from "react"
import { Head, Link, router, useForm } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/admin/ui/switch"
import { Badge } from "@/components/ui/badge"
import { 
    ArrowLeft,
    Plus,
    Trash2,
    Sparkles,
    Edit,
    CheckCircle,
    XCircle,
    Mail,
    Bot,
    Shield,
    Users,
    DollarSign,
    Package,
    Star
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import { route } from "ziggy-js"

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Plans Management', href: '/admin/plans' },
    { title: 'Plan Details', href: '#' },
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

interface ShowPlanProps {
    plan: Plan
}

export default function AdminPlansShow({ plan }: ShowPlanProps) {
    const [showAddFeature, setShowAddFeature] = useState(false)
    const { data: featureData, setData: setFeatureData, post: postFeature, processing: featureProcessing, reset: resetFeature } = useForm({
        name: '',
        description: '',
        icon: '',
        is_unlimited: false,
        sort_order: plan.features.length,
    })

    const handleAddFeature = (e: React.FormEvent) => {
        e.preventDefault()
        postFeature(route('admin.plans.features.store', plan.id), {
            onSuccess: () => {
                resetFeature()
                setShowAddFeature(false)
            }
        })
    }

    const handleDeleteFeature = (featureId: number) => {
        if (confirm('Are you sure you want to delete this feature?')) {
            router.delete(route('admin.plans.features.destroy', [plan.id, featureId]))
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Plan: ${plan.name}`} />
            
            <div className="space-y-6 p-4 sm:p-6 w-full">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="h-6 w-6" />
                            {plan.name}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            View and manage plan details and features
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('admin.plans.edit', plan.id)}>
                            <Button>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Plan
                            </Button>
                        </Link>
                        <Link href={route('admin.plans.index')}>
                            <Button variant="outline">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="w-full">
                    <div className="space-y-6 w-full">
                        <Card>
                            <CardHeader>
                                <CardTitle>Plan Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Price</Label>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">/{plan.frequency}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Status</Label>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {plan.is_active ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-gray-300 dark:border-gray-600">
                                                    <XCircle className="h-3 w-3 mr-1" />
                                                    Inactive
                                                </Badge>
                                            )}
                                            {plan.is_popular && (
                                                <Badge className="bg-amber-500 text-white dark:bg-amber-600 border-0">
                                                    <Star className="h-3 w-3 mr-1 fill-current" />
                                                    Popular
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Sort Order</Label>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{plan.sort_order}</p>
                                    </div>
                                </div>

                                {/* Description */}
                                {plan.description && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Description</Label>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{plan.description}</p>
                                    </div>
                                )}

                                {/* Custom Fields */}
                                {plan.custom_fields && plan.custom_fields.length > 0 && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 block">Plan Details</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {plan.custom_fields.map((field) => {
                                                const getIconComponent = (iconName: string | undefined) => {
                                                    if (!iconName) return Package
                                                    const iconMap: Record<string, React.ComponentType<any>> = {
                                                        Mail, Bot, Shield, Users, DollarSign, Package, Sparkles, Star
                                                    }
                                                    const lowerName = iconName.toLowerCase()
                                                    for (const [key, value] of Object.entries(iconMap)) {
                                                        if (key.toLowerCase() === lowerName) {
                                                            return value
                                                        }
                                                    }
                                                    return Package
                                                }
                                                const IconComponent = getIconComponent(field.icon)
                                                
                                                return (
                                                    <div key={field.key} className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                        <div className="h-10 w-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                                                            <IconComponent className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                                                                {field.label}
                                                            </Label>
                                                            <p className="text-base font-bold text-gray-900 dark:text-white">
                                                                {field.type === 'currency' ? `$${parseFloat(field.value).toFixed(2)}` : 
                                                                 field.type === 'number' ? parseInt(field.value).toLocaleString() : 
                                                                 field.value}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Stripe Information */}
                                {(plan.stripe_price_id || plan.stripe_product_id) && (
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <Label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 block">Stripe Integration</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {plan.stripe_price_id && (
                                                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                    <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Price ID</Label>
                                                    <p className="text-sm font-mono text-gray-900 dark:text-white break-all">{plan.stripe_price_id}</p>
                                                </div>
                                            )}
                                            {plan.stripe_product_id && (
                                                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                    <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Product ID</Label>
                                                    <p className="text-sm font-mono text-gray-900 dark:text-white break-all">{plan.stripe_product_id}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Plan Features</CardTitle>
                                        <CardDescription>Features included in this plan</CardDescription>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setShowAddFeature(!showAddFeature)}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Feature
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {showAddFeature && (
                                    <form onSubmit={handleAddFeature} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Feature Name *</Label>
                                                <Input
                                                    value={featureData.name}
                                                    onChange={(e) => setFeatureData('name', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Icon (Lucide icon name)</Label>
                                                <Input
                                                    value={featureData.icon}
                                                    onChange={(e) => setFeatureData('icon', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Textarea
                                                value={featureData.description}
                                                onChange={(e) => setFeatureData('description', e.target.value)}
                                                rows={2}
                                            />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={featureData.is_unlimited}
                                                onCheckedChange={(checked) => setFeatureData('is_unlimited', checked)}
                                            />
                                            <Label>Unlimited Feature</Label>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button type="submit" size="sm" disabled={featureProcessing}>
                                                {featureProcessing ? 'Adding...' : 'Add Feature'}
                                            </Button>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => {
                                                    setShowAddFeature(false)
                                                    resetFeature()
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </form>
                                )}

                                {plan.features.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>No features added yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {plan.features.map((feature) => {
                                            const getIconComponent = (iconName: string | null | undefined) => {
                                                if (!iconName) return Package
                                                const iconMap: Record<string, React.ComponentType<any>> = {
                                                    Mail, Bot, Shield, Users, DollarSign, Package, Sparkles, Star, CheckCircle
                                                }
                                                const lowerName = iconName.toLowerCase()
                                                for (const [key, value] of Object.entries(iconMap)) {
                                                    if (key.toLowerCase() === lowerName) {
                                                        return value
                                                    }
                                                }
                                                return Package
                                            }
                                            const IconComponent = getIconComponent(feature.icon)
                                            
                                            return (
                                                <div key={feature.id} className="flex items-start justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                    <div className="flex items-start gap-3 flex-1">
                                                        <div className="h-10 w-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                                                            <IconComponent className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="font-semibold text-gray-900 dark:text-white">{feature.name}</p>
                                                                {feature.is_unlimited && (
                                                                    <Badge className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary border-0 text-xs">
                                                                        Unlimited
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {feature.description && (
                                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{feature.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        onClick={() => handleDeleteFeature(feature.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}




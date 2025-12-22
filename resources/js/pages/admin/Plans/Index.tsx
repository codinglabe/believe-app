"use client"

import React, { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { 
    Plus, 
    Edit, 
    Trash2, 
    Eye,
    Sparkles,
    CheckCircle,
    XCircle,
    DollarSign,
    Star,
    Package,
    Users
} from "lucide-react"
import { motion } from "framer-motion"
import type { BreadcrumbItem } from "@/types"
import { route } from "ziggy-js"

interface PlanFeature {
    id: number
    name: string
    description: string | null
    icon: string | null
    is_unlimited: boolean
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
    price: number
    frequency: string
    is_active: boolean
    is_popular: boolean
    description: string | null
    custom_fields: CustomField[]
    features: PlanFeature[]
}

interface PlansIndexProps {
    plans: Plan[]
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Plans Management', href: '/admin/plans' },
]

export default function AdminPlansIndex({ plans }: PlansIndexProps) {
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [planToDelete, setPlanToDelete] = useState<Plan | null>(null)

    const handleDelete = (plan: Plan) => {
        setPlanToDelete(plan)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = () => {
        if (!planToDelete) return

        setDeletingId(planToDelete.id)
        router.delete(route('admin.plans.destroy', planToDelete.id), {
            onFinish: () => {
                setDeletingId(null)
                setDeleteDialogOpen(false)
                setPlanToDelete(null)
            },
        })
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Plans" />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Plans Management</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Manage subscription plans and features. Total: {plans.length} plans
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('admin.plans.subscribers')}>
                            <Button variant="outline">
                                <Users className="h-4 w-4 mr-2" />
                                View Subscribers
                            </Button>
                        </Link>
                        <Link href={route('admin.plans.create')}>
                            <Button className="bg-primary hover:bg-primary/90">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Plan
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Plans Grid */}
                {plans.length === 0 ? (
                    <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Sparkles className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                            </div>
                            <div>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">No plans created yet</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Get started by creating your first subscription plan
                                </p>
                            </div>
                            <Link href={route('admin.plans.create')}>
                                <Button className="mt-4">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Plan
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map((plan, index) => (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                                <Card className={`group h-full flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200 dark:border-gray-800 overflow-hidden ${
                                    plan.is_popular
                                        ? 'border-2 border-primary/40'
                                        : ''
                                }`}>
                                    {/* Premium Header for Popular Plans */}
                                    {plan.is_popular && (
                                        <div className="relative h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                                        </div>
                                    )}
                                    
                                    {/* Status Indicator Bar */}
                                    {!plan.is_popular && (
                                        <div className={`h-1 ${
                                            plan.is_active 
                                                ? 'bg-emerald-500' 
                                                : 'bg-gray-400'
                                        }`} />
                                    )}
                                    
                                    <CardHeader className={`pb-5 ${plan.is_popular ? 'pt-6' : 'pt-5'}`}>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className={`h-12 w-12 rounded-xl ${
                                                        plan.is_popular 
                                                            ? 'bg-gradient-to-br from-primary to-primary/80 shadow-lg' 
                                                            : plan.is_active
                                                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                                            : 'bg-gray-100 dark:bg-gray-800'
                                                    } flex items-center justify-center shrink-0`}>
                                                        <DollarSign className={`h-6 w-6 ${
                                                            plan.is_popular 
                                                                ? 'text-white' 
                                                                : plan.is_active
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : 'text-gray-500 dark:text-gray-400'
                                                        }`} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                                            {plan.name}
                                                        </CardTitle>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {plan.is_active ? (
                                                                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-medium px-2 py-0.5">
                                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                                    Active
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 border-gray-300 dark:border-gray-600">
                                                                    <XCircle className="h-3 w-3 mr-1" />
                                                                    Inactive
                                                                </Badge>
                                                            )}
                                                            {plan.is_popular && (
                                                                <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0 shadow-md text-xs font-semibold px-2.5 py-0.5">
                                                                    <Star className="h-3 w-3 mr-1 fill-current" />
                                                                    Most Popular
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Price Display */}
                                                <div className="mt-4">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-4xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">/{plan.frequency}</span>
                                                    </div>
                                                    {plan.description && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{plan.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    
                                    <CardContent className="px-6 pb-6 space-y-3 flex-1 flex flex-col">
                                        {/* Custom Fields - Compact Design */}
                                        {plan.custom_fields && plan.custom_fields.length > 0 && (
                                            <div className="space-y-2.5 flex-1">
                                                {plan.custom_fields.slice(0, 3).map((field) => (
                                                    <div key={field.key} className="flex items-center justify-between py-2 px-3 rounded-md bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                            {field.label}
                                                        </span>
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                            {field.type === 'currency' ? `$${parseFloat(field.value).toFixed(2)}` : 
                                                             field.type === 'number' ? parseInt(field.value).toLocaleString() : 
                                                             field.value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Features Summary */}
                                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Features</span>
                                                </div>
                                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs px-2.5 py-1">
                                                    {plan.features.length}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
                                            <Link href={route('admin.plans.show', plan.id)}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Link href={route('admin.plans.edit', plan.id)}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={() => handleDelete(plan)}
                                                disabled={deletingId === plan.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Plan</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete <strong>{planToDelete?.name}</strong>? 
                                This action cannot be undone and will remove all associated features.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setDeleteDialogOpen(false)
                                    setPlanToDelete(null)
                                }}
                                disabled={deletingId !== null}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteConfirm}
                                disabled={deletingId !== null}
                            >
                                {deletingId !== null ? 'Deleting...' : 'Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    )
}



























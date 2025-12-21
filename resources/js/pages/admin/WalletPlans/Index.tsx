"use client"

import React, { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    Wallet,
    CheckCircle,
    XCircle,
    DollarSign,
} from "lucide-react"
import { motion } from "framer-motion"
import type { BreadcrumbItem } from "@/types"
import { route } from "ziggy-js"

interface WalletPlan {
    id: number
    name: string
    price: number
    frequency: string
    is_active: boolean
    description: string | null
    trial_days: number
    sort_order: number
}

interface WalletPlansIndexProps {
    plans: WalletPlan[]
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Wallet Plans Management', href: '/admin/wallet-plans' },
]

export default function AdminWalletPlansIndex({ plans }: WalletPlansIndexProps) {
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [planToDelete, setPlanToDelete] = useState<WalletPlan | null>(null)

    const handleDelete = (plan: WalletPlan) => {
        setPlanToDelete(plan)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = () => {
        if (!planToDelete) return

        setDeletingId(planToDelete.id)
        router.delete(route('admin.wallet-plans.destroy', planToDelete.id), {
            onFinish: () => {
                setDeletingId(null)
                setDeleteDialogOpen(false)
                setPlanToDelete(null)
            },
        })
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Wallet Plans Management" />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Wallet Plans Management</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Manage wallet subscription plans for users. Total: {plans.length} plans
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('admin.wallet-plans.create')}>
                            <Button className="bg-primary hover:bg-primary/90">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Wallet Plan
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Plans Grid */}
                {plans.length === 0 ? (
                    <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Wallet className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                            </div>
                            <div>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">No wallet plans created yet</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Get started by creating your first wallet subscription plan
                                </p>
                            </div>
                            <Link href={route('admin.wallet-plans.create')}>
                                <Button className="mt-4">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Wallet Plan
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
                                <Card className={`group h-full flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200 dark:border-gray-800 overflow-hidden`}>
                                    {/* Status Indicator Bar */}
                                    <div className={`h-1 ${
                                        plan.is_active 
                                            ? 'bg-emerald-500' 
                                            : 'bg-gray-400'
                                    }`} />
                                    
                                    <CardHeader className="pb-5 pt-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className={`h-12 w-12 rounded-xl ${
                                                        plan.is_active
                                                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                                            : 'bg-gray-100 dark:bg-gray-800'
                                                    } flex items-center justify-center shrink-0`}>
                                                        <Wallet className={`h-6 w-6 ${
                                                            plan.is_active
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
                                                            {plan.trial_days > 0 && (
                                                                <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-medium px-2 py-0.5">
                                                                    {plan.trial_days} Day Trial
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
                                        {/* Trial Days Info */}
                                        {plan.trial_days > 0 && (
                                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Wallet className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Free Trial</span>
                                                    </div>
                                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-xs px-2.5 py-1">
                                                        {plan.trial_days} Days
                                                    </Badge>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
                                            <Link href={route('admin.wallet-plans.edit', plan.id)}>
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
                            <DialogTitle>Delete Wallet Plan</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete <strong>{planToDelete?.name}</strong>? 
                                This action cannot be undone.
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


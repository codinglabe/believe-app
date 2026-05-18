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
    Mail,
    CheckCircle,
    XCircle,
    DollarSign,
} from "lucide-react"
import { motion } from "framer-motion"
import type { BreadcrumbItem } from "@/types"

interface EmailPackage {
    id: number
    name: string
    description: string | null
    emails_count: number
    price: number
    is_active: boolean
    sort_order: number
}

interface EmailPackagesIndexProps {
    packages: EmailPackage[]
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Email Packages', href: '/admin/email-packages' },
]

export default function AdminEmailPackagesIndex({ packages }: EmailPackagesIndexProps) {
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [packageToDelete, setPackageToDelete] = useState<EmailPackage | null>(null)

    const handleDelete = (pkg: EmailPackage) => {
        setPackageToDelete(pkg)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = () => {
        if (!packageToDelete) return

        setDeletingId(packageToDelete.id)
        router.delete(`/admin/email-packages/${packageToDelete.id}`, {
            onFinish: () => {
                setDeletingId(null)
                setDeleteDialogOpen(false)
                setPackageToDelete(null)
            },
        })
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Email Packages Management" />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Packages Management</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Manage email packages for purchase. Total: {packages.length} packages
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/admin/email-packages/create">
                            <Button className="bg-primary hover:bg-primary/90">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Package
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Packages Grid */}
                {packages.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Mail className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                            </div>
                            <div>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">No email packages created yet</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Get started by creating your first email package
                                </p>
                            </div>
                            <Link href="/admin/email-packages/create">
                                <Button className="mt-4">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Package
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {packages.map((pkg, index) => (
                            <motion.div
                                key={pkg.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                                <Card className={`group h-full flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200 dark:border-gray-800 overflow-hidden`}>
                                    {/* Status Indicator Bar */}
                                    <div className={`h-1 ${
                                        pkg.is_active 
                                            ? 'bg-emerald-500' 
                                            : 'bg-gray-400'
                                    }`} />
                                    
                                    <CardHeader className="pb-5 pt-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className={`h-12 w-12 rounded-xl ${
                                                        pkg.is_active
                                                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                                            : 'bg-gray-100 dark:bg-gray-800'
                                                    } flex items-center justify-center shrink-0`}>
                                                        <Mail className={`h-6 w-6 ${
                                                            pkg.is_active
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : 'text-gray-500 dark:text-gray-400'
                                                        }`} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                                            {pkg.name}
                                                        </CardTitle>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {pkg.is_active ? (
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
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Package Details */}
                                                <div className="mt-4 space-y-3">
                                                    <div className="flex items-center justify-between py-2 px-3 rounded-md bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                            Emails
                                                        </span>
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                            {pkg.emails_count.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-2 px-3 rounded-md bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                            Price
                                                        </span>
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                            ${Number(pkg.price).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    {pkg.description && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{pkg.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    
                                    <CardContent className="px-6 pb-6 space-y-3 flex-1 flex flex-col">
                                        {/* Action Buttons */}
                                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
                                            <Link href={`/admin/email-packages/${pkg.id}/edit`}>
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
                                                onClick={() => handleDelete(pkg)}
                                                disabled={deletingId === pkg.id}
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
                            <DialogTitle>Delete Email Package</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete <strong>{packageToDelete?.name}</strong>? 
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setDeleteDialogOpen(false)
                                    setPackageToDelete(null)
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


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
    Image,
    Type,
    ExternalLink,
    CheckCircle,
    XCircle,
} from "lucide-react"
import { motion } from "framer-motion"
import type { BreadcrumbItem } from "@/types"

interface PromotionalBanner {
    id: number
    title: string | null
    type: 'image' | 'text'
    image_url: string | null
    text_content: string | null
    external_link: string | null
    is_active: boolean
    display_order: number
    starts_at: string | null
    ends_at: string | null
    background_color: string | null
    text_color: string | null
    description: string | null
    created_at: string
    updated_at: string
}

interface PromotionalBannersIndexProps {
    banners: PromotionalBanner[]
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Promotional Banners', href: '/admin/promotional-banners' },
]

export default function AdminPromotionalBannersIndex({ banners }: PromotionalBannersIndexProps) {
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [bannerToDelete, setBannerToDelete] = useState<PromotionalBanner | null>(null)

    const handleDelete = (banner: PromotionalBanner) => {
        setBannerToDelete(banner)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = () => {
        if (!bannerToDelete) return

        setDeletingId(bannerToDelete.id)
        router.delete(`/admin/promotional-banners/${bannerToDelete.id}`, {
            onFinish: () => {
                setDeletingId(null)
                setDeleteDialogOpen(false)
                setBannerToDelete(null)
            },
        })
    }

    const isCurrentlyActive = (banner: PromotionalBanner) => {
        if (!banner.is_active) return false
        const now = new Date()
        if (banner.starts_at && new Date(banner.starts_at) > now) return false
        if (banner.ends_at && new Date(banner.ends_at) < now) return false
        return true
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Promotional Banners Management" />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Promotional Banners Management</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Manage promotional banners displayed on the dashboard. Total: {banners.length} banners
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/admin/promotional-banners/create">
                            <Button className="bg-primary hover:bg-primary/90">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Banner
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Banners Grid */}
                {banners.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Image className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No banners yet</h3>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    Create your first promotional banner to get started
                                </p>
                            </div>
                            <Link href="/admin/promotional-banners/create">
                                <Button className="bg-primary hover:bg-primary/90">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Banner
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {banners.map((banner, index) => (
                            <motion.div
                                key={banner.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {banner.type === 'image' ? (
                                                        <Image className="h-4 w-4 text-blue-500" />
                                                    ) : (
                                                        <Type className="h-4 w-4 text-purple-500" />
                                                    )}
                                                    <CardTitle className="text-lg">
                                                        {banner.title || `Banner #${banner.id}`}
                                                    </CardTitle>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <Badge variant={banner.type === 'image' ? 'default' : 'secondary'}>
                                                        {banner.type}
                                                    </Badge>
                                                    {isCurrentlyActive(banner) ? (
                                                        <Badge className="bg-green-500 hover:bg-green-600">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="border-gray-300">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Preview */}
                                        <div 
                                            className={`rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 h-28 sm:h-32 md:h-36 overflow-hidden ${
                                                banner.type === 'image' && banner.image_url ? '' : 'p-4'
                                            }`}
                                            style={
                                                banner.type === 'image' && banner.image_url
                                                    ? undefined
                                                    : {
                                                        backgroundColor: banner.background_color || '#f3f4f6',
                                                        color: banner.text_color || '#1f2937',
                                                    }
                                            }
                                        >
                                            {banner.type === 'image' && banner.image_url ? (
                                                <img 
                                                    src={banner.image_url} 
                                                    alt={banner.title || 'Banner'} 
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-full flex items-center justify-center">
                                                    <p className="text-sm text-center">
                                                        {banner.text_content || 'No content'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="space-y-2 text-sm">
                                            {banner.external_link && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <ExternalLink className="h-4 w-4" />
                                                    <a 
                                                        href={banner.external_link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="truncate hover:text-primary"
                                                    >
                                                        {banner.external_link}
                                                    </a>
                                                </div>
                                            )}
                                            <div className="text-muted-foreground">
                                                Order: {banner.display_order}
                                            </div>
                                            {banner.starts_at && (
                                                <div className="text-muted-foreground">
                                                    Starts: {new Date(banner.starts_at).toLocaleDateString()}
                                                </div>
                                            )}
                                            {banner.ends_at && (
                                                <div className="text-muted-foreground">
                                                    Ends: {new Date(banner.ends_at).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-2 border-t">
                                            <Link 
                                                href={`/admin/promotional-banners/${banner.id}/edit`}
                                                className="flex-1"
                                            >
                                                <Button variant="outline" className="w-full">
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="destructive"
                                                onClick={() => handleDelete(banner)}
                                                disabled={deletingId === banner.id}
                                                className="flex-1"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Promotional Banner</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{bannerToDelete?.title || `Banner #${bannerToDelete?.id}`}"? 
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
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
        </AppLayout>
    )
}


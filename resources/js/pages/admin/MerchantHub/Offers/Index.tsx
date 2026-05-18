"use client"

import React, { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    Search,
    Edit,
    Trash2,
    Gift,
    Filter,
    Store,
    Tag,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
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

interface MerchantHubOffer {
    id: number
    title: string
    short_description: string | null
    image_url: string | null
    points_required: number
    cash_required: number | null
    currency: string
    status: 'draft' | 'active' | 'paused' | 'expired'
    merchant: MerchantHubMerchant
    category: MerchantHubCategory
    created_at: string
    updated_at: string
}

interface OffersIndexProps {
    offers: {
        data: MerchantHubOffer[]
        current_page: number
        last_page: number
        per_page: number
        total: number
        links: Array<{
            url: string | null
            label: string
            active: boolean
        }>
    }
    categories: MerchantHubCategory[]
    merchants: MerchantHubMerchant[]
    filters: {
        search: string
        status: string
        category_id: string
        merchant_id: string
    }
}

const breadcrumbs: BreadcrumbItem[] = [
    // { title: 'Dashboard', href: '/dashboard' },
    { title: 'Merchant Hub', href: '/admin/merchant-hub' },
    { title: 'Offers', href: '/admin/merchant-hub/offers' },
]

export default function AdminOffersIndex({ offers, categories, merchants, filters: initialFilters }: OffersIndexProps) {
    const [search, setSearch] = useState(initialFilters.search || '')
    const [selectedStatus, setSelectedStatus] = useState(initialFilters.status || '')
    const [selectedCategory, setSelectedCategory] = useState(initialFilters.category_id || '')
    const [selectedMerchant, setSelectedMerchant] = useState(initialFilters.merchant_id || '')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [offerToDelete, setOfferToDelete] = useState<MerchantHubOffer | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleSearch = (value: string) => {
        setSearch(value)
        router.get('/admin/merchant-hub/offers', {
            search: value || '',
            status: selectedStatus || '',
            category_id: selectedCategory || '',
            merchant_id: selectedMerchant || '',
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handleStatusChange = (value: string) => {
        setSelectedStatus(value === 'all' ? '' : value)
        router.get('/admin/merchant-hub/offers', {
            search: search || '',
            status: value === 'all' ? '' : value,
            category_id: selectedCategory || '',
            merchant_id: selectedMerchant || '',
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handleCategoryChange = (value: string) => {
        setSelectedCategory(value === 'all' ? '' : value)
        router.get('/admin/merchant-hub/offers', {
            search: search || '',
            status: selectedStatus || '',
            category_id: value === 'all' ? '' : value,
            merchant_id: selectedMerchant || '',
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handleMerchantChange = (value: string) => {
        setSelectedMerchant(value === 'all' ? '' : value)
        router.get('/admin/merchant-hub/offers', {
            search: search || '',
            status: selectedStatus || '',
            category_id: selectedCategory || '',
            merchant_id: value === 'all' ? '' : value,
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handleDeleteClick = (offer: MerchantHubOffer) => {
        setOfferToDelete(offer)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = () => {
        if (!offerToDelete) return

        setIsDeleting(true)
        router.delete(`/admin/merchant-hub/offers/${offerToDelete.id}`, {
            onFinish: () => {
                setIsDeleting(false)
                setDeleteDialogOpen(false)
                setOfferToDelete(null)
            },
        })
    }

    const getStatusConfig = (status: string) => {
        const configs = {
            active: {
                label: 'Active',
                variant: 'default' as const,
                bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
                color: 'text-emerald-800 dark:text-emerald-200',
                borderColor: 'border-emerald-200 dark:border-emerald-800',
            },
            draft: {
                label: 'Draft',
                variant: 'secondary' as const,
                bgColor: 'bg-gray-100 dark:bg-gray-800',
                color: 'text-gray-800 dark:text-gray-200',
                borderColor: 'border-gray-200 dark:border-gray-700',
            },
            paused: {
                label: 'Paused',
                variant: 'secondary' as const,
                bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
                color: 'text-yellow-800 dark:text-yellow-200',
                borderColor: 'border-yellow-200 dark:border-yellow-800',
            },
            expired: {
                label: 'Expired',
                variant: 'destructive' as const,
                bgColor: 'bg-red-100 dark:bg-red-900/20',
                color: 'text-red-800 dark:text-red-200',
                borderColor: 'border-red-200 dark:border-red-800',
            },
        }
        return configs[status as keyof typeof configs] || configs.draft
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Offers Management - Admin" />

            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Offers Management</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Manage offers for the Merchant Hub. Total: {offers.total} offers
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                            <Gift className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Total: <span className="font-semibold text-gray-900 dark:text-white">{offers.total}</span>
                            </span>
                        </div>
                        <Link href="/admin/merchant-hub/offers/create">
                            <Button className="bg-primary hover:bg-primary/90">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Offer
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <Card className="border-gray-200 dark:border-gray-800">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="sm:col-span-2 lg:col-span-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search offers..."
                                        value={search}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="pl-10 bg-white dark:bg-gray-800"
                                    />
                                </div>
                            </div>
                            <div>
                                <Select value={selectedStatus || 'all'} onValueChange={handleStatusChange}>
                                    <SelectTrigger className="w-full">
                                        <Filter className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                                        <SelectValue placeholder="Filter by Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="paused">Paused</SelectItem>
                                        <SelectItem value="expired">Expired</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Select value={selectedCategory || 'all'} onValueChange={handleCategoryChange}>
                                    <SelectTrigger className="w-full">
                                        <Tag className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                                        <SelectValue placeholder="Filter by Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id.toString()}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Select value={selectedMerchant || 'all'} onValueChange={handleMerchantChange}>
                                    <SelectTrigger className="w-full">
                                        <Store className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                                        <SelectValue placeholder="Filter by Merchant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Merchants</SelectItem>
                                        {merchants.map((merchant) => (
                                            <SelectItem key={merchant.id} value={merchant.id.toString()}>
                                                {merchant.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Offers Grid */}
                {offers.data.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {offers.data.map((offer, index) => {
                                const statusConfig = getStatusConfig(offer.status)
                                const imageUrl = offer.image_url
                                    ? (offer.image_url.startsWith('http')
                                        ? offer.image_url
                                        : `/storage/${offer.image_url}`)
                                    : null

                                return (
                                    <motion.div
                                        key={offer.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                    >
                                        <Card className="group h-full flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200 dark:border-gray-800 overflow-hidden">
                                            {/* Status Indicator Bar */}
                                            <div className={`h-1 ${statusConfig.bgColor} ${statusConfig.borderColor} border-b`} />

                                            {/* Image */}
                                            {imageUrl ? (
                                                <div className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                    <img
                                                        src={imageUrl}
                                                        alt={offer.title}
                                                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-48 w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                    <Gift className="h-16 w-16 text-gray-400 dark:text-gray-600" />
                                                </div>
                                            )}

                                            <CardHeader className="pb-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <CardTitle className="text-lg font-semibold truncate text-gray-900 dark:text-white mb-2">
                                                            {offer.title}
                                                        </CardTitle>
                                                        {offer.short_description && (
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                                                {offer.short_description}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge
                                                                variant={statusConfig.variant}
                                                                className="text-xs font-medium px-2.5 py-0.5"
                                                            >
                                                                {statusConfig.label}
                                                            </Badge>
                                                            <Badge variant="outline" className="text-xs">
                                                                {offer.category.name}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="space-y-4 flex-1 flex flex-col">
                                                {/* Merchant */}
                                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                    <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                        <Store className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Merchant</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 truncate">
                                                            {offer.merchant.name}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Points & Cash */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Points</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                                                            {offer.points_required.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    {offer.cash_required ? (
                                                        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cash</p>
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                                                                {offer.currency} {typeof offer.cash_required === 'number' ? offer.cash_required.toFixed(2) : parseFloat(offer.cash_required).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cash</p>
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                                                                Free
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
                                                    <Link href={`/admin/merchant-hub/offers/${offer.id}/edit`}>
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
                                                        onClick={() => handleDeleteClick(offer)}
                                                        disabled={isDeleting}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )
                            })}
                        </div>

                        {/* Pagination */}
                        {offers.last_page > 1 && (
                            <Card className="border-gray-200 dark:border-gray-800">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Showing {offers.data.length} of {offers.total} offers
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {offers.links.map((link, index) => (
                                                <Button
                                                    key={index}
                                                    variant={link.active ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => {
                                                        if (link.url) {
                                                            const url = new URL(link.url)
                                                            const params = Object.fromEntries(url.searchParams)
                                                            router.get('/admin/merchant-hub/offers', params, {
                                                                preserveState: true,
                                                                replace: true
                                                            })
                                                        }
                                                    }}
                                                    disabled={!link.url || link.active}
                                                    className={link.active ? "bg-primary hover:bg-primary/90" : ""}
                                                >
                                                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                ) : (
                    <div className="p-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Gift className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                            </div>
                            <div>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">No offers found</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Adjust your filters or create a new offer.
                                </p>
                            </div>
                            <Link href="/admin/merchant-hub/offers/create">
                                <Button className="mt-4">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Offer
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Offer</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete <strong>{offerToDelete?.title}</strong>?
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setDeleteDialogOpen(false)
                                    setOfferToDelete(null)
                                }}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    )
}


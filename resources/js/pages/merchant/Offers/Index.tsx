"use client"

import React, { useState, useEffect } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from "@/components/merchant-ui"
import { MerchantButton } from "@/components/merchant-ui"
import { MerchantBadge } from "@/components/merchant-ui"
import { MerchantInput } from "@/components/merchant-ui"
import { MerchantLabel } from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    Eye,
    Filter,
    Gift,
} from "lucide-react"
import { motion } from "framer-motion"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface MerchantHubCategory {
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
    filters: {
        search: string
        status: string
    }
}

export default function MerchantOffersIndex({ offers, filters: initialFilters }: OffersIndexProps) {
    const { props } = usePage<{ success?: string; error?: string }>()
    const [search, setSearch] = useState(initialFilters.search || '')
    const [selectedStatus, setSelectedStatus] = useState(initialFilters.status || 'all')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [offerToDelete, setOfferToDelete] = useState<MerchantHubOffer | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Show flash messages
    useEffect(() => {
        if (props.success) {
            showSuccessToast(props.success)
        }
        if (props.error) {
            showErrorToast(props.error)
        }
    }, [props.success, props.error])

    const handleSearch = (value: string) => {
        setSearch(value)
        router.get('/offers', {
            search: value || '',
            status: selectedStatus === 'all' ? '' : selectedStatus,
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handleStatusFilter = (value: string) => {
        setSelectedStatus(value)
        router.get('/offers', {
            search: search || '',
            status: value === 'all' ? '' : value,
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
        router.delete(`/offers/${offerToDelete.id}`, {
            onFinish: () => {
                setIsDeleting(false)
                setDeleteDialogOpen(false)
                setOfferToDelete(null)
            },
        })
    }

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            active: { label: 'Active', className: 'bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] shadow-none' },
            draft: { label: 'Draft', className: 'bg-gray-500 shadow-none' },
            paused: { label: 'Paused', className: 'bg-yellow-500 shadow-none' },
            expired: { label: 'Expired', className: 'bg-red-500 shadow-none' },
        }
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
        return (
            <MerchantBadge className={config.className}>
                {config.label}
            </MerchantBadge>
        )
    }

    return (
        <>
            <Head title="My Offers - Merchant Dashboard" />
            <MerchantDashboardLayout>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6 relative z-10"
                >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">My Offers</h1>
                            <p className="text-gray-400">Manage your merchant hub offers</p>
                        </div>
                        <Link href="/offers/create">
                            <MerchantButton className="bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461]">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Offer
                            </MerchantButton>
                        </Link>
                    </div>

                    {/* Filters */}
                    <MerchantCard className="shadow-2xl">
                        <MerchantCardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Search */}
                                <div className="flex flex-col gap-2">
                                    <MerchantLabel>Search</MerchantLabel>
                                    <MerchantInput
                                        type="text"
                                        placeholder="Search offers..."
                                        value={search}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="pl-10 mt-1"
                                    />
                                </div>


                                {/* Status Filter */}
                                <div className="flex flex-col gap-2">
                                    <MerchantLabel>Status</MerchantLabel>
                                    <Select value={selectedStatus || 'all'} onValueChange={handleStatusFilter}>
                                        <SelectTrigger className="mt-1 bg-gray-900/50 border-[#FF1493]/40 text-white">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="paused">Paused</SelectItem>
                                            <SelectItem value="expired">Expired</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </MerchantCardContent>
                    </MerchantCard>

                    {/* Offers Grid */}
                    {offers.data.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {offers.data.map((offer, index) => (
                                <motion.div
                                    key={offer.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className="flex flex-col h-full"
                                >
                                    {/* Top: Image (outside card) */}
                                    <div className="relative w-full aspect-square sm:aspect-[4/3] bg-gray-800 overflow-hidden rounded-t-lg">
                                        {offer.image_url ? (
                                            <img
                                                src={offer.image_url}
                                                alt={offer.title}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/placeholder.jpg'
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                                <Gift className="w-8 h-8 text-gray-600" />
                                            </div>
                                        )}
                                        <div className="absolute top-1 right-1">
                                            {getStatusBadge(offer.status)}
                                        </div>
                                    </div>
                                    {/* Bottom: Card with info only - no extra card padding so content sits flush */}
                                    <MerchantCard className="rounded-t-none rounded-b-lg flex-1 shadow-lg transition-all duration-300 hover:shadow-[#FF1493]/20 !p-0 !gap-0">
                                        <MerchantCardContent className="pt-3 pb-3 px-3">
                                            <h3 className="font-semibold text-sm text-white mb-1 line-clamp-2">
                                                {offer.title}
                                            </h3>
                                            {offer.short_description && (
                                                <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                                                    {offer.short_description}
                                                </p>
                                            )}
                                            {offer.category && (
                                                <MerchantBadge className="w-fit text-xs mb-2 shadow-none bg-slate-600/80 text-slate-200 border border-slate-500/50">
                                                    {offer.category.name}
                                                </MerchantBadge>
                                            )}
                                            <p className="text-xs text-gray-300 mb-2">
                                                <span className="font-semibold text-[#FF1493]">{offer.points_required.toLocaleString()}</span> pts
                                                {offer.cash_required && (
                                                    <span> + ${typeof offer.cash_required === 'number' ? offer.cash_required.toFixed(2) : parseFloat(offer.cash_required).toFixed(2)}</span>
                                                )}
                                            </p>
                                            <div className="flex gap-1.5">
                                                <Link href={`/offers/${offer.id}`} className="flex-1 min-w-0">
                                                    <MerchantButton variant="outline" size="sm" className="w-full text-xs h-8 px-2">
                                                        <Eye className="w-3.5 h-3.5 mr-1" />
                                                        View
                                                    </MerchantButton>
                                                </Link>
                                                <Link href={`/offers/${offer.id}/edit`} className="flex-1 min-w-0">
                                                    <MerchantButton variant="outline" size="sm" className="w-full text-xs h-8 px-2">
                                                        <Edit className="w-3.5 h-3.5 mr-1" />
                                                        Edit
                                                    </MerchantButton>
                                                </Link>
                                                <MerchantButton
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-400 hover:text-red-300 hover:border-red-400 text-xs h-8 px-2 shrink-0"
                                                    onClick={() => handleDeleteClick(offer)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </MerchantButton>
                                            </div>
                                        </MerchantCardContent>
                                    </MerchantCard>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <MerchantCard className="shadow-2xl">
                            <MerchantCardContent className="p-12 text-center">
                                <Gift className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">
                                    {search || (selectedStatus && selectedStatus !== 'all') ? 'No offers found' : 'No offers yet'}
                                </h3>
                                <p className="text-gray-400 mb-6">
                                    {search || (selectedStatus && selectedStatus !== 'all')
                                        ? 'Try adjusting your search or filters.'
                                        : 'Get started by creating your first offer.'}
                                </p>
                                {!search && (!selectedStatus || selectedStatus === 'all') && (
                                    <Link href="/offers/create">
                                        <MerchantButton className="bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461]">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Your First Offer
                                        </MerchantButton>
                                    </Link>
                                )}
                            </MerchantCardContent>
                        </MerchantCard>
                    )}

                    {/* Pagination */}
                    {offers.last_page > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-400">
                                Showing {((offers.current_page - 1) * offers.per_page) + 1} to {Math.min(offers.current_page * offers.per_page, offers.total)} of {offers.total} offers
                            </p>
                            <div className="flex gap-2">
                                {offers.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || '#'}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            link.active
                                                ? 'bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] text-white'
                                                : link.url
                                                ? 'bg-gray-900/50 border border-[#FF1493]/40 text-white hover:bg-gray-800'
                                                : 'bg-gray-900/30 border border-gray-700 text-gray-500 cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogContent className="bg-gray-900 border-[#FF1493]/40 text-white">
                            <DialogHeader>
                                <DialogTitle>Delete Offer</DialogTitle>
                                <DialogDescription className="text-gray-400">
                                    Are you sure you want to delete "{offerToDelete?.title}"? This action cannot be undone.
                                    {offerToDelete && (
                                        <span className="block mt-2 text-red-400">
                                            This offer cannot be deleted if it has existing redemptions.
                                        </span>
                                    )}
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <MerchantButton
                                    variant="outline"
                                    onClick={() => {
                                        setDeleteDialogOpen(false)
                                        setOfferToDelete(null)
                                    }}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </MerchantButton>
                                <MerchantButton
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={handleDeleteConfirm}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </MerchantButton>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </motion.div>
            </MerchantDashboardLayout>
        </>
    )
}

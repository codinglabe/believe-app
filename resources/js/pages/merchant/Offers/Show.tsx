"use client"

import React from "react"
import { Head, Link } from "@inertiajs/react"
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from "@/components/merchant-ui"
import { MerchantButton } from "@/components/merchant-ui"
import { MerchantBadge } from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import { ArrowLeft, Edit, Eye, Gift, Calendar, Coins, DollarSign, Package, Tag } from "lucide-react"
import { motion } from "framer-motion"
import { format } from "date-fns"

interface MerchantHubCategory {
    id: number
    name: string
    slug: string
}

interface MerchantHubOffer {
    id: number
    slug?: string
    title: string
    short_description: string | null
    description: string
    image_url: string | null
    points_required: number
    cash_required: number | null
    currency: string
    inventory_qty: number | null
    starts_at: string | null
    ends_at: string | null
    status: 'draft' | 'active' | 'paused' | 'expired'
    category: MerchantHubCategory
    created_at: string
    updated_at: string
}

interface OfferShowProps {
    offer: MerchantHubOffer
}

export default function MerchantOffersShow({ offer }: OfferShowProps) {
    const getStatusBadge = (status: string) => {
        const statusConfig = {
            active: { label: 'Active', className: 'bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] shadow-lg shadow-[#FF1493]/50' },
            draft: { label: 'Draft', className: 'bg-gray-500' },
            paused: { label: 'Paused', className: 'bg-yellow-500' },
            expired: { label: 'Expired', className: 'bg-red-500' },
        }
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
        return (
            <MerchantBadge className={config.className}>
                {config.label}
            </MerchantBadge>
        )
    }

    const imageUrl = offer.image_url
        ? (offer.image_url.startsWith('http')
            ? offer.image_url
            : offer.image_url.startsWith('/storage')
            ? offer.image_url
            : `/storage/${offer.image_url}`)
        : null

    return (
        <>
            <Head title={`${offer.title} - Merchant Dashboard`} />
            <MerchantDashboardLayout>
                <div className="w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <Link href="/offers">
                                        <MerchantButton type="button" variant="outline" size="sm">
                                            <ArrowLeft className="h-4 w-4 mr-2" />
                                            Back
                                        </MerchantButton>
                                    </Link>
                                    {getStatusBadge(offer.status)}
                                </div>
                                <h1 className="text-3xl font-bold text-white mb-2">{offer.title}</h1>
                                {offer.short_description && (
                                    <p className="text-gray-400">{offer.short_description}</p>
                                )}
                            </div>
                            <Link href={`/offers/${offer.id}/edit`}>
                                <MerchantButton className="bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461]">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Offer
                                </MerchantButton>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Image */}
                                {imageUrl && (
                                    <MerchantCard className="shadow-2xl overflow-hidden">
                                        <div className="relative h-96 w-full bg-gray-800">
                                            <img
                                                src={imageUrl}
                                                alt={offer.title}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/placeholder.jpg'
                                                }}
                                            />
                                        </div>
                                    </MerchantCard>
                                )}

                                {/* Description */}
                                <MerchantCard className="shadow-2xl">
                                    <MerchantCardHeader>
                                        <MerchantCardTitle className="text-white">Description</MerchantCardTitle>
                                    </MerchantCardHeader>
                                    <MerchantCardContent>
                                        <p className="text-gray-300 whitespace-pre-wrap">{offer.description}</p>
                                    </MerchantCardContent>
                                </MerchantCard>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Offer Details */}
                                <MerchantCard className="shadow-2xl">
                                    <MerchantCardHeader>
                                        <MerchantCardTitle className="text-white">Offer Details</MerchantCardTitle>
                                    </MerchantCardHeader>
                                    <MerchantCardContent className="space-y-4">
                                        {/* Points Required */}
                                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 rounded-lg border border-[#FF1493]/20">
                                            <div className="flex items-center gap-2">
                                                <Coins className="w-5 h-5 text-[#FF1493]" />
                                                <span className="text-gray-300">Points Required</span>
                                            </div>
                                            <span className="font-semibold text-white text-lg">
                                                {offer.points_required.toLocaleString()}
                                            </span>
                                        </div>

                                        {/* Cash Required */}
                                        {offer.cash_required && (
                                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 rounded-lg border border-[#FF1493]/20">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="w-5 h-5 text-[#FF1493]" />
                                                    <span className="text-gray-300">Cash Required</span>
                                                </div>
                                                <span className="font-semibold text-white text-lg">
                                                    ${typeof offer.cash_required === 'number' ? offer.cash_required.toFixed(2) : parseFloat(offer.cash_required).toFixed(2)} {offer.currency}
                                                </span>
                                            </div>
                                        )}

                                        {/* Category */}
                                        {offer.category && (
                                            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-[#FF1493]/20">
                                                <div className="flex items-center gap-2">
                                                    <Tag className="w-5 h-5 text-gray-400" />
                                                    <span className="text-gray-300">Category</span>
                                                </div>
                                                <span className="font-semibold text-white">
                                                    {offer.category.name}
                                                </span>
                                            </div>
                                        )}

                                        {/* Inventory */}
                                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-[#FF1493]/20">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-5 h-5 text-gray-400" />
                                                <span className="text-gray-300">Inventory</span>
                                            </div>
                                            <span className="font-semibold text-white">
                                                {offer.inventory_qty !== null ? offer.inventory_qty : 'Unlimited'}
                                            </span>
                                        </div>

                                        {/* Start Date */}
                                        {offer.starts_at && (
                                            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-[#FF1493]/20">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-5 h-5 text-gray-400" />
                                                    <span className="text-gray-300">Starts At</span>
                                                </div>
                                                <span className="font-semibold text-white text-sm">
                                                    {format(new Date(offer.starts_at), 'MMM dd, yyyy HH:mm')}
                                                </span>
                                            </div>
                                        )}

                                        {/* End Date */}
                                        {offer.ends_at && (
                                            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-[#FF1493]/20">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-5 h-5 text-gray-400" />
                                                    <span className="text-gray-300">Ends At</span>
                                                </div>
                                                <span className="font-semibold text-white text-sm">
                                                    {format(new Date(offer.ends_at), 'MMM dd, yyyy HH:mm')}
                                                </span>
                                            </div>
                                        )}

                                        {/* Created Date */}
                                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-[#FF1493]/20">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-5 h-5 text-gray-400" />
                                                <span className="text-gray-300">Created</span>
                                            </div>
                                            <span className="font-semibold text-white text-sm">
                                                {format(new Date(offer.created_at), 'MMM dd, yyyy')}
                                            </span>
                                        </div>
                                    </MerchantCardContent>
                                </MerchantCard>

                                {/* Actions */}
                                <MerchantCard className="shadow-2xl">
                                    <MerchantCardHeader>
                                        <MerchantCardTitle className="text-white">Actions</MerchantCardTitle>
                                    </MerchantCardHeader>
                                    <MerchantCardContent className="space-y-3">
                                        <Link href={`/hub/offers/${offer.slug || offer.id}`} target="_blank">
                                            <MerchantButton variant="outline" className="w-full">
                                                <Eye className="w-4 h-4 mr-2" />
                                                View Public Page
                                            </MerchantButton>
                                        </Link>
                                        <Link href={`/offers/${offer.id}/edit`}>
                                            <MerchantButton className="w-full bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461]">
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit Offer
                                            </MerchantButton>
                                        </Link>
                                    </MerchantCardContent>
                                </MerchantCard>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </MerchantDashboardLayout>
        </>
    )
}

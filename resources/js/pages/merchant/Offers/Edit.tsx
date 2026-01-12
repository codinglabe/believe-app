"use client"

import React, { useEffect } from "react"
import { Head, useForm, Link, router, usePage } from "@inertiajs/react"
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from "@/components/merchant-ui"
import { MerchantButton } from "@/components/merchant-ui"
import { MerchantInput } from "@/components/merchant-ui"
import { MerchantLabel } from "@/components/merchant-ui"
import { MerchantTextarea } from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUpload } from "@/components/admin/ImageUpload"
import { ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface MerchantHubCategory {
    id: number
    name: string
    slug: string
}

interface MerchantHubOffer {
    id: number
    merchant_hub_category_id: number
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
}

interface OffersEditProps {
    offer: MerchantHubOffer
    categories: MerchantHubCategory[]
}

export default function MerchantOffersEdit({ offer, categories }: OffersEditProps) {
    const { data, setData, processing, errors } = useForm({
        merchant_hub_category_id: offer.merchant_hub_category_id.toString(),
        title: offer.title,
        short_description: offer.short_description || '',
        description: offer.description,
        image: null as File | null,
        points_required: offer.points_required,
        cash_required: offer.cash_required ? offer.cash_required.toString() : '',
        currency: offer.currency || 'USD',
        inventory_qty: offer.inventory_qty ? offer.inventory_qty.toString() : '',
        starts_at: offer.starts_at ? new Date(offer.starts_at).toISOString().slice(0, 16) : '',
        ends_at: offer.ends_at ? new Date(offer.ends_at).toISOString().slice(0, 16) : '',
        status: offer.status,
    })

    const { props } = usePage<{ success?: string; error?: string }>()

    // Show flash messages
    useEffect(() => {
        if (props.success) {
            showSuccessToast(props.success)
        }
        if (props.error) {
            showErrorToast(props.error)
        }
    }, [props.success, props.error])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Prepare FormData for file upload with method spoofing
        const formData = new FormData()

        // Add all form fields
        Object.keys(data).forEach(key => {
            const value = data[key as keyof typeof data]
            if (value === null || value === undefined || value === '') {
                if (key === 'inventory_qty' || key === 'cash_required' || key === 'starts_at' || key === 'ends_at' || key === 'short_description') {
                    // These fields can be empty/null
                    return
                }
                return
            }

            if (value instanceof File) {
                formData.append(key, value)
            } else if (typeof value === 'boolean') {
                formData.append(key, value ? '1' : '0')
            } else {
                formData.append(key, String(value))
            }
        })

        // Add method spoofing for PUT request
        formData.append('_method', 'PUT')

        // Use router.post with FormData for proper file upload handling
        // Backend will redirect to index page after successful update
        router.post(`/offers/${offer.id}`, formData, {
            forceFormData: true,
        })
    }

    // Convert image_url to full URL for preview
    const imageUrl = offer.image_url
        ? (offer.image_url.startsWith('http')
            ? offer.image_url
            : offer.image_url.startsWith('/storage')
            ? offer.image_url
            : `/storage/${offer.image_url}`)
        : null

    return (
        <>
            <Head title={`Edit Offer - Merchant Dashboard`} />
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
                                <h1 className="text-3xl font-bold text-white mb-2">Edit Offer</h1>
                                <p className="text-gray-400">Update the details for your offer</p>
                            </div>
                            <Link href="/offers">
                                <MerchantButton type="button" variant="outline">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Offers
                                </MerchantButton>
                            </Link>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <MerchantCard className="shadow-2xl">
                                <MerchantCardHeader>
                                    <MerchantCardTitle className="text-white">Offer Details</MerchantCardTitle>
                                </MerchantCardHeader>
                                <MerchantCardContent className="space-y-6">
                                    {/* Category */}
                                    <div>
                                        <MerchantLabel htmlFor="merchant_hub_category_id">Category *</MerchantLabel>
                                        <Select
                                            value={data.merchant_hub_category_id}
                                            onValueChange={(value) => setData('merchant_hub_category_id', value)}
                                        >
                                            <SelectTrigger className={`mt-1 bg-gray-900/50 border-[#FF1493]/40 text-white ${errors.merchant_hub_category_id ? 'border-red-500' : ''}`}>
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem key={category.id} value={category.id.toString()}>
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.merchant_hub_category_id && (
                                            <p className="mt-1 text-sm text-red-400">{errors.merchant_hub_category_id}</p>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <MerchantLabel htmlFor="title">Title *</MerchantLabel>
                                        <MerchantInput
                                            id="title"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="e.g., 50% Off Electronics"
                                            className={`mt-1 ${errors.title ? 'border-red-500' : ''}`}
                                            required
                                        />
                                        {errors.title && (
                                            <p className="mt-1 text-sm text-red-400">{errors.title}</p>
                                        )}
                                    </div>

                                    {/* Short Description */}
                                    <div>
                                        <MerchantLabel htmlFor="short_description">Short Description</MerchantLabel>
                                        <MerchantInput
                                            id="short_description"
                                            value={data.short_description}
                                            onChange={(e) => setData('short_description', e.target.value)}
                                            placeholder="Brief description (max 500 characters)"
                                            maxLength={500}
                                            className={`mt-1 ${errors.short_description ? 'border-red-500' : ''}`}
                                        />
                                        {errors.short_description && (
                                            <p className="mt-1 text-sm text-red-400">{errors.short_description}</p>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <MerchantLabel htmlFor="description">Description *</MerchantLabel>
                                        <MerchantTextarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Full description of the offer"
                                            rows={6}
                                            className={`mt-1 ${errors.description ? 'border-red-500' : ''}`}
                                            required
                                        />
                                        {errors.description && (
                                            <p className="mt-1 text-sm text-red-400">{errors.description}</p>
                                        )}
                                    </div>

                                    {/* Image Upload */}
                                    <div>
                                        <ImageUpload
                                            label="Offer Image"
                                            value={imageUrl}
                                            onChange={(file) => setData('image', file)}
                                            processing={processing}
                                        />
                                        <p className="text-xs text-gray-400 mt-1">
                                            Upload a new image to replace the existing one (max 5MB)
                                        </p>
                                        {errors.image && (
                                            <p className="mt-1 text-sm text-red-400">{errors.image}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Points Required */}
                                        <div>
                                            <MerchantLabel htmlFor="points_required">Points Required *</MerchantLabel>
                                            <MerchantInput
                                                id="points_required"
                                                type="number"
                                                min="0"
                                                value={data.points_required}
                                                onChange={(e) => setData('points_required', parseInt(e.target.value) || 0)}
                                                className={`mt-1 ${errors.points_required ? 'border-red-500' : ''}`}
                                                required
                                            />
                                            {errors.points_required && (
                                                <p className="mt-1 text-sm text-red-400">{errors.points_required}</p>
                                            )}
                                        </div>

                                        {/* Cash Required */}
                                        <div>
                                            <MerchantLabel htmlFor="cash_required">Cash Required (Optional)</MerchantLabel>
                                            <MerchantInput
                                                id="cash_required"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={data.cash_required}
                                                onChange={(e) => setData('cash_required', e.target.value)}
                                                placeholder="0.00"
                                                className={`mt-1 ${errors.cash_required ? 'border-red-500' : ''}`}
                                            />
                                            {errors.cash_required && (
                                                <p className="mt-1 text-sm text-red-400">{errors.cash_required}</p>
                                            )}
                                        </div>

                                        {/* Currency */}
                                        <div>
                                            <MerchantLabel htmlFor="currency">Currency</MerchantLabel>
                                            <Select
                                                value={data.currency}
                                                onValueChange={(value) => setData('currency', value)}
                                            >
                                                <SelectTrigger className="mt-1 bg-gray-900/50 border-[#FF1493]/40 text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="USD">USD</SelectItem>
                                                    <SelectItem value="EUR">EUR</SelectItem>
                                                    <SelectItem value="GBP">GBP</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Inventory Quantity */}
                                        <div>
                                            <MerchantLabel htmlFor="inventory_qty">Inventory Quantity (Optional)</MerchantLabel>
                                            <MerchantInput
                                                id="inventory_qty"
                                                type="number"
                                                min="0"
                                                value={data.inventory_qty}
                                                onChange={(e) => setData('inventory_qty', e.target.value)}
                                                placeholder="Leave empty for unlimited"
                                                className={`mt-1 ${errors.inventory_qty ? 'border-red-500' : ''}`}
                                            />
                                            {errors.inventory_qty && (
                                                <p className="mt-1 text-sm text-red-400">{errors.inventory_qty}</p>
                                            )}
                                        </div>

                                        {/* Starts At */}
                                        <div>
                                            <MerchantLabel htmlFor="starts_at">Starts At (Optional)</MerchantLabel>
                                            <MerchantInput
                                                id="starts_at"
                                                type="datetime-local"
                                                value={data.starts_at}
                                                onChange={(e) => setData('starts_at', e.target.value)}
                                                className={`mt-1 ${errors.starts_at ? 'border-red-500' : ''}`}
                                            />
                                            {errors.starts_at && (
                                                <p className="mt-1 text-sm text-red-400">{errors.starts_at}</p>
                                            )}
                                        </div>

                                        {/* Ends At */}
                                        <div>
                                            <MerchantLabel htmlFor="ends_at">Ends At (Optional)</MerchantLabel>
                                            <MerchantInput
                                                id="ends_at"
                                                type="datetime-local"
                                                value={data.ends_at}
                                                onChange={(e) => setData('ends_at', e.target.value)}
                                                className={`mt-1 ${errors.ends_at ? 'border-red-500' : ''}`}
                                            />
                                            {errors.ends_at && (
                                                <p className="mt-1 text-sm text-red-400">{errors.ends_at}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <MerchantLabel htmlFor="status">Status *</MerchantLabel>
                                        <Select
                                            value={data.status}
                                            onValueChange={(value) => setData('status', value as 'draft' | 'active' | 'paused' | 'expired')}
                                        >
                                            <SelectTrigger className={`mt-1 bg-gray-900/50 border-[#FF1493]/40 text-white ${errors.status ? 'border-red-500' : ''}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">Draft</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="paused">Paused</SelectItem>
                                                <SelectItem value="expired">Expired</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.status && (
                                            <p className="mt-1 text-sm text-red-400">{errors.status}</p>
                                        )}
                                    </div>
                                </MerchantCardContent>
                            </MerchantCard>

                            {/* Submit Buttons */}
                            <div className="flex justify-end gap-3">
                                <Link href="/offers">
                                    <MerchantButton type="button" variant="outline">
                                        Cancel
                                    </MerchantButton>
                                </Link>
                                <MerchantButton type="submit" disabled={processing} className="bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461]">
                                    {processing ? 'Updating...' : 'Update Offer'}
                                </MerchantButton>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </MerchantDashboardLayout>
        </>
    )
}

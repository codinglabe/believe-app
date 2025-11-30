"use client"

import AppLayout from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Button } from "@/components/admin/ui/button"
import { Badge } from "@/components/admin/ui/badge"
import React from "react"
import { router, Head, useForm } from "@inertiajs/react"
import { Building2, User, Mail, AlertCircle, Clock, ShieldCheck, Phone, MapPin, ArrowLeft, Hash, TrendingUp, Link2, Save } from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface User {
    id: number
    name: string
    email: string
}

interface FractionalAsset {
    id: number
    name: string
    type: string
}

interface BuyerProfile {
    id: number
    farm_name: string
    verification_status: string
    rejection_reason: string | null
    address?: string
    description?: string
    phone?: string
    email?: string
    city?: string
    state?: string
    zip_code?: string
    country?: string
    national_id_number?: string
    farm_type?: string
    farm_size_acres?: number
    number_of_animals?: number
    specialization?: string
    fractional_asset_id?: number | null
    fractional_asset?: FractionalAsset | null
    user: User
}

interface BuyerViewProps {
    buyer: BuyerProfile
    availableAssets: FractionalAsset[]
}

export default function BuyerView({ buyer, availableAssets = [] }: BuyerViewProps) {
    const [isLinkingAsset, setIsLinkingAsset] = React.useState(false)
    
    const assetLinkForm = useForm({
        fractional_asset_id: buyer.fractional_asset_id?.toString() || '',
    })
    
    const handleLinkAsset = (e: React.FormEvent) => {
        e.preventDefault()
        const assetId = assetLinkForm.data.fractional_asset_id === 'none' || assetLinkForm.data.fractional_asset_id === '' 
            ? null 
            : assetLinkForm.data.fractional_asset_id
        
        router.put(`/admin/livestock/buyers/${buyer.id}/link-asset`, {
            fractional_asset_id: assetId
        }, {
            onSuccess: () => {
                setIsLinkingAsset(false)
                router.reload()
            },
        })
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Admin", href: "/dashboard" },
        { title: "Livestock Management", href: "/admin/livestock" },
        { title: "Buyers", href: "/admin/livestock/buyers" },
        { title: buyer.farm_name, href: `/admin/livestock/buyers/${buyer.id}` },
    ]

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'verified':
                return {
                    icon: ShieldCheck,
                    variant: 'default' as const,
                    color: 'text-green-600 dark:text-green-400',
                    bgColor: 'bg-green-50 dark:bg-green-900/20',
                    borderColor: 'border-green-200 dark:border-green-800',
                    label: 'Verified'
                }
            case 'pending':
                return {
                    icon: Clock,
                    variant: 'secondary' as const,
                    color: 'text-yellow-600 dark:text-yellow-400',
                    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
                    borderColor: 'border-yellow-200 dark:border-yellow-800',
                    label: 'Pending'
                }
            case 'rejected':
                return {
                    icon: AlertCircle,
                    variant: 'destructive' as const,
                    color: 'text-red-600 dark:text-red-400',
                    bgColor: 'bg-red-50 dark:bg-red-900/20',
                    borderColor: 'border-red-200 dark:border-red-800',
                    label: 'Rejected'
                }
            default:
                return {
                    icon: Clock,
                    variant: 'outline' as const,
                    color: 'text-gray-600 dark:text-gray-400',
                    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
                    borderColor: 'border-gray-200 dark:border-gray-800',
                    label: status
                }
        }
    }

    const statusConfig = getStatusConfig(buyer.verification_status)
    const StatusIcon = statusConfig.icon

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${buyer.farm_name} - Buyer Details`} />
            
            <div className="m-2 md:m-4 space-y-4">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.visit('/admin/livestock/buyers')}
                            className="shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <Building2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                {buyer.farm_name}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                                Complete buyer profile information
                            </p>
                        </div>
                    </div>
                    <Badge 
                        variant={statusConfig.variant}
                        className="flex items-center gap-1.5 text-sm px-4 py-2 h-auto"
                    >
                        <StatusIcon className="h-4 w-4" />
                        <span className="capitalize">{statusConfig.label}</span>
                    </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Farm Information */}
                        <Card className="border-gray-200 dark:border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    Farm Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Farm Name</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{buyer.farm_name}</p>
                                    </div>
                                    {buyer.farm_type && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Farm Type</p>
                                            <p className="text-base font-semibold text-gray-900 dark:text-white">{buyer.farm_type}</p>
                                        </div>
                                    )}
                                    {buyer.farm_size_acres && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Farm Size</p>
                                            <p className="text-base font-semibold text-gray-900 dark:text-white">{buyer.farm_size_acres} acres</p>
                                        </div>
                                    )}
                                    {buyer.number_of_animals && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Number of Animals</p>
                                            <p className="text-base font-semibold text-gray-900 dark:text-white">{buyer.number_of_animals}</p>
                                        </div>
                                    )}
                                    {buyer.specialization && (
                                        <div className="md:col-span-2">
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Specialization</p>
                                            <p className="text-base font-semibold text-gray-900 dark:text-white">{buyer.specialization}</p>
                                        </div>
                                    )}
                                </div>
                                {buyer.description && (
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Description</p>
                                        <p className="text-base text-gray-700 dark:text-gray-300">{buyer.description}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Contact Information */}
                        <Card className="border-gray-200 dark:border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Phone className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    Contact Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {buyer.user && (
                                        <>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                                    <User className="h-3.5 w-3.5" />
                                                    Owner Name
                                                </p>
                                                <p className="text-base font-semibold text-gray-900 dark:text-white">{buyer.user.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                                    <Mail className="h-3.5 w-3.5" />
                                                    Account Email
                                                </p>
                                                <p className="text-base font-medium text-gray-700 dark:text-gray-300">{buyer.user.email}</p>
                                            </div>
                                        </>
                                    )}
                                    {buyer.phone && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                                <Phone className="h-3.5 w-3.5" />
                                                Phone
                                            </p>
                                            <p className="text-base text-gray-700 dark:text-gray-300">{buyer.phone}</p>
                                        </div>
                                    )}
                                    {buyer.email && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                                <Mail className="h-3.5 w-3.5" />
                                                Farm Email
                                            </p>
                                            <p className="text-base text-gray-700 dark:text-gray-300">{buyer.email}</p>
                                        </div>
                                    )}
                                </div>
                                {buyer.address && (
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" />
                                            Address
                                        </p>
                                        <p className="text-base text-gray-700 dark:text-gray-300">{buyer.address}</p>
                                        {(buyer.city || buyer.state || buyer.zip_code || buyer.country) && (
                                            <p className="text-base text-gray-700 dark:text-gray-300 mt-1">
                                                {[buyer.city, buyer.state, buyer.zip_code, buyer.country].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Additional Information */}
                        {buyer.national_id_number && (
                            <Card className="border-gray-200 dark:border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Hash className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        Additional Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">National ID Number</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{buyer.national_id_number}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Rejection Reason */}
                        {buyer.verification_status === 'rejected' && buyer.rejection_reason && (
                            <Card className="border-red-200 dark:border-red-800">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                                        <AlertCircle className="h-5 w-5" />
                                        Rejection Reason
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-base text-red-700 dark:text-red-300">{buyer.rejection_reason}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Status Card */}
                        <Card className="border-gray-200 dark:border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-lg">Verification Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className={`h-12 w-12 rounded-lg ${statusConfig.bgColor} flex items-center justify-center`}>
                                        <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{statusConfig.label}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {buyer.verification_status === 'verified' && 'This buyer is verified and active'}
                                            {buyer.verification_status === 'pending' && 'Awaiting verification'}
                                            {buyer.verification_status === 'rejected' && 'This buyer has been rejected'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Asset Link Card */}
                        <Card className="border-gray-200 dark:border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Link2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    Link Asset
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLinkingAsset ? (
                                    <form onSubmit={handleLinkAsset} className="space-y-4">
                                        <div>
                                            <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Fractional Asset</Label>
                                            <Select
                                                value={assetLinkForm.data.fractional_asset_id || 'none'}
                                                onValueChange={(value) => assetLinkForm.setData('fractional_asset_id', value === 'none' ? '' : value)}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select an asset to link" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No Asset</SelectItem>
                                                    {availableAssets.map((asset) => (
                                                        <SelectItem key={asset.id} value={asset.id.toString()}>
                                                            {asset.name} ({asset.type})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {assetLinkForm.errors.fractional_asset_id && (
                                                <p className="text-xs text-red-500 mt-1">{assetLinkForm.errors.fractional_asset_id}</p>
                                            )}
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                Link a fractional asset to this buyer. When the buyer creates listings, this asset ID will be automatically stored in the fractional_listings table.
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={assetLinkForm.processing}
                                                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                                            >
                                                <Save className="h-4 w-4 mr-2" />
                                                {assetLinkForm.processing ? 'Saving...' : 'Save Link'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setIsLinkingAsset(false)
                                                    assetLinkForm.reset()
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-3">
                                        {buyer.fractional_asset ? (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Linked Asset</p>
                                                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{buyer.fractional_asset.name}</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 capitalize mt-1">Type: {buyer.fractional_asset.type}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                                                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                                    No asset linked. Link a fractional asset so that when this buyer creates listings, the asset ID will be automatically stored.
                                                </p>
                                            </div>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsLinkingAsset(true)}
                                            className="w-full border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                        >
                                            <Link2 className="h-4 w-4 mr-2" />
                                            {buyer.fractional_asset ? 'Change Asset Link' : 'Link Asset'}
                                        </Button>
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


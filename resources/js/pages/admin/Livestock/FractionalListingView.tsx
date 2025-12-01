"use client"

import AppLayout from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { router, Head } from "@inertiajs/react"
import { useState } from "react"
import { 
    ArrowLeft,
    Tag,
    Heart,
    Building2,
    User,
    Mail,
    Calendar,
    TrendingUp,
    CheckCircle,
    Clock,
    XCircle,
    Package,
    AlertCircle,
    FileText,
    MapPin,
    DollarSign,
    Info,
    Link2,
    Save
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "@inertiajs/react"
import { format } from "date-fns"
import type { BreadcrumbItem } from "@/types"

interface Photo {
    id: number
    url: string
    is_primary: boolean
}

interface HealthRecord {
    id: number
    record_type: string
    description: string
    record_date: string
}

interface Animal {
    id: number
    species: string
    breed: string
    sex: string
    ear_tag: string | null
    date_of_birth: string | null
    age_months: number | null
    weight_kg: number | null
    color_markings: string | null
    location: string | null
    health_status: string
    fertility_status: string
    current_market_value: number | null
    status: string
    photos: Photo[]
    health_records: HealthRecord[]
    parent_link?: {
        father?: { id: number; breed: string; ear_tag: string | null }
        mother?: { id: number; breed: string; ear_tag: string | null }
    }
}

interface Owner {
    id: number
    name: string
    email: string
    farm_name: string
}

interface Progress {
    percentage: number
    sold_shares: number
    total_shares: number
    offering?: {
        id: number
        title: string
        price_per_share: number
        token_price: number
        currency: string
        status: string
    } | null
}

interface FractionalAsset {
    id: number
    name: string
    type: string
}

interface FractionalListing {
    id: number
    tag_number: string
    country_code: string
    status: string
    notes: string | null
    fractional_asset_id: number | null
    fractional_asset: FractionalAsset | null
    created_at: string
    animal: Animal | null
    owner: Owner | null
    progress: Progress
}

interface FractionalListingViewProps {
    listing: FractionalListing
    availableAssets: FractionalAsset[]
}

export default function FractionalListingView({ listing, availableAssets }: FractionalListingViewProps) {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const [isLinkingAsset, setIsLinkingAsset] = useState(false)
    
    const assetLinkForm = useForm({
        fractional_asset_id: listing.fractional_asset_id?.toString() || '',
    })
    
    const handleLinkAsset = (e: React.FormEvent) => {
        e.preventDefault()
        const assetId = assetLinkForm.data.fractional_asset_id === 'unlink' || assetLinkForm.data.fractional_asset_id === '' 
            ? null 
            : assetLinkForm.data.fractional_asset_id
        
        router.put(`/admin/livestock/listings/${listing.id}/link-asset`, {
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
        { title: "Livestock", href: "/admin/livestock" },
        { title: "Livestock", href: "/admin/livestock/listings" },
        { title: listing.tag_number, href: `/admin/livestock/listings/${listing.id}` },
    ]

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'active':
                return {
                    label: 'Active',
                    icon: CheckCircle,
                    variant: 'default' as const,
                    bgColor: 'bg-green-500 hover:bg-green-600',
                    color: 'text-green-600 dark:text-green-400',
                    borderColor: 'border-green-200 dark:border-green-800',
                }
            case 'pending':
                return {
                    label: 'Pending',
                    icon: Clock,
                    variant: 'secondary' as const,
                    bgColor: 'bg-yellow-500 hover:bg-yellow-600',
                    color: 'text-yellow-600 dark:text-yellow-400',
                    borderColor: 'border-yellow-200 dark:border-yellow-800',
                }
            case 'sold_out':
                return {
                    label: 'Sold Out',
                    icon: Package,
                    variant: 'default' as const,
                    bgColor: 'bg-blue-500 hover:bg-blue-600',
                    color: 'text-blue-600 dark:text-blue-400',
                    borderColor: 'border-blue-200 dark:border-blue-800',
                }
            case 'cancelled':
                return {
                    label: 'Cancelled',
                    icon: XCircle,
                    variant: 'destructive' as const,
                    bgColor: 'bg-red-500 hover:bg-red-600',
                    color: 'text-red-600 dark:text-red-400',
                    borderColor: 'border-red-200 dark:border-red-800',
                }
            default:
                return {
                    label: status,
                    icon: AlertCircle,
                    variant: 'outline' as const,
                    bgColor: 'bg-gray-500 hover:bg-gray-600',
                    color: 'text-gray-600 dark:text-gray-400',
                    borderColor: 'border-gray-200 dark:border-gray-800',
                }
        }
    }

    const statusConfig = getStatusConfig(listing.status)
    const StatusIcon = statusConfig.icon

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${listing.tag_number} - Fractional Listing Details`} />
            
            <div className="m-2 md:m-4 space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.visit('/admin/livestock/listings')}
                            className="shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <Tag className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                {listing.tag_number}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                                Fractional listing details and progress
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
                        {/* Animal Photos */}
                        {listing.animal && listing.animal.photos.length > 0 && (
                            <Card className="border-gray-200 dark:border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Heart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        Photos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {/* Main Image */}
                                        <div className="relative w-full aspect-[16/9] bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
                                            <img
                                                src={listing.animal.photos[selectedImageIndex]?.url}
                                                alt={listing.animal.breed}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        
                                        {/* Thumbnail Gallery */}
                                        {listing.animal.photos.length > 1 && (
                                            <div className="grid grid-cols-4 gap-2">
                                                {listing.animal.photos.map((photo, index) => (
                                                    <button
                                                        key={photo.id}
                                                        onClick={() => setSelectedImageIndex(index)}
                                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                                            selectedImageIndex === index
                                                                ? 'border-amber-500 dark:border-amber-600 ring-2 ring-amber-500/20'
                                                                : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700'
                                                        }`}
                                                    >
                                                        <img
                                                            src={photo.url}
                                                            alt={`${listing.animal?.breed} ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Animal Information */}
                        {listing.animal && (
                            <Card className="border-gray-200 dark:border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Heart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        Animal Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Species</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{listing.animal.species}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Breed</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{listing.animal.breed}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Sex</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{listing.animal.sex}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Ear Tag</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{listing.animal.ear_tag || 'N/A'}</p>
                                        </div>
                                        {listing.animal.date_of_birth && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Date of Birth</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {format(new Date(listing.animal.date_of_birth), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                        )}
                                        {listing.animal.age_months !== null && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Age</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{listing.animal.age_months} months</p>
                                            </div>
                                        )}
                                        {listing.animal.weight_kg && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Weight</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{listing.animal.weight_kg} kg</p>
                                            </div>
                                        )}
                                        {listing.animal.current_market_value && (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Market Value</p>
                                                <p className="text-sm font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                                    ${listing.animal.current_market_value.toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    {listing.animal.color_markings && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Color/Markings</p>
                                            <p className="text-sm text-gray-900 dark:text-white">{listing.animal.color_markings}</p>
                                        </div>
                                    )}
                                    {listing.animal.location && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Location</p>
                                            <p className="text-sm text-gray-900 dark:text-white">{listing.animal.location}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Health Status</p>
                                            <Badge variant="outline" className="capitalize">{listing.animal.health_status}</Badge>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Fertility Status</p>
                                            <Badge variant="outline" className="capitalize">{listing.animal.fertility_status}</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Health Records */}
                        {listing.animal && listing.animal.health_records.length > 0 && (
                            <Card className="border-gray-200 dark:border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        Health Records
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {listing.animal.health_records.map((record) => (
                                            <div key={record.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                                                <div className="flex items-start justify-between mb-2">
                                                    <Badge variant="outline" className="capitalize">{record.record_type}</Badge>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {format(new Date(record.record_date), 'MMM d, yyyy')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-900 dark:text-white">{record.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Notes */}
                        {listing.notes && (
                            <Card className="border-gray-200 dark:border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        Notes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{listing.notes}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Listing Details */}
                        <Card className="border-gray-200 dark:border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Tag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    Listing Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Tag Number</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{listing.tag_number}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Country Code</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{listing.country_code}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Created At</p>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        {format(new Date(listing.created_at), 'MMM d, yyyy')}
                                    </p>
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
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Fractional Asset</p>
                                            <Select
                                                value={assetLinkForm.data.fractional_asset_id || 'unlink'}
                                                onValueChange={(value) => assetLinkForm.setData('fractional_asset_id', value === 'unlink' ? '' : value)}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select an asset to link" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="unlink">No Asset (Unlink)</SelectItem>
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
                                                Link this listing to a fractional asset. The asset ID will be stored in the fractional_listings table, allowing the tag number to be sold when investors purchase shares.
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
                                        {listing.fractional_asset ? (
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Linked Asset</p>
                                                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{listing.fractional_asset.name}</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 capitalize mt-1">Type: {listing.fractional_asset.type}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                                                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                                    No asset linked. Link this listing to a fractional asset to enable fractional ownership.
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
                                            {listing.fractional_asset ? 'Change Asset Link' : 'Link Asset'}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Owner Information */}
                        {listing.owner && (
                            <Card className="border-gray-200 dark:border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        Farm Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Farm Name</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{listing.owner.farm_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Owner</p>
                                        <p className="text-sm text-gray-900 dark:text-white">{listing.owner.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Email</p>
                                        <p className="text-sm text-gray-900 dark:text-white">{listing.owner.email}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Progress Card */}
                        {listing.progress.total_shares > 0 && listing.progress.offering && (
                            <Card className="border-gray-200 dark:border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        Fractional Progress
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Offering Title</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{listing.progress.offering.title}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Progress</p>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {listing.progress.sold_shares} / {listing.progress.total_shares} shares
                                            </span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {listing.progress.percentage.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-amber-600 to-orange-600 h-3 rounded-full transition-all"
                                                style={{ width: `${Math.min(listing.progress.percentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Price/Share</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {listing.progress.offering.currency} {listing.progress.offering.price_per_share.toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Token Price</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {listing.progress.offering.currency} {listing.progress.offering.token_price?.toLocaleString() || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Status</p>
                                        <Badge variant="outline" className="capitalize">{listing.progress.offering.status}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}


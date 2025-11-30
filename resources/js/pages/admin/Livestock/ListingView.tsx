"use client"

import AppLayout from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { router, Head } from "@inertiajs/react"
import { useState } from "react"
import { 
    ArrowLeft,
    MapPin,
    Calendar,
    DollarSign,
    Tag,
    Eye,
    User,
    FileText,
    AlertCircle,
    Package,
    CheckCircle,
    XCircle,
    Clock
} from "lucide-react"
import { format } from "date-fns"
import type { BreadcrumbItem } from "@/types"

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
    photos: Array<{ id: number; url: string; is_primary: boolean }>
    health_records: Array<{
        id: number
        record_type: string
        description: string
        record_date: string
    }>
    parent_link?: {
        father?: { id: number; breed: string; ear_tag: string | null }
        mother?: { id: number; breed: string; ear_tag: string | null }
    }
    seller: {
        id: number
        name: string
    }
    current_owner: {
        id: number
        name: string
    }
}

interface Listing {
    id: number
    title: string
    description: string | null
    price: number
    currency: string
    listed_at: string
    sold_at: string | null
    status: string
    animal: Animal
    seller: {
        id: number
        name: string
    }
}

interface ListingViewProps {
    listing: Listing
    sellerProfileId?: number | null
}

const speciesColors: Record<string, string> = {
    goat: 'bg-amber-500 text-white',
    sheep: 'bg-orange-500 text-white',
    cow: 'bg-brown-500 text-white',
    chicken: 'bg-yellow-500 text-white',
    pig: 'bg-pink-500 text-white',
}

export default function ListingView({ listing, sellerProfileId }: ListingViewProps) {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)

    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Admin", href: "/dashboard" },
        { title: "Livestock Management", href: "/admin/livestock" },
        { title: "Listings", href: "/admin/livestock/listings" },
        { title: listing.title, href: `/admin/livestock/listings/${listing.id}` },
    ]

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'active':
                return {
                    icon: CheckCircle,
                    variant: 'default' as const,
                    color: 'text-green-600 dark:text-green-400',
                    bgColor: 'bg-green-50 dark:bg-green-900/20',
                    borderColor: 'border-green-200 dark:border-green-800',
                    label: 'Active'
                }
            case 'sold':
                return {
                    icon: CheckCircle,
                    variant: 'secondary' as const,
                    color: 'text-blue-600 dark:text-blue-400',
                    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                    borderColor: 'border-blue-200 dark:border-blue-800',
                    label: 'Sold'
                }
            case 'removed':
                return {
                    icon: XCircle,
                    variant: 'destructive' as const,
                    color: 'text-red-600 dark:text-red-400',
                    bgColor: 'bg-red-50 dark:bg-red-900/20',
                    borderColor: 'border-red-200 dark:border-red-800',
                    label: 'Removed'
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

    const statusConfig = getStatusConfig(listing.status)
    const StatusIcon = statusConfig.icon

    const allPhotos = listing.animal.photos.length > 0 ? listing.animal.photos : []
    const primaryImage = allPhotos[selectedImageIndex] || allPhotos[0]

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${listing.title} - Listing Details`} />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.visit('/admin/livestock/listings')}
                            className="shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <Package className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                {listing.title}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                                Complete listing information and animal details
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
                        {/* Image Gallery */}
                        <Card className="border-gray-200 dark:border-gray-800">
                            <CardContent className="p-0">
                                <div className="relative aspect-[16/9] bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
                                    {primaryImage ? (
                                        <img
                                            src={primaryImage.url}
                                            alt={listing.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="h-24 w-24 text-gray-400 dark:text-gray-500" />
                                        </div>
                                    )}
                                </div>
                                {allPhotos.length > 1 && (
                                    <div className="p-4 grid grid-cols-4 gap-2">
                                        {allPhotos.map((photo, index) => (
                                            <button
                                                key={photo.id}
                                                onClick={() => setSelectedImageIndex(index)}
                                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                                    selectedImageIndex === index
                                                        ? 'border-amber-600 dark:border-amber-400'
                                                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                            >
                                                <img
                                                    src={photo.url}
                                                    alt={`${listing.title} - ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Description */}
                        {listing.description && (
                            <Card className="border-gray-200 dark:border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        Description
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                        {listing.description}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Animal Information */}
                        <Card className="border-gray-200 dark:border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Tag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    Animal Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Species</p>
                                        <Badge className={speciesColors[listing.animal.species.toLowerCase()] || 'bg-gray-500 text-white'}>
                                            {listing.animal.species}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Breed</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{listing.animal.breed}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Sex</p>
                                        <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{listing.animal.sex}</p>
                                    </div>
                                    {listing.animal.ear_tag && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Ear Tag</p>
                                            <p className="text-base font-semibold text-gray-900 dark:text-white">{listing.animal.ear_tag}</p>
                                        </div>
                                    )}
                                    {listing.animal.date_of_birth && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Date of Birth
                                            </p>
                                            <p className="text-base text-gray-700 dark:text-gray-300">
                                                {format(new Date(listing.animal.date_of_birth), 'MMMM d, yyyy')}
                                            </p>
                                        </div>
                                    )}
                                    {listing.animal.age_months && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Age</p>
                                            <p className="text-base text-gray-700 dark:text-gray-300">{listing.animal.age_months} months</p>
                                        </div>
                                    )}
                                    {listing.animal.weight_kg && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Weight</p>
                                            <p className="text-base text-gray-700 dark:text-gray-300">{listing.animal.weight_kg} kg</p>
                                        </div>
                                    )}
                                    {listing.animal.location && (
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5" />
                                                Location
                                            </p>
                                            <p className="text-base text-gray-700 dark:text-gray-300">{listing.animal.location}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Health Status</p>
                                        <Badge variant="outline" className="capitalize">
                                            {listing.animal.health_status}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Fertility Status</p>
                                        <Badge variant="outline" className="capitalize">
                                            {listing.animal.fertility_status}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Health Records */}
                        {listing.animal.health_records && listing.animal.health_records.length > 0 && (
                            <Card className="border-gray-200 dark:border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        Recent Health Records
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {listing.animal.health_records.map((record) => (
                                            <div key={record.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge variant="outline" className="capitalize">
                                                        {record.record_type}
                                                    </Badge>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {format(new Date(record.record_date), 'MMM d, yyyy')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{record.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Parent Information */}
                        {listing.animal.parent_link && (listing.animal.parent_link.father || listing.animal.parent_link.mother) && (
                            <Card className="border-gray-200 dark:border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        Parent Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {listing.animal.parent_link.father && (
                                            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Father</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{listing.animal.parent_link.father.breed}</p>
                                                {listing.animal.parent_link.father.ear_tag && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Tag: {listing.animal.parent_link.father.ear_tag}</p>
                                                )}
                                            </div>
                                        )}
                                        {listing.animal.parent_link.mother && (
                                            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Mother</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{listing.animal.parent_link.mother.breed}</p>
                                                {listing.animal.parent_link.mother.ear_tag && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Tag: {listing.animal.parent_link.mother.ear_tag}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Purchase Information */}
                        <Card className="border-gray-200 dark:border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    Listing Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Price</p>
                                    <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                        {listing.currency || '$'}{listing.price.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Listed At
                                    </p>
                                    <p className="text-base text-gray-700 dark:text-gray-300">
                                        {format(new Date(listing.listed_at), 'MMMM d, yyyy')}
                                    </p>
                                </div>
                                {listing.sold_at && (
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            Sold At
                                        </p>
                                        <p className="text-base text-gray-700 dark:text-gray-300">
                                            {format(new Date(listing.sold_at), 'MMMM d, yyyy')}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Seller Information */}
                        <Card className="border-gray-200 dark:border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    Seller Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Seller Name</p>
                                    <p className="text-base font-semibold text-gray-900 dark:text-white">{listing.seller.name}</p>
                                </div>
                                {sellerProfileId ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.visit(`/admin/livestock/sellers/${sellerProfileId}`)}
                                        className="w-full border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Seller Profile
                                    </Button>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                                        No seller profile found
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Current Owner */}
                        <Card className="border-gray-200 dark:border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    Current Owner
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">
                                    {listing.animal.current_owner?.name || 'N/A'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}


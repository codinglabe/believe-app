"use client"

import AppLayout from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { router, Head } from "@inertiajs/react"
import { useState, useRef } from "react"
import { debounce } from "lodash"
import { 
    Heart, 
    Tag, 
    Search, 
    Filter, 
    User, 
    TrendingUp, 
    CheckCircle, 
    Clock, 
    XCircle,
    Package,
    AlertCircle,
    Eye,
    Building2
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Admin", href: "/dashboard" },
    { title: "Livestock", href: "/admin/livestock" },
    { title: "Livestock", href: "/admin/livestock/listings" },
]

interface Animal {
    id: number
    species: string
    breed: string
    sex: string
    ear_tag: string | null
    primary_photo?: { url: string } | null
}

interface Owner {
    id: number
    name: string
    email: string
    farm_name?: string | null
}

interface Progress {
    has_token_selling: boolean
    percentage: number
    sold_shares: number
    total_shares: number
    sold_tokens: number
    total_tokens: number
    remaining_tokens: number
    remaining_shares: number
}

interface FractionalListing {
    id: number
    tag_number: string
    country_code: string
    status: string
    notes: string | null
    created_at: string
    livestock_animal_id: number | null
    is_fully_sold: boolean
    awaiting_assignment: boolean
    animal: Animal | null
    owner: Owner | null
    progress: Progress
}

interface FractionalListingsProps {
    listings: {
        data: FractionalListing[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
    }
    stats: {
        total: number
        active: number
        pending: number
        sold_out: number
        cancelled: number
    }
    filters: {
        search?: string
        status?: string
        per_page?: number
    }
}

export default function FractionalListings({ listings, stats, filters }: FractionalListingsProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '')
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all')

    const debouncedSearch = useRef(
        debounce((value: string) => {
            router.get('/admin/livestock/listings', 
                { search: value || undefined, status: selectedStatus !== 'all' ? selectedStatus : undefined },
                { preserveState: true, replace: true }
            )
        }, 500)
    ).current

    const handleSearch = (value: string) => {
        setSearchQuery(value)
        debouncedSearch(value)
    }

    const handleStatusChange = (value: string) => {
        setSelectedStatus(value)
        router.get('/admin/livestock/listings', 
            { search: searchQuery || undefined, status: value !== 'all' ? value : undefined },
            { preserveState: true, replace: true }
        )
    }

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Livestock - Fractional Listings - Admin" />
            
            <div className="m-2 md:m-4 space-y-4">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Heart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            Buyer Listed Livestock
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            View all buyer-listed tag numbers with fractional ownership details
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                            <Tag className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Total: <span className="font-semibold text-gray-900 dark:text-white">{listings.total}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                                </div>
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Tag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Active</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.active}</p>
                                </div>
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Pending</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.pending}</p>
                                </div>
                                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Sold Out</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.sold_out}</p>
                                </div>
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Cancelled</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.cancelled}</p>
                                </div>
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by tag number, country code, breed, or owner..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select value={selectedStatus} onValueChange={handleStatusChange}>
                            <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="sold_out">Sold Out</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                                <SelectItem value="awaiting_assignment">Awaiting Assignment</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Listings Grid */}
                {listings.data.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {listings.data.map((listing) => {
                                const statusConfig = getStatusConfig(listing.status)
                                const StatusIcon = statusConfig.icon

                                return (
                                    <div key={listing.id} className="group">
                                        {/* Animal Photo - Full Width at Top */}
                                        {listing.animal?.primary_photo ? (
                                            <div className="relative w-full aspect-[3/2] bg-gray-200 dark:bg-gray-800 rounded-t-lg overflow-hidden mb-0">
                                                <img
                                                    src={listing.animal.primary_photo.url}
                                                    alt={listing.animal.breed}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                />
                                                {/* Sold Badge - Top Right Corner */}
                                                {listing.is_fully_sold && (
                                                    <div className="absolute top-2 right-2 z-10">
                                                        <Badge 
                                                            variant="default"
                                                            className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-green-500 hover:bg-green-600 text-white border-green-600 shadow-lg"
                                                        >
                                                            <CheckCircle className="h-3 w-3" />
                                                            <span>Sold</span>
                                                        </Badge>
                                                    </div>
                                                )}
                                                {/* Awaiting Assignment Badge - Top Left Corner */}
                                                {listing.awaiting_assignment && (
                                                    <div className="absolute top-2 left-2 z-10">
                                                        <Badge 
                                                            variant="outline"
                                                            className="flex items-center gap-1 text-xs font-medium px-2 py-1 border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/90 shadow-lg backdrop-blur-sm"
                                                        >
                                                            <Clock className="h-3 w-3" />
                                                            <span>Awaiting Assignment</span>
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative w-full aspect-[3/2] bg-gray-200 dark:bg-gray-800 rounded-t-lg overflow-hidden mb-0 flex items-center justify-center">
                                                <Heart className="h-12 w-12 text-gray-400 dark:text-gray-600" />
                                                {/* Sold Badge - Top Right Corner */}
                                                {listing.is_fully_sold && (
                                                    <div className="absolute top-2 right-2 z-10">
                                                        <Badge 
                                                            variant="default"
                                                            className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-green-500 hover:bg-green-600 text-white border-green-600 shadow-lg"
                                                        >
                                                            <CheckCircle className="h-3 w-3" />
                                                            <span>Sold</span>
                                                        </Badge>
                                                    </div>
                                                )}
                                                {/* Awaiting Assignment Badge - Top Left Corner */}
                                                {listing.awaiting_assignment && (
                                                    <div className="absolute top-2 left-2 z-10">
                                                        <Badge 
                                                            variant="outline"
                                                            className="flex items-center gap-1 text-xs font-medium px-2 py-1 border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/90 shadow-lg backdrop-blur-sm"
                                                        >
                                                            <Clock className="h-3 w-3" />
                                                            <span>Awaiting Assignment</span>
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Info Card Below Picture */}
                                        <Card className="border-gray-200 dark:border-gray-800 overflow-hidden rounded-t-none -mt-1">
                                            {/* Status Indicator Bar */}
                                            <div className={`h-0.5 ${statusConfig.bgColor}`} />
                                            
                                            <CardHeader className="pb-2 pt-2.5 px-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                                            <Tag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <CardTitle className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                                                                {listing.tag_number}
                                                            </CardTitle>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <Badge 
                                                                    variant={statusConfig.variant}
                                                                    className="flex items-center gap-1 text-xs font-medium px-2 py-0.5"
                                                                >
                                                                    <StatusIcon className="h-3 w-3" />
                                                                    <span className="capitalize">{statusConfig.label}</span>
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            
                                            <CardContent className="space-y-2.5 px-3 pb-3">
                                                {/* Animal Information */}
                                                {listing.animal && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                                        <Heart className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                                        <span className="font-semibold">{listing.animal.breed}</span>
                                                        <span className="text-gray-500 dark:text-gray-500">•</span>
                                                        <span className="capitalize">{listing.animal.species}</span>
                                                        <span className="text-gray-500 dark:text-gray-500">•</span>
                                                        <span className="capitalize">{listing.animal.sex}</span>
                                                    </div>
                                                )}

                                                {/* Farm Name */}
                                                {listing.owner && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                                        <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                                        <span className="truncate">{listing.owner.farm_name || listing.owner.name || 'N/A'}</span>
                                                    </div>
                                                )}

                                                {/* Progress Bar - Tag Wise (Always show progress if available) */}
                                                {listing.progress.total_tokens > 0 && (
                                                    <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-2.5 -mx-1">
                                                        <div className="flex items-center justify-between text-xs font-semibold text-gray-800 dark:text-gray-200">
                                                            <div className="flex items-center gap-1.5">
                                                                <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                                                <span>Sales Progress</span>
                                                            </div>
                                                            <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">
                                                                {listing.progress.percentage.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden shadow-inner">
                                                            <div
                                                                className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                                                                style={{ width: `${Math.min(listing.progress.percentage, 100)}%` }}
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                                                            <div className="flex flex-col">
                                                                <span className="text-gray-600 dark:text-gray-400 font-medium mb-0.5">Sold</span>
                                                                <span className="font-bold text-green-600 dark:text-green-400 text-sm">
                                                                    {listing.progress.sold_tokens.toLocaleString()}
                                                                </span>
                                                                <span className="text-gray-500 dark:text-gray-500 text-[10px] mt-0.5">
                                                                    tokens ({listing.progress.sold_shares} share{listing.progress.sold_shares !== 1 ? 's' : ''})
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col text-right">
                                                                <span className="text-gray-600 dark:text-gray-400 font-medium mb-0.5">Remaining</span>
                                                                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                                                                    {listing.progress.remaining_tokens.toLocaleString()}
                                                                </span>
                                                                <span className="text-gray-500 dark:text-gray-500 text-[10px] mt-0.5">
                                                                    tokens ({listing.progress.remaining_shares} share{listing.progress.remaining_shares !== 1 ? 's' : ''})
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* View Button */}
                                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                                        onClick={() => router.visit(`/admin/livestock/listings/${listing.id}`)}
                                                    >
                                                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                                                        View Details
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Pagination */}
                        {listings.last_page > 1 && (
                            <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Showing <span className="font-semibold text-gray-900 dark:text-white">
                                                {((listings.current_page - 1) * 12 || 0) + 1}
                                            </span> to <span className="font-semibold text-gray-900 dark:text-white">
                                                {Math.min(listings.current_page * 12 || 0, listings.total)}
                                            </span> of <span className="font-semibold text-gray-900 dark:text-white">
                                                {listings.total}
                                            </span> listings
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap justify-center">
                                            {listings.links.map((link, index) => (
                                                <Button
                                                    key={index}
                                                    variant={link.active ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => {
                                                        if (link.url) {
                                                            const url = new URL(link.url)
                                                            const params = new URLSearchParams(url.search)
                                                            router.get('/admin/livestock/listings', Object.fromEntries(params), {
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
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardContent className="p-16 text-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <Tag className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">No listings found</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {searchQuery || selectedStatus !== 'all' 
                                            ? 'Try adjusting your search or filter criteria.'
                                            : "No buyer-listed livestock found yet"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    )
}


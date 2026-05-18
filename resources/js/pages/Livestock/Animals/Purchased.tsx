"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Link, router, Head } from "@inertiajs/react"
import { useState, useMemo, useRef } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { 
    Eye, 
    Search,
    Filter,
    Heart,
    Tag,
    CheckCircle,
    XCircle,
    AlertCircle,
    TrendingUp,
    Package,
    Calendar,
    MapPin,
    User
} from "lucide-react"
import { debounce } from "lodash"

interface Animal {
    id: number
    species: string
    breed: string
    sex: string
    ear_tag: string | null
    age_months: number | null
    status: string
    primary_photo?: { url: string } | null
    listing?: { id: number; status: string } | null
    seller?: { id: number; name: string; farm_name?: string } | null
    fractional_listing?: { 
        id: number
        tag_number: string
        status: string
        country_code: string
    } | null
    fractional_offering?: {
        id: number
        title: string
        price_per_share: number
        token_price: number | null
        tokens_per_share: number
        available_shares: number
        status: string
    }
    fractional_progress?: {
        sold_tokens: number
        total_tokens: number
        remaining_tokens: number
        percentage: number
    }
    has_fractional_offering?: number
}

interface PurchasedAnimalsProps {
    animals: {
        data: Animal[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
    }
    filters: {
        search?: string
        status?: string
    }
}

export default function PurchasedAnimals({ animals, filters }: PurchasedAnimalsProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '')
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all')
    const [unlistDialogOpen, setUnlistDialogOpen] = useState(false)
    const [animalToUnlist, setAnimalToUnlist] = useState<Animal | null>(null)
    const [isUnlisting, setIsUnlisting] = useState(false)

    const debouncedSearch = useRef(
        debounce((value: string) => {
            router.get('/animals/purchased', 
                { search: value || undefined, status: selectedStatus !== 'all' ? selectedStatus : undefined },
                { preserveState: true, replace: true }
            )
        }, 500)
    ).current

    const handleSearchChange = (value: string) => {
        setSearchQuery(value)
        debouncedSearch(value)
    }

    const handleStatusChange = (value: string) => {
        setSelectedStatus(value)
        router.get('/animals/purchased', 
            { search: searchQuery || undefined, status: value !== 'all' ? value : undefined },
            { preserveState: true, replace: true }
        )
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'available':
                return { label: 'Available', color: 'bg-green-500 hover:bg-green-600', icon: CheckCircle, bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-200 dark:border-green-800', variant: 'default' as const }
            case 'sold':
                return { label: 'Purchased', color: 'bg-blue-500 hover:bg-blue-600', icon: Package, bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-200 dark:border-blue-800', variant: 'default' as const }
            case 'off_farm':
                return { label: 'Off Farm', color: 'bg-gray-500 hover:bg-gray-600', icon: MapPin, bgColor: 'bg-gray-50 dark:bg-gray-900/20', borderColor: 'border-gray-200 dark:border-gray-800', variant: 'outline' as const }
            case 'deceased':
                return { label: 'Deceased', color: 'bg-red-500 hover:bg-red-600', icon: XCircle, bgColor: 'bg-red-50 dark:bg-red-900/20', borderColor: 'border-red-200 dark:border-red-800', variant: 'destructive' as const }
            default:
                return { label: status, color: 'bg-gray-500 hover:bg-gray-600', icon: AlertCircle, bgColor: 'bg-gray-50 dark:bg-gray-900/20', borderColor: 'border-gray-200 dark:border-gray-800', variant: 'outline' as const }
        }
    }

    return (
        <LivestockDashboardLayout>
            <Head title="Purchased Animals - Livestock Management" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Purchased Animals</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            View all animals you have purchased
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Purchased</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{animals.total}</p>
                                </div>
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                    <Package className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-green-200 dark:border-green-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        {animals.data.filter(a => a.status === 'available').length}
                                    </p>
                                </div>
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-blue-200 dark:border-blue-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Purchased</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        {animals.data.filter(a => a.status === 'sold').length}
                                    </p>
                                </div>
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-orange-200 dark:border-orange-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Listed</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        {animals.data.filter(a => a.listing).length}
                                    </p>
                                </div>
                                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                                    <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
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
                            placeholder="Search by breed, ear tag, or color..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-600"
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select value={selectedStatus} onValueChange={handleStatusChange}>
                            <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-600">
                                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="available">Available</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                                <SelectItem value="off_farm">Off Farm</SelectItem>
                                <SelectItem value="deceased">Deceased</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Animals Grid */}
                {animals.data.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {animals.data.map((animal) => {
                                // Check if fractional listing has sold tokens
                                const hasSoldTokens = animal.fractional_progress && animal.fractional_progress.sold_tokens > 0
                                const isFullySold = animal.fractional_progress && 
                                                    animal.fractional_progress.sold_tokens > 0 && 
                                                    animal.fractional_progress.sold_tokens >= animal.fractional_progress.total_tokens
                                
                                // If fractional listing is fully sold, show "Sold" status
                                const finalStatus = isFullySold ? 'sold' : animal.status
                                const statusConfig = getStatusConfig(finalStatus)
                                const StatusIcon = statusConfig.icon
                                const isListed = animal.listing?.status === 'active'
                                const isFractionalListed = animal.fractional_listing?.status === 'active' || animal.fractional_listing?.status === 'pending'
                                const hasFractionalOffering = (animal.has_fractional_offering ?? 0) > 0
                                
                                // Hide unlist button if any tokens are sold
                                const canUnlist = isFractionalListed && !hasSoldTokens

                                return (
                                    <Card 
                                        key={animal.id} 
                                        className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-all overflow-hidden group p-0"
                                    >
                                        {/* Full Width Image at Top - No Padding, Flush with Card */}
                                        <div className="relative w-full aspect-[3/2] bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                            {animal.primary_photo ? (
                                                <img
                                                    src={animal.primary_photo.url}
                                                    alt={animal.breed}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800">
                                                    <Heart className="h-16 w-16 text-gray-400 dark:text-gray-600" />
                                                </div>
                                            )}
                                            
                                            {/* Status Badge - Show "Sold" if fractional listing is fully sold */}
                                            <div className="absolute top-2 right-2 z-10">
                                                <Badge 
                                                    className={`${
                                                        finalStatus === 'available' 
                                                            ? 'bg-green-500 hover:bg-green-600 text-white border-0' 
                                                            : finalStatus === 'sold' && isFullySold
                                                            ? 'bg-red-500 hover:bg-red-600 text-white border-0'
                                                            : finalStatus === 'sold' && !isFullySold
                                                            ? 'bg-blue-500 hover:bg-blue-600 text-white border-0'
                                                            : `${statusConfig.bgColor} ${statusConfig.borderColor} ${statusConfig.color} border-2`
                                                    } flex items-center gap-1 px-2 py-0.5 text-xs shadow-lg`}
                                                    variant={finalStatus === 'available' || finalStatus === 'sold' ? 'default' : statusConfig.variant}
                                                >
                                                    {finalStatus === 'available' ? (
                                                        <>
                                                            <CheckCircle className="h-3 w-3" />
                                                            <span className="font-semibold">Available</span>
                                                        </>
                                                    ) : finalStatus === 'sold' && isFullySold ? (
                                                        <>
                                                            <XCircle className="h-3 w-3" />
                                                            <span className="font-semibold">Sold</span>
                                                        </>
                                                    ) : finalStatus === 'sold' && !isFullySold ? (
                                                        <>
                                                            <Package className="h-3 w-3" />
                                                            <span className="font-semibold">Purchased</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <StatusIcon className="h-3 w-3" />
                                                            <span className="font-semibold">{statusConfig.label}</span>
                                                        </>
                                                    )}
                                                </Badge>
                                            </div>
                                            
                                            {/* Listed Badges */}
                                            {(isListed || isFractionalListed || hasFractionalOffering) && (
                                                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                                    {isListed && (
                                                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 flex items-center gap-1 px-2 py-0.5 text-xs shadow-lg">
                                                            <Tag className="h-3 w-3" />
                                                            <span className="font-semibold">Listed</span>
                                                        </Badge>
                                                    )}
                                                    {isFractionalListed && (
                                                        <Badge className={`${
                                                            animal.fractional_listing?.status === 'pending' 
                                                                ? 'bg-yellow-500 hover:bg-yellow-600' 
                                                                : 'bg-purple-500 hover:bg-purple-600'
                                                        } text-white border-0 flex items-center gap-1 px-2 py-0.5 text-xs shadow-lg`}>
                                                            <Tag className="h-3 w-3" />
                                                            <span className="font-semibold">
                                                                {animal.fractional_listing?.status === 'pending' ? 'Pending' : 'Fractional'}
                                                            </span>
                                                        </Badge>
                                                    )}
                                                    {hasFractionalOffering && !isFractionalListed && (
                                                        <Badge className="bg-purple-500 hover:bg-purple-600 text-white border-0 flex items-center gap-1 px-2 py-0.5 text-xs shadow-lg">
                                                            <Tag className="h-3 w-3" />
                                                            <span className="font-semibold">Fractional</span>
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Content Section */}
                                        <CardContent className="p-4">
                                            {/* Title */}
                                            <div className="mb-3">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                                                    {animal.breed}
                                                </h3>
                                                
                                                {/* Info Grid */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="p-1 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                                <Tag className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                                            </div>
                                                            <span className="text-gray-700 dark:text-gray-300 capitalize font-medium">{animal.species}</span>
                                                        </div>
                                                        <span className="text-gray-400 dark:text-gray-500">•</span>
                                                        <span className="text-gray-700 dark:text-gray-300 capitalize font-medium">{animal.sex}</span>
                                                    </div>
                                                    
                                                    {animal.ear_tag && (
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <div className="p-1 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                                <Tag className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                                            </div>
                                                            <span className="text-gray-700 dark:text-gray-300 font-medium">Ear Tag:</span>
                                                            <span className="text-gray-900 dark:text-white font-bold">{animal.ear_tag}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {animal.age_months && (
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <div className="p-1 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                                <Calendar className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                                            </div>
                                                            <span className="text-gray-700 dark:text-gray-300 font-medium">Age:</span>
                                                            <span className="text-gray-900 dark:text-white font-bold">{animal.age_months} months</span>
                                                        </div>
                                                    )}

                                                    {animal.seller && (
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <div className="p-1 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                                <User className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                                            </div>
                                                            <span className="text-gray-700 dark:text-gray-300 font-medium">From:</span>
                                                            <span className="text-gray-900 dark:text-white font-bold">{animal.seller.farm_name || animal.seller.name || 'N/A'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Fractional Ownership Progress */}
                                            {animal.fractional_listing && animal.fractional_progress && animal.fractional_offering && (
                                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                                                Fractional Ownership
                                                            </span>
                                                            {animal.fractional_listing.tag_number && (
                                                                <Badge variant="outline" className="text-xs border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                                                                    Tag: {animal.fractional_listing.tag_number}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        
                                                        {animal.fractional_offering.title && (
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                                {animal.fractional_offering.title}
                                                            </p>
                                                        )}
                                                        
                                                        {/* Progress Bar */}
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                                                                <span className="font-semibold text-purple-600 dark:text-purple-400">
                                                                    {animal.fractional_progress.percentage.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                                                                    style={{ width: `${Math.min(animal.fractional_progress.percentage, 100)}%` }}
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                                <span>
                                                                    {animal.fractional_progress.sold_tokens} / {animal.fractional_progress.total_tokens} tokens
                                                                </span>
                                                                <span>
                                                                    {animal.fractional_progress.remaining_tokens} remaining
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Action Buttons */}
                                            <div className="pt-2 flex gap-2">
                                                <Link href={`/animals/${animal.id}`} className="flex-1">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="w-full border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                                                        View
                                                    </Button>
                                                </Link>
                                                {canUnlist ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setAnimalToUnlist(animal)
                                                            setUnlistDialogOpen(true)
                                                        }}
                                                        className="flex-1 border-red-200 dark:border-red-800 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                    >
                                                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                                        Unlist
                                                    </Button>
                                                ) : isFractionalListed ? null : (
                                                    <Link href={`/fractional-listings/create/${animal.id}`} className="flex-1">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="w-full border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                                                        >
                                                            <Tag className="h-3.5 w-3.5 mr-1.5" />
                                                            List
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>

                        {/* Pagination */}
                        {animals.last_page > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                                {animals.links.map((link, index) => {
                                    if (link.url === null) {
                                        return (
                                            <span
                                                key={index}
                                                className="px-3 py-2 text-sm text-gray-400 dark:text-gray-600"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        )
                                    }

                                    return (
                                        <Link
                                            key={index}
                                            href={link.url || '#'}
                                            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                                                link.active
                                                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium'
                                                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-600'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    )
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg">
                        <CardContent className="p-12">
                            <div className="text-center">
                                <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit mx-auto mb-4">
                                    <Package className="h-12 w-12 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Purchased Animals</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    You haven't purchased any animals yet. Browse the marketplace to find animals to purchase.
                                </p>
                                <Link href="/marketplace">
                                    <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
                                        <TrendingUp className="h-4 w-4 mr-2" />
                                        Browse Marketplace
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Unlist Confirmation Dialog */}
                <Dialog open={unlistDialogOpen} onOpenChange={(open) => {
                    if (!open) {
                        setUnlistDialogOpen(false)
                        setAnimalToUnlist(null)
                    }
                }}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                Unlist Animal
                            </DialogTitle>
                            <DialogDescription>
                                Are you sure you want to unlist this animal from fractional ownership?
                            </DialogDescription>
                        </DialogHeader>
                        {animalToUnlist && (
                            <div className="space-y-4 py-4">
                                <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4">
                                    <div className="flex items-center gap-3">
                                        {animalToUnlist.primary_photo ? (
                                            <img
                                                src={animalToUnlist.primary_photo.url}
                                                alt={animalToUnlist.breed}
                                                className="w-16 h-16 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                                                <Heart className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                                                {animalToUnlist.breed}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                                {animalToUnlist.species} • {animalToUnlist.sex}
                                            </p>
                                            {animalToUnlist.ear_tag && (
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                    Tag: {animalToUnlist.ear_tag}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Note</p>
                                    <p className="text-xs text-amber-700 dark:text-amber-400">
                                        You can relist this animal for fractional ownership anytime. The animal will remain in your inventory.
                                    </p>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setUnlistDialogOpen(false)
                                    setAnimalToUnlist(null)
                                }}
                                disabled={isUnlisting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (!animalToUnlist?.fractional_listing?.id) return
                                    
                                    setIsUnlisting(true)
                                    router.delete(`/fractional-listings/${animalToUnlist.fractional_listing.id}`, {
                                        onSuccess: () => {
                                            setUnlistDialogOpen(false)
                                            setAnimalToUnlist(null)
                                            setIsUnlisting(false)
                                        },
                                        onError: () => {
                                            setIsUnlisting(false)
                                        },
                                        onFinish: () => {
                                            setIsUnlisting(false)
                                        }
                                    })
                                }}
                                disabled={isUnlisting || !animalToUnlist?.fractional_listing?.id}
                            >
                                {isUnlisting ? "Unlisting..." : "Unlist Animal"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </LivestockDashboardLayout>
    )
}


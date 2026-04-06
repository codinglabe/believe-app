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
    Package,
    MapPin,
    User,
    Plus,
    Trash2
} from "lucide-react"

interface Animal {
    id: number
    species: string
    breed: string
    sex: string
    ear_tag: string | null
    age_months: number | null
    status: string
    livestock_user_id: number
    current_owner_livestock_user_id: number
    primary_photo?: { url: string } | null
    listing?: { id: number; status: string } | null
    seller?: { id: number; name: string; farm_name?: string } | null
    has_fractional_offering?: number
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
}

interface BuyerAnimalsProps {
    animals: {
        data: Animal[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
        per_page: number
    }
    stats: {
        total: number
        available: number
        sold: number
        off_farm: number
        deceased: number
    }
    filters: {
        search?: string
        status?: string
    }
}

export default function BuyerAnimals({ animals, stats, filters }: BuyerAnimalsProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '')
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all')
    const [unlistDialogOpen, setUnlistDialogOpen] = useState(false)
    const [animalToUnlist, setAnimalToUnlist] = useState<Animal | null>(null)
    const [isUnlisting, setIsUnlisting] = useState(false)

    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

    const handleSearchChange = (value: string) => {
        setSearchQuery(value)
        
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }
        
        debounceTimerRef.current = setTimeout(() => {
            const params: Record<string, string> = {}
            if (value.trim()) params.search = value.trim()
            if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus
            
            router.get('/buyer/animals', params, {
                preserveState: true,
                replace: true
            })
        }, 300)
    }

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status)
        
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }
        
        debounceTimerRef.current = setTimeout(() => {
            const params: Record<string, string> = {}
            if (searchQuery.trim()) params.search = searchQuery.trim()
            if (status && status !== 'all') params.status = status
            
            router.get('/buyer/animals', params, {
                preserveState: true,
                replace: true
            })
        }, 300)
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'available':
                return {
                    icon: CheckCircle,
                    variant: 'default' as const,
                    color: 'text-green-600 dark:text-green-400',
                    bgColor: 'bg-green-50 dark:bg-green-900/20',
                    borderColor: 'border-green-200 dark:border-green-800',
                    label: 'Available'
                }
            case 'sold':
                return {
                    icon: Package,
                    variant: 'secondary' as const,
                    color: 'text-blue-600 dark:text-blue-400',
                    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                    borderColor: 'border-blue-200 dark:border-blue-800',
                    label: 'Sold'
                }
            case 'off_farm':
                return {
                    icon: MapPin,
                    variant: 'outline' as const,
                    color: 'text-yellow-600 dark:text-yellow-400',
                    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
                    borderColor: 'border-yellow-200 dark:border-yellow-800',
                    label: 'Off Farm'
                }
            case 'deceased':
                return {
                    icon: XCircle,
                    variant: 'destructive' as const,
                    color: 'text-red-600 dark:text-red-400',
                    bgColor: 'bg-red-50 dark:bg-red-900/20',
                    borderColor: 'border-red-200 dark:border-red-800',
                    label: 'Deceased'
                }
            default:
                return {
                    icon: AlertCircle,
                    variant: 'secondary' as const,
                    color: 'text-gray-600 dark:text-gray-400',
                    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
                    borderColor: 'border-gray-200 dark:border-gray-800',
                    label: status
                }
        }
    }

    return (
        <LivestockDashboardLayout>
            <Head title="Livestock - Buyer Dashboard" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Livestock</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            View all your animals
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative flex-1 md:max-w-xs">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search animals..."
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500"
                            />
                        </div>
                        {/* Filter */}
                        <Select value={selectedStatus} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="available">Available</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                                <SelectItem value="off_farm">Off Farm</SelectItem>
                                <SelectItem value="deceased">Deceased</SelectItem>
                            </SelectContent>
                        </Select>
                        {/* Add Button */}
                        <Link href="/animals/create">
                            <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Animal
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Animals</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                                </div>
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                    <Heart className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-green-200 dark:border-green-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.available}</p>
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
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sold</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.sold}</p>
                                </div>
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-yellow-200 dark:border-yellow-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Off Farm</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.off_farm}</p>
                                </div>
                                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                                    <MapPin className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-red-200 dark:border-red-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Deceased</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.deceased}</p>
                                </div>
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Animals Grid */}
                {animals.data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {animals.data.map((animal, index) => {
                            // Check if this is a purchased animal (not originally owned by buyer)
                            const isPurchased = animal.livestock_user_id !== animal.current_owner_livestock_user_id
                            
                            // For purchased animals, don't show "Sold" status - show as "Available" instead
                            const displayStatus = (isPurchased && animal.status === 'sold') ? 'available' : animal.status
                            
                            // Check if fractional listing has sold tokens
                            const hasSoldTokens = animal.fractional_progress && animal.fractional_progress.sold_tokens > 0
                            const isFullySold = animal.fractional_progress && 
                                                animal.fractional_progress.sold_tokens > 0 && 
                                                animal.fractional_progress.sold_tokens >= animal.fractional_progress.total_tokens
                            
                            // If fractional listing is fully sold, show "Sold" status
                            const finalDisplayStatus = isFullySold ? 'sold' : displayStatus
                            const statusConfig = getStatusConfig(finalDisplayStatus)
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
                                    {/* Full Width Image at Top */}
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
                                        
                                        {/* Card Number Badge - Bottom Left */}
                                        <div className="absolute bottom-2 left-2 z-10">
                                            <Badge className="bg-black/70 hover:bg-black/90 text-white border-0 flex items-center gap-1 px-2 py-1 text-xs font-semibold shadow-lg backdrop-blur-sm">
                                                <span>#{((animals.current_page - 1) * (animals.per_page || animals.data.length || 12)) + index + 1}</span>
                                                <span className="text-[10px] opacity-80">/ {animals.total}</span>
                                            </Badge>
                                        </div>
                                        
                                        {/* Status Badge - Show "Sold" if fractional listing is fully sold */}
                                        {finalDisplayStatus !== 'sold' || isFullySold ? (
                                            <div className="absolute top-2 right-2 z-10">
                                                <Badge 
                                                    className={`${
                                                        finalDisplayStatus === 'available' 
                                                            ? 'bg-green-500 hover:bg-green-600 text-white border-0' 
                                                            : finalDisplayStatus === 'sold' && isFullySold
                                                            ? 'bg-red-500 hover:bg-red-600 text-white border-0'
                                                            : `${statusConfig.bgColor} ${statusConfig.borderColor} ${statusConfig.color} border-2`
                                                    } flex items-center gap-1 px-2 py-0.5 text-xs shadow-lg`}
                                                    variant={finalDisplayStatus === 'available' || (finalDisplayStatus === 'sold' && isFullySold) ? 'default' : statusConfig.variant}
                                                >
                                                    {finalDisplayStatus === 'available' ? (
                                                        <>
                                                            <CheckCircle className="h-3 w-3" />
                                                            <span className="font-semibold">Available</span>
                                                        </>
                                                    ) : finalDisplayStatus === 'sold' && isFullySold ? (
                                                        <>
                                                            <XCircle className="h-3 w-3" />
                                                            <span className="font-semibold">Sold</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <StatusIcon className="h-3 w-3" />
                                                            <span className="font-semibold">{statusConfig.label}</span>
                                                        </>
                                                    )}
                                                </Badge>
                                            </div>
                                        ) : null}
                                        
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
                                    
                                    {/* Content */}
                                    <CardContent className="p-3 space-y-2">
                                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">
                                            {animal.species} - {animal.breed}
                                        </h3>
                                        
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <Tag className="h-3.5 w-3.5" />
                                            <span>Ear Tag: {animal.ear_tag || 'N/A'}</span>
                                        </div>
                                        
                                        {animal.seller && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <User className="h-3.5 w-3.5" />
                                                <span>From: {animal.seller.farm_name || animal.seller.name || 'N/A'}</span>
                                            </div>
                                        )}
                                        
                                        {/* Fractional Listing Info */}
                                        {animal.fractional_listing && (
                                            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Tag className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                                                        Tag ID: {animal.fractional_listing.tag_number}
                                                    </span>
                                                </div>
                                                
                                                {animal.fractional_offering && (
                                                    <div className="space-y-1.5">
                                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                                            <span className="font-medium">Offering:</span> {animal.fractional_offering.title}
                                                        </div>
                                                        
                                                        {animal.fractional_progress && animal.fractional_progress.total_tokens > 0 && (
                                                            <div className="space-y-1 pt-1">
                                                                <div className="flex items-center justify-between text-[10px] font-medium text-gray-700 dark:text-gray-300">
                                                                    <span>Sales Progress</span>
                                                                    <span className="font-semibold">{animal.fractional_progress.percentage.toFixed(1)}%</span>
                                                                </div>
                                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                                    <div
                                                                        className="bg-gradient-to-r from-purple-600 to-purple-700 h-1.5 rounded-full transition-all"
                                                                        style={{ width: `${Math.min(animal.fractional_progress.percentage, 100)}%` }}
                                                                    />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                                    <div>
                                                                        <span className="text-gray-600 dark:text-gray-400">Sold:</span>
                                                                        <span className="font-semibold text-green-600 dark:text-green-400 ml-1">
                                                                            {animal.fractional_progress.sold_tokens} tokens
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                                                                        <span className="font-semibold text-purple-600 dark:text-purple-400 ml-1">
                                                                            {animal.fractional_progress.remaining_tokens} tokens
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
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
                ) : (
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg">
                        <CardContent className="p-16 text-center">
                            <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit mx-auto mb-6">
                                <Heart className="h-16 w-16 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                                No animals found
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                                {searchQuery || selectedStatus !== 'all' 
                                    ? 'Try adjusting your search or filter criteria.'
                                    : "You don't have any animals yet. Purchase animals from the marketplace to get started."}
                            </p>
                            {!searchQuery && selectedStatus === 'all' && (
                                <Link href="/marketplace">
                                    <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30">
                                        Browse Marketplace
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {animals.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        {animals.links.map((link, index) => (
                            <Button
                                key={index}
                                variant={link.active ? "default" : "outline"}
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                className={link.active ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30" : "border-gray-200 dark:border-gray-700"}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
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


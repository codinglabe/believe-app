"use client"

import AppLayout from "@/layouts/app-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { router, Head } from "@inertiajs/react"
import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Package, Search, Filter, Eye, DollarSign } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface Animal {
    id: number
    breed: string
    primary_photo?: { url: string } | null
}

interface Listing {
    id: number
    title: string
    price: number
    currency: string
    status: string
    animal: Animal
}

interface Seller {
    id: number
    farm_name: string
    user: {
        id: number
        name: string
        email: string
    }
}

interface SellerListingsProps {
    seller: Seller
    listings: {
        data: Listing[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
        per_page: number
    }
    breedsList: string[]
    filters: {
        search?: string
        breed?: string
        per_page?: number
        page?: number
    }
}

export default function SellerListings({ seller, listings, breedsList, filters }: SellerListingsProps) {
    const [search, setSearch] = useState(filters.search || '')
    const [selectedBreed, setSelectedBreed] = useState(filters.breed || '')
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Admin", href: "/dashboard" },
        { title: "Livestock Management", href: "/admin/livestock" },
        { title: "Sellers", href: "/admin/livestock/sellers" },
        { title: seller.farm_name, href: `/admin/livestock/sellers/${seller.id}` },
        { title: "Listings", href: `/admin/livestock/sellers/${seller.id}/listings` },
    ]

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [])

    const handleSearchChange = (value: string) => {
        setSearch(value)
        
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        searchTimeoutRef.current = setTimeout(() => {
            const params: Record<string, string> = {}
            if (value) params.search = value
            if (selectedBreed) params.breed = selectedBreed
            
            router.get(`/admin/livestock/sellers/${seller.id}/listings`, params, {
                preserveState: true,
                replace: true
            })
        }, 500)
    }

    const handleBreedChange = (breed: string) => {
        setSelectedBreed(breed)
        const params: Record<string, string> = {}
        if (search) params.search = search
        if (breed) params.breed = breed
        
        router.get(`/admin/livestock/sellers/${seller.id}/listings`, params, {
            preserveState: true,
            replace: true
        })
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'active':
                return {
                    variant: 'default' as const,
                    badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800',
                    label: 'Active'
                }
            case 'sold':
                return {
                    variant: 'secondary' as const,
                    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                    label: 'Sold'
                }
            case 'removed':
                return {
                    variant: 'destructive' as const,
                    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800',
                    label: 'Removed'
                }
            default:
                return {
                    variant: 'outline' as const,
                    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300 border-gray-200 dark:border-gray-800',
                    label: status
                }
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${seller.farm_name} - Listings`} />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.visit('/admin/livestock/sellers')}
                            className="shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Sellers
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <Package className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                {seller.farm_name} - Listings
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                                All listings for {seller.user.name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Total: <span className="font-semibold text-gray-900 dark:text-white">{listings.total}</span>
                        </span>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by title, description, breed, or ear tag..."
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="w-full sm:w-48">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select value={selectedBreed || "all"} onValueChange={(value) => handleBreedChange(value === "all" ? "" : value)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All Breeds" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Breeds</SelectItem>
                                    {breedsList.map((breed) => (
                                        <SelectItem key={breed} value={breed}>
                                            {breed}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Listings Grid */}
                {listings.data.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {listings.data.map((listing) => {
                                const statusConfig = getStatusConfig(listing.status)

                                return (
                                    <div
                                        key={listing.id}
                                        className="group bg-card border border-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                                    >
                                        {/* Image with Gradient Overlay */}
                                        <div className="relative overflow-hidden">
                                            {listing.animal.primary_photo ? (
                                                <>
                                                    <img
                                                        src={listing.animal.primary_photo.url}
                                                        alt={listing.title}
                                                        className="w-full h-40 object-cover transform group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                </>
                                            ) : (
                                                <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                    <Package className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                                                </div>
                                            )}

                                            {/* Status Badge */}
                                            <div className="absolute top-4 right-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-sm bg-card/90 border ${statusConfig.badgeClass} shadow-lg`}
                                                >
                                                    {statusConfig.label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-3">
                                            {/* Title */}
                                            <h3 className="font-semibold text-sm line-clamp-2 mb-3 leading-tight group-hover:text-primary transition-colors text-gray-900 dark:text-white">
                                                {listing.title}
                                            </h3>

                                            {/* Breed Info */}
                                            <div className="mb-3 p-2 bg-muted rounded-lg border border-border">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="font-medium text-muted-foreground">Breed:</span>
                                                    <span className="text-foreground">{listing.animal.breed}</span>
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div className="flex items-center gap-2 mb-3 p-2 bg-primary/10 rounded-lg border border-primary/20">
                                                <DollarSign className="h-4 w-4 text-primary flex-shrink-0" />
                                                <span className="text-base font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                                    {listing.currency || '$'}{listing.price.toLocaleString()}
                                                </span>
                                            </div>

                                            {/* Footer */}
                                            <div className="pt-2 border-t border-border">
                                                {/* Action Button */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.visit(`/admin/livestock/listings/${listing.id}`)}
                                                    className="w-full h-7 text-xs border-border hover:bg-accent"
                                                >
                                                    <Eye className="w-3 h-3 mr-1.5" />
                                                    View
                                                </Button>
                                            </div>
                                        </div>
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
                                                {((listings.current_page - 1) * listings.per_page || 0) + 1}
                                            </span> to <span className="font-semibold text-gray-900 dark:text-white">
                                                {Math.min(listings.current_page * listings.per_page || 0, listings.total)}
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
                                                            router.get(`/admin/livestock/sellers/${seller.id}/listings`, Object.fromEntries(params), {
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
                                    <Package className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">No listings found</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {search || selectedBreed 
                                            ? "No listings match your search criteria" 
                                            : "This seller hasn't created any listings yet"}
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


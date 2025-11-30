"use client"

import LivestockLayout from "@/layouts/livestock/LivestockLayout"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Link, router, Head, usePage } from "@inertiajs/react"
import { useState, useCallback } from "react"
import debounce from "lodash.debounce"
import { route } from "ziggy-js"
import { 
    Search, 
    Filter, 
    Heart,
    MapPin,
    Calendar,
    DollarSign,
    ArrowRight,
    Tag,
    Eye,
    CheckCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface Animal {
    id: number
    species: string
    breed: string
    sex: string
    ear_tag: string | null
    age_months: number | null
    weight_kg: number | null
    color_markings: string | null
    location: string | null
    health_status: string
    current_market_value: number | null
    primary_photo?: {
        url: string
    } | null
    seller: {
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
    animal: Animal
}

interface Paginated<T> {
    data: T[]
    links: { url: string | null; label: string; active: boolean }[]
    current_page: number
    last_page: number
    from: number | null
    to: number | null
    total: number
}

interface MarketplaceIndexProps {
    listings: Paginated<Listing>
    speciesList: string[]
    breedsList: string[]
    locationsList: string[]
    filters: {
        search?: string
        species?: string
        breed?: string
        min_price?: string
        max_price?: string
        location?: string
    }
}

const speciesColors: Record<string, string> = {
    goat: 'bg-amber-500 text-white',
    sheep: 'bg-orange-500 text-white',
    cow: 'bg-brown-500 text-white',
    chicken: 'bg-yellow-500 text-white',
    pig: 'bg-pink-500 text-white',
}

export default function MarketplaceIndex({ listings, speciesList, breedsList, locationsList, filters }: MarketplaceIndexProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '')
    const [selectedSpecies, setSelectedSpecies] = useState(filters.species || '')
    const [selectedBreed, setSelectedBreed] = useState(filters.breed || '')
    const [minPrice, setMinPrice] = useState(filters.min_price || '')
    const [maxPrice, setMaxPrice] = useState(filters.max_price || '')
    const [location, setLocation] = useState(filters.location || '')
    const [showFilters, setShowFilters] = useState(false)

    const handleSearchChange = (value: string) => {
        setSearchQuery(value)
        debouncedFilter(value, selectedSpecies, selectedBreed, minPrice, maxPrice, location)
    }

    const debouncedFilter = useCallback(
        debounce((search: string, species: string, breed: string, min: string, max: string, loc: string) => {
            const params: Record<string, string> = {}
            if (search.trim()) params.search = search.trim()
            if (species) params.species = species
            if (breed) params.breed = breed
            if (min) params.min_price = min
            if (max) params.max_price = max
            if (loc) params.location = loc
            
            router.get(route('marketplace.index'), params, {
                preserveState: true,
                replace: true
            })
        }, 300),
        []
    )

    const clearFilters = () => {
        setSearchQuery('')
        setSelectedSpecies('')
        setSelectedBreed('')
        setMinPrice('')
        setMaxPrice('')
        setLocation('')
        router.get(route('marketplace.index'), {}, {
            preserveState: true,
            replace: true
        })
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { 
            y: 0, 
            opacity: 1,
            transition: {
                duration: 0.5
            }
        }
    }

    return (
        <LivestockLayout>
            <Head title="Livestock Marketplace - Buy Quality Animals" />
            
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                {/* Hero Section */}
                <section className="bg-gradient-to-br from-amber-600 via-orange-600 to-amber-600 text-white py-12 sm:py-16 md:py-20">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="text-center max-w-4xl mx-auto"
                        >
                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-white flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                                <Heart className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 text-amber-300" />
                                <span>Livestock Marketplace</span>
                            </h1>
                            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 opacity-90 text-white px-4 sm:px-0">
                                Buy quality livestock with full ownership. Browse goats, sheep, cattle, and more from verified sellers.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-3xl mx-auto px-4 sm:px-0">
                                <div className="text-center">
                                    <div className="text-2xl sm:text-3xl font-bold mb-2 text-white">{listings.total || 0}+</div>
                                    <div className="opacity-90 text-amber-100 text-sm sm:text-base">Available Animals</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl sm:text-3xl font-bold mb-2 text-white">100%</div>
                                    <div className="opacity-90 text-amber-100 text-sm sm:text-base">Full Ownership</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl sm:text-3xl font-bold mb-2 text-white">Verified</div>
                                    <div className="opacity-90 text-amber-100 text-sm sm:text-base">Sellers Only</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Search and Filters */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-8"
                    >
                        {/* Header with Search and Filter */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Available Listings</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Browse {listings.total || 0} available animals
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Search */}
                                <div className="relative flex-1 md:max-w-xs">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder="Search listings..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500"
                                    />
                                </div>
                                {/* Filter Button */}
                                <Button
                                    variant="outline"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                >
                                    <Filter className="h-4 w-4" />
                                    Filters
                                </Button>
                            </div>
                        </div>

                        {/* Filters Panel */}
                        {showFilters && (
                            <Card className="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800/50 shadow-lg mb-4">
                                <CardContent className="p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Species</label>
                                            <select
                                                value={selectedSpecies}
                                                onChange={(e) => {
                                                    setSelectedSpecies(e.target.value)
                                                    debouncedFilter(searchQuery, e.target.value, selectedBreed, minPrice, maxPrice, location)
                                                }}
                                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-amber-500 dark:focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                            >
                                                <option value="">All Species</option>
                                                {speciesList.map((species) => (
                                                    <option key={species} value={species}>
                                                        {species.charAt(0).toUpperCase() + species.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Breed</label>
                                            <Input
                                                type="text"
                                                placeholder="Breed..."
                                                value={selectedBreed}
                                                onChange={(e) => {
                                                    setSelectedBreed(e.target.value)
                                                    debouncedFilter(searchQuery, selectedSpecies, e.target.value, minPrice, maxPrice, location)
                                                }}
                                                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Min Price</label>
                                            <Input
                                                type="number"
                                                placeholder="Min $"
                                                value={minPrice}
                                                onChange={(e) => {
                                                    setMinPrice(e.target.value)
                                                    debouncedFilter(searchQuery, selectedSpecies, selectedBreed, e.target.value, maxPrice, location)
                                                }}
                                                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Max Price</label>
                                            <Input
                                                type="number"
                                                placeholder="Max $"
                                                value={maxPrice}
                                                onChange={(e) => {
                                                    setMaxPrice(e.target.value)
                                                    debouncedFilter(searchQuery, selectedSpecies, selectedBreed, minPrice, e.target.value, location)
                                                }}
                                                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Location</label>
                                            <Input
                                                type="text"
                                                placeholder="Location..."
                                                value={location}
                                                onChange={(e) => {
                                                    setLocation(e.target.value)
                                                    debouncedFilter(searchQuery, selectedSpecies, selectedBreed, minPrice, maxPrice, e.target.value)
                                                }}
                                                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500"
                                            />
                                        </div>
                                    </div>

                                    {(searchQuery || selectedSpecies || selectedBreed || minPrice || maxPrice || location) && (
                                        <div className="mt-4 flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearFilters}
                                                className="text-sm"
                                            >
                                                Clear Filters
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </motion.div>

                    {/* Listings Grid */}
                    {listings.data.length > 0 ? (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                        >
                            {listings.data.map((listing) => (
                                <motion.div key={listing.id} variants={itemVariants}>
                                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-all overflow-hidden group p-0">
                                        {/* Full Width Image at Top - No Padding, Flush with Card */}
                                        <div className="relative w-full aspect-[4/3] bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                            {listing.animal.primary_photo ? (
                                                <img
                                                    src={listing.animal.primary_photo.url}
                                                    alt={listing.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800">
                                                    <Heart className="h-16 w-16 text-gray-400 dark:text-gray-600" />
                                                </div>
                                            )}
                                            
                                            {/* Species Badge */}
                                            <div className="absolute top-2 left-2 z-10">
                                                <Badge
                                                    className={cn(
                                                        "shadow-lg text-xs px-2 py-0.5",
                                                        speciesColors[listing.animal.species] || "bg-gray-500 text-white"
                                                    )}
                                                >
                                                    {listing.animal.species.charAt(0).toUpperCase() + listing.animal.species.slice(1)}
                                                </Badge>
                                            </div>
                                            
                                            {/* Price Badge */}
                                            <div className="absolute top-2 right-2 z-10">
                                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-lg text-xs px-2 py-0.5 flex items-center gap-1">
                                                    <DollarSign className="h-3 w-3" />
                                                    <span className="font-semibold">${listing.price.toLocaleString()}</span>
                                                </Badge>
                                            </div>
                                        </div>
                                        
                                        {/* Content Section */}
                                        <CardContent className="p-3">
                                            {/* Title */}
                                            <div className="mb-2">
                                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5 line-clamp-1">
                                                    {listing.title}
                                                </h3>
                                                
                                                {/* Info Grid */}
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="p-0.5 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                                <Tag className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                                                            </div>
                                                            <span className="text-gray-700 dark:text-gray-300 font-medium">{listing.animal.breed}</span>
                                                        </div>
                                                        <span className="text-gray-400 dark:text-gray-500">•</span>
                                                        <span className="text-gray-700 dark:text-gray-300 capitalize font-medium">{listing.animal.sex}</span>
                                                    </div>
                                                    
                                                    {listing.animal.age_months && (
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <div className="p-0.5 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                                <Calendar className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                                                            </div>
                                                            <span className="text-gray-700 dark:text-gray-300 font-medium">Age:</span>
                                                            <span className="text-gray-900 dark:text-white font-bold">{listing.animal.age_months} months</span>
                                                        </div>
                                                    )}
                                                    
                                                    {listing.animal.location && (
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <div className="p-0.5 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                                <MapPin className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                                                            </div>
                                                            <span className="text-gray-900 dark:text-white font-bold line-clamp-1">{listing.animal.location}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Price Display */}
                                            <div className="mb-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                                        ${listing.price.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Action Button */}
                                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <Link href={route('marketplace.show', listing.id)} className="block">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="w-full border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-300 dark:hover:border-amber-700 font-medium text-xs h-7"
                                                    >
                                                        <Eye className="h-3 w-3 mr-1" />
                                                        View
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg">
                            <CardContent className="p-16 text-center">
                                <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit mx-auto mb-6">
                                    <Heart className="h-16 w-16 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                                    No listings found
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Try adjusting your filters to see more results.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Pagination */}
                    {listings.last_page > 1 && (
                        <div className="mt-8 flex justify-center gap-2">
                            {listings.links.map((link, index) => (
                                <Button
                                    key={index}
                                    variant={link.active ? "default" : "outline"}
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </LivestockLayout>
    )
}


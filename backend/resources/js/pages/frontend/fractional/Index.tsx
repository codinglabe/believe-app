"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Badge } from "@/components/frontend/ui/badge"
import { Link, router, Head } from "@inertiajs/react"
import { useState, useEffect, useCallback } from "react"
import debounce from "lodash.debounce"
import { 
    Search, 
    Filter, 
    Coins, 
    PieChart, 
    TrendingUp, 
    DollarSign, 
    Building,
    Calendar,
    ArrowRight,
    Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface FractionalAsset {
    id: number
    name: string
    type: string
    symbol: string | null
}

interface FractionalOffering {
    id: number
    asset_id: number
    title: string
    summary: string | null
    total_shares: number
    available_shares: number
    price_per_share: number
    currency: string
    status: string
    created_at: string
    asset: FractionalAsset
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

interface FractionalIndexProps {
    offerings: Paginated<FractionalOffering>
    assetTypes: string[]
    filters: {
        search?: string
        asset_type?: string
    }
}

const assetTypeIcons: Record<string, any> = {
    gold: Coins,
    'real-estate': Building,
    art: Sparkles,
    cryptocurrency: TrendingUp,
}

const assetTypeColors: Record<string, string> = {
    gold: 'bg-yellow-500 text-white dark:bg-yellow-600 dark:text-white',
    'real-estate': 'bg-blue-500 text-white dark:bg-blue-600 dark:text-white',
    art: 'bg-purple-500 text-white dark:bg-purple-600 dark:text-white',
    cryptocurrency: 'bg-green-500 text-white dark:bg-green-600 dark:text-white',
}

export default function FractionalIndex({ offerings, assetTypes, filters }: FractionalIndexProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '')
    const [selectedAssetType, setSelectedAssetType] = useState(filters.asset_type || '')
    const [showFilters, setShowFilters] = useState(false)

    const handleSearchChange = (value: string) => {
        setSearchQuery(value)
        debouncedSearch(value, selectedAssetType)
    }

    const handleAssetTypeChange = (type: string) => {
        const newType = selectedAssetType === type ? '' : type
        setSelectedAssetType(newType)
        debouncedSearch(searchQuery, newType)
    }

    const debouncedSearch = useCallback(
        debounce((search: string, assetType: string) => {
            const params: Record<string, string> = {}
            if (search.trim()) {
                params.search = search.trim()
            }
            if (assetType) {
                params.asset_type = assetType
            }
            router.get(route('fractional.index'), params, {
                preserveState: true,
                replace: true
            })
        }, 300),
        []
    )

    const clearFilters = () => {
        setSearchQuery('')
        setSelectedAssetType('')
        router.get(route('fractional.index'), {}, {
            preserveState: true,
            replace: true
        })
    }

    const soldShares = (offering: FractionalOffering) => offering.total_shares - offering.available_shares
    const soldPercentage = (offering: FractionalOffering) => 
        Math.round((soldShares(offering) / offering.total_shares) * 100)

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
        <FrontendLayout>
            <Head title="Fractional Ownership - Invest in Premium Assets" />
            
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Hero Section */}
                <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white py-12 sm:py-16 md:py-20">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="text-center max-w-4xl mx-auto"
                        >
                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-white flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                                <PieChart className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 text-pink-300" />
                                <span>Fractional Ownership</span>
                            </h1>
                            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 opacity-90 text-white px-4 sm:px-0">
                                Invest in gold, real estate, art, and more through fractional ownership. 
                                Start with as little as $50 and build your portfolio.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-3xl mx-auto px-4 sm:px-0">
                                <div className="text-center">
                                    <div className="text-2xl sm:text-3xl font-bold mb-2 text-white">{offerings.total || 0}+</div>
                                    <div className="opacity-90 text-blue-100 text-sm sm:text-base">Available Offerings</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl sm:text-3xl font-bold mb-2 text-white">100%</div>
                                    <div className="opacity-90 text-blue-100 text-sm sm:text-base">Secure Investment</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl sm:text-3xl font-bold mb-2 text-white">$50+</div>
                                    <div className="opacity-90 text-blue-100 text-sm sm:text-base">Starting Price</div>
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
                    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder="Search offerings..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        className="pl-10 h-12"
                                    />
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {assetTypes.map((type) => {
                                        const Icon = assetTypeIcons[type] || Coins
                                        return (
                                            <Button
                                                key={type}
                                                variant={selectedAssetType === type ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => handleAssetTypeChange(type)}
                                                className="capitalize"
                                            >
                                                <Icon className="h-4 w-4 mr-2" />
                                                {type.replace('-', ' ')}
                                            </Button>
                                        )
                                    })}
                                    {(searchQuery || selectedAssetType) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearFilters}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            Clear Filters
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Offerings Grid */}
                {offerings.data.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                    >
                        <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            No offerings found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {searchQuery || selectedAssetType
                                ? "Try adjusting your search or filters"
                                : "Check back soon for new fractional ownership opportunities"}
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
                    >
                        {offerings.data.map((offering, index) => {
                            const sold = soldShares(offering)
                            const percentage = soldPercentage(offering)
                            const AssetIcon = assetTypeIcons[offering.asset.type] || Coins
                            const assetColor = assetTypeColors[offering.asset.type] || 'bg-gray-100 text-gray-800'

                            return (
                                <motion.div
                                    key={offering.id}
                                    variants={itemVariants}
                                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                                    className="group"
                                >
                                    <Card className="h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
                                        {/* Card Header with Gradient */}
                                        <div className="relative h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 overflow-hidden">
                                            <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                                                <Badge className={cn("px-3 py-1.5 font-semibold text-sm shadow-lg border-0", assetColor)}>
                                                    <AssetIcon className="h-4 w-4 mr-1.5" />
                                                    <span className="capitalize font-medium">{offering.asset.type.replace('-', ' ')}</span>
                                                </Badge>
                                                {offering.available_shares === 0 && (
                                                    <Badge className="bg-red-600 text-white px-3 py-1.5 font-semibold text-sm shadow-lg border-0">
                                                        Sold Out
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="absolute bottom-4 left-4 right-4">
                                                <h3 className="text-white font-bold text-lg line-clamp-1 drop-shadow-lg">
                                                    {offering.title}
                                                </h3>
                                            </div>
                                        </div>

                                        <CardContent className="p-6 space-y-4">
                                            {/* Asset Name */}
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <Building className="h-4 w-4" />
                                                <span className="truncate">{offering.asset.name}</span>
                                            </div>

                                            {/* Summary */}
                                            {offering.summary && (
                                                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                                    {offering.summary}
                                                </p>
                                            )}

                                            {/* Progress Bar */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-600 dark:text-gray-400">Shares Sold</span>
                                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {sold} / {offering.total_shares}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        transition={{ duration: 0.8, delay: index * 0.1 }}
                                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                    <TrendingUp className="h-3 w-3" />
                                                    <span>{percentage}% sold</span>
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div className="flex items-center justify-between pt-4 border-t">
                                                <div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Price per Share</p>
                                                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                                        {offering.currency} {offering.price_per_share.toLocaleString()}
                                                    </p>
                                                </div>
                                                <DollarSign className="h-8 w-8 text-gray-400" />
                                            </div>

                                            {/* Action Button */}
                                            <Link href={route('fractional.show', offering.id)} className="block">
                                                <Button 
                                                    className="w-full group/btn" 
                                                    disabled={offering.available_shares === 0}
                                                >
                                                    {offering.available_shares === 0 ? (
                                                        'Sold Out'
                                                    ) : (
                                                        <>
                                                            View Details
                                                            <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                                        </>
                                                    )}
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )
                        })}
                    </motion.div>
                )}

                {/* Pagination */}
                {offerings.last_page > 1 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-center gap-2 mt-8"
                    >
                        {offerings.links.map((link, index) => {
                            if (!link.url) {
                                return (
                                    <span key={index} className="px-3 py-2 text-gray-400">
                                        {link.label}
                                    </span>
                                )
                            }

                            return (
                                <Link
                                    key={index}
                                    href={link.url}
                                    className={cn(
                                        "px-4 py-2 rounded-lg transition-all",
                                        link.active
                                            ? "bg-blue-600 text-white shadow-lg"
                                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                                    )}
                                >
                                    {link.label.includes('Previous') ? '←' : link.label.includes('Next') ? '→' : link.label}
                                </Link>
                            )
                        })}
                    </motion.div>
                )}
                </div>
            </div>
        </FrontendLayout>
    )
}


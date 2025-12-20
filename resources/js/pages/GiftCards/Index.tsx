"use client"

import { Head, router } from "@inertiajs/react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Gift,
    Search,
    ShoppingBag,
    Globe,
    ArrowRight,
    Sparkles,
    Filter
} from "lucide-react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Brand {
    productId?: number
    productName?: string
    productImage?: string
    denominations?: number[]
    valueRestrictions?: {
        minVal?: number
        maxVal?: number
    }
    productDescription?: string
    termsAndConditions?: string
    howToUse?: string
    expiryAndValidity?: string
    discount?: number
}

interface PaginationData {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
    links: Array<{
        url: string | null
        label: string
        active: boolean
    }>
}

interface GiftCardsIndexProps {
    giftCards: {
        data: Brand[]
    } & PaginationData
    user?: {
        id: number
        name: string
        email: string
        role: string
    } | null
    filters: {
        search: string
        country: string
        per_page: number
    }
    availableCountries: Record<string, string>
}

export default function GiftCardsIndex({ giftCards, user, filters, availableCountries }: GiftCardsIndexProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || "")
    const [selectedCountry, setSelectedCountry] = useState<string>(filters.country || "USA")
    const [isLoading, setIsLoading] = useState(false)

    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

    const handleSearch = (value: string) => {
        setSearchQuery(value)

        // Clear existing timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout)
        }

        // Set new timeout with longer delay (1000ms = 1 second)
        const timeoutId = setTimeout(() => {
            router.get(route('gift-cards.index'), {
                search: value,
                country: selectedCountry,
                per_page: filters.per_page,
            }, {
                preserveState: true,
                preserveScroll: true,
                onStart: () => setIsLoading(true),
                onFinish: () => setIsLoading(false),
            })
        }, 1000) // Increased delay to 1 second

        setSearchTimeout(timeoutId)
    }

    const handleCountryFilter = (country: string) => {
        setSelectedCountry(country)
        router.get(route('gift-cards.index'), {
            search: searchQuery,
            country: country,
            per_page: filters.per_page,
        }, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => setIsLoading(true),
            onFinish: () => setIsLoading(false),
        })
    }

    const handlePageChange = (page: number) => {
        if (page < 1 || page > giftCards.last_page) return

        router.get(route('gift-cards.index'), {
            page,
            search: searchQuery,
            country: selectedCountry,
            per_page: filters.per_page,
        }, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => setIsLoading(true),
            onFinish: () => setIsLoading(false),
        })
    }

    const handleViewBrand = (brand: Brand) => {
        if (brand.productId) {
            router.visit(route('gift-cards.show') + `?productId=${brand.productId}&country=${selectedCountry}`)
        }
    }

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeout) {
                clearTimeout(searchTimeout)
            }
        }
    }, [searchTimeout])

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount)
    }

    // Use FrontendLayout for users and guests, AppSidebarLayout only for orgs/admins
    const Layout = (user && user.role !== 'user' && user.role !== null) ? AppSidebarLayout : FrontendLayout

    return (
        <Layout>
            <Head title="Gift Cards Marketplace" />

            <div className="container mx-auto flex h-full flex-1 flex-col gap-6 rounded-xl px-4 py-4 md:px-10 md:py-6">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 dark:bg-primary/20 rounded-xl p-3">
                            <Gift className="text-primary h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold dark:text-white">Gift Cards Marketplace</h1>
                            <p className="text-muted-foreground">Browse and purchase gift cards from brands worldwide</p>
                        </div>
                    </div>

                    {/* Search and Filter */}
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                            <Input
                                placeholder="Search gift cards..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="pl-10 dark:border-gray-700 dark:bg-gray-800"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Country Filter */}
                        <Select value={selectedCountry} onValueChange={handleCountryFilter}>
                            <SelectTrigger className="w-full sm:w-[200px] dark:border-gray-700 dark:bg-gray-800">
                                <Globe className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-800">
                                {Object.entries(availableCountries).map(([code, name]) => (
                                    <SelectItem key={code} value={code} className="dark:hover:bg-gray-700">
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Gift Cards Grid */}
                {isLoading ? (
                    <div className="py-12 text-center">
                        <p className="text-muted-foreground">Loading...</p>
                    </div>
                ) : giftCards.data.length === 0 ? (
                    <Card className="dark:border-gray-700 dark:bg-gray-800">
                        <CardContent className="py-12 text-center">
                            <Gift className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                            <p className="text-muted-foreground">No gift cards found</p>
                            <p className="text-muted-foreground mt-2 text-sm">Try adjusting your search or country filter</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {giftCards.data.map((brand) => (
                                <Card
                                    key={brand.productId}
                                    className="group hover:border-primary/50 overflow-hidden border-2 transition-all duration-300 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800"
                                >
                                    {/* Image Section */}
                                    {brand.productImage ? (
                                        <div className="bg-muted relative h-48 w-full overflow-hidden">
                                            <img
                                                src={brand.productImage}
                                                alt={brand.productName || 'Gift Card'}
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                            />
                                            {brand.discount && brand.discount > 0 && (
                                                <Badge className="absolute top-2 right-2 bg-red-500 text-white">{brand.discount}% OFF</Badge>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex h-48 w-full items-center justify-center bg-gradient-to-br">
                                            <Gift className="text-primary/50 h-16 w-16" />
                                        </div>
                                    )}

                                    <CardHeader className="pb-3">
                                        <div className="space-y-2">
                                            <CardTitle className="group-hover:text-primary line-clamp-2 text-lg transition-colors dark:text-white">
                                                {brand.productName || 'Gift Card'}
                                            </CardTitle>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        {/* Amount Display */}
                                        {brand.valueRestrictions && (
                                            <div className="bg-primary/5 dark:bg-primary/10 border-primary/20 flex items-center justify-between rounded-lg border p-3">
                                                <span className="text-muted-foreground text-sm">Starting from:</span>
                                                <span className="text-primary text-xl font-bold">
                                                    {formatCurrency(brand.valueRestrictions.minVal || 0)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Quick Info */}
                                        <div className="space-y-2 text-sm">
                                            {brand.denominations && brand.denominations.length > 0 && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Available amounts:</span>
                                                    <span className="text-xs font-medium">{brand.denominations.length} options</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Purchase Button */}
                                        <Button
                                            className="group-hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 w-full shadow-md"
                                            onClick={() => handleViewBrand(brand)}
                                            disabled={isLoading}
                                        >
                                            <ShoppingBag className="mr-2 h-4 w-4" />
                                            View Details
                                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Pagination */}
                        {giftCards.last_page > 1 && (
                            <div className="border-border mt-8 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row dark:border-gray-700">
                                <div className="text-muted-foreground text-sm">
                                    Showing {giftCards.from || 0} to {giftCards.to || 0} of {giftCards.total} results
                                </div>
                                <nav className="flex flex-wrap justify-center space-x-1 sm:justify-end">
                                    {giftCards.links.map((link, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                if (link.url && !link.active) {
                                                    const url = new URL(link.url, window.location.origin);
                                                    const page = url.searchParams.get('page') || '1';
                                                    handlePageChange(parseInt(page));
                                                }
                                            }}
                                            disabled={!link.url || link.active}
                                            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                                link.active
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-card text-muted-foreground hover:bg-accent border-border border dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                                            } ${!link.url && 'cursor-not-allowed opacity-50'}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </nav>
                            </div>
                        )}
                    </>
                )}

                {/* Info Section */}
                <Card className="bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <Sparkles className="text-primary mt-1 h-6 w-6 shrink-0" />
                            <div>
                                <h3 className="mb-2 font-semibold dark:text-white">About Gift Cards</h3>
                                <p className="text-muted-foreground text-sm">
                                    Purchase gift cards from brands instantly with secure payment. Your gift card will be delivered immediately after
                                    payment confirmation. Perfect for gifting or personal use!
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

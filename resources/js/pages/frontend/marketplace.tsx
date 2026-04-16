"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Link, router, usePage } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"
import { useState, useEffect, useCallback } from "react"
import debounce from "lodash.debounce"
import pickBy from "lodash.pickby"
import axios from "axios"
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Badge } from "@/components/frontend/ui/badge"
import {
    Star,
    ChevronLeft,
    ChevronRight,
    ShoppingCart,
    Plus,
    Search,
    Filter,
    Building,
    Trash2,
    Minus,
    Loader2,
    ChevronDown,
    ChevronUp,
} from "lucide-react"

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    price_display: string;
    unit_price: number;
    is_at_cost_pricing?: boolean;
    typical_retail_display?: string;
    at_cost_display?: string;
    platform_fee_percentage?: number;
    platform_fee_display?: string;
    image: string;
    image_url: string;
    quantity_available: number;
    rating: number;
    reviews: number;
    category: {
        id: number;
        name: string;
    };
    organization: {
        id: number;
        name: string;
    };
    /** Catalog vs merchant-pool listing (organization_products) */
    listing_kind?: "catalog" | "pool";
    is_merchant_pool_listing?: boolean;
    organization_product_id?: number | null;
}

interface CartItem {
    id: number;
    product_id: number;
    quantity: number;
    unit_price: number | string;
    product: Product;
}

interface Cart {
    id: number;
    items: CartItem[];
}

interface PageProps {
    products: Product[];
    categories: any[];
    organizations: any[];
    selectedCategories: number[];
    selectedOrganizations: number[];
    search: string;
    cart?: Cart;
    total?: number;
    itemCount?: number;
}

// Helper function to safely convert to number
const toNumber = (value: number | string): number => {
    if (typeof value === 'number') return value;
    return parseFloat(value) || 0;
};

export default function Marketplace({
    products,
    categories,
    organizations,
    selectedCategories,
    selectedOrganizations,
    search
}: PageProps) {
    const [currentProductPage, setCurrentProductPage] = useState(1)
    const [showCartModal, setShowCartModal] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [cartLoading, setCartLoading] = useState(false)
    const [cartModalLoading, setCartModalLoading] = useState(false)
    const [isOrganizationsExpanded, setIsOrganizationsExpanded] = useState(true)
    const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true)
    const productsPerPage = 6





    // Calculate pagination for products
    const totalProducts = products?.length || 0
    const totalProductPages = Math.ceil(totalProducts / productsPerPage)
    const startProductIndex = (currentProductPage - 1) * productsPerPage
    const endProductIndex = Math.min(startProductIndex + productsPerPage, totalProducts)
    const currentProducts = products?.slice(startProductIndex, endProductIndex) || []

    const [filters, setFilters] = useState<{
        search: string
        categories: number[]
        organizations: number[]
    }>({
        search: search || '',
        categories: (selectedCategories || []).map(Number),
        organizations: (selectedOrganizations || []).map(Number),
    })

    const toggleCategory = (categoryId: number) => {
        setFilters((prev) => ({
            ...prev,
            categories: prev.categories.includes(categoryId)
                ? prev.categories.filter(id => id !== categoryId)
                : [...prev.categories, categoryId]
        }))
    }

    const toggleOrganization = (organizationId: number) => {
        setFilters((prev) => ({
            ...prev,
            organizations: prev.organizations.includes(organizationId)
                ? prev.organizations.filter(id => id !== organizationId)
                : [...prev.organizations, organizationId]
        }))
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters((prev) => ({
            ...prev,
            search: e.target.value
        }))
    }

    const clearAllFilters = () => {
        setFilters({
            search: '',
            categories: [],
            organizations: [],
        })
        setCurrentProductPage(1)
    }

    const debouncedFilter = useCallback(
        debounce((query: Record<string, string>) => {
            router.get('/marketplace', pickBy(query), {
                preserveState: true,
                replace: true
            })
        }, 300),
        []
    )

    useEffect(() => {
        const query: Record<string, string> = {
            search: filters.search,
            categories: filters.categories.length > 0 ? filters.categories.join(',') : '',
            organizations: filters.organizations.length > 0 ? filters.organizations.join(',') : '',
        }
        debouncedFilter(pickBy(query))
    }, [filters])

    const handleProductPageChange = (page: number) => {
        setCurrentProductPage(page);
    }

    const activeFilterCount =
        filters.categories.length +
        filters.organizations.length +
        (filters.search ? 1 : 0)

    const productDetailHref = (product: Product) =>
        product.is_merchant_pool_listing && product.organization_product_id
            ? `/marketplace/pool/${product.organization_product_id}`
            : `/products/${product.id}`

    return (
        <FrontendLayout>
            <PageHead title="Marketplace" description="Discover products from verified nonprofits. Shop and support causes you care about." />
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                {/* Hero Section */}
                <section className="bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 py-12 sm:py-16 md:py-20">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="text-center max-w-4xl mx-auto"
                        >
                            <div className="inline-flex items-center justify-center mb-4">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                                    <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                                </div>
                            </div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                                Marketplace
                            </h1>
                            <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
                                Shop catalog products from verified nonprofit organizations
                            </p>
                        </motion.div>
                    </div>
                </section>

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                    {/* Header with Search and Cart */}
                    <div className="mb-8">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                            <div className="flex-1 w-full max-w-2xl">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                    <Input
                                        type="text"
                                        placeholder="Search products..."
                                        value={filters.search}
                                        onChange={handleSearchChange}
                                        className="w-full pl-12 pr-4 h-12 sm:h-14 bg-white/70 dark:bg-gray-800 border-white/60 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 shadow-[0_10px_30px_rgba(99,102,241,0.12)] backdrop-blur-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full lg:w-auto">
                                {/* Mobile Filter Toggle */}
                                <Button
                                    onClick={() => setShowFilters(!showFilters)}
                                    variant="outline"
                                    className="lg:hidden flex items-center gap-2 h-12 border-gray-300 dark:border-gray-600"
                                >
                                    <Filter className="h-4 w-4" />
                                    Filters
                                    {activeFilterCount > 0 && (
                                        <Badge variant="secondary" className="ml-1 bg-purple-600 text-white">
                                            {activeFilterCount}
                                        </Badge>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
                        {/* Filters Sidebar */}
                        <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                                className="space-y-4"
                            >
                                {/* Filter Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Filters</h3>
                                    {activeFilterCount > 0 && (
                                        <Button
                                            onClick={clearAllFilters}
                                            variant="ghost"
                                            size="sm"
                                            className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm font-medium"
                                        >
                                            Clear all
                                        </Button>
                                    )}
                                </div>

                                <Card className="bg-white/70 dark:bg-gray-800 border-white/50 dark:border-gray-700 shadow-[0_14px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                                    <CardHeader className="pb-3 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-gray-700 dark:to-gray-700 rounded-t-xl">
                                        <button
                                            type="button"
                                            onClick={() => setIsOrganizationsExpanded(!isOrganizationsExpanded)}
                                            className="w-full flex items-center justify-between text-left"
                                        >
                                            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                <Building className="h-4 w-4 text-purple-700 dark:text-purple-400 shrink-0" />
                                                Organizations
                                            </CardTitle>
                                            {isOrganizationsExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-300 shrink-0" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-300 shrink-0" />
                                            )}
                                        </button>
                                    </CardHeader>
                                    <AnimatePresence>
                                        {isOrganizationsExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <CardContent className="space-y-3 pt-4" style={{ height: '240px', maxHeight: '240px' }}>
                                                    <div className="overflow-y-auto h-full pr-2" style={{ maxHeight: '240px' }}>
                                                        {organizations.map((organization: any) => (
                                                            <label key={organization.id} className="flex items-center space-x-3 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={filters.organizations.includes(Number(organization.id))}
                                                                    onChange={() => toggleOrganization(Number(organization.id))}
                                                                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 shrink-0"
                                                                />
                                                                <span className="text-sm text-slate-700 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors truncate">
                                                                    {organization.name}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>

                                {/* Categories Filter */}
                                <Card className="bg-white/70 dark:bg-gray-800 border-white/50 dark:border-gray-700 shadow-[0_14px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                                    <CardHeader className="pb-3 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-gray-700 dark:to-gray-700 rounded-t-xl">
                                        <button
                                            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                                            className="w-full flex items-center justify-between"
                                        >
                                            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                                                Categories
                                            </CardTitle>
                                            {isCategoriesExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                            )}
                                        </button>
                                    </CardHeader>
                                    <AnimatePresence>
                                        {isCategoriesExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <CardContent className="space-y-3 pt-4" style={{ height: '240px', maxHeight: '240px' }}>
                                                    <div className="overflow-y-auto h-full pr-2" style={{ maxHeight: '240px' }}>
                                                        {categories.map((category: any) => (
                                                            <label key={category.id} className="flex items-center space-x-3 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={filters.categories.includes(Number(category.id))}
                                                                    onChange={() => toggleCategory(Number(category.id))}
                                                                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                                                                />
                                                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                                                    {category.name}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            </motion.div>
                        </div>

                        {/* Products Grid */}
                        <div className="lg:col-span-4">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                            >
                                {/* Results Header */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                                    <div>
                                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                            Marketplace
                                            {totalProducts > 0 && (
                                                <span className="text-purple-600 dark:text-purple-400 text-lg font-semibold ml-2">
                                                    ({totalProducts} {totalProducts === 1 ? 'product' : 'products'})
                                                </span>
                                            )}
                                        </h2>
                                        {filters.search && (
                                            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
                                                Search results for: <span className="font-semibold">"{filters.search}"</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                        {totalProducts > 0
                                            ? `Showing ${startProductIndex + 1}-${endProductIndex} of ${totalProducts} products`
                                            : 'No products'}
                                    </div>
                                </div>

                                {totalProducts > 0 ? (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {currentProducts.map((product: Product) => (
                                                <Link
                                                    href={productDetailHref(product)}
                                                    key={`${product.listing_kind ?? "catalog"}-${product.id}`}
                                                >
                                                <Card
                                                    className="group overflow-hidden border border-slate-200/70 bg-white text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(99,102,241,0.22)] dark:border-white/10 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/70 dark:text-white"
                                                >
                                                    <div className="relative overflow-hidden">
                                                        <img
                                                            src={product.image || product.image_url || "/placeholder.svg"}
                                                            alt={product.name}
                                                            className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500 opacity-95"
                                                        />
                                                        {product.quantity_available <= 0 && (
                                                            <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                                                                Out of Stock
                                                            </div>
                                                        )}
                                                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start max-w-[85%]">
                                                            <Badge
                                                                variant="secondary"
                                                                className="bg-black/50 text-white text-xs font-medium border border-white/10 shadow-md backdrop-blur-sm"
                                                            >
                                                                {product.is_merchant_pool_listing ? "Merchant pool" : "Organization"}
                                                            </Badge>
                                                            <Badge
                                                                variant="secondary"
                                                                className="bg-white/95 text-slate-900 text-xs font-medium border border-slate-200 shadow-md backdrop-blur-sm dark:bg-white/10 dark:text-white dark:border-white/10"
                                                            >
                                                                {product.category?.name || 'Uncategorized'}
                                                            </Badge>
                                                        </div>
                                                        {product.organization && (
                                                            <Badge
                                                                variant="outline"
                                                                className="absolute bottom-3 left-3 bg-purple-500/15 text-purple-100 text-xs font-medium border border-purple-400/20 shadow-md max-w-[90%] truncate backdrop-blur-sm dark:text-purple-100"
                                                            >
                                                                {product.organization.name}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <CardContent className="p-5 sm:p-6">
                                                        <div className="mb-3">
                                                            <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-2 dark:text-white dark:group-hover:text-purple-200">
                                                                {product.name}
                                                            </h4>
                                                        </div>

                                                        <p className="text-slate-600 mb-4 text-sm leading-relaxed line-clamp-3 min-h-[3.75rem] dark:text-white/75">
                                                            {product.description}
                                                        </p>

                                                        {product.is_at_cost_pricing ? (
                                                            (() => {
                                                                const at = Number(String(product.at_cost_display ?? '').replace(/[^0-9.]/g, '')) || 0
                                                                const retail = Number(String(product.typical_retail_display ?? '').replace(/[^0-9.]/g, '')) || 0
                                                                const save = Math.max(0, retail - at)
                                                                return (
                                                                    <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-white to-indigo-500/10 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] dark:border-emerald-400/20 dark:bg-gradient-to-br dark:from-emerald-400/10 dark:via-white/5 dark:to-purple-500/10 dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                                                                        <div className="flex items-start justify-between gap-4">
                                                                            <div>
                                                                                <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700/80 dark:text-emerald-200/80">
                                                                                    Your Price
                                                                                </p>
                                                                                <div className="flex items-end gap-2">
                                                                                    <p className="text-3xl font-extrabold text-emerald-700 tabular-nums dark:text-emerald-300">
                                                                                        {product.at_cost_display}
                                                                                    </p>
                                                                                    <span className="text-sm font-semibold text-emerald-800/90 pb-1 dark:text-emerald-100/90">
                                                                                        At Cost
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-white/60">Typical Retail</p>
                                                                                <p className="text-sm text-slate-600 line-through tabular-nums dark:text-white/80">
                                                                                    {product.typical_retail_display}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="mt-3 rounded-xl bg-slate-900/5 px-3 py-2 text-sm text-slate-700 border border-slate-200 dark:bg-black/30 dark:text-white/80 dark:border-white/10">
                                                                            Platform fee adds <span className="font-semibold text-slate-900 dark:text-white">{product.platform_fee_display}</span> at checkout
                                                                        </div>
                                                                        {save > 0 && (
                                                                            <p className="mt-2 text-sm text-emerald-700/80 dark:text-emerald-200/80">
                                                                                You save <span className="font-semibold text-emerald-800 tabular-nums dark:text-emerald-200">${save.toFixed(2)}</span>
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })()
                                                        ) : (
                                                            <div className="mb-4">
                                                                <span className="text-2xl font-bold text-indigo-700 whitespace-nowrap tabular-nums dark:text-purple-200">
                                                                    {product.price_display}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
                                                            <span className="text-xs text-slate-500 font-medium dark:text-white/60">
                                                                {product.quantity_available} in stock
                                                            </span>
                                                            {product.quantity_available > 0 && product.quantity_available <= 5 && (
                                                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-200">
                                                                    Low stock
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <Link
                                                                href={productDetailHref(product)}
                                                                className="flex-1"
                                                                onClick={(e) => {
                                                                    // Prevent navigation if out of stock
                                                                    if (product.quantity_available <= 0) {
                                                                        e.preventDefault();
                                                                    }
                                                                }}
                                                            >
                                                                <Button
                                                                    disabled={product.quantity_available <= 0}
                                                                    className="w-full h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-300"
                                                                >
                                                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                                                    Buy Now
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </CardContent>
                                                    </Card>
                                                    </Link>
                                            ))}
                                        </div>

                                        {/* Pagination */}
                                        {totalProductPages > 1 && (
                                            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handleProductPageChange(currentProductPage - 1)}
                                                        disabled={currentProductPage === 1}
                                                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 h-10"
                                                    >
                                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                                        Previous
                                                    </Button>

                                                    <div className="flex gap-1">
                                                        {Array.from({ length: totalProductPages }, (_, i) => i + 1).map((page) => (
                                                            <Button
                                                                key={page}
                                                                variant={currentProductPage === page ? "default" : "outline"}
                                                                onClick={() => handleProductPageChange(page)}
                                                                className={`h-10 min-w-[2.5rem] ${
                                                                    currentProductPage === page
                                                                        ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md"
                                                                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                                }`}
                                                            >
                                                                {page}
                                                            </Button>
                                                        ))}
                                                    </div>

                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handleProductPageChange(currentProductPage + 1)}
                                                        disabled={currentProductPage === totalProductPages}
                                                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 h-10"
                                                    >
                                                        Next
                                                        <ChevronRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-16 sm:py-20">
                                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                                            <ShoppingCart className="h-10 w-10 text-gray-400" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                            No products found
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                                            Try adjusting your search or filters to find what you're looking for.
                                        </p>
                                        <Button
                                            onClick={clearAllFilters}
                                            variant="outline"
                                            className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-900/20 h-11 px-6"
                                        >
                                            Clear all filters
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Cart Modal */}
                {/* {showCartModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[95vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shopping Cart</h2>
                                    <button
                                        onClick={() => setShowCartModal(false)}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl transition-colors duration-200"
                                    >
                                        ×
                                    </button>
                                </div>

                                {cartModalLoading ? (
                                    <div className="flex justify-center items-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading cart...</span>
                                    </div>
                                ) : !cart || cart.items.length === 0 ? (
                                    <div className="text-center py-8">
                                        <ShoppingCart className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                                        <p className="text-gray-600 dark:text-gray-400 mb-4">Your cart is empty</p>
                                        <Button
                                            onClick={() => setShowCartModal(false)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            Continue Shopping
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-4 mb-6">
                                            {cart.items.map((item) => (
                                                <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                                                    <img
                                                        src={item.product.image_url || item.product.image || "/placeholder.svg"}
                                                        alt={item.product.name}
                                                        className="w-16 h-16 object-cover rounded"
                                                    />
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
                                                            {item.product.name}
                                                        </h4>
                                                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                                                            ${toNumber(item.unit_price).toFixed(2)} each
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            {item.product.quantity_available} in stock
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                                            disabled={item.quantity <= 1 || cartLoading}
                                                            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors duration-200"
                                                        >
                                                            {cartLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Minus className="h-3 w-3" />}
                                                        </button>
                                                        <span className="w-8 text-center font-medium text-gray-900 dark:text-white">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                                            disabled={item.quantity >= item.product.quantity_available || cartLoading}
                                                            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors duration-200"
                                                        >
                                                            {cartLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                                        </button>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-gray-900 dark:text-white">
                                                            ${(toNumber(item.unit_price) * item.quantity).toFixed(2)}
                                                        </p>
                                                        <button
                                                            onClick={() => removeFromCart(item.id)}
                                                            disabled={cartLoading}
                                                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm mt-1 transition-colors duration-200 disabled:opacity-50"
                                                        >
                                                            {cartLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-lg font-semibold text-gray-900 dark:text-white">Total:</span>
                                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                                    ${getCartTotal().toFixed(2)}
                                                </span>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={clearCart}
                                                    variant="outline"
                                                    className="flex-1"
                                                    disabled={cartLoading}
                                                >
                                                    {cartLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Clear Cart'}
                                                </Button>
                                                <Link
                                                    href={route('cart.index')}
                                                    className="flex-1"
                                                    onClick={() => setShowCartModal(false)}
                                                >
                                                    <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
                                                        View Cart
                                                    </Button>
                                                </Link>
                                                <Link
                                                    href={route('checkout.show')}
                                                    className="flex-1"
                                                    onClick={() => setShowCartModal(false)}
                                                >
                                                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                                        Checkout
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )} */}
            </div>
        </FrontendLayout>
    )
}

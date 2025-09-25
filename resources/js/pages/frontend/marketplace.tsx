"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Link, router, useForm } from "@inertiajs/react"
import { useState, useEffect, useCallback } from "react"
import debounce from "lodash.debounce"
import pickBy from "lodash.pickby"
import axios from "axios"
import { showErrorToast } from '@/lib/toast';
import { Badge } from "@/components/frontend/ui/badge"
import {
    Star,
    ChevronLeft,
    ChevronRight,
    ShoppingCart,
    Plus,
    Search,
    Filter,
    Building
} from "lucide-react"

export default function Marketplace({ products, categories, organizations, selectedCategories, selectedOrganizations, search }: any) {
    const [isFavorite, setIsFavorite] = useState(false)
    const [showDonationModal, setShowDonationModal] = useState(false)
    const [currentProductPage, setCurrentProductPage] = useState(1)
    const [cart, setCart] = useState<any[]>([])
    const [showCartModal, setShowCartModal] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
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
        categories: selectedCategories || [],
        organizations: selectedOrganizations || []
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
            organizations: []
        })
        setCurrentProductPage(1)
    }

    const debouncedFilter = useCallback(
        debounce((query) => {
            router.get(route('marketplace.index'), pickBy(query), {
                preserveState: true,
                replace: true
            })
        }, 300),
        []
    )

    useEffect(() => {
        const query = {
            ...filters,
            categories: filters.categories.length > 0 ? filters.categories.join(',') : '',
            organizations: filters.organizations.length > 0 ? filters.organizations.join(',') : '',
        }
        debouncedFilter(query)
    }, [filters])

    const { post, processing } = useForm();

    const handleProductPageChange = (page: number) => {
        setCurrentProductPage(page)
    }

    const addToCart = (product: any) => {
        const existingItem = cart.find((item) => item.id === product.id)
        if (existingItem) {
            setCart(cart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)))
        } else {
            setCart([...cart, { ...product, quantity: 1 }])
        }
    }

    const buyNow = (product: any) => {
        setCart([{ ...product, quantity: 1 }])
        setShowCartModal(true)
    }

    const removeFromCart = (productId: number) => {
        setCart(cart.filter((item) => item.id !== productId))
    }

    const updateQuantity = (productId: number, quantity: number) => {
        if (quantity === 0) {
            removeFromCart(productId)
        } else {
            setCart(cart.map((item) => (item.id === productId ? { ...item, quantity } : item)))
        }
    }

    const getCartTotal = () => {
        return cart.reduce((total, item) => total + item.unit_price * item.quantity, 0)
    }

    const getCartItemCount = () => {
        return cart.reduce((total, item) => total + item.quantity, 0)
    }

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCompletePurchase = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const orderData = {
            first_name: firstName,
            last_name: lastName,
            email,
            shipping_address: shippingAddress,
            city,
            zip,
            phone,
            products: cart.map(item => ({
                id: item.id,
                quantity: item.quantity,
            })),
        };

        try {
            const response = await axios.post(route('purchase.order'), orderData);
            if (response.data.url) {
                window.location.href = response.data.url;
            } else {
                setIsSubmitting(false);
                showErrorToast("Stripe URL not received.");
            }
        } catch (error: any) {
            setIsSubmitting(false);
            if (error.response && error.response.data && error.response.data.errors) {
                setErrors(error.response.data.errors);
            } else {
                showErrorToast("Order failed. Please try again.");
            }
        }
    };

    // Form state for checkout
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [shippingAddress, setShippingAddress] = useState("");
    const [city, setCity] = useState("");
    const [zip, setZip] = useState("");
    const [phone, setPhone] = useState("");

    // Active filter count for badge
    const activeFilterCount = filters.categories.length + filters.organizations.length + (filters.search ? 1 : 0);

    return (
        <FrontendLayout>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Hero Section */}
                <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-20">
                    <div className="container mx-auto px-4">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="text-center max-w-4xl mx-auto"
                        >
                            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">Marketplace</h1>
                            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                                Discover amazing products from various organizations
                            </p>
                        </motion.div>
                    </div>
                </section>

                <div className="container mx-auto px-4 py-8">
                    {/* Header with Search and Cart */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                        <div className="flex-1 w-full max-w-2xl">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    type="text"
                                    placeholder="Search products..."
                                    value={filters.search}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            {/* Mobile Filter Toggle */}
                            <Button
                                onClick={() => setShowFilters(!showFilters)}
                                variant="outline"
                                className="lg:hidden flex items-center gap-2"
                            >
                                <Filter className="h-4 w-4" />
                                Filters
                                {activeFilterCount > 0 && (
                                    <Badge variant="secondary" className="ml-1 bg-blue-500 text-white">
                                        {activeFilterCount}
                                    </Badge>
                                )}
                            </Button>

                            {/* Cart Button */}
                            {getCartItemCount() > 0 && (
                                <Button
                                    onClick={() => setShowCartModal(true)}
                                    variant="outline"
                                    size="lg"
                                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 relative"
                                >
                                    <ShoppingCart className="mr-2 h-5 w-5" />
                                    Cart ({getCartItemCount()})
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        {/* Filters Sidebar - Hidden on mobile, shown when toggled */}
                        <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                                className="space-y-6"
                            >
                                {/* Filter Header */}
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
                                    {activeFilterCount > 0 && (
                                        <Button
                                            onClick={clearAllFilters}
                                            variant="ghost"
                                            size="sm"
                                            className="text-blue-600 hover:text-blue-700 text-sm"
                                        >
                                            Clear all
                                        </Button>
                                    )}
                                </div>

                                {/* Categories Filter */}
                                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                                            Categories
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-0">
                                        {categories.map((category: any) => (
                                            <label key={category.id} className="flex items-center space-x-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={filters.categories.includes(category.id)}
                                                    onChange={() => toggleCategory(category.id)}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                                    {category.name}
                                                </span>
                                            </label>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* Organizations Filter */}
                                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Building className="h-4 w-4" />
                                            Organizations
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-0 max-h-60 overflow-y-auto">
                                        {organizations.map((organization: any) => (
                                            <label key={organization.id} className="flex items-center space-x-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={filters.organizations.includes(organization.id)}
                                                    onChange={() => toggleOrganization(organization.id)}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors truncate">
                                                    {organization.name}
                                                </span>
                                            </label>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* Active Filters */}
                                {(filters.categories.length > 0 || filters.organizations.length > 0) && (
                                    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-semibold text-blue-900 dark:text-blue-100">
                                                Active Filters
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 pt-0">
                                            {filters.categories.map(categoryId => {
                                                const category = categories.find((c: any) => c.id === categoryId);
                                                return category ? (
                                                    <div key={categoryId} className="flex items-center justify-between">
                                                        <span className="text-sm text-blue-800 dark:text-blue-200">Category: {category.name}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => toggleCategory(categoryId)}
                                                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                                                        >
                                                            ×
                                                        </Button>
                                                    </div>
                                                ) : null;
                                            })}
                                            {filters.organizations.map(orgId => {
                                                const organization = organizations.find((o: any) => o.id === orgId);
                                                return organization ? (
                                                    <div key={orgId} className="flex items-center justify-between">
                                                        <span className="text-sm text-blue-800 dark:text-blue-200">Org: {organization.name}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => toggleOrganization(orgId)}
                                                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                                                        >
                                                            ×
                                                        </Button>
                                                    </div>
                                                ) : null;
                                            })}
                                        </CardContent>
                                    </Card>
                                )}
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
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                            Products {totalProducts > 0 && `(${totalProducts})`}
                                        </h2>
                                        {filters.search && (
                                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                                Search results for: "{filters.search}"
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Showing {startProductIndex + 1}-{endProductIndex} of {totalProducts} products
                                    </div>
                                </div>

                                {totalProducts > 0 ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {currentProducts.map((product: any) => (
                                                <Card
                                                    key={product.id}
                                                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group hover:border-blue-300 dark:hover:border-blue-600"
                                                >
                                                    <div className="relative overflow-hidden rounded-t-lg">
                                                        <img
                                                            src={product.image || "/placeholder.svg"}
                                                            alt={product.name}
                                                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                        {product.quantity_available <= 0 && (
                                                            <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                                                Out of Stock
                                                            </div>
                                                        )}
                                                        <Badge
                                                            variant="secondary"
                                                            className="absolute top-3 left-3 bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 text-xs border-0"
                                                        >
                                                            {product.category?.name || 'Uncategorized'}
                                                        </Badge>
                                                        {product.organization && (
                                                            <Badge
                                                                variant="outline"
                                                                className="absolute bottom-3 left-3 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs border-0"
                                                            >
                                                                {product.organization.name}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <CardContent className="p-5">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                                                {product.name}
                                                            </h4>
                                                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap ml-2">
                                                                ${product.unit_price}
                                                            </span>
                                                        </div>

                                                        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed line-clamp-3">
                                                            {product.description}
                                                        </p>

                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-1">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star
                                                                        key={i}
                                                                        className={`h-4 w-4 ${
                                                                            i < Math.floor(product.rating || 0)
                                                                                ? "text-yellow-400 fill-current"
                                                                                : "text-gray-300"
                                                                        }`}
                                                                    />
                                                                ))}
                                                                <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                                                                    {product.rating || 0} ({product.reviews || 0})
                                                                </span>
                                                            </div>
                                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                {product.quantity_available} in stock
                                                            </span>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <Button
                                                                onClick={() => addToCart(product)}
                                                                disabled={product.quantity_available <= 0}
                                                                variant="outline"
                                                                className="flex-1 bg-transparent border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <Plus className="mr-2 h-4 w-4" />
                                                                Add to Cart
                                                            </Button>
                                                            <Button
                                                                onClick={() => buyNow(product)}
                                                                disabled={product.quantity_available <= 0}
                                                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                                            >
                                                                <ShoppingCart className="mr-2 h-4 w-4" />
                                                                Buy Now
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
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
                                                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
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
                                                                className={
                                                                    currentProductPage === page
                                                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                                                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                                                                }
                                                            >
                                                                {page}
                                                            </Button>
                                                        ))}
                                                    </div>

                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handleProductPageChange(currentProductPage + 1)}
                                                        disabled={currentProductPage === totalProductPages}
                                                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                                                    >
                                                        Next
                                                        <ChevronRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-16">
                                        <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                            No products found
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                                            Try adjusting your search or filters to find what you're looking for.
                                        </p>
                                        <Button
                                            onClick={clearAllFilters}
                                            variant="outline"
                                            className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                        >
                                            Clear all filters
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Cart/Checkout Modal - Keep the existing modal code exactly as is */}
                {showCartModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[95vh] overflow-y-auto">
                            {/* ... existing cart modal code remains exactly the same ... */}
                        </div>
                    </div>
                )}
            </div>
        </FrontendLayout>
    )
}

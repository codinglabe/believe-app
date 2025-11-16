"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Link, router, usePage } from "@inertiajs/react"
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
    Loader2
} from "lucide-react"

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    unit_price: number;
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
    const [isFavorite, setIsFavorite] = useState(false)
    const [currentProductPage, setCurrentProductPage] = useState(1)
    const [showCartModal, setShowCartModal] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [cart, setCart] = useState<Cart | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [cartLoading, setCartLoading] = useState(false)
    const [cartModalLoading, setCartModalLoading] = useState(false)
    const productsPerPage = 6

    // Get initial cart from server props
    const pageProps = usePage().props as PageProps;
    useEffect(() => {
        if (pageProps.cart) {
            setCart(pageProps.cart);
        }
    }, [pageProps.cart]);

    // Fetch cart data when modal opens
    const fetchCartData = async () => {
        setCartModalLoading(true);
        try {
            const response = await axios.get(route('cart.data'));
            // The cart data is in response.data.props.cart for Inertia responses
            if (response.data.props) {
                setCart(response.data.props.cart);
            } else {
                // If direct API response
                setCart(response.data.cart || response.data);
            }
        } catch (error) {
            console.error('Failed to fetch cart data:', error);
            showErrorToast('Failed to load cart data');
        } finally {
            setCartModalLoading(false);
        }
    };

    // When modal opens, fetch latest cart data
    useEffect(() => {
        // if (showCartModal) {
            fetchCartData();
        // }
    }, [showCartModal]);

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

    // Cart Functions - Updated to refresh cart data
    const addToCart = async (product: Product) => {
        if (isLoading) return;

        setIsLoading(true);
        try {
            const response = await axios.post(route('cart.add'), {
                product_id: product.id,
                quantity: 1
            });

            // Update cart state with fresh data
            setCart(response.data.cart);
            showSuccessToast('Product added to cart!');
        } catch (error: any) {
            if (error.response?.data?.error) {
                showErrorToast(error.response.data.error);
            } else {
                showErrorToast('Failed to add product to cart');
            }
        } finally {
            setIsLoading(false);
        }
    }

    const updateCartQuantity = async (cartItemId: number, quantity: number) => {
        setCartLoading(true);
        try {
            const response = await axios.put(route('cart.update', cartItemId), {
                quantity: quantity
            });
            setCart(response.data.cart);
            showSuccessToast('Cart updated');
        } catch (error: any) {
            if (error.response?.data?.error) {
                showErrorToast(error.response.data.error);
            } else {
                showErrorToast('Failed to update cart');
            }
        } finally {
            setCartLoading(false);
        }
    }

    const removeFromCart = async (cartItemId: number) => {
        setCartLoading(true);
        try {
            const response = await axios.delete(route('cart.destroy', cartItemId));
            setCart(response.data.cart);
            showSuccessToast('Item removed from cart');
        } catch (error) {
            showErrorToast('Failed to remove item from cart');
        } finally {
            setCartLoading(false);
        }
    }

    const clearCart = async () => {
        if (confirm('Are you sure you want to clear your cart?')) {
            setCartLoading(true);
            try {
                const response = await axios.post(route('cart.clear'));
                setCart(response.data.cart);
                showSuccessToast('Cart cleared');
            } catch (error) {
                showErrorToast('Failed to clear cart');
            } finally {
                setCartLoading(false);
            }
        }
    }

    const getCartTotal = (): number => {
        if (!cart?.items) return 0;
        return cart.items.reduce((total, item) => {
            return total + (toNumber(item.unit_price) * item.quantity);
        }, 0);
    }

    const getCartItemCount = (): number => {
        if (!cart?.items) return 0;
        return cart.items.reduce((total, item) => total + item.quantity, 0);
    }

    const handleProductPageChange = (page: number) => {
        setCurrentProductPage(page);
    }

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
                            <Button
                                onClick={() => setShowCartModal(true)}
                                variant="outline"
                                size="lg"
                                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 relative"
                            >
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                Cart ({getCartItemCount()})
                                {cartLoading && (
                                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        {/* Filters Sidebar */}
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
                                            {currentProducts.map((product: Product) => (
                                                <Card
                                                    key={product.id}
                                                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group hover:border-blue-300 dark:hover:border-blue-600"
                                                >
                                                    <div className="relative overflow-hidden rounded-t-lg">
                                                        <img
                                                            src={product.image || product.image_url || "/placeholder.svg"}
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
                                                                ${product.price || product.unit_price}
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
                                                                disabled={product.quantity_available <= 0 || isLoading}
                                                                variant="outline"
                                                                className="flex-1 bg-transparent border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {isLoading ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Plus className="mr-2 h-4 w-4" />
                                                                )}
                                                                Add to Cart
                                                            </Button>
                                                            <Link
                                                                href={route('checkout.show')}
                                                                className="flex-1"
                                                            >
                                                                <Button
                                                                    onClick={() => addToCart(product)}
                                                                    disabled={product.quantity_available <= 0}
                                                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                                                >
                                                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                                                    Buy Now
                                                                </Button>
                                                            </Link>
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

                {/* Cart Modal */}
                {showCartModal && (
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
                )}
            </div>
        </FrontendLayout>
    )
}

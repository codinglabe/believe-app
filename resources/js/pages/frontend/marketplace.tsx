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
    Heart,
    MapPin,
    Globe,
    Phone,
    Mail,
    Calendar,
    Award,
    Share2,
    DollarSign,
    Star,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    ShoppingCart,
    Check,
    FileText,
    Building,
    Plus,
} from "lucide-react"






export default function Marketplace({ products, categories, selectedCategories }: any) {

    const [isFavorite, setIsFavorite] = useState(false)
    const [showDonationModal, setShowDonationModal] = useState(false)
    const [currentProductPage, setCurrentProductPage] = useState(1)
    const [cart, setCart] = useState<any[]>([])
    const [showCartModal, setShowCartModal] = useState(false)
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
    }>({
        search: '',
        categories: selectedCategories || []
    })


    const toggleCategory = (categoryId: number) => {
        setFilters((prev) => ({
            ...prev,
            categories: prev.categories.includes(categoryId)
                ? prev.categories.filter(id => id !== categoryId)
                : [...prev.categories, categoryId]
        }))
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters((prev) => ({
            ...prev,
            search: e.target.value
        }))
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
            categories: filters.categories.join(','),
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

    // useEffect(() => {
    //     router.get(route('marketplace.index'), {
    //         categories: selectedFilterCategories,
    //     }, {
    //         preserveScroll: true,
    //         replace: true,
    //     })
    // }, [selectedFilterCategories])

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
            // Add payment info as needed
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

                        </motion.div>
                    </div>
                </section>




                <div className="container-fluid mx-auto px-4 py-12">


                    <div className="flex w-full justify-end mb-5">
                        {getCartItemCount() > 0 && (
                            <Button
                                onClick={() => setShowCartModal(true)}
                                variant="outline"
                                size="lg"
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20 relative"
                            >
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                Cart ({getCartItemCount()})
                            </Button>
                        )}
                    </div>

                    {/* Search input */}
                    <div className="flex w-full mb-5">
                        <Input
                            type="text"
                            placeholder="Search products..."
                            value={filters.search}
                            onChange={handleSearchChange}
                            className="w-full p-2 border rounded"
                        />
                    </div>


                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                        <div className="space-y-6">

                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                            >
                                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                    <CardHeader>
                                        <CardTitle className="text-lg text-gray-900 dark:text-white">Filter</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {categories.map((category: any) => (
                                            <label key={category.id} className="flex items-center space-x-2 text-lg">
                                                <input
                                                    type="checkbox"
                                                    checked={filters.categories.includes(category.id)}
                                                    onChange={() => toggleCategory(category.id)}
                                                    className="accent-blue-600"
                                                />
                                                <span>{category.name}</span>
                                            </label>
                                        ))}
                                    </CardContent>
                                </Card>
                            </motion.div>


                        </div>

                        <div className="lg:col-span-4">
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                                {totalProducts > 0 ? (
                                    <>
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                                            {currentProducts.map((product) => (
                                                <Card
                                                    key={product.id}
                                                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group"
                                                >
                                                    <div className="relative overflow-hidden">
                                                        <img
                                                            src={product.image || "/placeholder.svg"}
                                                            alt={product.name}
                                                            width={400}
                                                            height={200}
                                                            className="w-full h-40 sm:h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                        {(product.quantity_available <= 0) && (
                                                            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                                                                Out of Stock
                                                            </div>
                                                        )}
                                                        <Badge variant="secondary" className="absolute top-2 left-2 bg-white/90 text-gray-800 text-xs">
                                                            {product.category}
                                                        </Badge>
                                                    </div>
                                                    <CardContent className="p-4 sm:p-6">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                                {product.name}
                                                            </h4>
                                                            <span className="text-xl sm:text-2xl font-bold text-blue-600">${product.unit_price}</span>
                                                        </div>

                                                        <p className="text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 text-sm leading-relaxed">
                                                            {product.description}
                                                        </p>

                                                        <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                                            <div className="flex items-center">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star
                                                                        key={i}
                                                                        className={`h-3 w-3 sm:h-4 sm:w-4 ${i < Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                                                                            }`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                                                {product.rating} ({product.reviews} reviews)
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row gap-2">
                                                            <Button
                                                                onClick={() => addToCart(product)}
                                                                disabled={product.quantity_available <= 0}
                                                                variant="outline"
                                                                className="flex-1 bg-transparent disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
                                                            >
                                                                <Plus className="mr-2 h-4 w-4" />
                                                                Add to Cart
                                                            </Button>
                                                            <Button
                                                                onClick={() => buyNow(product)}
                                                                disabled={product.quantity_available <= 0}
                                                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
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
                                            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 pt-6">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handleProductPageChange(currentProductPage - 1)}
                                                        disabled={currentProductPage === 1}
                                                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                                                    >
                                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                                        <span className="hidden sm:inline">Previous</span>
                                                        <span className="sm:hidden">Prev</span>
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
                                                        <span className="hidden sm:inline">Next</span>
                                                        <span className="sm:hidden">Next</span>
                                                        <ChevronRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                </div>

                                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-0 sm:ml-4">
                                                    Showing {startProductIndex + 1}-{endProductIndex} of {totalProducts} products
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500">No products available at this time.</p>
                                    </div>
                                )}
                            </motion.div>
                        </div>


                    </div>
                </div>

                {/* Cart/Checkout Modal */}
                {showCartModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[95vh] overflow-y-auto">
                            <div className="p-4 sm:p-6">
                                <div className="flex justify-between items-center mb-4 sm:mb-6">
                                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Shopping Cart</h3>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setShowCartModal(false)}
                                        className="text-gray-500 hover:text-gray-700 h-8 w-8 p-0"
                                    >
                                        ×
                                    </Button>
                                </div>

                                {cart.length === 0 ? (
                                    <div className="text-center py-8">
                                        <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Your cart is empty</h3>
                                        <p className="text-gray-600 dark:text-gray-300">Add some products to get started!</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Cart Items */}
                                        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                                            {cart.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                                                >
                                                    <img
                                                        src={item.image || "/placeholder.svg"}
                                                        alt={item.name}
                                                        width={64}
                                                        height={64}
                                                        className="rounded object-cover flex-shrink-0 w-16 h-16"
                                                    />
                                                    <div className="flex-1 w-full sm:w-auto">
                                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                                                            {item.name}
                                                        </h4>
                                                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">${item.unit_price} each</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                                className="h-7 w-7 p-0 text-xs"
                                                            >
                                                                -
                                                            </Button>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-center">
                                                                {item.quantity}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                                className="h-7 w-7 p-0 text-xs"
                                                            >
                                                                +
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="text-right w-full sm:w-auto flex justify-between sm:block">
                                                        <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                                                            ${(item.unit_price * item.quantity).toFixed(2)}
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => removeFromCart(item.id)}
                                                            className="text-red-600 hover:text-red-700 text-xs sm:text-sm mt-0 sm:mt-1 h-auto p-1"
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Order Summary */}
                                        <div className="border-t border-gray-200 dark:border-gray-600 pt-3 sm:pt-4 mb-4 sm:mb-6">
                                            <div className="flex justify-between items-center text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                                                <span>Total:</span>
                                                <span>${getCartTotal().toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Checkout Form */}
                                        <form className="space-y-3 sm:space-y-4" onSubmit={handleCompletePurchase}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        First Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                        placeholder="Enter your first name"
                                                        value={firstName}
                                                        onChange={e => setFirstName(e.target.value)}
                                                    />
                                                    {errors.first_name && <p className="text-sm text-red-500">{errors.first_name}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Last Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                        placeholder="Enter your last name"
                                                        value={lastName}
                                                        onChange={e => setLastName(e.target.value)}
                                                    />
                                                    {errors.last_name && <p className="text-sm text-red-500">{errors.last_name}</p>}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                    placeholder="Enter your email"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                />
                                                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Shipping Address
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                    placeholder="Street address"
                                                    value={shippingAddress}
                                                    onChange={e => setShippingAddress(e.target.value)}
                                                />
                                                {errors.shipping_address && <p className="text-sm text-red-500">{errors.shipping_address}</p>}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                        placeholder="City"
                                                        value={city}
                                                        onChange={e => setCity(e.target.value)}
                                                    />
                                                    {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        ZIP Code
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                        placeholder="ZIP"
                                                        value={zip}
                                                        onChange={e => setZip(e.target.value)}
                                                    />
                                                    {errors.zip && <p className="text-sm text-red-500">{errors.zip}</p>}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Phone Number
                                                </label>
                                                <input
                                                    type="tel"
                                                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                    placeholder="Phone number"
                                                    value={phone}
                                                    onChange={e => setPhone(e.target.value)}
                                                />
                                                {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                                            </div>

                                            {/* <div className="border-t border-gray-200 dark:border-gray-600 pt-3 sm:pt-4">
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-sm sm:text-base">
                                          Payment Information
                                        </h4>
                                        <div className="space-y-3">
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                              Card Number
                                            </label>
                                            <input
                                              type="text"
                                              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                              placeholder="1234 5678 9012 3456"
                                            />
                                          </div>
                                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Expiry Date
                                              </label>
                                              <input
                                                type="text"
                                                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="MM/YY"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                CVV
                                              </label>
                                              <input
                                                type="text"
                                                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                                placeholder="123"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      </div> */}

                                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setShowCartModal(false)}
                                                    className="w-full sm:flex-1 text-sm sm:text-base"
                                                >
                                                    Continue Shopping
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-sm sm:text-base"
                                                >
                                                    Complete Purchase (${getCartTotal().toFixed(2)})
                                                </Button>
                                            </div>
                                        </form>
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

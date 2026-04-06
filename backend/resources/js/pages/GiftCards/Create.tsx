"use client"

import React from "react"
import { Head, router, useForm } from "@inertiajs/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Gift,
    ArrowLeft,
    Loader2,
    Plus,
    Calendar,
    Globe
} from "lucide-react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import toast from "react-hot-toast"

interface Brand {
    productId?: number
    brandName?: string
    countryName?: string
    currency?: string
    denominations?: number[]
    valueRestrictions?: {
        minVal?: number
        maxVal?: number
    }
    productImage?: string
    productDescription?: string
    termsAndConditions?: string
    howToUse?: string
    expiryAndValidity?: string // Text format like "1 YEAR" or "4 Months to claim, 7 Months to redeem"
    discount?: number
    [key: string]: unknown
}

interface CreateProps {
    brands?: Brand[]
    selectedCountry?: string
    availableCountries?: Record<string, string>
    apiError?: string | null
    organization: {
        id: number
        name: string
    } | null
}

export default function CreatePage({
    brands = [],
    selectedCountry = 'USA',
    availableCountries = {},
    apiError = null,
    organization
}: CreateProps) {
    const [selectedBrandData, setSelectedBrandData] = React.useState<Brand | null>(null)

    const { data, setData, post, processing, errors } = useForm({
        brand: '',
        brand_name: '',
        product_id: '', // Store selected productId
        amount: 0,
        country: selectedCountry === 'USA' ? 'United States' : selectedCountry,
        currency: 'USD',
        expires_at: '',
    })

    const handleCountryChange = (country: string) => {
        // Reload page with new country to fetch brands
        router.get(route('gift-cards.create'), {
            country: country
        }, {
            preserveState: false,
            preserveScroll: false,
        })
    }

    const handleBrandSelect = (selectedBrand: Brand | null) => {
        if (selectedBrand) {
            const brandName = selectedBrand.brandName || ''
            const currency = selectedBrand.currency || 'USD'
            const countryName = selectedBrand.countryName || (selectedCountry === 'USA' ? 'United States' : selectedCountry)
            const productId = selectedBrand.productId?.toString() || ''

            // Get amount from denominations (first available) or use minVal from restrictions
            let amount = 0
            if (selectedBrand.denominations && selectedBrand.denominations.length > 0) {
                amount = selectedBrand.denominations[0] // Use first denomination
            } else if (selectedBrand.valueRestrictions?.minVal) {
                amount = selectedBrand.valueRestrictions.minVal
            }

            // Store selected brand data for displaying additional info
            setSelectedBrandData(selectedBrand)

            setData({
                ...data,
                brand: brandName,
                brand_name: brandName,
                product_id: productId,
                currency: currency,
                country: countryName,
                amount: amount,
            })
        } else {
            // Reset to defaults when no brand selected
            setSelectedBrandData(null)
            setData({
                ...data,
                brand: '',
                brand_name: '',
                product_id: '',
                currency: 'USD',
                country: selectedCountry === 'USA' ? 'United States' : selectedCountry,
                amount: 0,
            })
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post(route('gift-cards.store'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Gift card created successfully!')
            },
            onError: (errors) => {
                console.log('Form errors:', errors)

                if (errors && typeof errors === 'object') {
                    let hasShownError = false
                    Object.entries(errors).forEach(([, value]) => {
                        if (value) {
                            hasShownError = true
                            if (Array.isArray(value)) {
                                value.forEach(err => {
                                    if (typeof err === 'string') {
                                        toast.error(err)
                                    }
                                })
                            } else if (typeof value === 'string') {
                                toast.error(value)
                            }
                        }
                    })

                    if (!hasShownError) {
                        toast.error('Failed to create gift card. Please try again.')
                    }
                } else {
                    toast.error('Failed to create gift card. Please try again.')
                }
            }
        })
    }

    // Default countries if not provided
    const countries = Object.keys(availableCountries).length > 0
        ? availableCountries
        : {
            'USA': 'United States',
            'Canada': 'Canada',
            'UK': 'United Kingdom',
            'France': 'France',
            'India': 'India',
            'Italy': 'Italy',
            'Japan': 'Japan',
        }

    return (
        <AppSidebarLayout>
            <Head title="Create Gift Card" />

            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl py-4 px-4 md:py-6 md:px-10">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.visit(route('gift-cards.index'))}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                </div>

                <div className="max-w-2xl mx-auto w-full">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Gift className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl">Create Gift Card</CardTitle>
                                    <CardDescription>
                                        {organization ? `Create a gift card for ${organization.name}` : 'Create a new gift card'}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Country Selection */}
                                <div>
                                    <Label htmlFor="country_select">
                                        <Globe className="h-4 w-4 inline mr-2" />
                                        Select Country *
                                    </Label>
                                    <select
                                        id="country_select"
                                        value={selectedCountry}
                                        onChange={(e) => handleCountryChange(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md border border-input bg-background"
                                        required
                                    >
                                        {Object.entries(countries).map(([key, value]) => (
                                            <option key={key} value={key}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Select a country to see available brands
                                    </p>
                                </div>

                                {/* Brand Selection from Phaze API */}
                                <div>
                                    <Label htmlFor="brand_select">Select Brand *</Label>
                                    <select
                                        id="brand_select"
                                        value={data.product_id}
                                        onChange={(e) => {
                                            const selectedProductId = e.target.value
                                            const selectedBrand = brands.find(b =>
                                                b.productId?.toString() === selectedProductId
                                            ) || null
                                            handleBrandSelect(selectedBrand)
                                        }}
                                        className="w-full px-3 py-2 rounded-md border border-input bg-background"
                                        required
                                        disabled={brands.length === 0}
                                    >
                                        <option value="">
                                            {brands.length === 0 ? 'Loading brands...' : 'Select a brand'}
                                        </option>
                                        {brands.map((brand) => {
                                            const brandName = brand.brandName || 'Unknown Brand'
                                            const productId = brand.productId?.toString() || ''
                                            const currency = brand.currency || ''
                                            const amountInfo = brand.denominations && brand.denominations.length > 0
                                                ? ` - From ${currency}${brand.denominations[0]}`
                                                : brand.valueRestrictions?.minVal
                                                    ? ` - Min ${currency}${brand.valueRestrictions.minVal}`
                                                    : ''
                                            return (
                                                <option key={productId} value={productId}>
                                                    {brandName} {currency ? `(${currency})` : ''}{amountInfo}
                                                </option>
                                            )
                                        })}
                                    </select>
                                    {apiError && (
                                        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                                                API Error
                                            </p>
                                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                                {apiError}
                                            </p>
                                        </div>
                                    )}
                                    {brands.length === 0 && !apiError && (
                                        <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                                                No brands available for {countries[selectedCountry] || selectedCountry}
                                            </p>
                                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                                Please try selecting a different country or check your Phaze API configuration.
                                            </p>
                                        </div>
                                    )}
                                    {errors.brand_name && (
                                        <p className="text-sm text-destructive mt-1">{errors.brand_name}</p>
                                    )}
                                </div>

                                {/* Brand Name (auto-filled, disabled) */}
                                <div>
                                    <Label htmlFor="brand_name_display">Brand Name *</Label>
                                    <Input
                                        id="brand_name_display"
                                        type="text"
                                        value={data.brand_name}
                                        disabled
                                        readOnly
                                        className="bg-muted cursor-not-allowed"
                                        placeholder="Select a brand to auto-fill"
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Auto-filled from selected brand
                                    </p>
                                    {errors.brand_name && (
                                        <p className="text-sm text-destructive mt-1">{errors.brand_name}</p>
                                    )}
                                </div>

                                {/* Amount (auto-filled from brand denominations, disabled) */}
                                <div>
                                    <Label htmlFor="amount">Amount *</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        value={data.amount || ''}
                                        disabled
                                        readOnly
                                        className="bg-muted cursor-not-allowed"
                                        placeholder="Select a brand to auto-fill amount"
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Amount is set automatically from brand's available denominations
                                    </p>
                                    {errors.amount && (
                                        <p className="text-sm text-destructive mt-1">{errors.amount}</p>
                                    )}
                                </div>

                                {/* Country (auto-filled, disabled) */}
                                <div>
                                    <Label htmlFor="country">Country *</Label>
                                    <Input
                                        id="country"
                                        type="text"
                                        value={data.country}
                                        disabled
                                        readOnly
                                        className="bg-muted cursor-not-allowed"
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Auto-filled from selected brand
                                    </p>
                                    {errors.country && (
                                        <p className="text-sm text-destructive mt-1">{errors.country}</p>
                                    )}
                                </div>

                                {/* Currency (auto-filled from brand, disabled) */}
                                <div>
                                    <Label htmlFor="currency">Currency *</Label>
                                    <Input
                                        id="currency"
                                        type="text"
                                        value={data.currency}
                                        disabled
                                        readOnly
                                        className="bg-muted cursor-not-allowed"
                                        placeholder="USD"
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Auto-filled from selected brand
                                    </p>
                                    {errors.currency && (
                                        <p className="text-sm text-destructive mt-1">{errors.currency}</p>
                                    )}
                                </div>

                                {/* Expiry and Validity Information (from brand) */}
                                {selectedBrandData?.expiryAndValidity && (
                                    <div>
                                        <Label>
                                            <Calendar className="h-4 w-4 inline mr-2" />
                                            Expiry & Validity Information
                                        </Label>
                                        <div className="w-full px-3 py-2 rounded-md border border-input bg-muted min-h-[60px]">
                                            <div
                                                className="text-sm prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{
                                                    __html: selectedBrandData.expiryAndValidity
                                                        .replace(/&lt;/g, '<')
                                                        .replace(/&gt;/g, '>')
                                                        .replace(/&amp;/g, '&')
                                                }}
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            This information is provided by the brand. The gift card expiration date will be set automatically (1 year from creation date).
                                        </p>
                                    </div>
                                )}

                                {/* Additional Brand Information */}
                                {selectedBrandData && (
                                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                                        <div>
                                            <Label className="text-sm font-semibold">Available Denominations</Label>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {selectedBrandData.denominations && selectedBrandData.denominations.length > 0 ? (
                                                    selectedBrandData.denominations.map((denom, index) => (
                                                        <span
                                                            key={index}
                                                            className="px-3 py-1 bg-background border rounded-md text-sm"
                                                        >
                                                            {selectedBrandData.currency} {denom}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">
                                                        {selectedBrandData.valueRestrictions?.minVal
                                                            ? `Min: ${selectedBrandData.currency} ${selectedBrandData.valueRestrictions.minVal}`
                                                            : 'No denominations specified'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Amount is set to the first available denomination: {selectedBrandData.currency} {data.amount}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="flex gap-4">
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={processing || brands.length === 0}
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create Gift Card
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.visit(route('gift-cards.index'))}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppSidebarLayout>
    )
}

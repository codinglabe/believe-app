"use client"

import { Head, router, useForm, usePage } from "@inertiajs/react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Badge } from "@/components/frontend/ui/badge"
import {
    Gift,
    ArrowLeft,
    CreditCard,
    DollarSign,
    Loader2,
    CheckCircle,
    Building2,
    Calendar,
    Globe,
    Info,
    Coins
} from "lucide-react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import toast from "react-hot-toast"
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

interface Organization {
    id: number
    name: string
    gift_card_terms_approved?: boolean
}

interface PurchaseDetailsProps {
    brand: Brand
    country: string
    user?: {
        id: number
        name: string
        email: string
        role: string
    } | null
    followingOrganizations: Organization[]
}

export default function PurchaseDetailsPage({ brand, country, user, followingOrganizations }: PurchaseDetailsProps) {
    const page = usePage()
    const auth = (page.props as any).auth
    const currentBalance = parseFloat(auth?.user?.believe_points) || 0

    const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
    const [customAmount, setCustomAmount] = useState("")
    const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("")
    const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'believe_points'>('stripe')

    const { data, setData, post, processing, errors } = useForm({
        productId: brand.productId || 0,
        amount: 0,
        organization_id: 0,
        country: country,
        brand_name: brand.productName || '',
        currency: 'USD',
        payment_method: paymentMethod,
    })

    // Update form data when payment method changes
    useEffect(() => {
        setData('payment_method', paymentMethod)
    }, [paymentMethod])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount)
    }

    const denominations = brand.denominations || []
    const valueRestrictions = brand.valueRestrictions || {
        minVal: 0.01,
        maxVal: 10000
    }

    // Fix NaN issues - ensure minVal and maxVal are valid numbers
    const minVal = (valueRestrictions.minVal && !isNaN(valueRestrictions.minVal) && valueRestrictions.minVal > 0)
        ? Number(valueRestrictions.minVal)
        : 0.01
    const maxVal = (valueRestrictions.maxVal && !isNaN(valueRestrictions.maxVal) && valueRestrictions.maxVal > 0)
        ? Number(valueRestrictions.maxVal)
        : null
    const hasMaxLimit = maxVal !== null && maxVal > 0

    const handleAmountSelect = (amount: number) => {
        setSelectedAmount(amount)
        // Also set in custom amount input field
        setCustomAmount(amount.toString())
        setData('amount', amount)
    }

    const handleCustomAmount = (value: string) => {
        setCustomAmount(value)
        setSelectedAmount(null)
        const numValue = parseFloat(value)
        if (!isNaN(numValue) && numValue >= minVal && (maxVal === null || numValue <= maxVal)) {
            setData('amount', numValue)
        } else {
            setData('amount', 0)
        }
    }

    const handleOrganizationSelect = (orgId: string) => {
        setSelectedOrganizationId(orgId)
        setData('organization_id', parseInt(orgId))
    }

    // Get selected organization details
    const selectedOrganization = followingOrganizations.find(org => org.id.toString() === selectedOrganizationId)
    const isOrganizationApproved = selectedOrganization?.gift_card_terms_approved ?? false

    const handlePurchase = (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedOrganizationId) {
            toast.error('Please select an organization')
            return
        }

        // Validate amount - if maxVal is null/0, only check minVal
        if (data.amount < minVal || (maxVal !== null && data.amount > maxVal)) {
            const maxMsg = maxVal !== null ? ` and ${formatCurrency(maxVal)}` : ''
            toast.error(`Amount must be at least ${formatCurrency(minVal)}${maxMsg}`)
            return
        }

        if (!user || user.role !== 'user') {
            if (!user) {
                router.visit(route('login'))
            } else {
                toast.error('Only users can purchase gift cards')
            }
            return
        }

        post(route('gift-cards.purchase.store'), {
            preserveScroll: true,
            onSuccess: () => {
                // Redirect to Stripe checkout will happen via response
            },
            onError: (errors) => {
                if (errors && typeof errors === 'object') {
                    Object.entries(errors).forEach(([key, value]) => {
                        if (value) {
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
                } else {
                    toast.error('Failed to process purchase. Please try again.')
                }
            }
        })
    }

    // If maxVal is null/0, only check minVal. Otherwise check both min and max
    const isValidAmount = data.amount >= minVal &&
                          (maxVal === null || data.amount <= maxVal) &&
                          data.amount > 0
    const isValidForm = isValidAmount && selectedOrganizationId

    return (
        <FrontendLayout>
            <Head title={`${brand.productName || 'Gift Card'} - Purchase`} />

            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 dark:from-gray-900 dark:via-gray-900 dark:to-primary/10">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    {/* Header */}
                    <div className="mb-8">
                        <Button
                            variant="ghost"
                            onClick={() => router.visit(route('gift-cards.index'))}
                            className="mb-4 dark:hover:bg-gray-800"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Gift Cards
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-primary/10 dark:bg-primary/20">
                                <Gift className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold dark:text-white">{brand.productName || 'Gift Card'}</h1>
                                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                    <Globe className="h-4 w-4" />
                                    <span>{country}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Brand Details Section */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Brand Image - Large Display */}
                            <Card className="overflow-hidden shadow-xl border-2 dark:bg-gray-800 dark:border-gray-700">
                                {brand.productImage ? (
                                    <div className="w-full h-96 overflow-hidden bg-muted">
                                        <img
                                            src={brand.productImage}
                                            alt={brand.productName || 'Gift Card'}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full h-96 bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center">
                                        <Gift className="h-24 w-24 text-primary/50" />
                                    </div>
                                )}
                            </Card>

                            {/* Brand Information Card */}
                            <Card className="shadow-xl border-2 dark:bg-gray-800 dark:border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-3xl dark:text-white">{brand.productName || 'Gift Card'}</CardTitle>
                                    <CardDescription className="text-base flex items-center gap-4 mt-2">
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-4 w-4" />
                                            <span>{country}</span>
                                        </div>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Brand Description */}
                                    {brand.productDescription && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 dark:text-white">
                                                <Info className="h-5 w-5" />
                                                About This Brand
                                            </h3>
                                            <div
                                                className="text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
                                                dangerouslySetInnerHTML={{ __html: brand.productDescription }}
                                            />
                                        </div>
                                    )}

                                    {/* How to Use */}
                                    {brand.howToUse && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-3 dark:text-white">How to Use</h3>
                                            <div
                                                className="text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
                                                dangerouslySetInnerHTML={{ __html: brand.howToUse }}
                                            />
                                        </div>
                                    )}

                                    {/* Terms and Conditions */}
                                    {brand.termsAndConditions && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-3 dark:text-white">Terms and Conditions</h3>
                                            <div
                                                className="text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
                                                dangerouslySetInnerHTML={{ __html: brand.termsAndConditions }}
                                            />
                                        </div>
                                    )}

                                    {/* Expiry and Validity */}
                                    {brand.expiryAndValidity && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 dark:text-white">
                                                <Calendar className="h-5 w-5" />
                                                Expiry & Validity
                                            </h3>
                                            <div
                                                className="text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
                                                dangerouslySetInnerHTML={{ __html: brand.expiryAndValidity }}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Purchase Form */}
                            <Card className="shadow-xl border-2 dark:bg-gray-800 dark:border-gray-700">
                                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
                                    <CardTitle className="text-2xl dark:text-white">Purchase Gift Card</CardTitle>
                                    <CardDescription>Select organization and choose your desired gift card value</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <form onSubmit={handlePurchase} className="space-y-6">
                                        {/* General Errors */}
                                        {((errors as any).auth || (errors as any).error) && (
                                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                                <p className="text-sm text-destructive">
                                                    {(errors as any).auth || (errors as any).error}
                                                </p>
                                            </div>
                                        )}

                                        {/* Organization Selection */}
                                        {user && user.role === 'user' && followingOrganizations.length > 0 && (
                                            <div>
                                                <Label className="text-base mb-4 block dark:text-gray-300">
                                                    Select Organization <span className="text-destructive">*</span>
                                                </Label>
                                                <Select value={selectedOrganizationId} onValueChange={handleOrganizationSelect}>
                                                    <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600">
                                                        <Building2 className="h-4 w-4 mr-2" />
                                                        <SelectValue placeholder="Choose an organization" />
                                                    </SelectTrigger>
                                                    <SelectContent className="dark:bg-gray-800">
                                                        {followingOrganizations.map((org) => (
                                                            <SelectItem
                                                                key={org.id}
                                                                value={org.id.toString()}
                                                                className="dark:hover:bg-gray-700"
                                                            >
                                                                {org.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {errors.organization_id && (
                                                    <p className="text-sm text-destructive mt-2">{errors.organization_id}</p>
                                                )}
                                                {selectedOrganizationId && !isOrganizationApproved && (
                                                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                                        <div className="flex items-start gap-2">
                                                            <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                                            <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                                                <p className="font-semibold mb-1">Organization Approval Required</p>
                                                                <p>This organization has not approved the gift card program terms yet. Gift cards cannot be purchased until they approve the terms in their settings.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Amount Selection */}
                                        <div>
                                            <Label className="text-base mb-4 block dark:text-gray-300">Select Amount</Label>

                                            {/* Predefined Amounts */}
                                            {denominations.length > 0 && (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                                    {denominations.map((amount) => (
                                                        <button
                                                            key={amount}
                                                            type="button"
                                                            onClick={() => handleAmountSelect(amount)}
                                                            className={`p-4 rounded-lg border-2 transition-all dark:border-gray-600 ${
                                                                selectedAmount === amount
                                                                    ? 'border-primary bg-primary/10 dark:bg-primary/20 font-bold scale-105'
                                                                    : 'border-input hover:border-primary/50 dark:hover:border-gray-500'
                                                            }`}
                                                        >
                                                            <div className="font-semibold dark:text-white">{formatCurrency(amount)}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Custom Amount with Range Validation */}
                                            <div>
                                                <Label htmlFor="custom-amount" className="mb-2 block dark:text-gray-300">
                                                    Or enter custom amount
                                                </Label>
                                                <div className="space-y-2">
                                                    <Input
                                                        id="custom-amount"
                                                        type="number"
                                                        placeholder={hasMaxLimit
                                                            ? `Enter amount between ${formatCurrency(minVal)} - ${formatCurrency(maxVal)}`
                                                            : `Enter amount (minimum ${formatCurrency(minVal)})`
                                                        }
                                                        value={customAmount}
                                                        onChange={(e) => handleCustomAmount(e.target.value)}
                                                        min={minVal}
                                                        max={hasMaxLimit ? maxVal : undefined}
                                                        step="0.01"
                                                        className="text-lg dark:bg-gray-700 dark:border-gray-600"
                                                    />
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                        <span>Minimum: {formatCurrency(minVal)}</span>
                                                        {hasMaxLimit && (
                                                            <span>Maximum: {formatCurrency(maxVal)}</span>
                                                        )}
                                                    </div>
                                                    {customAmount && (
                                                        <div className="text-sm">
                                                            {(() => {
                                                                const numValue = parseFloat(customAmount)
                                                                if (isNaN(numValue) || customAmount === '') {
                                                                    return <span className="text-muted-foreground">Enter a valid amount</span>
                                                                } else if (numValue < minVal) {
                                                                    return <span className="text-destructive">Amount is below minimum ({formatCurrency(minVal)})</span>
                                                                } else if (hasMaxLimit && numValue > maxVal) {
                                                                    return <span className="text-destructive">Amount exceeds maximum ({formatCurrency(maxVal)})</span>
                                                                } else {
                                                                    return <span className="text-green-600 dark:text-green-400 font-medium">✓ Valid amount: {formatCurrency(numValue)}</span>
                                                                }
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {errors.amount && (
                                                <p className="text-sm text-destructive mt-2">{errors.amount}</p>
                                            )}
                                        </div>

                                        {/* Selected Amount Display */}
                                        {isValidAmount && (
                                            <div className="p-6 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 dark:from-primary/20 dark:via-primary/10 border-2 border-primary/20 shadow-lg">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                                                        <p className="text-4xl font-bold text-primary">
                                                            {formatCurrency(data.amount)}
                                                        </p>
                                                    </div>
                                                    <div className="p-4 rounded-full bg-primary/20 dark:bg-primary/30">
                                                        <DollarSign className="h-10 w-10 text-primary" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment Method Selection - Show when amount is valid and user is logged in */}
                                        {isValidAmount && user && user.role === 'user' && (
                                            <div className="space-y-4 p-4 border rounded-lg bg-muted/50 dark:bg-gray-700/50">
                                                <Label className="text-base font-semibold dark:text-gray-300">Payment Method</Label>

                                                <div className="grid grid-cols-1 gap-3">
                                                    {/* Stripe Payment */}
                                                    <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                        paymentMethod === 'stripe'
                                                            ? 'border-primary bg-primary/10 dark:bg-primary/20'
                                                            : 'border-input hover:border-primary/50 dark:border-gray-600 dark:hover:border-gray-500'
                                                    }`}>
                                                        <input
                                                            type="radio"
                                                            name="payment_method"
                                                            value="stripe"
                                                            checked={paymentMethod === 'stripe'}
                                                            onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'believe_points')}
                                                            className="w-4 h-4 text-primary"
                                                        />
                                                        <CreditCard className="h-5 w-5" />
                                                        <div className="flex-1">
                                                            <div className="font-semibold dark:text-white">Pay with Card (Stripe)</div>
                                                            <div className="text-sm text-muted-foreground">Secure payment via Stripe</div>
                                                        </div>
                                                    </label>

                                                    {/* Believe Points Payment */}
                                                    <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                        paymentMethod === 'believe_points'
                                                            ? 'border-primary bg-primary/10 dark:bg-primary/20'
                                                            : 'border-input hover:border-primary/50 dark:border-gray-600 dark:hover:border-gray-500'
                                                    } ${currentBalance < data.amount ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            name="payment_method"
                                                            value="believe_points"
                                                            checked={paymentMethod === 'believe_points'}
                                                            onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'believe_points')}
                                                            disabled={currentBalance < data.amount}
                                                            className="w-4 h-4 text-primary"
                                                        />
                                                        <Coins className="h-5 w-5 text-yellow-600" />
                                                        <div className="flex-1">
                                                            <div className="font-semibold flex items-center gap-2 dark:text-white">
                                                                Pay with Believe Points
                                                                {currentBalance < data.amount && (
                                                                    <Badge variant="destructive" className="text-xs">
                                                                        Insufficient
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                Your balance: {currentBalance.toFixed(2)} points
                                                                {currentBalance >= data.amount && (
                                                                    <span className="text-green-600 dark:text-green-400 ml-2">
                                                                        (You'll have {(currentBalance - data.amount).toFixed(2)} points remaining)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </label>
                                                </div>

                                                {paymentMethod === 'believe_points' && currentBalance < data.amount && (
                                                    <p className="text-sm text-destructive flex items-center gap-1">
                                                        <CheckCircle className="h-4 w-4" />
                                                        You need {data.amount.toFixed(2)} points but only have {currentBalance.toFixed(2)} points.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Submit Button */}
                                        {!user ? (
                                            <Button
                                                type="button"
                                                className="w-full bg-gradient-to-r from-primary to-primary/90 dark:from-primary dark:to-primary/90"
                                                size="lg"
                                                onClick={() => router.visit(route('login'))}
                                            >
                                                Login to Purchase
                                            </Button>
                                        ) : user.role !== 'user' ? (
                                            <Button disabled className="w-full" variant="outline" size="lg">
                                                Only users can purchase gift cards
                                            </Button>
                                        ) : followingOrganizations.length === 0 ? (
                                            <Button disabled className="w-full" variant="outline" size="lg">
                                                You need to follow at least one organization to purchase gift cards
                                            </Button>
                                        ) : (
                                            <Button
                                                type="submit"
                                                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg dark:from-primary dark:to-primary/90"
                                                size="lg"
                                                disabled={!isValidForm || processing || !isOrganizationApproved || (paymentMethod === 'believe_points' && currentBalance < data.amount)}
                                            >
                                                {processing ? (
                                                    <>
                                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : !isOrganizationApproved ? (
                                                    <>
                                                        <Info className="h-5 w-5 mr-2" />
                                                        Organization Approval Required
                                                    </>
                                                ) : paymentMethod === 'believe_points' ? (
                                                    <>
                                                        <Coins className="h-5 w-5 mr-2" />
                                                        Pay with Believe Points
                                                    </>
                                                ) : (
                                                    <>
                                                        <CreditCard className="h-5 w-5 mr-2" />
                                                        Proceed to Secure Payment
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar - Purchase Summary */}
                        <div className="space-y-6 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
                            {/* Purchase Summary Card */}
                            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border-2 border-primary/20 shadow-lg dark:bg-gray-800 dark:border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                                        <div className="p-2 rounded-lg bg-primary/20 dark:bg-primary/30">
                                            <Gift className="h-5 w-5 text-primary" />
                                        </div>
                                        Purchase Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Brand:</span>
                                            <span className="font-medium text-right max-w-[150px] truncate dark:text-white">{brand.productName || 'Gift Card'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-1">
                                                <Globe className="h-3 w-3" />
                                                Country:
                                            </span>
                                            <Badge variant="outline" className="dark:border-gray-600">{country}</Badge>
                                        </div>
                                        {selectedOrganizationId && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground flex items-center gap-1">
                                                    <Building2 className="h-3 w-3" />
                                                    Organization:
                                                </span>
                                                <span className="font-medium text-right max-w-[150px] truncate dark:text-white">
                                                    {followingOrganizations.find(org => org.id.toString() === selectedOrganizationId)?.name || ''}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Currency:</span>
                                            <span className="font-medium dark:text-white">USD</span>
                                        </div>
                                    </div>

                                    {/* Amount Range Info */}
                                    <div className="pt-3 border-t dark:border-gray-700">
                                        <p className="text-xs font-semibold text-muted-foreground mb-2">Available Amount Range:</p>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Min:</span>
                                                <span className="font-medium text-primary">{formatCurrency(minVal)}</span>
                                            </div>
                                            {hasMaxLimit && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Max:</span>
                                                    <span className="font-medium text-primary">{formatCurrency(maxVal)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Selected Amount Display */}
                                    {isValidAmount && (
                                        <div className="pt-3 border-t dark:border-gray-700">
                                            <div className="p-4 rounded-lg bg-primary/10 dark:bg-primary/20 border-2 border-primary/20">
                                                <p className="text-xs text-muted-foreground mb-1">Selected Amount</p>
                                                <p className="text-2xl font-bold text-primary">
                                                    {formatCurrency(data.amount)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Secure Payment Info */}
                            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-300 dark:border-green-700 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                                        <div className="p-2 rounded-lg bg-green-600/20">
                                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        Secure Payment
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-start gap-3 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-muted-foreground dark:text-gray-300">Instant delivery after payment</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-muted-foreground dark:text-gray-300">Secure Stripe payment processing</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-muted-foreground dark:text-gray-300">Full refund if not satisfied</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-muted-foreground dark:text-gray-300">24/7 customer support</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {brand.discount && brand.discount > 0 && (
                                <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-300 dark:border-green-700 shadow-lg">
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            <Badge className="bg-green-600 text-white text-lg px-4 py-1">
                                                {brand.discount}% OFF
                                            </Badge>
                                            <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                                                Special discount available!
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    )
}

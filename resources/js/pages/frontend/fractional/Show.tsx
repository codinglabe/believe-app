"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Link, router, Head, useForm } from "@inertiajs/react"
import { useState } from "react"
import {
    ArrowLeft,
    Coins,
    PieChart,
    TrendingUp,
    DollarSign,
    Building,
    Calendar,
    CheckCircle,
    Sparkles,
    ShoppingCart
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface FractionalAsset {
    id: number
    name: string
    type: string
    symbol: string | null
    description: string | null
}

interface FractionalOffering {
    id: number
    asset_id: number
    title: string
    summary: string | null
    total_shares: number
    available_shares: number
    price_per_share: number
    token_price: number | null
    ownership_percentage: number | null
    currency: string
    status: string
    go_live_at: string | null
    close_at: string | null
    created_at: string
    asset: FractionalAsset
}

interface FractionalShowProps {
    offering: FractionalOffering
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

export default function FractionalShow({ offering }: FractionalShowProps) {
    // Use token_price if available, otherwise fall back to price_per_share
    // Ensure it's always a number
    const tokenPrice = Number(offering.token_price || offering.price_per_share) || 0
    const costPerShare = Number(offering.price_per_share) || 0

    // Use the exact ownership_percentage from the offering (per token percentage)
    const ownershipPerToken = offering.ownership_percentage ? Number(offering.ownership_percentage) : 0

    const [amountToSpend, setAmountToSpend] = useState(tokenPrice > 0 ? tokenPrice.toFixed(2) : '0.00')
    const AssetIcon = assetTypeIcons[offering.asset.type] || Coins
    const assetColor = assetTypeColors[offering.asset.type] || 'bg-gray-100 text-gray-800'

    const soldShares = offering.total_shares - offering.available_shares
    const soldPercentage = Math.round((soldShares / offering.total_shares) * 100)
    const totalValue = offering.total_shares * costPerShare

    // Calculate tokens per share
    const tokensPerShare = tokenPrice > 0 && costPerShare > 0 ? Math.floor(costPerShare / tokenPrice) : 0
    const totalTokens = offering.total_shares * tokensPerShare
    const availableTokens = offering.available_shares * tokensPerShare

    const { data, setData, post, processing } = useForm({
        amount: tokenPrice,
    })

    // Calculate tokens from amount
    const calculateTokensFromAmount = (amount: number): number => {
        if (!amount || amount <= 0 || tokenPrice <= 0) return 0
        return Math.floor(amount / tokenPrice)
    }

    // Calculate full shares and tokens from amount invested
    const amountInvested = parseFloat(amountToSpend) || 0
    const fullShares = costPerShare > 0 ? Math.floor(amountInvested / costPerShare) : 0
    const remainingAmount = costPerShare > 0 ? amountInvested % costPerShare : amountInvested
    const tokensFromRemaining = tokenPrice > 0 ? Math.floor(remainingAmount / tokenPrice) : 0

    // Total tokens (from remaining amount after full shares)
    const validTokens = Math.min(tokensFromRemaining, availableTokens)
    const totalPrice = amountInvested

    // Calculate ownership percentage: (Amount Invested / Cost per Share) × 100
    // This calculates ownership based on the investment amount relative to full share price
    // Example: $75 invested, $75 cost per share = 100% ownership (1 full share)
    // Example: $10 invested, $75 cost per share = 13.333% ownership
    const ownershipPercentageValue = costPerShare > 0 && amountInvested > 0
        ? (amountInvested / costPerShare) * 100
        : 0
    // Format percentage: remove trailing zeros, show up to 3 decimal places
    const ownershipPercentage = ownershipPercentageValue > 0
        ? parseFloat(ownershipPercentageValue.toFixed(3)).toString()
        : '0'

    // Update amount
    const handleAmountChange = (value: string) => {
        setAmountToSpend(value)
        const amount = parseFloat(value) || 0
        setData('amount', amount)
    }

    const handlePurchase = (e: React.FormEvent) => {
        e.preventDefault()
        // if (validTokens < 0) {
        //     alert('Please enter a valid amount')
        //     return
        // }
        // TODO: Implement purchase flow with Stripe
        post(route('fractional.purchase', offering.id), {
            preserveScroll: true,
        })
    }

    return (
        <FrontendLayout>
            <Head title={`${offering.title} - Fractional Ownership`} />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
                {/* Back Button */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-6"
                >
                    <Link href={route('fractional.index')}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Offerings
                        </Button>
                    </Link>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Hero Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                                <div className="relative h-64 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
                                    <div className="absolute top-6 left-6 right-6 flex items-start justify-between">
                                        <Badge className={cn("px-4 py-2 font-semibold text-base shadow-lg border-0", assetColor)}>
                                            <AssetIcon className="h-5 w-5 mr-2" />
                                            <span className="capitalize font-medium">{offering.asset.type.replace('-', ' ')}</span>
                                        </Badge>
                                        {offering.available_shares === 0 && (
                                            <Badge className="bg-red-600 text-white px-4 py-2 font-semibold text-base shadow-lg border-0">
                                                Sold Out
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="absolute bottom-6 left-6 right-6">
                                        <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg mb-2">
                                            {offering.title}
                                        </h1>
                                        <div className="flex items-center gap-4 text-white/90">
                                            <div className="flex items-center gap-2">
                                                <Building className="h-5 w-5" />
                                                <span>{offering.asset.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="p-6">
                                    {offering.summary && (
                                        <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">
                                            {offering.summary}
                                        </p>
                                    )}

                                    {/* Asset Description */}
                                    {offering.asset.description && (
                                        <div className="mb-6">
                                            <h3 className="text-lg font-semibold mb-3">About the Asset</h3>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                {offering.asset.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Progress Section */}
                                    <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Investment Progress
                                            </span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {soldPercentage}% Funded
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${soldPercentage}%` }}
                                                transition={{ duration: 1 }}
                                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                                    {soldShares}
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">Shares Sold</p>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                                    {offering.available_shares}
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">Available</p>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                                    {offering.total_shares}
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">Total Shares</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Key Details */}
                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Price per Share</span>
                                            </div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                                {offering.currency} {costPerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <PieChart className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Total Value</span>
                                            </div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                                {offering.currency} {totalValue.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Purchase Sidebar */}
                    <div className="lg:col-span-1">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        >
                            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl sticky top-8 rounded-lg overflow-hidden">
                                <CardHeader className="bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-t-lg">
                                    <CardTitle className="text-xl">Purchase Shares</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <form onSubmit={handlePurchase} className="space-y-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="amount">Amount to Invest</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                                                    {offering.currency}
                                                </span>
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    step="0.01"
                                                    min={tokenPrice}
                                                    value={amountToSpend}
                                                    onChange={(e) => handleAmountChange(e.target.value)}
                                                    className="text-lg font-semibold pl-12"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                Minimum: {offering.currency} {tokenPrice.toFixed(2)}
                                            </p>
                                        </div>

                                        {/* Shares and Tokens Display */}
                                        <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                                                    What You're Purchasing
                                                </p>
                                                <div className="flex items-center justify-between">
                                                    {fullShares > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-10 h-10 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                                                                <span className="text-white font-bold text-sm">{fullShares}</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">Full Share{fullShares !== 1 ? 's' : ''}</p>
                                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                    {fullShares} {fullShares === 1 ? 'Share' : 'Shares'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {validTokens > 0 && (
                                                        <div className={`flex items-center gap-2 ${fullShares > 0 ? 'ml-4 pl-4 border-l border-gray-300 dark:border-gray-600' : ''}`}>
                                                            <div className="w-10 h-10 rounded-full bg-purple-600 dark:bg-purple-500 flex items-center justify-center">
                                                                <span className="text-white font-bold text-sm">{validTokens}</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">Token{validTokens !== 1 ? 's' : ''}</p>
                                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                    {validTokens} {validTokens === 1 ? 'Token' : 'Tokens'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {fullShares === 0 && validTokens === 0 && (
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Enter amount to see purchase details</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ownership Percentage */}
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Ownership %
                                                </span>
                                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                    {ownershipPercentage}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {offering.currency} {amountInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ÷ {offering.currency} {costPerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = {ownershipPercentage}% ownership
                                            </p>
                                        </div>

                                        <div className="space-y-3 pt-4 border-t">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Cost per Share</span>
                                                <span className="font-medium">
                                                    {offering.currency} {costPerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Token Price</span>
                                                <span className="font-medium">
                                                    {offering.currency} {tokenPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Purchase</span>
                                                <span className="font-medium">
                                                    {fullShares > 0 && validTokens > 0 ? (
                                                        <>{fullShares} {fullShares === 1 ? 'share' : 'shares'}, {validTokens} {validTokens === 1 ? 'token' : 'tokens'}</>
                                                    ) : fullShares > 0 ? (
                                                        <>{fullShares} {fullShares === 1 ? 'share' : 'shares'}</>
                                                    ) : (
                                                        <>{validTokens} {validTokens === 1 ? 'token' : 'tokens'}</>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-lg font-bold pt-2 border-t">
                                                <span>Total Price</span>
                                                <span className="text-blue-600 dark:text-blue-400">
                                                    {offering.currency} {totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                                            disabled={offering.available_shares === 0 || processing || amountInvested <= 0}
                                        >
                                            {offering.available_shares === 0 ? (
                                                <>
                                                    <span className="mr-2">❌</span>
                                                    Sold Out
                                                </>
                                            ) : processing ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                                    Processing...
                                                </>
                                            ) : amountInvested <= 0 ? (
                                                <>
                                                    <ShoppingCart className="h-5 w-5 mr-2" />
                                                    Enter Amount to Purchase
                                                </>
                                            ) : (
                                                <>
                                                    <ShoppingCart className="h-5 w-5 mr-2" />
                                                    {fullShares > 0 && validTokens > 0 ? (
                                                        <>Purchase {fullShares} {fullShares === 1 ? 'Share' : 'Shares'} & {validTokens} {validTokens === 1 ? 'Token' : 'Tokens'}</>
                                                    ) : fullShares > 0 ? (
                                                        <>Purchase {fullShares} {fullShares === 1 ? 'Share' : 'Shares'}</>
                                                    ) : (
                                                        <>Purchase {validTokens} {validTokens === 1 ? 'Token' : 'Tokens'}</>
                                                    )}
                                                </>
                                            )}
                                        </Button>

                                        {offering.available_shares > 0 && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                <span>Secure checkout with Stripe</span>
                                            </div>
                                        )}
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
                </div>
            </div>
        </FrontendLayout>
    )
}


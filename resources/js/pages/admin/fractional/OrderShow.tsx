"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link } from "@inertiajs/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    ArrowLeft,
    User,
    Mail,
    Hash,
    Calendar,
    DollarSign,
    Coins,
    PieChart,
    Building,
    CheckCircle,
    Copy,
    ShoppingCart
} from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"

interface User {
    id: number
    name: string
    email: string
}

interface FractionalAsset {
    id: number
    name: string
    type: string
}

interface FractionalOffering {
    id: number
    title: string
    asset: FractionalAsset
    price_per_share: number
    token_price: number | null
    currency: string
}

interface FractionalOrder {
    id: number
    order_number: string | null
    tag_number: string
    shares: number
    tokens: number
    amount: number
    paid_at: string
    payment_intent_id: string | null
    user: User
    offering: FractionalOffering
    meta: {
        full_shares?: number
        tokens?: number
        total_tokens?: number
        all_tag_numbers?: string[]
        [key: string]: unknown
    } | null
}

interface OrderShowProps {
    order: FractionalOrder
}

export default function OrderShow({ order }: OrderShowProps) {
    const [copied, setCopied] = useState<string | null>(null)

    const orderMeta = order.meta || {}
    const fullShares = orderMeta.full_shares ?? order.shares ?? 0
    const tokens = orderMeta.tokens ?? 0
    const costPerShare = order.offering.price_per_share
    const ownershipPercentage = costPerShare > 0 ? ((order.amount / costPerShare) * 100).toFixed(3) : '0'

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        setCopied(label)
        setTimeout(() => setCopied(null), 2000)
    }

    const CopyButton = ({ text, label }: { text: string; label: string }) => (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(text, label)}
            className="h-6 w-6 p-0"
        >
            <Copy className={`h-3 w-3 ${copied === label ? 'text-green-500' : ''}`} />
        </Button>
    )

    return (
        <AppLayout>
            <Head title={`Order #${order.order_number || order.id} - Fractional Ownership`} />

            <div className="m-2 md:m-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={route('admin.fractional.orders.index')}>
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Orders
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Order Details</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">Order {order.order_number || `#${order.id}`}</p>
                        </div>
                    </div>
                    <Badge className="bg-green-600 text-white px-4 py-2 text-sm font-semibold">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Paid
                    </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Buyer Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Buyer Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                            <User className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Buyer Name</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{order.user.name}</p>
                                        </div>
                                    </div>
                                    <CopyButton text={order.user.name} label="name" />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{order.user.email}</p>
                                        </div>
                                    </div>
                                    <CopyButton text={order.user.email} label="email" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Purchase Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5" />
                                    Purchase Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">Offering</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{order.offering.title}</p>
                                    </div>
                                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                                        <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-2">Asset</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{order.offering.asset.name}</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 text-center">Purchase Breakdown</p>
                                    <div className="flex items-center justify-center gap-6 flex-wrap">
                                        {fullShares > 0 && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                                                    <span className="text-white font-bold text-lg">{fullShares}</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Full Share{fullShares !== 1 ? 's' : ''}</p>
                                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                        {fullShares} {fullShares === 1 ? 'Share' : 'Shares'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {tokens > 0 && (
                                            <div className={`flex items-center gap-3 ${fullShares > 0 ? 'pl-6 border-l-2 border-gray-300 dark:border-gray-600' : ''}`}>
                                                <div className="w-12 h-12 rounded-full bg-purple-600 dark:bg-purple-500 flex items-center justify-center">
                                                    <span className="text-white font-bold text-lg">{tokens}</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Token{tokens !== 1 ? 's' : ''}</p>
                                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                        {tokens} {tokens === 1 ? 'Token' : 'Tokens'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Amount Invested</p>
                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {order.offering.currency} {order.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Ownership</p>
                                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{ownershipPercentage}%</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Total Tokens</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{order.tokens.toLocaleString()}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Order Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Order Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Hash className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Order Number</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900 dark:text-white">{order.order_number || `#${order.id}`}</span>
                                        <CopyButton text={order.order_number || String(order.id)} label="order" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Hash className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Tag Number</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900 dark:text-white">{order.tag_number}</span>
                                        <CopyButton text={order.tag_number} label="tag" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Purchase Date</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {format(new Date(order.paid_at), 'MMM dd, yyyy')}
                                    </span>
                                </div>
                                {order.payment_intent_id && (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4 text-gray-400" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Payment Intent</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[120px]">
                                                {order.payment_intent_id}
                                            </span>
                                            <CopyButton text={order.payment_intent_id} label="payment" />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Offering Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Offering Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Cost per Share</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {order.offering.currency} {costPerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Token Price</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {order.offering.currency} {(order.offering.token_price || costPerShare).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <Link href={route('admin.fractional.offerings.edit', order.offering.id)}>
                                    <Button variant="outline" className="w-full mt-4">
                                        View Offering
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}


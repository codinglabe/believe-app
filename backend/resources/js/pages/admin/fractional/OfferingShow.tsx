"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link } from "@inertiajs/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    ArrowLeft,
    PieChart,
    Building,
    DollarSign,
    Users,
    Coins,
    Hash,
    Calendar,
    Eye,
    Mail
} from "lucide-react"
import { format } from "date-fns"

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

interface FractionalOrder {
    id: number
    order_number: string | null
    tag_number: string
    shares: number
    tokens: number
    amount: number
    paid_at: string
    user: User
    meta: {
        full_shares?: number
        tokens?: number
        [key: string]: unknown
    } | null
}

interface FractionalOffering {
    id: number
    title: string
    summary: string | null
    total_shares: number
    available_shares: number
    price_per_share: number
    token_price: number | null
    ownership_percentage: number | null
    currency: string
    status: string
    asset: FractionalAsset
    created_at: string
}

interface OfferingShowProps {
    offering: FractionalOffering
    orders: FractionalOrder[]
    stats: {
        total_revenue: number
        total_buyers: number
        total_shares: number
        total_tokens: number
    }
}

export default function OfferingShow({ offering, orders, stats }: OfferingShowProps) {
    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; className: string }> = {
            draft: { label: 'Draft', className: 'bg-gray-500' },
            live: { label: 'Live', className: 'bg-green-500' },
            sold_out: { label: 'Sold Out', className: 'bg-blue-500' },
            closed: { label: 'Closed', className: 'bg-red-500' },
        }
        const config = statusConfig[status] || statusConfig.draft
        return (
            <Badge className={`${config.className} text-white`}>
                {config.label}
            </Badge>
        )
    }

    const soldShares = offering.total_shares - offering.available_shares
    const soldPercentage = offering.total_shares > 0 
        ? ((soldShares / offering.total_shares) * 100).toFixed(1)
        : '0'

    return (
        <AppLayout>
            <Head title={`${offering.title} - Fractional Offering`} />

            <div className="m-2 md:m-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={route('admin.fractional.offerings.index')}>
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Offerings
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{offering.title}</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">Offering Details & Buyers</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {getStatusBadge(offering.status)}
                        <Link href={route('admin.fractional.offerings.edit', offering.id)}>
                            <Button variant="outline">
                                Edit Offering
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Total Revenue</p>
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                        {offering.currency} {stats.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <DollarSign className="h-10 w-10 text-blue-500 dark:text-blue-400 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Total Buyers</p>
                                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                        {stats.total_buyers}
                                    </p>
                                </div>
                                <Users className="h-10 w-10 text-purple-500 dark:text-purple-400 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Shares Sold</p>
                                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                        {stats.total_shares} / {offering.total_shares}
                                    </p>
                                </div>
                                <PieChart className="h-10 w-10 text-green-500 dark:text-green-400 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Tokens Sold</p>
                                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                                        {stats.total_tokens.toLocaleString()}
                                    </p>
                                </div>
                                <Coins className="h-10 w-10 text-orange-500 dark:text-orange-400 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Offering Details */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Offering Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Asset</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{offering.asset.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Price per Share</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {offering.currency} {offering.price_per_share.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Token Price</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {offering.currency} {(offering.token_price || offering.price_per_share).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Ownership % per Token</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {offering.ownership_percentage ? Number(offering.ownership_percentage).toFixed(2) : '0.00'}%
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Total Shares</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{offering.total_shares}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Available Shares</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{offering.available_shares}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Progress</span>
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{soldPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div 
                                            className="bg-blue-600 h-2 rounded-full transition-all"
                                            style={{ width: `${soldPercentage}%` }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Buyers List */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Buyers ({orders.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {orders.length > 0 ? (
                                    <div className="space-y-3">
                                        {orders.map((order) => {
                                            const orderMeta = order.meta || {}
                                            const fullShares = orderMeta.full_shares ?? order.shares ?? 0
                                            const tokens = orderMeta.tokens ?? 0

                                            return (
                                                <div 
                                                    key={order.id}
                                                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-3 flex-1">
                                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                                <Users className="h-5 w-5 text-white" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                        {order.user.name}
                                                                    </h3>
                                                                    <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 text-xs">
                                                                        Paid
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
                                                                    <Mail className="h-3 w-3" />
                                                                    <span className="truncate">{order.user.email}</span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Hash className="h-3 w-3 text-gray-400" />
                                                                        <span className="text-gray-600 dark:text-gray-400">Order:</span>
                                                                        <span className="font-semibold text-gray-900 dark:text-white">{order.order_number || `#${order.id}`}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Hash className="h-3 w-3 text-gray-400" />
                                                                        <span className="text-gray-600 dark:text-gray-400">Tag:</span>
                                                                        <span className="font-semibold text-gray-900 dark:text-white">{order.tag_number}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Calendar className="h-3 w-3 text-gray-400" />
                                                                        <span className="text-gray-600 dark:text-gray-400">
                                                                            {format(new Date(order.paid_at), 'MMM dd, yyyy')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="mb-2">
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</p>
                                                                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                                                    {offering.currency} {order.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5 justify-end">
                                                                {fullShares > 0 && (
                                                                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs">
                                                                        {fullShares} {fullShares === 1 ? 'Share' : 'Shares'}
                                                                    </Badge>
                                                                )}
                                                                {tokens > 0 && (
                                                                    <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 text-xs">
                                                                        {tokens} {tokens === 1 ? 'Token' : 'Tokens'}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <Link href={route('admin.fractional.orders.show', order.id)} className="mt-2 inline-block">
                                                                <Button variant="ghost" size="sm" className="h-7 text-xs">
                                                                    <Eye className="h-3 w-3 mr-1" />
                                                                    View Order
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Buyers Yet</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            This offering hasn't received any purchases yet.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}


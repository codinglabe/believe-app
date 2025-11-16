"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Head, Link, router } from "@inertiajs/react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
    PieChart,
    Search,
    DollarSign,
    Coins,
    Eye,
    Calendar,
    Hash,
    Download,
    Building,
    TrendingUp
} from "lucide-react"
import { debounce } from "lodash"
import { format } from "date-fns"

interface FractionalAsset {
    id: number
    name: string
    type: string
}

interface FractionalOffering {
    id: number
    title: string
    asset: FractionalAsset
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
    offering: FractionalOffering
    meta: {
        full_shares?: number
        tokens?: number
        total_tokens?: number
        all_tag_numbers?: string[]
        [key: string]: unknown
    } | null
}

interface OrderPagination {
    data: FractionalOrder[]
    links: Array<{
        url: string | null
        label: string
        active: boolean
    }>
    meta: {
        current_page: number
        last_page: number
        from: number | null
        to: number | null
        total: number
    }
}

interface FractionalOwnershipProps {
    orders: OrderPagination
    stats: {
        total_invested: number
        total_orders: number
        total_shares: number
        total_tokens: number
    }
    filters: {
        search?: string
    }
}

export default function FractionalOwnership({ orders, stats, filters }: FractionalOwnershipProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '')

    const debouncedSearch = useMemo(
        () => debounce((search: string) => {
            const params: Record<string, string> = {}
            if (search.trim()) {
                params.search = search.trim()
            }
            router.get(route('profile.fractional-ownership'), params, {
                preserveState: true,
                replace: true
            })
        }, 300),
        []
    )

    const handleSearchChange = (value: string) => {
        setSearchQuery(value)
        debouncedSearch(value)
    }

    return (
        <ProfileLayout 
            title="My Fractional Ownership" 
            description="View all your fractional ownership investments and certificates"
        >
            <Head title="My Fractional Ownership" />

            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Total Invested</p>
                                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                        ${stats.total_invested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <DollarSign className="h-10 w-10 text-green-500 dark:text-green-400 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Total Orders</p>
                                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                        {stats.total_orders}
                                    </p>
                                </div>
                                <PieChart className="h-10 w-10 text-blue-500 dark:text-blue-400 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Total Shares</p>
                                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                        {stats.total_shares}
                                    </p>
                                </div>
                                <TrendingUp className="h-10 w-10 text-purple-500 dark:text-purple-400 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Total Tokens</p>
                                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                                        {stats.total_tokens.toLocaleString()}
                                    </p>
                                </div>
                                <Coins className="h-10 w-10 text-orange-500 dark:text-orange-400 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <Card>
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search by order number, tag number, offering, or asset..."
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Orders List */}
                {orders.data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {orders.data.map((order, index) => {
                            const orderMeta = order.meta || {}
                            const fullShares = orderMeta.full_shares ?? order.shares ?? 0
                            const tokens = orderMeta.tokens ?? 0
                            const allTagNumbers = orderMeta.all_tag_numbers || (order.tag_number ? [order.tag_number] : [])

                            return (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="hover:shadow-lg transition-all duration-200 border-border/50 overflow-hidden h-full flex flex-col">
                                        <CardContent className="p-4 space-y-3">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate mb-1">
                                                        {order.offering.title}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                        <Building className="h-3 w-3" />
                                                        <span className="truncate">{order.offering.asset.name}</span>
                                                    </div>
                                                </div>
                                                <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 text-xs px-2 py-0.5 h-5">
                                                    Paid
                                                </Badge>
                                            </div>

                                            {/* Order & Tag Info */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center gap-1.5 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                                                    <Hash className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Order</p>
                                                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                                            {order.order_number || `#${order.id}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                                                    <Hash className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Tag{allTagNumbers.length > 1 ? 's' : ''}</p>
                                                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                                            {allTagNumbers.length > 0 ? allTagNumbers[0] : order.tag_number}
                                                            {allTagNumbers.length > 1 && ` +${allTagNumbers.length - 1}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Purchase Breakdown */}
                                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Purchase</p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {fullShares > 0 && (
                                                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                                                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                                                {fullShares} {fullShares === 1 ? 'Share' : 'Shares'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {tokens > 0 && (
                                                        <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                                                            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                                                                {tokens} {tokens === 1 ? 'Token' : 'Tokens'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Amount & Date */}
                                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">Amount</span>
                                                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                                        {order.offering.currency} {order.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>Purchase Date</span>
                                                    </div>
                                                    <span>{format(new Date(order.paid_at), 'MMM dd, yyyy')}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                                                <Link 
                                                    href={route('fractional.certificate.show', order.id)} 
                                                    className="flex-1"
                                                >
                                                    <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                                                        <Download className="h-3 w-3 mr-1.5" />
                                                        Certificate
                                                    </Button>
                                                </Link>
                                                <Link 
                                                    href={route('fractional.show', order.offering.id)} 
                                                    className="flex-1"
                                                >
                                                    <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                                                        <Eye className="h-3 w-3 mr-1.5" />
                                                        View
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )
                        })}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Purchases Found</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {searchQuery 
                                    ? 'Try adjusting your search' 
                                    : "You haven't made any fractional ownership purchases yet"}
                            </p>
                            {!searchQuery && (
                                <Link href={route('fractional.index')}>
                                    <Button>
                                        Browse Offerings
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {orders.links && orders.links.length > 3 && (
                    <div className="flex justify-center">
                        <div className="flex gap-2">
                            {orders.links.map((link, index: number) => (
                                <Link
                                    key={index}
                                    href={link.url || '#'}
                                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                                        link.active
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </ProfileLayout>
    )
}


"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router } from "@inertiajs/react"
import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
    ShoppingCart, 
    Search, 
    DollarSign, 
    Users, 
    Coins,
    Eye,
    Calendar,
    Hash,
    X
} from "lucide-react"
import { debounce } from "lodash"
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

interface Offering {
    id: number
    title: string
}

interface OrderIndexProps {
    orders: {
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
    offerings: Offering[]
    filters: {
        search?: string
        offering_id?: string
    }
    stats: {
        total_revenue: number
        total_orders: number
        total_tokens: number
    }
}

export default function OrderIndex({ orders, offerings, filters, stats }: OrderIndexProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '')
    const [selectedOffering, setSelectedOffering] = useState(filters.offering_id || 'all')

    const debouncedSearch = useMemo(
        () => debounce((search: string, offeringId: string) => {
            const params: Record<string, string> = {}
            if (search.trim()) {
                params.search = search.trim()
            }
            if (offeringId) {
                params.offering_id = offeringId
            }
            router.get(route('admin.fractional.orders.index'), params, {
                preserveState: true,
                replace: true
            })
        }, 300),
        []
    )

    const handleSearchChange = (value: string) => {
        setSearchQuery(value)
        debouncedSearch(value, selectedOffering)
    }

    const handleOfferingChange = (value: string) => {
        setSelectedOffering(value)
        const offeringId = value === 'all' ? '' : value
        debouncedSearch(searchQuery, offeringId)
    }

    const clearFilters = () => {
        setSearchQuery('')
        setSelectedOffering('all')
        router.get(route('admin.fractional.orders.index'), {}, {
            preserveState: true,
            replace: true
        })
    }

    return (
        <AppLayout>
            <Head title="Fractional Ownership Orders" />

            <div className="m-2 md:m-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders & Buyers</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">View all sold shares and buyer details</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total Revenue</p>
                                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                                        ${stats.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <DollarSign className="h-12 w-12 text-blue-500 dark:text-blue-400 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Total Orders</p>
                                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                                        {stats.total_orders.toLocaleString()}
                                    </p>
                                </div>
                                <ShoppingCart className="h-12 w-12 text-purple-500 dark:text-purple-400 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Total Tokens Sold</p>
                                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                                        {stats.total_tokens.toLocaleString()}
                                    </p>
                                </div>
                                <Coins className="h-12 w-12 text-green-500 dark:text-green-400 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Search by buyer name, email, tag number, or offering..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={selectedOffering} onValueChange={handleOfferingChange}>
                                <SelectTrigger className="w-full sm:w-[250px]">
                                    <SelectValue placeholder="Filter by Offering" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Offerings</SelectItem>
                                    {offerings.map((offering) => (
                                        <SelectItem key={offering.id} value={String(offering.id)}>
                                            {offering.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {(searchQuery || (selectedOffering && selectedOffering !== 'all')) && (
                                <Button variant="outline" onClick={clearFilters}>
                                    <X className="h-4 w-4 mr-2" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Orders List */}
                {orders.data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {orders.data.map((order, index) => {
                            const orderMeta = order.meta || {}
                            const fullShares = orderMeta.full_shares ?? order.shares ?? 0
                            const tokens = orderMeta.tokens ?? 0
                            
                            return (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="hover:shadow-lg transition-all duration-200 border-border/50 overflow-hidden h-full flex flex-col">
                                        <CardHeader className="pb-3 border-b px-4 pt-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10">
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                                                    <Users className="h-5 w-5 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                            {order.user.name}
                                                        </h3>
                                                        <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 text-xs px-2 py-0.5 h-5">
                                                            Paid
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                        {order.user.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>{format(new Date(order.paid_at), 'MMM dd, yyyy')}</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                                            {/* Order & Tag Info */}
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                                                    <Hash className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Order</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                            {order.order_number || `#${order.id}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                                                    <Hash className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Tag</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                            {order.tag_number}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Offering & Asset */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between py-1">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Offering</span>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate ml-2">{order.offering.title}</span>
                                                </div>
                                                <div className="flex items-center justify-between py-1">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Asset</span>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate ml-2">{order.offering.asset.name}</span>
                                                </div>
                                            </div>

                                            {/* Purchase Breakdown */}
                                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Breakdown</p>
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

                                            {/* Amount */}
                                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-auto">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</span>
                                                    <span className="text-base font-bold text-green-600 dark:text-green-400">
                                                        {order.offering.currency} {order.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* View Details Button */}
                                            <Link href={route('admin.fractional.orders.show', order.id)} className="mt-2">
                                                <Button variant="outline" className="w-full h-9 text-sm">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Details
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )
                        })}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Orders Found</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {searchQuery || selectedOffering 
                                    ? 'Try adjusting your search filters' 
                                    : 'No purchases have been made yet'}
                            </p>
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
        </AppLayout>
    )
}


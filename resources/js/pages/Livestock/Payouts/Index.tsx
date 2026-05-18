"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Link, router, Head } from "@inertiajs/react"
import { useState, useCallback } from "react"
import debounce from "lodash.debounce"
import { Eye, DollarSign, Calendar, Search, CheckCircle, Clock, XCircle, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
interface Payout {
    id: number
    amount: number
    currency: string
    payout_type: string
    status: string
    created_at: string
    paid_at: string | null
}

interface PayoutsIndexProps {
    payouts: {
        data: Payout[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
    }
    filters: {
        status?: string
    }
}

export default function PayoutsIndex({ payouts, filters }: PayoutsIndexProps) {
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all')

    const handleStatusChange = (status: string) => {
        const actualStatus = status === 'all' ? '' : status
        setSelectedStatus(status)
        const params: Record<string, string> = {}
        if (actualStatus) params.status = actualStatus
        
        router.get(route('payouts.index'), params, {
            preserveState: true,
            replace: true
        })
    }

    const totalPending = payouts.data
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)

    const totalPaid = payouts.data
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)

    return (
        <LivestockDashboardLayout>
            <Head title="Payouts - Livestock Management" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payouts</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Track your earnings and payouts
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Filter */}
                        <Select value={selectedStatus} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                <Calendar className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Payouts</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        ${totalPending.toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                    <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-green-200 dark:border-green-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Paid</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        ${totalPaid.toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-blue-200 dark:border-blue-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Payouts</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                        {payouts.total}
                                    </p>
                                </div>
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Payouts Grid */}
                {payouts.data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {payouts.data.map((payout) => {
                            const getStatusConfig = (status: string) => {
                                switch (status) {
                                    case 'paid':
                                        return {
                                            icon: CheckCircle,
                                            bgColor: 'bg-green-500 hover:bg-green-600',
                                            textColor: 'text-white',
                                            borderColor: 'border-green-500',
                                            iconBg: 'bg-green-100 dark:bg-green-900/30',
                                            iconColor: 'text-green-600 dark:text-green-400'
                                        }
                                    case 'pending':
                                        return {
                                            icon: Clock,
                                            bgColor: 'bg-amber-500 hover:bg-amber-600',
                                            textColor: 'text-white',
                                            borderColor: 'border-amber-500',
                                            iconBg: 'bg-amber-100 dark:bg-amber-900/30',
                                            iconColor: 'text-amber-600 dark:text-amber-400'
                                        }
                                    case 'failed':
                                    case 'cancelled':
                                        return {
                                            icon: XCircle,
                                            bgColor: 'bg-red-500 hover:bg-red-600',
                                            textColor: 'text-white',
                                            borderColor: 'border-red-500',
                                            iconBg: 'bg-red-100 dark:bg-red-900/30',
                                            iconColor: 'text-red-600 dark:text-red-400'
                                        }
                                    default:
                                        return {
                                            icon: DollarSign,
                                            bgColor: 'bg-gray-500 hover:bg-gray-600',
                                            textColor: 'text-white',
                                            borderColor: 'border-gray-500',
                                            iconBg: 'bg-gray-100 dark:bg-gray-900/30',
                                            iconColor: 'text-gray-600 dark:text-gray-400'
                                        }
                                }
                            }
                            const statusConfig = getStatusConfig(payout.status)
                            const StatusIcon = statusConfig.icon
                            
                            return (
                                <Card key={payout.id} className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-all hover:border-amber-300 dark:hover:border-amber-700">
                                    <CardContent className="p-4">
                                        <div className="space-y-3">
                                            {/* Header with Icon and Status */}
                                            <div className="flex items-start justify-between">
                                                <div className={`p-2.5 ${statusConfig.iconBg} rounded-lg`}>
                                                    <StatusIcon className={`h-5 w-5 ${statusConfig.iconColor}`} />
                                                </div>
                                                <Badge className={`${statusConfig.bgColor} ${statusConfig.textColor} border-0 shadow-sm text-xs`}>
                                                    <StatusIcon className="h-2.5 w-2.5 mr-1" />
                                                    {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                                                </Badge>
                                            </div>
                                            
                                            {/* Amount */}
                                            <div>
                                                <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                                    ${payout.amount.toLocaleString()}
                                                </h3>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase mt-0.5">
                                                    {payout.currency}
                                                </p>
                                            </div>
                                            
                                            {/* Payout Type */}
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                                                    {payout.payout_type.replace('_', ' ')}
                                                </p>
                                            </div>
                                            
                                            {/* Dates */}
                                            <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                    <Calendar className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                                    <span>Created: {format(new Date(payout.created_at), 'MMM dd, yyyy')}</span>
                                                </div>
                                                {payout.paid_at && (
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                        <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                                                        <span>Paid: {format(new Date(payout.paid_at), 'MMM dd, yyyy')}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* View Button */}
                                            <Link href={route('payouts.show', payout.id)} className="block">
                                                <Button variant="outline" size="sm" className="w-full border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 h-8 text-xs">
                                                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                                                    View Details
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg">
                        <CardContent className="p-16 text-center">
                            <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit mx-auto mb-6">
                                <DollarSign className="h-16 w-16 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                                No payouts yet
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Payouts will appear here when animals are sold or stud fees are paid.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {payouts.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {payouts.links.map((link, index) => (
                            <Button
                                key={index}
                                variant={link.active ? "default" : "outline"}
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                className={link.active ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20"}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </LivestockDashboardLayout>
    )
}


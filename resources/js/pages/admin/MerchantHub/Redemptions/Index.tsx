"use client"

import React, { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    Package,
    Gift,
    Store,
    User,
    Calendar,
    Coins,
    DollarSign,
    Eye,
    CheckCircle2,
    PauseCircle,
} from "lucide-react"
import { motion } from "framer-motion"
import type { BreadcrumbItem } from "@/types"
import { format } from "date-fns"

interface User {
    id: number
    name: string
    email: string
}

interface MerchantHubOffer {
    id: number
    title: string
    image_url: string | null
    merchant: {
        id: number
        name: string
    }
}

interface MerchantHubOfferRedemption {
    id: number
    merchant_hub_offer_id: number
    user_id: number
    points_spent: number
    cash_spent: number | null
    status: 'pending' | 'approved' | 'fulfilled' | 'canceled'
    receipt_code: string
    created_at: string
    updated_at: string
    user: User
    offer: MerchantHubOffer
}

interface RedemptionsIndexProps {
    redemptions: {
        data: MerchantHubOfferRedemption[]
        current_page: number
        last_page: number
        per_page: number
        total: number
        links: Array<{
            url: string | null
            label: string
            active: boolean
        }>
    }
    filters: {
        search: string
        status: string
    }
}

const breadcrumbs: BreadcrumbItem[] = [
    // { title: 'Dashboard', href: '/dashboard' },
    { title: 'Merchant Hub', href: '/admin/merchant-hub' },
    { title: 'Redemptions', href: '/admin/merchant-hub/redemptions' },
]

export default function AdminRedemptionsIndex({ redemptions, filters: initialFilters }: RedemptionsIndexProps) {
    const [search, setSearch] = useState(initialFilters.search || '')
    const [selectedStatus, setSelectedStatus] = useState(initialFilters.status || '')
    const [updateStatusDialogOpen, setUpdateStatusDialogOpen] = useState(false)
    const [redemptionToUpdate, setRedemptionToUpdate] = useState<MerchantHubOfferRedemption | null>(null)
    const [newStatus, setNewStatus] = useState<'pending' | 'approved' | 'fulfilled' | 'canceled'>('approved')
    const [isUpdating, setIsUpdating] = useState(false)

    const handleFilterChange = () => {
        router.get('/admin/merchant-hub/redemptions', {
            search: search || '',
            status: selectedStatus === 'all' ? '' : selectedStatus,
        }, {
            preserveState: true,
            replace: true,
        })
    }

    const handleSearch = (value: string) => {
        setSearch(value)
        // Debounce search - trigger on blur or enter
    }

    const handleStatusChange = (value: string) => {
        setSelectedStatus(value)
        handleFilterChange()
    }

    const handleUpdateStatusClick = (redemption: MerchantHubOfferRedemption) => {
        setRedemptionToUpdate(redemption)
        setNewStatus(redemption.status)
        setUpdateStatusDialogOpen(true)
    }

    const handleStatusUpdate = () => {
        if (!redemptionToUpdate) return

        setIsUpdating(true)
        router.put(`/admin/merchant-hub/redemptions/${redemptionToUpdate.id}/status`, {
            status: newStatus,
        }, {
            onFinish: () => {
                setIsUpdating(false)
                setUpdateStatusDialogOpen(false)
                setRedemptionToUpdate(null)
            },
        })
    }

    const getStatusConfig = (status: MerchantHubOfferRedemption['status']) => {
        switch (status) {
            case 'approved':
                return {
                    label: 'Approved',
                    variant: 'default' as const,
                    bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
                    color: 'text-emerald-800 dark:text-emerald-200',
                    icon: CheckCircle2,
                }
            case 'pending':
                return {
                    label: 'Pending',
                    variant: 'secondary' as const,
                    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
                    color: 'text-yellow-800 dark:text-yellow-200',
                    icon: Clock,
                }
            case 'fulfilled':
                return {
                    label: 'Fulfilled',
                    variant: 'default' as const,
                    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
                    color: 'text-blue-800 dark:text-blue-200',
                    icon: CheckCircle,
                }
            case 'canceled':
                return {
                    label: 'Canceled',
                    variant: 'destructive' as const,
                    bgColor: 'bg-red-100 dark:bg-red-900/20',
                    color: 'text-red-800 dark:text-red-200',
                    icon: XCircle,
                }
            default:
                return {
                    label: 'Unknown',
                    variant: 'secondary' as const,
                    bgColor: 'bg-gray-100 dark:bg-gray-800',
                    color: 'text-gray-800 dark:text-gray-200',
                    icon: Clock,
                }
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Redemptions Management - Admin" />

            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Redemptions Management</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Manage offer redemptions. Total: {redemptions.total} redemptions
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <Card className="border-gray-200 dark:border-gray-800">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by receipt code, user name, or offer title..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onBlur={handleFilterChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleFilterChange()
                                    }}
                                    className="pl-10 bg-white dark:bg-gray-800"
                                />
                            </div>
                            <Select value={selectedStatus || 'all'} onValueChange={handleStatusChange}>
                                <SelectTrigger className="bg-white dark:bg-gray-800">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Filter by Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                                    <SelectItem value="canceled">Canceled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Redemptions Table */}
                {redemptions.data.length > 0 ? (
                    <>
                        <Card className="border-gray-200 dark:border-gray-800">
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Receipt Code
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    User
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Offer
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Points / Cash
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Date
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                            {redemptions.data.map((redemption, index) => {
                                                const statusConfig = getStatusConfig(redemption.status)
                                                const StatusIcon = statusConfig.icon
                                                const offerImageUrl = redemption.offer.image_url
                                                    ? (redemption.offer.image_url.startsWith('http')
                                                        ? redemption.offer.image_url
                                                        : `/storage/${redemption.offer.image_url}`)
                                                    : '/placeholder.svg'

                                                return (
                                                    <motion.tr
                                                        key={redemption.id}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <Package className="h-4 w-4 text-gray-400" />
                                                                <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                                                                    {redemption.receipt_code}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                                    <User className="h-5 w-5 text-gray-400" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                        {redemption.user.name}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                        {redemption.user.email}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <img
                                                                    src={offerImageUrl}
                                                                    alt={redemption.offer.title}
                                                                    className="h-12 w-12 rounded-lg object-cover"
                                                                />
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                        {redemption.offer.title}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                        {redemption.offer.merchant.name}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-white">
                                                                    <Coins className="h-4 w-4 text-yellow-500" />
                                                                    <span>{redemption.points_spent.toLocaleString()} Points</span>
                                                                </div>
                                                                {redemption.cash_spent && redemption.cash_spent > 0 && (
                                                                    <div className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-white">
                                                                        <DollarSign className="h-4 w-4 text-green-500" />
                                                                        <span>${typeof redemption.cash_spent === 'number' ? redemption.cash_spent.toFixed(2) : parseFloat(redemption.cash_spent).toFixed(2)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <Badge
                                                                variant={statusConfig.variant}
                                                                className={`${statusConfig.bgColor} ${statusConfig.color} flex items-center gap-1.5 w-fit`}
                                                            >
                                                                <StatusIcon className="h-3 w-3" />
                                                                {statusConfig.label}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className="h-4 w-4" />
                                                                {format(new Date(redemption.created_at), 'MMM d, yyyy')}
                                                            </div>
                                                            <div className="text-xs mt-0.5">
                                                                {format(new Date(redemption.created_at), 'h:mm a')}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleUpdateStatusClick(redemption)}
                                                                className="hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20"
                                                            >
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                Update Status
                                                            </Button>
                                                        </td>
                                                    </motion.tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pagination */}
                        {redemptions.last_page > 1 && (
                            <Card className="border-gray-200 dark:border-gray-800">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            Showing {redemptions.data.length} of {redemptions.total} redemptions
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {redemptions.links.map((link, index) => (
                                                <Button
                                                    key={index}
                                                    variant={link.active ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => {
                                                        if (link.url) {
                                                            const url = new URL(link.url)
                                                            const params = Object.fromEntries(url.searchParams)
                                                            router.get('/admin/merchant-hub/redemptions', params, {
                                                                preserveState: true,
                                                                replace: true
                                                            })
                                                        }
                                                    }}
                                                    disabled={!link.url || link.active}
                                                    className={link.active ? "bg-primary hover:bg-primary/90" : ""}
                                                >
                                                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                ) : (
                    <div className="p-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Gift className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                            </div>
                            <div>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">No redemptions found</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Adjust your filters or wait for users to redeem offers.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Update Status Dialog */}
                <Dialog open={updateStatusDialogOpen} onOpenChange={setUpdateStatusDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Update Redemption Status</DialogTitle>
                            <DialogDescription>
                                Update the status for receipt code: <strong>{redemptionToUpdate?.receipt_code}</strong>
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    New Status
                                </label>
                                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as typeof newStatus)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="fulfilled">Fulfilled</SelectItem>
                                        <SelectItem value="canceled">Canceled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {redemptionToUpdate && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Redemption Details:</p>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                        <p>Offer: {redemptionToUpdate.offer.title}</p>
                                        <p>User: {redemptionToUpdate.user.name} ({redemptionToUpdate.user.email})</p>
                                        <p>Points: {redemptionToUpdate.points_spent.toLocaleString()}</p>
                                        {redemptionToUpdate.cash_spent && redemptionToUpdate.cash_spent > 0 && (
                                            <p>Cash: ${typeof redemptionToUpdate.cash_spent === 'number' ? redemptionToUpdate.cash_spent.toFixed(2) : parseFloat(redemptionToUpdate.cash_spent).toFixed(2)}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setUpdateStatusDialogOpen(false)
                                    setRedemptionToUpdate(null)
                                }}
                                disabled={isUpdating}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleStatusUpdate}
                                disabled={isUpdating || newStatus === redemptionToUpdate?.status}
                            >
                                {isUpdating ? 'Updating...' : 'Update Status'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    )
}


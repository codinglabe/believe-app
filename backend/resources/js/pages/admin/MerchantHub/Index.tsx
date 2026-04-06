"use client"

import React from "react"
import { Head, Link } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Store, Gift, ShoppingBag, CheckCircle, Clock, Package } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Merchant Hub', href: '/admin/merchant-hub' },
]

interface Stats {
    total_merchants: number
    active_merchants: number
    total_offers: number
    active_offers: number
    total_redemptions: number
    pending_redemptions: number
}

interface MerchantHubIndexProps {
    stats: Stats
}

export default function AdminMerchantHubIndex({ stats }: MerchantHubIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Merchant Hub Management" />

            <div className="space-y-6 p-4 sm:p-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Merchant Hub Management</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                        Manage merchants, offers, and redemptions
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Merchants</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {stats.total_merchants}
                                    </p>
                                </div>
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                                    <Store className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Merchants</p>
                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {stats.active_merchants}
                                    </p>
                                </div>
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                                    <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Offers</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {stats.total_offers}
                                    </p>
                                </div>
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                                    <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Offers</p>
                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {stats.active_offers}
                                    </p>
                                </div>
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                                    <Gift className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Redemptions</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {stats.total_redemptions}
                                    </p>
                                </div>
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                                    <ShoppingBag className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Redemptions</p>
                                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                        {stats.pending_redemptions}
                                    </p>
                                </div>
                                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-full">
                                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/admin/merchant-hub/merchants">
                        <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Store className="h-5 w-5" />
                                    Manage Merchants
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    View and manage all merchants
                                </p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/admin/merchant-hub/offers">
                        <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Gift className="h-5 w-5" />
                                    Manage Offers
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    View and manage all offers
                                </p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/admin/merchant-hub/redemptions">
                        <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingBag className="h-5 w-5" />
                                    View Redemptions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    View all redemption requests
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </AppLayout>
    )
}


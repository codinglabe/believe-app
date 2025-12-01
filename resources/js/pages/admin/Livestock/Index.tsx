"use client"

import AppLayout from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, Head } from "@inertiajs/react"
import { Users, Package, DollarSign, Clock, TrendingUp } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Admin", href: "/dashboard" },
    { title: "Livestock Management", href: "/admin/livestock" },
]

interface Stats {
    total_sellers: number
    pending_sellers: number
    active_listings: number
    pending_payouts: number
    total_payouts: number
}

interface IndexProps {
    stats: Stats
}

export default function AdminLivestockIndex({ stats }: IndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Livestock Management - Admin" />
            
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Livestock Management</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Manage sellers, listings, and payouts
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Sellers</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {stats.total_sellers}
                                    </p>
                                </div>
                                <Users className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Pending Sellers</p>
                                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                        {stats.pending_sellers}
                                    </p>
                                </div>
                                <Clock className="h-8 w-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Listings</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {stats.active_listings}
                                    </p>
                                </div>
                                <Package className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Pending Payouts</p>
                                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                        {stats.pending_payouts}
                                    </p>
                                </div>
                                <DollarSign className="h-8 w-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        ${stats.total_payouts.toLocaleString()}
                                    </p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link href="/admin/livestock/sellers">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Manage Sellers
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Verify and manage seller profiles
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/admin/livestock/listings">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    Manage Listings
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Review and manage marketplace listings
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/admin/livestock/payouts">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Manage Payouts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Approve and process seller payouts
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </AppLayout>
    )
}




"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link, router, Head } from "@inertiajs/react"
import { 
    Plus, 
    Eye, 
    Edit, 
    DollarSign,
    Heart,
    CheckCircle,
    Clock,
    AlertCircle,
    TrendingUp,
    Package
} from "lucide-react"
import { format } from "date-fns"
interface SellerProfile {
    id: number
    farm_name: string
    verification_status: string
}

interface Animal {
    id: number
    breed: string
    species: string
    status: string
    primary_photo?: { url: string } | null
    listing?: { id: number; price: number; status: string } | null
}

interface Listing {
    id: number
    title: string
    price: number
    status: string
    animal: {
        id: number
        breed: string
        primary_photo?: { url: string } | null
    }
}

interface Payout {
    id: number
    amount: number
    currency: string
    payout_type: string
    status: string
    created_at: string
}

interface DashboardProps {
    profile: SellerProfile
    animals: {
        data: Animal[]
        current_page: number
        last_page: number
        total: number
    }
    purchasedAnimals?: {
        data: Animal[]
        current_page: number
        last_page: number
        total: number
    }
    listings: {
        data: Listing[]
        current_page: number
        last_page: number
        total: number
    }
    payouts: {
        data: Payout[]
        current_page: number
        last_page: number
        total: number
    }
}

export default function SellerDashboard({ profile, animals, purchasedAnimals, listings, payouts }: DashboardProps) {
    const pendingPayouts = payouts.data.filter(p => p.status === 'pending')
    const totalPending = pendingPayouts.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)

    return (
        <LivestockDashboardLayout>
            <Head title="Seller Dashboard - Livestock Management" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Seller Dashboard</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Manage your livestock and listings
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link href={route('animals.create')}>
                            <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Animal
                            </Button>
                        </Link>
                        <Link href={route('seller.edit')}>
                            <Button variant="outline" className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Profile
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Profile Status */}
                <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Profile Status</CardTitle>
                            </div>
                            <Badge 
                                className={
                                    profile.verification_status === 'verified' 
                                        ? 'bg-green-500 hover:bg-green-600 text-white border-0' 
                                        : profile.verification_status === 'pending'
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white border-0'
                                        : 'bg-red-500 hover:bg-red-600 text-white border-0'
                                }
                            >
                                {profile.verification_status === 'verified' ? (
                                    <>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Verified
                                    </>
                                ) : profile.verification_status === 'pending' ? (
                                    <>
                                        <Clock className="h-3 w-3 mr-1" />
                                        Pending
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Rejected
                                    </>
                                )}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Farm Name</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{profile.farm_name}</p>
                            </div>
                            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Animals</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{animals.total}</p>
                            </div>
                            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active Listings</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{listings.total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                    <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-green-200 dark:border-green-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Animals</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{animals.total}</p>
                                </div>
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <Heart className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-blue-200 dark:border-blue-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Listings</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{listings.total}</p>
                                </div>
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-orange-200 dark:border-orange-800/50 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Payouts</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{payouts.total}</p>
                                </div>
                                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                                    <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Payouts */}
                <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                <DollarSign className="h-5 w-5 text-white" />
                            </div>
                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white pb-2">Recent Payouts</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {payouts.data.length > 0 ? (
                            <div className="space-y-3">
                                {payouts.data.map((payout) => (
                                    <div key={payout.id} className="flex items-center justify-between p-4 border border-amber-200 dark:border-amber-800/50 rounded-lg hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all bg-amber-50/30 dark:bg-amber-950/10">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">
                                                    ${payout.amount.toLocaleString()} {payout.currency}
                                            </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                                {payout.payout_type.replace('_', ' ')}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                                {format(new Date(payout.created_at), 'MMM dd, yyyy')}
                                            </p>
                                        </div>
                                        </div>
                                        <Badge className={
                                            payout.status === 'paid' 
                                                ? 'bg-green-500 hover:bg-green-600 text-white border-0' 
                                                : payout.status === 'pending'
                                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-0'
                                                : 'bg-red-500 hover:bg-red-600 text-white border-0'
                                        }>
                                            {payout.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit mx-auto mb-4">
                                    <DollarSign className="h-12 w-12 text-amber-600 dark:text-amber-400" />
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">No payouts yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </LivestockDashboardLayout>
    )
}


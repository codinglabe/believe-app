"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link, Head } from "@inertiajs/react"
import { 
    Package,
    ShoppingBag,
    TrendingUp,
    CheckCircle,
    Heart,
    Eye,
    PlusCircle,
    Building2,
    MapPin,
    Phone,
    Mail,
    User,
    Settings
} from "lucide-react"
import { route } from "ziggy-js"
import { format } from "date-fns"

interface BuyerProfile {
    id: number
    farm_name: string
    verification_status: string
    address?: string
    phone?: string
    email?: string
    city?: string
    state?: string
    country?: string
}

interface Animal {
    id: number
    species: string
    breed: string
    sex: string
    ear_tag: string | null
    age_months: number | null
    status: string
    primary_photo?: { url: string } | null
    listing?: { id: number; status: string } | null
    seller?: { id: number; name: string } | null
}

interface DashboardProps {
    profile: BuyerProfile
    purchasedAnimals: {
        data: Animal[]
        links: { url: string | null; label: string; active: boolean }[]
        current_page: number
        last_page: number
        total: number
    }
    stats: {
        total_purchased: number
        available: number
        sold: number
        listed: number
    }
}

export default function BuyerDashboard({ profile, purchasedAnimals, stats }: DashboardProps) {
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'available':
                return { label: 'Available', color: 'bg-green-500', icon: CheckCircle, bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-200 dark:border-green-800' }
            case 'sold':
                return { label: 'Purchased', color: 'bg-blue-500', icon: Package, bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-200 dark:border-blue-800' }
            default:
                return { label: status, color: 'bg-gray-500', icon: Package, bgColor: 'bg-gray-50 dark:bg-gray-900/20', borderColor: 'border-gray-200 dark:border-gray-800' }
        }
    }

    return (
        <LivestockDashboardLayout>
            <Head title="Buyer Dashboard - Livestock Management" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Buyer Dashboard</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                            Manage your purchased animals and farm profile
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={route('buyer.edit')}>
                            <Button variant="outline" className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                                <Settings className="h-4 w-4 mr-2" />
                                Edit Profile
                            </Button>
                        </Link>
                        <Link href={route('marketplace.index')}>
                            <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Browse Marketplace
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Profile Status Card */}
                <Card className="border-amber-200 dark:border-amber-800 shadow-sm">
                    <CardHeader className="pb-4 border-b border-amber-200 dark:border-amber-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 flex items-center justify-center shadow-sm">
                                    <Building2 className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">Farm Profile</CardTitle>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                        {profile.farm_name}
                                    </p>
                                </div>
                            </div>
                            <Badge 
                                variant={profile.verification_status === 'verified' ? 'default' : 'secondary'}
                                className={profile.verification_status === 'verified' 
                                    ? 'bg-green-500 hover:bg-green-600' 
                                    : 'bg-yellow-500 hover:bg-yellow-600'
                                }
                            >
                                {profile.verification_status === 'verified' ? 'Verified' : 'Pending'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {profile.address && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                    <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Address</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{profile.address}</p>
                                        {(profile.city || profile.state || profile.country) && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                                {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {profile.phone && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                    <Phone className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{profile.phone}</p>
                                    </div>
                                </div>
                            )}
                            {profile.email && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                    <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Farm Email</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{profile.email}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-amber-200 dark:border-amber-800 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total Purchased</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_purchased}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-amber-200 dark:border-amber-800 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Available</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.available}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-amber-200 dark:border-amber-800 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Sold</p>
                                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">{stats.sold}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-amber-200 dark:border-amber-800 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Listed</p>
                                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.listed}</p>
                                </div>
                                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <ShoppingBag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Purchased Animals */}
                <Card className="border-amber-200 dark:border-amber-800 shadow-sm">
                    <CardHeader className="pb-4 border-b border-amber-200 dark:border-amber-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 flex items-center justify-center">
                                    <Heart className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle>Purchased Animals</CardTitle>
                            </div>
                            <Link href={route('marketplace.index')}>
                                <Button variant="outline" size="sm">
                                    <ShoppingBag className="h-4 w-4 mr-2" />
                                    Browse More
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {purchasedAnimals.data.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {purchasedAnimals.data.map((animal) => {
                                    const statusConfig = getStatusConfig(animal.status)
                                    const StatusIcon = statusConfig.icon
                                    
                                    return (
                                        <Card 
                                            key={animal.id}
                                            className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200 dark:border-gray-800 overflow-hidden"
                                        >
                                            <div className="relative aspect-[3/2] overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                {animal.primary_photo?.url ? (
                                                    <img 
                                                        src={animal.primary_photo.url} 
                                                        alt={`${animal.species} ${animal.breed}`}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Heart className="h-12 w-12 text-gray-400 dark:text-gray-600" />
                                                    </div>
                                                )}
                                                <div className="absolute top-2 left-2">
                                                    <Badge className={`${statusConfig.bgColor} ${statusConfig.borderColor} border text-xs`}>
                                                        <StatusIcon className="h-3 w-3 mr-1" />
                                                        {statusConfig.label}
                                                    </Badge>
                                                </div>
                                                {animal.listing?.status === 'active' && (
                                                    <div className="absolute top-2 right-2">
                                                        <Badge className="bg-amber-500 hover:bg-amber-600 text-xs">
                                                            Listed
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                            <CardContent className="p-4">
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {animal.species} - {animal.breed}
                                                        </p>
                                                        {animal.ear_tag && (
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                Tag: {animal.ear_tag}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {animal.seller && (
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                            <User className="h-3 w-3" />
                                                            <span>From: {animal.seller.name}</span>
                                                        </div>
                                                    )}
                                                    <Link href={route('animals.show', animal.id)}>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="w-full mt-3 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                                        >
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
                            <div className="text-center py-12">
                                <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                                    <Heart className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">No purchased animals yet</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Start browsing the marketplace to find your perfect livestock
                                </p>
                                <Link href={route('marketplace.index')}>
                                    <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
                                        <ShoppingBag className="h-4 w-4 mr-2" />
                                        Browse Marketplace
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </LivestockDashboardLayout>
    )
}


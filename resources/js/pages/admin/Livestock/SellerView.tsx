"use client"

import AppLayout from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { router, Head } from "@inertiajs/react"
import { Building2, User, Mail, AlertCircle, Clock, ShieldCheck, Phone, MapPin, CreditCard, ArrowLeft, Package, Eye, DollarSign } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

interface User {
    id: number
    name: string
    email: string
}

interface SellerProfile {
    id: number
    farm_name: string
    verification_status: string
    rejection_reason: string | null
    address?: string
    phone?: string
    national_id_number?: string
    payee_type?: string
    payee_details?: any
    user: User
}

interface Animal {
    id: number
    species: string
    breed: string
    primary_photo?: { url: string } | null
}

interface Listing {
    id: number
    title: string
    description: string | null
    price: number
    currency: string
    status: string
    listed_at: string | null
    sold_at: string | null
    animal: Animal
}

interface SellerViewProps {
    seller: SellerProfile
    listings: Listing[]
}

export default function SellerView({ seller, listings }: SellerViewProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Admin", href: "/dashboard" },
        { title: "Livestock Management", href: "/admin/livestock" },
        { title: "Sellers", href: "/admin/livestock/sellers" },
        { title: seller.farm_name, href: `/admin/livestock/sellers/${seller.id}` },
    ]

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'verified':
                return {
                    icon: ShieldCheck,
                    variant: 'default' as const,
                    color: 'text-green-600 dark:text-green-400',
                    bgColor: 'bg-green-50 dark:bg-green-900/20',
                    borderColor: 'border-green-200 dark:border-green-800',
                    label: 'Verified'
                }
            case 'pending':
                return {
                    icon: Clock,
                    variant: 'secondary' as const,
                    color: 'text-yellow-600 dark:text-yellow-400',
                    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
                    borderColor: 'border-yellow-200 dark:border-yellow-800',
                    label: 'Pending'
                }
            case 'rejected':
                return {
                    icon: AlertCircle,
                    variant: 'destructive' as const,
                    color: 'text-red-600 dark:text-red-400',
                    bgColor: 'bg-red-50 dark:bg-red-900/20',
                    borderColor: 'border-red-200 dark:border-red-800',
                    label: 'Rejected'
                }
            default:
                return {
                    icon: Clock,
                    variant: 'outline' as const,
                    color: 'text-gray-600 dark:text-gray-400',
                    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
                    borderColor: 'border-gray-200 dark:border-gray-800',
                    label: status
                }
        }
    }

    const statusConfig = getStatusConfig(seller.verification_status)
    const StatusIcon = statusConfig.icon

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${seller.farm_name} - Seller Details`} />
            
            <div className="space-y-6 p-4 sm:p-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.visit('/admin/livestock/sellers')}
                            className="shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <Building2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                {seller.farm_name}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1.5">
                                Complete seller profile information
                            </p>
                        </div>
                    </div>
                    <Badge 
                        variant={statusConfig.variant}
                        className="flex items-center gap-1.5 text-sm px-4 py-2 h-auto"
                    >
                        <StatusIcon className="h-4 w-4" />
                        <span className="capitalize">{statusConfig.label}</span>
                    </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Owner Information */}
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                Owner Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Name</p>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">{seller.user.name}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5" />
                                    Email
                                </p>
                                <p className="text-base font-medium text-gray-700 dark:text-gray-300">{seller.user.email}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Farm Information */}
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                Farm Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Farm Name</p>
                                <p className="text-base font-semibold text-gray-900 dark:text-white">{seller.farm_name}</p>
                            </div>
                            {seller.address && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        Address
                                    </p>
                                    <p className="text-base text-gray-700 dark:text-gray-300">{seller.address}</p>
                                </div>
                            )}
                            {seller.phone && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5" />
                                        Phone
                                    </p>
                                    <p className="text-base text-gray-700 dark:text-gray-300">{seller.phone}</p>
                                </div>
                            )}
                            {seller.national_id_number && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">National ID</p>
                                    <p className="text-base text-gray-700 dark:text-gray-300">{seller.national_id_number}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Payment Information */}
                {(seller.payee_type || seller.payee_details) && (
                    <Card className="border-gray-200 dark:border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                Payment Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {seller.payee_type && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Payee Type</p>
                                    <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">{seller.payee_type}</p>
                                </div>
                            )}
                            {seller.payee_details && typeof seller.payee_details === 'object' && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Payee Details</p>
                                    <div className="space-y-3">
                                        {Object.entries(seller.payee_details).map(([key, value]) => (
                                            <div key={key} className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{String(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Rejection Reason */}
                {seller.rejection_reason && (
                    <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-red-800 dark:text-red-300">
                                <AlertCircle className="h-5 w-5" />
                                Rejection Reason
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">{seller.rejection_reason}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Listings Section */}
                <Card className="border-gray-200 dark:border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            Listings ({listings.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {listings.length > 0 ? (
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                                {listings.map((listing) => {
                                    const getStatusConfig = (status: string) => {
                                        switch (status) {
                                            case 'active':
                                                return {
                                                    variant: 'default' as const,
                                                    color: 'text-green-600 dark:text-green-400',
                                                    bgColor: 'bg-green-50 dark:bg-green-900/20',
                                                    borderColor: 'border-green-200 dark:border-green-800',
                                                    badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800',
                                                    label: 'Active'
                                                }
                                            case 'sold':
                                                return {
                                                    variant: 'secondary' as const,
                                                    color: 'text-blue-600 dark:text-blue-400',
                                                    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                                                    borderColor: 'border-blue-200 dark:border-blue-800',
                                                    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                                                    label: 'Sold'
                                                }
                                            case 'removed':
                                                return {
                                                    variant: 'destructive' as const,
                                                    color: 'text-red-600 dark:text-red-400',
                                                    bgColor: 'bg-red-50 dark:bg-red-900/20',
                                                    borderColor: 'border-red-200 dark:border-red-800',
                                                    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800',
                                                    label: 'Removed'
                                                }
                                            default:
                                                return {
                                                    variant: 'outline' as const,
                                                    color: 'text-gray-600 dark:text-gray-400',
                                                    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
                                                    borderColor: 'border-gray-200 dark:border-gray-800',
                                                    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300 border-gray-200 dark:border-gray-800',
                                                    label: status
                                                }
                                        }
                                    }
                                    const statusConfig = getStatusConfig(listing.status)

                                    return (
                                        <div
                                            key={listing.id}
                                            className="group bg-card border border-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                                        >
                                            {/* Image with Gradient Overlay */}
                                            <div className="relative overflow-hidden">
                                                {listing.animal.primary_photo ? (
                                                    <>
                                                        <img
                                                            src={listing.animal.primary_photo.url}
                                                            alt={listing.title}
                                                            className="w-full h-48 sm:h-56 lg:h-52 xl:h-48 2xl:h-56 object-cover transform group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                    </>
                                                ) : (
                                                    <div className="w-full h-48 sm:h-56 lg:h-52 xl:h-48 2xl:h-56 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                        <Package className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                                                    </div>
                                                )}

                                                {/* Status Badge */}
                                                <div className="absolute top-4 right-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-sm bg-card/90 border ${statusConfig.badgeClass} shadow-lg`}
                                                    >
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-4 sm:p-6">
                                                {/* Title */}
                                                <h3 className="font-bold text-lg sm:text-xl line-clamp-2 mb-3 leading-tight group-hover:text-primary transition-colors text-gray-900 dark:text-white">
                                                    {listing.title}
                                                </h3>

                                                {/* Description */}
                                                {listing.description && (
                                                    <p className="text-muted-foreground text-sm sm:text-base mb-4 line-clamp-3 leading-relaxed">
                                                        {listing.description}
                                                    </p>
                                                )}

                                                {/* Animal Info */}
                                                <div className="space-y-2 mb-4 p-3 bg-muted rounded-lg border border-border">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="font-medium text-muted-foreground">Species:</span>
                                                        <span className="text-foreground">{listing.animal.species}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="font-medium text-muted-foreground">Breed:</span>
                                                        <span className="text-foreground">{listing.animal.breed}</span>
                                                    </div>
                                                </div>

                                                {/* Price */}
                                                <div className="flex items-center gap-2 mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                                    <DollarSign className="h-5 w-5 text-primary flex-shrink-0" />
                                                    <span className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                                        {listing.currency || '$'}{listing.price.toLocaleString()}
                                                    </span>
                                                </div>

                                                {/* Footer */}
                                                <div className="flex flex-col items-start pt-4 border-t border-border gap-3">
                                                    {/* Action Button */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.visit(`/admin/livestock/listings/${listing.id}`)}
                                                    className="w-full sm:w-auto border-border hover:bg-accent"
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View Listing
                                                </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <Package className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">No listings found</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            This seller hasn't created any listings yet.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    )
}



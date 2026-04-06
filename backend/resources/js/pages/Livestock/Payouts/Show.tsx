"use client"

import LivestockDashboardLayout from "@/layouts/livestock/LivestockDashboardLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link, Head } from "@inertiajs/react"
import { ArrowLeft, DollarSign, Calendar, FileText, Package, User, Link as LinkIcon, Image as ImageIcon, CheckCircle, MapPin } from "lucide-react"
import { format } from "date-fns"

interface Payout {
    id: number
    amount: number
    currency: string
    payout_type: string
    status: string
    failure_reason: string | null
    created_at: string
    paid_at: string | null
    notes: string | null
}

interface Animal {
    id: number
    species: string
    breed: string
    ear_tag: string | null
    photos?: Array<{ id: number; url: string; is_primary?: boolean }>
}

interface Buyer {
    id: number
    name: string
    email: string
}

interface BuyerAddress {
    farm_name: string
    address: string
    city?: string
    state?: string
    zip_code?: string
    country?: string
    phone?: string
    email?: string
}

interface Listing {
    id: number
    title: string
    animal: Animal
}

interface ReferenceData {
    type: string
    listing: Listing
    animal: Animal
    buyer: Buyer | null
    buyer_address: BuyerAddress | null
    buyer_confirmation: string | null
    buyer_confirmation_notes: string | null
    buyer_confirmed_at: string | null
}

interface ShowProps {
    payout: Payout
    reference_data: ReferenceData | null
}

export default function PayoutShow({ payout, reference_data }: ShowProps) {
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'paid':
                return {
                    bgColor: 'bg-green-500',
                    textColor: 'text-white',
                    borderColor: 'border-green-500',
                }
            case 'pending':
                return {
                    bgColor: 'bg-amber-500',
                    textColor: 'text-white',
                    borderColor: 'border-amber-500',
                }
            case 'failed':
            case 'cancelled':
                return {
                    bgColor: 'bg-red-500',
                    textColor: 'text-white',
                    borderColor: 'border-red-500',
                }
            default:
                return {
                    bgColor: 'bg-gray-500',
                    textColor: 'text-white',
                    borderColor: 'border-gray-500',
                }
        }
    }
    const statusConfig = getStatusConfig(payout.status)

    return (
        <LivestockDashboardLayout>
            <Head title="Payout Details - Livestock Management" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/payouts">
                            <Button variant="outline" size="sm" className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Payouts
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payout Details</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                View detailed information about this payout
                            </p>
                        </div>
                    </div>
                    <Badge className={`${statusConfig.bgColor} ${statusConfig.textColor} border-0 shadow-sm px-3 py-1.5 text-sm font-medium`}>
                        {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                    </Badge>
                </div>

                {/* Payout Information Card */}
                <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg">
                    <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                <DollarSign className="h-5 w-5 text-white" />
                            </div>
                            <CardTitle className="pb-2">Payout Information</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {/* Amount */}
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Amount</p>
                            <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                ${payout.amount.toLocaleString()} {payout.currency}
                            </p>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Payout Type</p>
                                <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">
                                    {payout.payout_type.replace('_', ' ')}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Created</p>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                                        {format(new Date(payout.created_at), 'MMM dd, yyyy HH:mm')}
                                    </p>
                                </div>
                            </div>
                            {payout.paid_at && (
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Paid At</p>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <p className="text-base font-semibold text-green-600 dark:text-green-400">
                                            {format(new Date(payout.paid_at), 'MMM dd, yyyy HH:mm')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Failure Reason */}
                        {payout.failure_reason && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                                    Failure Reason
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    {payout.failure_reason}
                                </p>
                            </div>
                        )}

                        {/* Notes */}
                        {payout.notes && (
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Notes</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {payout.notes}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Payment Source Details */}
                {reference_data && reference_data.type === 'listing' && (
                    <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg">
                        <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                    <Package className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="pb-2">Payment Source</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            {/* Why Payment Came In */}
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Reason for Payment</p>
                                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                                        Animal Sale - {reference_data.listing.title}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        This payout was generated from the sale of your animal through the marketplace.
                                    </p>
                                </div>
                            </div>

                            {/* Animal Information */}
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Animal Details</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-start gap-4">
                                        {reference_data.animal.photos && reference_data.animal.photos.length > 0 ? (
                                            <img
                                                src={reference_data.animal.photos[0].url}
                                                alt={reference_data.animal.breed}
                                                className="w-24 h-24 rounded-lg object-cover border-2 border-amber-200 dark:border-amber-800 shadow-md"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-lg bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-200 dark:border-amber-800 flex items-center justify-center shadow-md">
                                                <ImageIcon className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Animal</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                                                {reference_data.animal.species} - {reference_data.animal.breed}
                                            </p>
                                            {reference_data.animal.ear_tag && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    Tag: {reference_data.animal.ear_tag}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Listing</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {reference_data.listing.title}
                                        </p>
                                        <Link
                                            href={`/marketplace/${reference_data.listing.id}`}
                                            className="text-xs text-amber-600 dark:text-amber-400 hover:underline mt-1 flex items-center gap-1"
                                        >
                                            <LinkIcon className="h-3 w-3" />
                                            View Listing
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Buyer Information */}
                            {reference_data.buyer && (
                                <div>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Buyer Information</p>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                                <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {reference_data.buyer.name}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {reference_data.buyer.email}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Drop-off Address */}
                                        {reference_data.buyer_address && (
                                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    Drop-off Address
                                                </p>
                                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                                        {reference_data.buyer_address.farm_name}
                                                    </p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                                        {reference_data.buyer_address.address}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        {[
                                                            reference_data.buyer_address.city,
                                                            reference_data.buyer_address.state,
                                                            reference_data.buyer_address.zip_code
                                                        ].filter(Boolean).join(', ')}
                                                        {reference_data.buyer_address.country && `, ${reference_data.buyer_address.country}`}
                                                    </p>
                                                    {reference_data.buyer_address.phone && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            Phone: {reference_data.buyer_address.phone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Buyer Confirmation Status */}
                                        {reference_data.buyer_confirmation && (
                                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                                                        Payment Confirmed by Buyer
                                                    </p>
                                                </div>
                                                {reference_data.buyer_confirmation_notes && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                                                        "{reference_data.buyer_confirmation_notes}"
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Link to Animal */}
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link
                                    href={`/animals/${reference_data.animal.id}`}
                                    className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
                                >
                                    <LinkIcon className="h-4 w-4" />
                                    View Animal Details
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </LivestockDashboardLayout>
    )
}


"use client"

import LivestockLayout from "@/layouts/livestock/LivestockLayout"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link, router, Head, useForm, usePage } from "@inertiajs/react"
import { useState } from "react"
import { 
    ArrowLeft,
    Heart,
    MapPin,
    Calendar,
    DollarSign,
    Tag,
    Eye,
    ShoppingCart,
    CheckCircle,
    User,
    FileText,
    AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface Animal {
    id: number
    species: string
    breed: string
    sex: string
    ear_tag: string | null
    date_of_birth: string | null
    age_months: number | null
    weight_kg: number | null
    color_markings: string | null
    location: string | null
    health_status: string
    fertility_status: string
    current_market_value: number | null
    photos: Array<{ id: number; url: string; is_primary: boolean }>
    health_records: Array<{
        id: number
        record_type: string
        description: string
        record_date: string
    }>
    parent_link?: {
        father?: { id: number; breed: string; ear_tag: string | null }
        mother?: { id: number; breed: string; ear_tag: string | null }
    }
    seller: {
        id: number
        name: string
    }
    current_owner: {
        id: number
        name: string
    }
}

interface Listing {
    id: number
    title: string
    description: string | null
    price: number
    currency: string
    listed_at: string
    status: string
    animal: Animal
    seller: {
        id: number
        name: string
    }
}

interface ShowProps {
    listing: Listing
}

const speciesColors: Record<string, string> = {
    goat: 'bg-amber-500 text-white',
    sheep: 'bg-orange-500 text-white',
    cow: 'bg-brown-500 text-white',
    chicken: 'bg-yellow-500 text-white',
    pig: 'bg-pink-500 text-white',
}

export default function MarketplaceShow({ listing }: ShowProps) {
    const { data, setData, post, processing } = useForm({
        payment_method: 'stripe'
    })
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const { auth } = usePage().props as any

    // Check if user already owns this animal (purchased it)
    const isCurrentOwner = auth?.user && 
                          listing.animal.current_owner?.id === auth.user.id &&
                          listing.animal.seller?.id !== auth.user.id

    // Check if listing is sold
    const isSold = listing.status === 'sold'

    // Check if user is the seller
    const isSeller = auth?.user && auth.user.id === listing.seller.id

    // Check if user is a buyer (has buyer profile)
    const isBuyer = auth?.user?.buyer_profile !== null && auth?.user?.buyer_profile !== undefined

    // Determine if purchase button should be shown (only buyers can purchase)
    const canPurchase = auth?.user && 
                       isBuyer &&
                       !isSeller && 
                       !isCurrentOwner && 
                       !isSold &&
                       listing.status === 'active'

    const handlePurchase = () => {
        if (!auth?.user) {
            router.visit(route('livestock.login'))
            return
        }

        if (!isBuyer) {
            showErrorToast('Only buyers can purchase animals. Please create a buyer profile first.')
            return
        }

        if (isSeller) {
            showErrorToast('You cannot purchase your own listing.')
            return
        }

        if (isCurrentOwner) {
            showErrorToast('You already own this animal.')
            return
        }

        if (isSold) {
            showErrorToast('This listing has already been sold.')
            return
        }

        // Redirect to Stripe Checkout
        post(route('marketplace.checkout', listing.id), {
            onSuccess: () => {
                // Redirect will happen via Inertia::location in the controller
            },
            onError: (errors) => {
                showErrorToast(errors.error || 'Failed to create checkout session. Please try again.')
            }
        })
    }

    const allPhotos = listing.animal.photos.length > 0 ? listing.animal.photos : []
    const primaryImage = allPhotos[selectedImageIndex] || allPhotos[0]

    return (
        <LivestockLayout>
            <Head title={`${listing.title} - Livestock Marketplace`} />
            
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <Link href={route('marketplace.index')}>
                        <Button variant="ghost" className="mb-6">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Marketplace
                        </Button>
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column - Images */}
                        <div className="lg:col-span-2">
                            {/* Main Image - No Card, Just Image */}
                            <div className="mb-4">
                                {primaryImage ? (
                                    <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden shadow-xl">
                                        <img
                                            src={primaryImage.url}
                                            alt={listing.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg flex items-center justify-center shadow-xl">
                                        <Heart className="h-16 w-16 text-gray-400 dark:text-gray-600" />
                                    </div>
                                )}
                            </div>

                            {/* Thumbnail Gallery */}
                            {listing.animal.photos.length > 1 && (
                                <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                                    {listing.animal.photos.map((photo, index) => (
                                        <button
                                            key={photo.id}
                                            onClick={() => setSelectedImageIndex(index)}
                                            className={cn(
                                                "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                                                selectedImageIndex === index
                                                    ? "border-amber-500 shadow-lg scale-105"
                                                    : "border-transparent hover:border-amber-300 dark:hover:border-amber-700"
                                            )}
                                        >
                                            <img
                                                src={photo.url}
                                                alt={`${listing.title} ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            {selectedImageIndex === index && (
                                                <div className="absolute inset-0 bg-amber-500/20 border-2 border-amber-500 rounded-lg" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Description */}
                            <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow mt-6">
                                <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                            <FileText className="h-5 w-5 text-white" />
                                        </div>
                                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Description</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                                        {listing.description || 'No description provided.'}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Health Records */}
                            {listing.animal.health_records.length > 0 && (
                                <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow mt-6">
                                    <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                                <CheckCircle className="h-5 w-5 text-white" />
                                            </div>
                                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Recent Health Records</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="space-y-4">
                                            {listing.animal.health_records.map((record) => (
                                                <div key={record.id} className="border-l-4 border-amber-500 dark:border-amber-600 pl-4 py-2 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 rounded-r-lg transition-colors">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                                                            {record.record_type}
                                                        </Badge>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                            {format(new Date(record.record_date), 'MMM dd, yyyy')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                                        {record.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Parent Information */}
                            {listing.animal.parent_link && (
                                <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow mt-6">
                                    <CardHeader className="border-b border-amber-200 dark:border-amber-800/50 pb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg">
                                                <User className="h-5 w-5 text-white" />
                                            </div>
                                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Parent Information</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {listing.animal.parent_link.father && (
                                                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                                                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
                                                        <User className="h-4 w-4" />
                                                        Father
                                                    </p>
                                                    <p className="text-gray-900 dark:text-white font-semibold">
                                                        {listing.animal.parent_link.father.breed}
                                                    </p>
                                                    {listing.animal.parent_link.father.ear_tag && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            Ear Tag: {listing.animal.parent_link.father.ear_tag}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {listing.animal.parent_link.mother && (
                                                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                                                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
                                                        <User className="h-4 w-4" />
                                                        Mother
                                                    </p>
                                                    <p className="text-gray-900 dark:text-white font-semibold">
                                                        {listing.animal.parent_link.mother.breed}
                                                    </p>
                                                    {listing.animal.parent_link.mother.ear_tag && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            Ear Tag: {listing.animal.parent_link.mother.ear_tag}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Right Column - Purchase Info */}
                        <div className="lg:col-span-1">
                            <Card className="border border-amber-200 dark:border-amber-800/50 shadow-lg hover:shadow-xl transition-shadow sticky top-8">
                                <CardContent className="p-6">
                                    <div className="mb-6">
                                        <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                                            {listing.title}
                                        </h1>
                                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                                            <Badge
                                                className={cn(
                                                    "shadow-sm",
                                                    speciesColors[listing.animal.species] || "bg-gray-500 text-white"
                                                )}
                                            >
                                                {listing.animal.species.charAt(0).toUpperCase() + listing.animal.species.slice(1)}
                                            </Badge>
                                            <Badge variant="outline" className="border-amber-200 dark:border-amber-800 text-gray-700 dark:text-gray-300">
                                                {listing.animal.sex}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                            <div className="p-1.5 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <span className="font-medium">{listing.animal.breed}</span>
                                        </div>
                                        {listing.animal.ear_tag && (
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <div className="p-1.5 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                    <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <span className="text-sm">Ear Tag: <span className="font-semibold">{listing.animal.ear_tag}</span></span>
                                            </div>
                                        )}
                                        {listing.animal.location && (
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <div className="p-1.5 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                    <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <span className="text-sm">{listing.animal.location}</span>
                                            </div>
                                        )}
                                        {listing.animal.age_months && (
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <div className="p-1.5 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                    <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <span className="text-sm">{listing.animal.age_months} months old</span>
                                            </div>
                                        )}
                                        {listing.animal.weight_kg && (
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <div className="p-1.5 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                    <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <span className="text-sm">Weight: <span className="font-semibold">{listing.animal.weight_kg} kg</span></span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                            <div className="p-1.5 bg-green-500/20 dark:bg-green-500/30 rounded">
                                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            </div>
                                            <span className="text-sm">Health: <span className="font-semibold capitalize">{listing.animal.health_status}</span></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                            <div className="p-1.5 bg-amber-500/20 dark:bg-amber-500/30 rounded">
                                                <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <span className="text-sm">Seller: <span className="font-semibold">{listing.seller.name}</span></span>
                                        </div>
                                    </div>

                                    <div className="border-t border-amber-200 dark:border-amber-800/50 pt-6 mb-6">
                                        <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
                                            ${listing.price.toLocaleString()}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {listing.currency} • Full Ownership
                                        </div>
                                    </div>

                                    {isSeller ? (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                                            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                                                <AlertCircle className="h-5 w-5" />
                                                <span className="font-medium text-sm">This is your listing</span>
                                            </div>
                                        </div>
                                    ) : isCurrentOwner ? (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                                            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                                                <CheckCircle className="h-5 w-5" />
                                                <span className="font-medium text-sm">You already own this animal</span>
                                            </div>
                                        </div>
                                    ) : isSold ? (
                                        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-4">
                                            <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                                                <AlertCircle className="h-5 w-5" />
                                                <span className="font-medium text-sm">This listing has been sold</span>
                                            </div>
                                        </div>
                                    ) : canPurchase ? (
                                        <Button
                                            onClick={handlePurchase}
                                            disabled={processing}
                                            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30 mb-4"
                                            size="lg"
                                        >
                                            <ShoppingCart className="h-5 w-5 mr-2" />
                                            {processing ? 'Processing...' : 'Purchase Animal'}
                                        </Button>
                                    ) : !auth?.user ? (
                                        <Link href={route('livestock.login')}>
                                            <Button
                                                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30 mb-4"
                                                size="lg"
                                            >
                                                <ShoppingCart className="h-5 w-5 mr-2" />
                                                Login to Purchase
                                            </Button>
                                        </Link>
                                    ) : !isBuyer ? (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                                            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                                                <AlertCircle className="h-5 w-5" />
                                                <span className="font-medium text-sm">Only buyers can purchase animals. Please create a buyer profile first.</span>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="space-y-1 text-center text-sm text-gray-600 dark:text-gray-400">
                                        <p className="flex items-center justify-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            Full ownership transfer
                                        </p>
                                        <p className="flex items-center justify-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            Verified seller
                                        </p>
                                        <p className="flex items-center justify-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            Secure payment
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </LivestockLayout>
    )
}


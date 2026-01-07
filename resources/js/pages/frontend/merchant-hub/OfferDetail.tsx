import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { motion } from 'framer-motion'
import FrontendLayout from '@/layouts/frontend/frontend-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/frontend/ui/card'
import { Button } from '@/components/frontend/ui/button'
import { Badge } from '@/components/frontend/ui/badge'
import { Avatar, AvatarFallback } from '@/components/frontend/ui/avatar'
import { 
  ArrowLeft, 
  Store, 
  Gift, 
  Star, 
  Check, 
  Share2, 
  Heart,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Clock,
  Shield
} from 'lucide-react'
import { usePage } from '@inertiajs/react'

interface Offer {
  id: string
  title: string
  image: string
  images?: string[]
  pointsRequired: number
  cashRequired?: number
  merchantName: string
  merchantId?: string
  category: string
  description: string
  fullDescription?: string
  terms?: string
  validUntil?: string
  redemptionCount?: number
  rating?: number
  reviews?: number
}

interface Props {
  offerId: string
  offer?: Offer
  relatedOffers?: Offer[]
}

export default function OfferDetail({ offerId, offer: initialOffer, relatedOffers: initialRelatedOffers = [] }: Props) {
  const { auth } = usePage().props as any
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isRedeeming, setIsRedeeming] = useState(false)

  // Mock data - in production, this would come from props
  const offer: Offer = initialOffer || {
    id: offerId,
    title: 'Gift Card - $50 Value',
    image: '/placeholder.jpg',
    images: ['/placeholder.jpg', '/placeholder.jpg', '/placeholder.jpg'],
    pointsRequired: 5000,
    cashRequired: 10,
    merchantName: 'Retail Store',
    merchantId: '1',
    category: 'Gift Cards',
    description: 'Redeem points for a $50 gift card',
    fullDescription: 'Get a $50 gift card that can be used at any of our retail locations. This gift card never expires and can be used for any purchase. Perfect for gifting or treating yourself!',
    terms: 'Gift card is valid for 12 months from date of redemption. Cannot be exchanged for cash. Terms and conditions apply.',
    validUntil: '2024-12-31',
    redemptionCount: 245,
    rating: 4.8,
    reviews: 32
  }

  const relatedOffers: Offer[] = initialRelatedOffers.length > 0 ? initialRelatedOffers : [
    {
      id: '2',
      title: 'Fitness Class Pass',
      image: '/placeholder.jpg',
      pointsRequired: 7500,
      merchantName: 'Fitness Center',
      category: 'Services',
      description: 'Unlimited classes for one month'
    },
    {
      id: '3',
      title: 'Wireless Earbuds',
      image: '/placeholder.jpg',
      pointsRequired: 10000,
      cashRequired: 25,
      merchantName: 'Tech Store',
      category: 'Electronics',
      description: 'Premium wireless earbuds with noise cancellation'
    },
    {
      id: '4',
      title: 'Dinner for Two',
      image: '/placeholder.jpg',
      pointsRequired: 8000,
      cashRequired: 30,
      merchantName: 'Fine Dining Restaurant',
      category: 'Dining',
      description: 'Three-course dinner for two people'
    }
  ]

  const images = offer.images || [offer.image]
  const hasMultipleImages = images.length > 1

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Gift Cards': 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
      'Services': 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
      'Electronics': 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
      'Dining': 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
      'Entertainment': 'bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/30',
    }
    return colors[category] || 'bg-muted text-muted-foreground border-border'
  }

  const handleRedeem = () => {
    if (!auth?.user) {
      router.visit('/login')
      return
    }

    setIsRedeeming(true)
    // TODO: Implement redemption logic
    setTimeout(() => {
      setIsRedeeming(false)
      // Show success message and redirect
    }, 1000)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: offer.title,
        text: offer.description,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <FrontendLayout>
      <Head title={`${offer.title} - Merchant Hub`} />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/merchant-hub">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Merchant Hub
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Images */}
            <div className="lg:col-span-2 space-y-4">
              {/* Main Image */}
              <Card className="overflow-hidden">
                <div className="relative aspect-[4/3] w-full bg-muted max-h-[500px]">
                  <img
                    src={images[selectedImageIndex] || offer.image}
                    alt={offer.title}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.jpg'
                    }}
                  />
                  {hasMultipleImages && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={() => setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                      >
                        <ArrowLeft className="h-4 w-4 rotate-180" />
                      </Button>
                    </>
                  )}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-black/50 hover:bg-black/70 text-white"
                      onClick={() => setIsFavorite(!isFavorite)}
                    >
                      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-black/50 hover:bg-black/70 text-white"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Thumbnail Images */}
              {hasMultipleImages && images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all bg-muted ${
                        selectedImageIndex === index
                          ? 'border-blue-600 dark:border-blue-400 ring-2 ring-blue-600/20'
                          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${offer.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.jpg'
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Description Card */}
              <Card>
                <CardHeader>
                  <CardTitle>About This Offer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    {offer.fullDescription || offer.description}
                  </p>

                  {offer.terms && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-2">Terms & Conditions</h4>
                      <p className="text-sm text-muted-foreground">{offer.terms}</p>
                    </div>
                  )}

                  {offer.validUntil && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Valid until: {new Date(offer.validUntil).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Details & Actions */}
            <div className="space-y-6">
              {/* Main Info Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <Badge className={getCategoryColor(offer.category)}>
                      {offer.category}
                    </Badge>
                    {offer.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{offer.rating}</span>
                        {offer.reviews && (
                          <span className="text-sm text-muted-foreground">({offer.reviews})</span>
                        )}
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-2xl mb-2">{offer.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    {offer.merchantName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pricing */}
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Points Required</span>
                        <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {offer.pointsRequired.toLocaleString()}
                      </div>
                    </div>

                    {offer.cashRequired && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">Cash Required</span>
                          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                          ${offer.cashRequired.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  {offer.redemptionCount !== undefined && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        <span>{offer.redemptionCount} redemptions</span>
                      </div>
                    </div>
                  )}

                  {/* Redeem Button */}
                  <Button
                    onClick={handleRedeem}
                    disabled={isRedeeming}
                    className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    size="lg"
                  >
                    {isRedeeming ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <Gift className="h-5 w-5 mr-2" />
                        Redeem Offer
                      </>
                    )}
                  </Button>

                  {!auth?.user && (
                    <p className="text-sm text-center text-muted-foreground">
                      <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                        Sign in
                      </Link>
                      {' '}to redeem this offer
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Merchant Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Merchant Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        <Store className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{offer.merchantName}</p>
                      <p className="text-sm text-muted-foreground">Verified Merchant</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span>Verified Business</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Secure Transactions</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Related Offers */}
          {relatedOffers.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Related Offers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedOffers.map((relatedOffer) => (
                  <motion.div
                    key={relatedOffer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer group">
                      <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-muted">
                        <img
                          src={relatedOffer.image || '/placeholder.jpg'}
                          alt={relatedOffer.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.jpg'
                          }}
                        />
                        <Badge 
                          className={`absolute top-2 right-2 ${getCategoryColor(relatedOffer.category)}`}
                        >
                          {relatedOffer.category}
                        </Badge>
                      </div>
                      <CardHeader>
                        <CardTitle className="line-clamp-2">{relatedOffer.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          {relatedOffer.merchantName}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {relatedOffer.description}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Points:</span>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              {relatedOffer.pointsRequired.toLocaleString()}
                            </span>
                          </div>
                          {relatedOffer.cashRequired && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Cash:</span>
                              <span className="text-sm font-bold">
                                ${relatedOffer.cashRequired.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <Link href={`/merchant-hub/offers/${relatedOffer.id}`}>
                            <Button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" size="sm">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}


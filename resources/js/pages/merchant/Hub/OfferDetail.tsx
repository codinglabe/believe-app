import React, { useState } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import { MerchantHeader, MerchantFooter } from '@/components/merchant'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantBadge } from '@/components/merchant-ui'
import { ArrowLeft, Heart, Share2, Store, Clock, Check, Star, Shield, Gift, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'

interface Offer {
  id: string
  slug: string
  title: string
  image: string
  pointsRequired: number
  cashRequired?: number
  merchantName: string
  merchantId?: string
  merchantSlug?: string
  category: string
  categorySlug?: string
  description: string
  shortDescription?: string
  currency?: string
  inventoryQty?: number
  startsAt?: string
  endsAt?: string
  isAvailable: boolean
  redemptionsCount?: number
}

interface RelatedOffer {
  id: string
  slug: string
  title: string
  image: string
  pointsRequired: number
  cashRequired?: number
  merchantName: string
  category: string
  description: string
}

interface Props {
  offer: Offer
  relatedOffers?: RelatedOffer[]
}

export default function HubOfferDetail({ offer, relatedOffers = [] }: Props) {
  const { auth } = usePage().props as any
  const [isFavorite, setIsFavorite] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

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

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: offer.title,
        text: offer.shortDescription || offer.description,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      // You can add a toast notification here
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleRedeemOffer = async () => {
    // Check if user is logged in
    if (!auth?.user) {
      router.visit('/login', {
        data: { redirect: window.location.pathname }
      })
      return
    }

    setIsProcessing(true)

    try {
      // Create Stripe checkout session
      const response = await axios.post('/hub/offers/checkout', {
        offer_id: offer.id,
      })

      if (response.data.success && response.data.url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.url
      } else {
        setIsProcessing(false)
        alert('Failed to create payment session. Please try again.')
      }
    } catch (error: any) {
      setIsProcessing(false)
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to process redemption. Please try again.'
      alert(errorMessage)
    }
  }

  return (
    <>
      <Head title={`${offer.title} - Merchant Hub`} />
      <div className="min-h-screen bg-gradient-to-br from-black via-[#1a0a0a] to-[#2d1b1b] dark:from-black dark:via-[#1a0a0a] dark:to-[#2d1b1b] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493]/5 via-[#DC143C]/5 to-[#E97451]/5 pointer-events-none"></div>

        {/* Header */}
        <MerchantHeader
          variant="public"
          title={`${import.meta.env.VITE_APP_NAME || 'Believe'} Merchant`}
          showMenu={true}
        />

        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="mb-6">
            <Link href="/hub">
              <MerchantButton variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Merchant Hub
              </MerchantButton>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Images & Description */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Image */}
              <MerchantCard className="overflow-hidden">
                <div className="relative aspect-[4/3] w-full max-h-[500px] bg-gray-800">
                  <img
                    src={offer.image}
                    alt={offer.title}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.jpg'
                    }}
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <MerchantButton
                      variant="outline"
                      size="icon"
                      className={`rounded-full ${isFavorite ? 'bg-red-500 text-white' : ''}`}
                      onClick={() => setIsFavorite(!isFavorite)}
                    >
                      <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                    </MerchantButton>
                    <MerchantButton variant="outline" size="icon" className="rounded-full" onClick={handleShare}>
                      <Share2 className="w-4 h-4" />
                    </MerchantButton>
                  </div>
                </div>
              </MerchantCard>

              {/* Offer Description */}
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Description</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {offer.description}
                  </p>
                </MerchantCardContent>
              </MerchantCard>

              {/* Related Offers */}
              {relatedOffers.length > 0 && (
                <MerchantCard>
                  <MerchantCardHeader>
                    <MerchantCardTitle className="text-white">Related Offers</MerchantCardTitle>
                  </MerchantCardHeader>
                  <MerchantCardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {relatedOffers.map((relatedOffer) => (
                        <Link
                          key={relatedOffer.id}
                          href={`/hub/offers/${relatedOffer.slug}`}
                          className="block"
                        >
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700 hover:border-[#FF1493]/50 transition-colors"
                          >
                            <div className="aspect-video bg-gray-700">
                              <img
                                src={relatedOffer.image}
                                alt={relatedOffer.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder.jpg'
                                }}
                              />
                            </div>
                            <div className="p-4">
                              <h3 className="text-white font-semibold mb-2 line-clamp-2">
                                {relatedOffer.title}
                              </h3>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[#FF1493] font-bold">
                                  {relatedOffer.pointsRequired.toLocaleString()} pts
                                </span>
                                {relatedOffer.cashRequired && (
                                  <span className="text-gray-400">
                                    + ${relatedOffer.cashRequired.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        </Link>
                      ))}
                    </div>
                  </MerchantCardContent>
                </MerchantCard>
              )}
            </div>

            {/* Right Column - Details & Actions */}
            <div className="lg:col-span-1 space-y-6">
              {/* Offer Details Card */}
              <MerchantCard className="sticky top-24">
                <MerchantCardHeader>
                  <MerchantBadge className={`w-fit mb-2 ${getCategoryColor(offer.category)}`}>
                    {offer.category}
                  </MerchantBadge>
                  <MerchantCardTitle className="text-2xl font-bold text-white">{offer.title}</MerchantCardTitle>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Store className="w-4 h-4" />
                    <span>{offer.merchantName}</span>
                    <Shield className="w-4 h-4 text-green-500 ml-1" />
                  </div>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-lg">
                      <span className="font-medium text-gray-300">Points Required:</span>
                      <span className="font-bold text-[#FF1493]">
                        {offer.pointsRequired.toLocaleString()}
                      </span>
                    </div>
                    {offer.cashRequired && (
                      <div className="flex items-center justify-between text-lg">
                        <span className="font-medium text-gray-300">Cash Required:</span>
                        <span className="font-bold text-white">
                          {offer.currency || 'USD'} {offer.cashRequired.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {offer.isAvailable ? (
                    <MerchantButton
                      onClick={handleRedeemOffer}
                      disabled={isProcessing}
                      className="w-full bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461] text-white text-lg py-3 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Redeem Offer'}
                    </MerchantButton>
                  ) : (
                    <MerchantButton
                      disabled
                      className="w-full bg-gray-600 text-gray-400 text-lg py-3 h-auto cursor-not-allowed"
                    >
                      Not Available
                    </MerchantButton>
                  )}

                  <div className="space-y-2 text-sm text-gray-400">
                    {offer.endsAt && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Valid until: {formatDate(offer.endsAt)}</span>
                      </div>
                    )}
                    {offer.startsAt && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Starts: {formatDate(offer.startsAt)}</span>
                      </div>
                    )}
                    {offer.redemptionsCount !== undefined && (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        <span>{offer.redemptionsCount.toLocaleString()} redemptions</span>
                      </div>
                    )}
                    {offer.inventoryQty !== null && offer.inventoryQty !== undefined && (
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        <span>{offer.inventoryQty} available</span>
                      </div>
                    )}
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              {/* Merchant Info Card */}
              {offer.merchantSlug && (
                <MerchantCard>
                  <MerchantCardHeader>
                    <MerchantCardTitle className="text-white">About {offer.merchantName}</MerchantCardTitle>
                  </MerchantCardHeader>
                  <MerchantCardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] flex items-center justify-center">
                        <span className="text-white font-bold text-xl">
                          {offer.merchantName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">{offer.merchantName}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Shield className="h-4 w-4 text-green-500" />
                          <span>Verified Merchant</span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/hub?merchant=${offer.merchantSlug}`}>
                      <MerchantButton variant="outline" className="w-full">
                        View All Offers from {offer.merchantName}
                      </MerchantButton>
                    </Link>
                  </MerchantCardContent>
                </MerchantCard>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <MerchantFooter />
      </div>
    </>
  )
}

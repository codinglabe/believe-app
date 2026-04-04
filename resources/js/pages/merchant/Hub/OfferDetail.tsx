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
  referencePrice?: number | null
  discountPercentage?: number | null
  discountAmount?: number
  pointsRequired: number
  customerPriceWithPoints?: number
  communityCashPrice?: number
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
  const [paymentMethod, setPaymentMethod] = useState<'points' | 'cash' | null>(null)
  /** Merchant Hub redemptions use `users.reward_points` only (not believe_points). */
  const userPoints = Number((auth?.user as any)?.reward_points ?? 0)
  // Show points + cash options when we have retail price or at least a cash price (backend may derive reference from points/discount)
  const hasReferencePrice = (offer.referencePrice != null && offer.referencePrice > 0) ||
    (offer.communityCashPrice != null && offer.communityCashPrice > 0)

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

  const handleRedeemOffer = async (method: 'points' | 'cash') => {
    if (!auth?.user) {
      router.visit('/login', { data: { redirect: window.location.pathname } })
      return
    }
    if (method === 'points' && userPoints < offer.pointsRequired) {
      alert(`You need ${offer.pointsRequired.toLocaleString()} points but you have ${Number(userPoints).toLocaleString()}.`)
      return
    }
    setPaymentMethod(method)
    setIsProcessing(true)

    try {
      const response = await axios.post('/hub/offers/checkout', {
        offer_id: offer.id,
        payment_method: method,
      })
      if (response.data.success && response.data.url) {
        window.location.href = response.data.url
      } else {
        setIsProcessing(false)
        setPaymentMethod(null)
        alert(response.data?.error || 'Failed to start checkout. Please try again.')
      }
    } catch (error: any) {
      setIsProcessing(false)
      setPaymentMethod(null)
      const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to process redemption.'
      alert(msg)
    }
  }

  return (
    <>
      <Head title={`${offer.title} - Merchant Hub`} />
      <div className="min-h-screen bg-gradient-to-br from-black via-[#1a0a0a] to-[#2d1b1b] dark:from-black dark:via-[#1a0a0a] dark:to-[#2d1b1b] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#2563EB]/4 to-[#2563EB]/2 pointer-events-none"></div>

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
                            className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700 hover:border-[#2563EB]/50 transition-colors"
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
                                <span className="text-[#2563EB] font-bold">
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
                  {hasReferencePrice && (
                    <>
                      {offer.referencePrice != null && offer.referencePrice > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-400">Retail Price</p>
                          <p className="text-2xl font-bold text-white">
                            {offer.currency || 'USD'} {offer.referencePrice.toFixed(2)}
                          </p>
                        </div>
                      )}

                      <div className="space-y-4 border-t border-gray-700 pt-4">
                        <p className="text-sm text-gray-400">
                          {userPoints >= offer.pointsRequired
                            ? 'You have enough points — use them for the discount below, or pay with cash instead.'
                            : "You don't have enough points — pay with cash (full amount)."}
                        </p>

                        <div className="rounded-lg bg-gray-800/60 p-4 border border-[#2563EB]/20">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Use points (if you have enough)</p>
                          <p className="text-lg text-white">
                            {offer.pointsRequired.toLocaleString()} points → {offer.currency || 'USD'} {(offer.discountAmount ?? 0).toFixed(2)} off
                          </p>
                          <p className="text-xl font-bold text-[#2563EB] mt-1">
                            You pay: {offer.currency || 'USD'} {(offer.customerPriceWithPoints ?? 0).toFixed(2)}
                          </p>
                          {offer.isAvailable && (
                            <MerchantButton
                              onClick={() => handleRedeemOffer('points')}
                              disabled={isProcessing || userPoints < offer.pointsRequired}
                              className="mt-3 w-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white disabled:opacity-50"
                            >
                              {isProcessing && paymentMethod === 'points' ? 'Processing...' : userPoints >= offer.pointsRequired ? `Use ${offer.pointsRequired.toLocaleString()} points` : `Need ${offer.pointsRequired.toLocaleString()} points`}
                            </MerchantButton>
                          )}
                          {auth?.user && userPoints < offer.pointsRequired && (
                            <p className="mt-2 text-sm text-amber-400">You have {Number(userPoints).toLocaleString()} points. Use cash below to pay the full amount.</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-gray-500">
                          <span className="flex-1 h-px bg-gray-600" />
                          <span className="text-sm font-medium">Or pay with money</span>
                          <span className="flex-1 h-px bg-gray-600" />
                        </div>

                        <div className="rounded-lg bg-gray-800/60 p-4 border border-green-500/20">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Pay with cash</p>
                          <p className="text-xl font-bold text-green-400 mt-1">
                            You pay: {offer.currency || 'USD'} {(offer.communityCashPrice ?? 0).toFixed(2)}
                          </p>
                          {offer.isAvailable && (
                            <MerchantButton
                              onClick={() => handleRedeemOffer('cash')}
                              disabled={isProcessing}
                              variant="outline"
                              className="mt-3 w-full border-green-500/50 text-green-400 hover:bg-green-500/10"
                            >
                              {isProcessing && paymentMethod === 'cash' ? 'Processing...' : `Pay ${(offer.communityCashPrice ?? 0).toFixed(2)}`}
                            </MerchantButton>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {!hasReferencePrice && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-lg">
                        <span className="font-medium text-gray-300">Points Required:</span>
                        <span className="font-bold text-[#2563EB]">{offer.pointsRequired.toLocaleString()}</span>
                      </div>
                      {offer.cashRequired != null && offer.cashRequired > 0 && (
                        <div className="flex items-center justify-between text-lg">
                          <span className="font-medium text-gray-300">Cash Required:</span>
                          <span className="font-bold text-white">{offer.currency || 'USD'} {offer.cashRequired.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {offer.isAvailable && !hasReferencePrice ? (
                    <MerchantButton
                      onClick={() => handleRedeemOffer('points')}
                      disabled={isProcessing}
                      className="w-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white text-lg py-3 h-auto disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : 'Redeem Offer'}
                    </MerchantButton>
                  ) : null}

                  {!offer.isAvailable && (
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
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center">
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

import React from 'react'
import { Head, Link, usePage } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantBadge } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { ArrowLeft, Edit, Eye, Calendar, Gift, DollarSign, Users, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  offerId: string
}

export default function OfferShow({ offerId }: Props) {
  const { url } = usePage()

  // Mock data - replace with actual data from backend
  const offer = {
    id: offerId,
    title: 'Wireless Earbuds',
    description: 'Premium wireless earbuds with noise cancellation and long battery life.',
    image: '/placeholder.jpg',
    pointsRequired: 10000,
    cashRequired: 25,
    category: 'Electronics',
    status: 'active',
    redemptions: 45,
    limitPerMember: 1,
    validUntil: '2024-12-31',
    createdAt: '2024-01-15',
    redemptionRules: [
      'Limit 1 per member',
      'Valid for in-store redemption only',
      'Cannot be combined with other offers'
    ]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <MerchantBadge className="bg-green-600/30 text-green-400 border-green-600/50">Active</MerchantBadge>
      case 'inactive':
        return <MerchantBadge className="bg-gray-600/30 text-gray-400 border-gray-600/50">Inactive</MerchantBadge>
      case 'draft':
        return <MerchantBadge className="bg-yellow-600/30 text-yellow-400 border-yellow-600/50">Draft</MerchantBadge>
      default:
        return <MerchantBadge>{status}</MerchantBadge>
    }
  }

  return (
    <>
      <Head title={`${offer.title} - Offer Details`} />
      <MerchantDashboardLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 relative z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/offers">
              <MerchantButton variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Offers
              </MerchantButton>
            </Link>
            <Link href={`/offers/${offerId}/edit`}>
              <MerchantButton>
                <Edit className="w-4 h-4 mr-2" />
                Edit Offer
              </MerchantButton>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image */}
              <MerchantCard>
                <div className="relative h-96 w-full bg-gray-800 rounded-t-lg overflow-hidden">
                  <img
                    src={offer.image}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.jpg'
                    }}
                  />
                </div>
                <MerchantCardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-white mb-2">{offer.title}</h1>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(offer.status)}
                        <MerchantBadge variant="outline">{offer.category}</MerchantBadge>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-6">{offer.description}</p>
                </MerchantCardContent>
              </MerchantCard>

              {/* Redemption Rules */}
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Redemption Rules</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent>
                  <ul className="space-y-2">
                    {offer.redemptionRules.map((rule, index) => (
                      <li key={index} className="flex items-center gap-2 text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-[#FF1493] flex-shrink-0" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </MerchantCardContent>
              </MerchantCard>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Pricing Info */}
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Pricing</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 rounded-lg border border-[#FF1493]/20">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-[#FF1493]" />
                      <span className="text-gray-300">Points Required</span>
                    </div>
                    <span className="text-xl font-bold text-white">{offer.pointsRequired.toLocaleString()}</span>
                  </div>
                  {offer.cashRequired && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 rounded-lg border border-[#FF1493]/20">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-[#FF1493]" />
                        <span className="text-gray-300">Cash Required</span>
                      </div>
                      <span className="text-xl font-bold text-white">${offer.cashRequired.toFixed(2)}</span>
                    </div>
                  )}
                </MerchantCardContent>
              </MerchantCard>

              {/* Statistics */}
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Statistics</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Total Redemptions</span>
                    </div>
                    <span className="text-white font-semibold">{offer.redemptions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Limit per Member</span>
                    </div>
                    <span className="text-white font-semibold">{offer.limitPerMember}</span>
                  </div>
                  {offer.validUntil && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">Valid Until</span>
                      </div>
                      <span className="text-white font-semibold">{new Date(offer.validUntil).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">Created</span>
                    </div>
                    <span className="text-white font-semibold">{new Date(offer.createdAt).toLocaleDateString()}</span>
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              {/* Actions */}
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Actions</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-3">
                  <Link href={`/hub/offers/${offerId}`} target="_blank">
                    <MerchantButton variant="outline" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View Public Page
                    </MerchantButton>
                  </Link>
                  <Link href={`/offers/${offerId}/edit`}>
                    <MerchantButton className="w-full bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451]">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Offer
                    </MerchantButton>
                  </Link>
                </MerchantCardContent>
              </MerchantCard>
            </div>
          </div>
        </motion.div>
      </MerchantDashboardLayout>
    </>
  )
}


import React, { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantBadge } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { Plus, Edit, Trash2, Eye, Search } from 'lucide-react'
import { motion } from 'framer-motion'

export default function OffersIndex() {
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data - replace with actual data from backend
  const offers = [
    {
      id: '1',
      title: 'Wireless Earbuds',
      image: '/placeholder.jpg',
      pointsRequired: 10000,
      cashRequired: 25,
      status: 'active',
      redemptions: 45
    },
    {
      id: '2',
      title: 'Gift Card',
      image: '/placeholder.jpg',
      pointsRequired: 5000,
      cashRequired: 10,
      status: 'active',
      redemptions: 120
    },
    {
      id: '3',
      title: 'Fitness Class Pass',
      image: '/placeholder.jpg',
      pointsRequired: 7500,
      status: 'inactive',
      redemptions: 30
    }
  ]

  const filteredOffers = offers.filter(offer =>
    offer.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <Head title="My Offers - Merchant Dashboard" />
      <MerchantDashboardLayout>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 relative z-10"
          >
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                  placeholder="Search offers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-[#FF1493]/40 rounded-lg bg-gray-900/50 backdrop-blur text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF1493] focus:border-[#FF1493] shadow-lg shadow-[#FF1493]/20 transition-all duration-300"
              />
            </div>

            {/* Offers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOffers.map((offer, index) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <MerchantCard className="transition-all duration-300 hover:scale-105">
                    <div className="relative h-48 w-full bg-gray-800">
                      <img
                        src={offer.image}
                        alt={offer.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.jpg'
                        }}
                      />
                      <MerchantBadge
                        className={`absolute top-2 right-2 ${
                          offer.status === 'active'
                            ? 'bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] shadow-lg shadow-[#FF1493]/50'
                            : 'bg-gray-500'
                        }`}
                      >
                        {offer.status === 'active' ? 'Active' : 'Inactive'}
                      </MerchantBadge>
                    </div>
                    <MerchantCardContent className="p-4">
                      <h3 className="font-semibold text-lg text-white mb-2">
                        {offer.title}
                      </h3>
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold">{offer.pointsRequired.toLocaleString()}</span> Points
                          {offer.cashRequired && (
                            <span> + ${offer.cashRequired}</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-300">
                          {offer.redemptions} redemptions
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/hub/offers/${offer.id}`} className="flex-1">
                          <MerchantButton variant="outline" size="sm" className="w-full">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </MerchantButton>
                        </Link>
                        <Link href={`/offers/${offer.id}/edit`} className="flex-1">
                          <MerchantButton variant="outline" size="sm" className="w-full">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </MerchantButton>
                        </Link>
                        <MerchantButton variant="outline" size="sm" className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </MerchantButton>
                      </div>
                    </MerchantCardContent>
                  </MerchantCard>
                </motion.div>
              ))}
            </div>

            {filteredOffers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-300 mb-4">
                  {searchQuery ? 'No offers found matching your search.' : 'You haven\'t created any offers yet.'}
                </p>
                <Link href="/offers/create">
                  <MerchantButton>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Offer
                  </MerchantButton>
                </Link>
              </div>
            )}
          </motion.div>
      </MerchantDashboardLayout>
    </>
  )
}


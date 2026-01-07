import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import { OfferCard } from '@/components/merchant/OfferCard'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantHeader, MerchantFooter } from '@/components/merchant'
import { Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { router } from '@inertiajs/react'

interface Offer {
  id: string
  title: string
  image: string
  pointsRequired: number
  cashRequired?: number
  merchantName: string
  category: string
}

export default function MerchantHub() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Mock data - in production, this would come from props
  const offers: Offer[] = [
    {
      id: '1',
      title: 'Gift Card',
      image: '/placeholder.jpg',
      pointsRequired: 5000,
      cashRequired: 10,
      merchantName: 'Retail Store',
      category: 'Gift Cards'
    },
    {
      id: '2',
      title: 'Fitness Class Pass',
      image: '/placeholder.jpg',
      pointsRequired: 7500,
      merchantName: 'Fitness Center',
      category: 'Services'
    },
    {
      id: '3',
      title: 'Wireless Earbuds',
      image: '/placeholder.jpg',
      pointsRequired: 10000,
      cashRequired: 25,
      merchantName: 'Tech Store',
      category: 'Electronics'
    },
    {
      id: '4',
      title: 'Dinner for Two',
      image: '/placeholder.jpg',
      pointsRequired: 8000,
      cashRequired: 30,
      merchantName: 'Restaurant',
      category: 'Dining'
    }
  ]

  const categories = ['All', 'Gift Cards', 'Services', 'Electronics', 'Dining']

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         offer.merchantName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || selectedCategory === 'All' || offer.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleOfferClick = (offerId: string) => {
    router.visit(`/hub/offers/${offerId}`)
  }

  return (
    <>
      <Head title="Merchant Hub - Believe" />
      <div className="min-h-screen bg-gradient-to-br from-black via-[#1a0a0a] to-[#2d1b1b] dark:from-black dark:via-[#1a0a0a] dark:to-[#2d1b1b] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493]/5 via-[#DC143C]/5 to-[#E97451]/5 pointer-events-none"></div>
        {/* Header */}
        <MerchantHeader 
          variant="public" 
          title="Believe"
          showMenu={true}
        />

        <div className="container mx-auto px-4 pt-24 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10"
          >
            <h1 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_0_10px_rgba(255,20,147,0.5)]">
              Merchant Hub
            </h1>

            {/* Search and Filter */}
            <div className="mb-6 space-y-4">
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

              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <MerchantButton
                    key={category}
                    variant={selectedCategory === category || (!selectedCategory && category === 'All') ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category === 'All' ? null : category)}
                    className="whitespace-nowrap"
                  >
                    {category}
                  </MerchantButton>
                ))}
              </div>
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
                  <OfferCard
                    {...offer}
                    onClick={() => handleOfferClick(offer.id)}
                  />
                </motion.div>
              ))}
            </div>

            {filteredOffers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-300">
                  No offers found. Try adjusting your search or filters.
                </p>
              </div>
            )}
          </motion.div>
        </div>
        
        {/* Footer */}
        <MerchantFooter />
      </div>
    </>
  )
}

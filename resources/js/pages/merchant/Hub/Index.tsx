import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { MerchantHeader, MerchantFooter } from '@/components/merchant'
import { MerchantCard, MerchantCardContent } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantBadge } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Gift, TrendingUp, DollarSign, Coins } from 'lucide-react'
import { motion } from 'framer-motion'

interface Offer {
  id: string
  slug: string
  title: string
  image: string
  pointsRequired: number
  cashRequired?: number
  currency?: string
  merchantName: string
  merchantSlug?: string
  category: string
  categorySlug?: string
  description: string
}

interface Category {
  id: number
  name: string
  slug: string
  offers_count: number
}

interface Props {
  offers: {
    data: Offer[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    links: Array<{
      url: string | null
      label: string
      active: boolean
    }>
  }
  categories: Category[]
  filters: {
    category?: string
    merchant?: string
    search?: string
    min_points?: number
    max_points?: number
    has_cash?: boolean
    sort?: string
    per_page?: number
  }
}

export default function HubIndex({ offers, categories, filters: initialFilters }: Props) {
  const [search, setSearch] = useState(initialFilters.search || '')
  const [selectedCategory, setSelectedCategory] = useState(initialFilters.category || 'all')
  const [selectedSort, setSelectedSort] = useState(initialFilters.sort || 'newest')

  const handleSearch = (value: string) => {
    setSearch(value)
    router.get('/hub', {
      search: value || '',
      category: selectedCategory === 'all' ? '' : selectedCategory,
      sort: selectedSort,
    }, {
      preserveState: true,
      replace: true,
    })
  }

  const handleCategoryFilter = (value: string) => {
    setSelectedCategory(value)
    router.get('/hub', {
      search: search || '',
      category: value === 'all' ? '' : value,
      sort: selectedSort,
    }, {
      preserveState: true,
      replace: true,
    })
  }

  const handleSortChange = (value: string) => {
    setSelectedSort(value)
    router.get('/hub', {
      search: search || '',
      category: selectedCategory === 'all' ? '' : selectedCategory,
      sort: value,
    }, {
      preserveState: true,
      replace: true,
    })
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Gift Cards': 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
      'Services': 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
      'Electronics': 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
      'Dining': 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
      'Entertainment': 'bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/30',
    }
    return colors[category] || 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30'
  }

  const handlePageChange = (url: string | null) => {
    if (url) {
      router.visit(url, {
        preserveState: true,
      })
    }
  }

  return (
    <>
      <Head title="Merchant Hub - Browse Offers" />
      <div className="min-h-screen bg-gradient-to-br from-black via-[#1a0a0a] to-[#2d1b1b] dark:from-black dark:via-[#1a0a0a] dark:to-[#2d1b1b] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493]/5 via-[#DC143C]/5 to-[#E97451]/5 pointer-events-none"></div>
        
        {/* Header */}
        <MerchantHeader 
          variant="public" 
          title={`${import.meta.env.VITE_APP_NAME || 'Believe'} Merchant Hub`}
          showMenu={true}
        />

        <div className="container mx-auto px-4 pt-24 pb-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Browse Offers
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Discover amazing rewards and redeem them with your points
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <MerchantInput
                    type="text"
                    placeholder="Search offers..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 bg-gray-900/50 border-[#FF1493]/40 text-white placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="w-full md:w-64">
                <Select value={selectedCategory || 'all'} onValueChange={handleCategoryFilter}>
                  <SelectTrigger className="bg-gray-900/50 border-[#FF1493]/40 text-white">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.slug}>
                        {category.name} ({category.offers_count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Filter */}
              <div className="w-full md:w-64">
                <Select value={selectedSort || 'newest'} onValueChange={handleSortChange}>
                  <SelectTrigger className="bg-gray-900/50 border-[#FF1493]/40 text-white">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="points_asc">Points: Low to High</SelectItem>
                    <SelectItem value="points_desc">Points: High to Low</SelectItem>
                    <SelectItem value="cash_asc">Cash: Low to High</SelectItem>
                    <SelectItem value="cash_desc">Cash: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Offers Grid */}
          {offers.data.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {offers.data.map((offer) => (
                  <Link key={offer.id} href={`/hub/offers/${offer.slug}`}>
                    <motion.div
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="h-full"
                    >
                      <MerchantCard className="overflow-hidden cursor-pointer h-full flex flex-col hover:border-[#FF1493]/50 transition-colors">
                        <div className="aspect-video bg-gray-800 relative overflow-hidden">
                          <img
                            src={offer.image}
                            alt={offer.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.jpg'
                            }}
                          />
                          <div className="absolute top-2 left-2">
                            <MerchantBadge className={getCategoryColor(offer.category)}>
                              {offer.category}
                            </MerchantBadge>
                          </div>
                        </div>
                        <MerchantCardContent className="p-4 flex-1 flex flex-col">
                          <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
                            {offer.title}
                          </h3>
                          <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-1">
                            {offer.description}
                          </p>
                          <div className="space-y-2 mt-auto">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-[#FF1493]">
                                <Coins className="w-4 h-4" />
                                <span className="font-bold">{offer.pointsRequired.toLocaleString()}</span>
                                <span className="text-sm text-gray-400">pts</span>
                              </div>
                              {offer.cashRequired && (
                                <div className="flex items-center gap-1 text-white">
                                  <DollarSign className="w-4 h-4" />
                                  <span className="font-bold">{offer.cashRequired.toFixed(2)}</span>
                                  <span className="text-xs text-gray-400">{offer.currency || 'USD'}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              by {offer.merchantName}
                            </div>
                          </div>
                        </MerchantCardContent>
                      </MerchantCard>
                    </motion.div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {offers.last_page > 1 && (
                <div className="flex justify-center items-center gap-2">
                  {offers.links.map((link, index) => (
                    <button
                      key={index}
                      onClick={() => handlePageChange(link.url)}
                      disabled={!link.url || link.active}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        link.active
                          ? 'bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] text-white cursor-default'
                          : link.url
                          ? 'bg-gray-800 text-white hover:bg-gray-700 cursor-pointer'
                          : 'bg-gray-900 text-gray-600 cursor-not-allowed'
                      }`}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <MerchantCard className="text-center py-12">
              <MerchantCardContent>
                <Gift className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {search || selectedCategory !== 'all' ? 'No offers found' : 'No offers available'}
                </h3>
                <p className="text-gray-400">
                  {search || selectedCategory !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'Check back soon for new offers!'}
                </p>
              </MerchantCardContent>
            </MerchantCard>
          )}
        </div>
        
        {/* Footer */}
        <MerchantFooter />
      </div>
    </>
  )
}


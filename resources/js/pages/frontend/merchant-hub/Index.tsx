import React, { useState, useEffect, useRef } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { Search, Store, Gift, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import FrontendLayout from '@/layouts/frontend/frontend-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/frontend/ui/card'
import { Button } from '@/components/frontend/ui/button'
import { Badge } from '@/components/frontend/ui/badge'
import { Input } from '@/components/frontend/ui/input'

// Global route helper (provided by Laravel/Inertia)
declare global {
  function route(name: string, params?: Record<string, unknown>): string
}

interface Offer {
  id: string
  title: string
  image: string
  pointsRequired: number
  cashRequired?: number
  merchantName: string
  category: string
  description?: string
}

interface Category {
  id: number
  name: string
  slug: string
  offers_count: number
}

interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

interface PaginatedOffers {
  data: Offer[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  links?: PaginationLink[]
}

interface Props {
  offers?: PaginatedOffers
  categories?: Category[]
  filters?: {
    category?: string
    search?: string
    min_points?: number
    max_points?: number
    has_cash?: boolean
    sort?: string
    per_page?: number
  }
}

export default function MerchantHubIndex({ offers: initialOffers, categories: initialCategories = [], filters: initialFilters = {} }: Props) {
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '')
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(initialFilters.category || null)
  const isInitialMount = useRef(true)

  // Use real data from backend (already filtered by backend)
  const offersData: Offer[] = initialOffers?.data || []
  
  // Build categories list dynamically from backend data
  const allCategoriesList = ['All', ...(initialCategories.map(cat => cat.name))]
  const categories = initialCategories.length > 0 ? allCategoriesList : ['All']

  // Debounce search with useEffect
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const timeoutId = setTimeout(() => {
      router.get(
        route('merchant-hub.index'),
        {
          search: searchQuery || undefined,
          category: selectedCategorySlug || undefined,
        },
        {
          preserveState: true,
          preserveScroll: true,
          replace: true,
        }
      )
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedCategorySlug])

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Handle search form submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.get(
      route('merchant-hub.index'),
      {
        search: searchQuery || undefined,
        category: selectedCategorySlug || undefined,
      },
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      }
    )
  }

  // Handle category filter change
  const handleCategoryChange = (categoryName: string) => {
    if (categoryName === 'All') {
      setSelectedCategorySlug(null)
      router.get(
        route('merchant-hub.index'),
        {
          search: searchQuery || undefined,
        },
        {
          preserveState: true,
          preserveScroll: true,
          replace: true,
        }
      )
    } else {
      const categoryData = initialCategories.find(cat => cat.name === categoryName)
      if (categoryData) {
        setSelectedCategorySlug(categoryData.slug)
        router.get(
          route('merchant-hub.index'),
          {
            search: searchQuery || undefined,
            category: categoryData.slug,
          },
          {
            preserveState: true,
            preserveScroll: true,
            replace: true,
          }
        )
      }
    }
  }

  // Use backend-filtered offers directly (no client-side filtering)
  const filteredOffers = offersData

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

  return (
    <FrontendLayout>
      <Head title="Merchant Hub - Browse Offers" />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h1 className="text-xl font-bold">Merchant Hub</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 py-16 md:py-24"
        >
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,transparent)]" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6"
              >
                <Store className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">Merchant Hub</span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-4xl md:text-6xl font-bold text-white mb-4"
              >
                Discover Amazing Offers
                <br />
                <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                  from Local Merchants
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-lg md:text-xl text-white/90 mb-8"
              >
                Redeem your points for products, services, and experiences
              </motion.p>

              {/* Search Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="relative max-w-2xl mx-auto"
              >
                <form onSubmit={handleSearchSubmit}>
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search offers, merchants, or categories..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="pl-12 pr-32 h-14 text-lg bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="absolute right-2 h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Search
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-8">
          {/* Action Buttons */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">Available Offers</h2>
              <Badge variant="secondary">{initialOffers?.total || 0} offers</Badge>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Category Filters */}
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:w-64 flex-shrink-0"
            >
              <Card className="sticky top-24 border shadow-lg bg-gradient-to-br from-background to-muted/30 overflow-hidden">
                {/* Decorative gradient overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />

                <CardHeader className="relative">
                  <CardTitle className="text-lg flex items-center gap-2 font-bold">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    Categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative space-y-2">
                  {categories.map((category) => {
                    const categoryData = category === 'All' 
                      ? null 
                      : initialCategories.find(cat => cat.name === category)
                    const offersCount = category === 'All' 
                      ? (initialOffers?.total || 0)
                      : (categoryData?.offers_count || 0)
                    
                    const isSelected = category === 'All' 
                      ? !selectedCategorySlug
                      : categoryData?.slug === selectedCategorySlug
                    
                    return (
                      <Button
                        key={category}
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => handleCategoryChange(category)}
                        className={`w-full text-left justify-start ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-md'
                            : ''
                        }`}
                        size="sm"
                      >
                        <span className="flex items-center justify-between w-full">
                          <span>{category}</span>
                          {offersCount > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {offersCount}
                            </Badge>
                          )}
                        </span>
                      </Button>
                    )
                  })}
                </CardContent>
              </Card>
            </motion.aside>

            {/* Main Content */}
            <div className="flex-1">

              {/* Offers Grid */}
              {filteredOffers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOffers.map((offer, index) => (
                    <motion.div
                      key={offer.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer group">
                        <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-muted">
                          <img
                            src={offer.image || '/placeholder.jpg'}
                            alt={offer.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.jpg'
                            }}
                          />
                          <Badge 
                            className={`absolute top-2 right-2 ${getCategoryColor(offer.category)}`}
                          >
                            {offer.category}
                          </Badge>
                        </div>
                        <CardHeader>
                          <CardTitle className="line-clamp-2">{offer.title}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            {offer.merchantName}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {offer.description && (
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                              {offer.description}
                            </p>
                          )}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Points Required:</span>
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                {offer.pointsRequired.toLocaleString()}
                              </span>
                            </div>
                            {offer.cashRequired && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Cash Required:</span>
                                <span className="text-sm font-bold">
                                  ${offer.cashRequired.toFixed(2)}
                                </span>
                              </div>
                            )}
                            <Link href={`/merchant-hub/offers/${offer.id}`}>
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
              ) : (
                <div className="text-center py-12">
                  <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No offers found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filters to find what you're looking for.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}


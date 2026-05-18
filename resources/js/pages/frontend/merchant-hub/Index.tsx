import React, { useState, useEffect, useRef } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { PageHead } from '@/components/frontend/PageHead'
import { Search, Store, Gift, Sparkles, ShoppingBag, Package, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import FrontendLayout from '@/layouts/frontend/frontend-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/frontend/ui/card'
import { Button } from '@/components/frontend/ui/button'
import { Badge } from '@/components/frontend/ui/badge'
import { Input } from '@/components/frontend/ui/input'
import { cn } from '@/lib/utils'

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

interface HubCategory {
  id: number
  name: string
  slug: string
  offers_count: number
}

interface ProductCategoryRow {
  id: number
  name: string
  products_count: number
}

interface MarketplaceProductRow {
  id: number
  name: string
  description: string
  price: number
  price_display: string
  image: string
  category: string
  merchantName: string
  url: string
}

interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  links?: PaginationLink[]
}

interface Filters {
  tab?: string
  category?: string
  search?: string
  min_points?: number
  max_points?: number
  has_cash?: boolean
  sort?: string
  per_page?: number
  pcategory?: string | null
}

interface Props {
  tab?: string
  offers?: Paginated<Offer> | null
  marketplaceProducts?: Paginated<MarketplaceProductRow> | null
  categories?: HubCategory[]
  productCategories?: ProductCategoryRow[]
  filters?: Filters
}

function offerImageSrc(src: string | undefined): string {
  if (!src || src === '/placeholder.jpg') return src || '/placeholder.jpg'
  if (src.startsWith('http') || src.startsWith('//') || src.startsWith('/storage')) return src
  return '/storage/' + src.replace(/^\//, '')
}

function PaginationBar({ links, lastPage }: { links?: PaginationLink[]; lastPage?: number }) {
  if (lastPage != null && lastPage <= 1) return null
  if (!links?.length) return null
  return (
    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mt-12 md:mt-16">
      {links.map((l, i) =>
        l.url ? (
          <button
            key={i}
            type="button"
            onClick={() => l.url && router.visit(l.url)}
            className={cn(
              'min-w-[2.5rem] px-3 py-2 rounded-xl text-sm font-medium transition-colors',
              l.active
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25'
                : 'bg-muted/80 hover:bg-muted text-foreground border border-border/60'
            )}
            dangerouslySetInnerHTML={{ __html: l.label }}
          />
        ) : (
          <span
            key={i}
            className="px-3 py-2 text-muted-foreground text-sm"
            dangerouslySetInnerHTML={{ __html: l.label }}
          />
        )
      )}
    </div>
  )
}

export default function MerchantHubIndex({
  offers: initialOffers,
  marketplaceProducts: initialMarketplaceProducts,
  categories: initialCategories = [],
  productCategories: initialProductCategories = [],
  filters: initialFilters = {},
}: Props) {
  const { auth } = usePage().props as { auth?: { user?: unknown } }
  const currentTab = (initialFilters.tab === 'products' ? 'products' : 'offers') as 'offers' | 'products'

  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '')
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(initialFilters.category || null)
  const [selectedProductCategoryId, setSelectedProductCategoryId] = useState<number | null>(
    initialFilters.pcategory ? parseInt(String(initialFilters.pcategory), 10) || null : null
  )
  const isInitialMount = useRef(true)

  const offersTotal =
    (initialOffers as Paginated<Offer> | null | undefined)?.total ??
    (initialOffers as Paginated<Offer> | null | undefined)?.data?.length ??
    0

  const offersData: Offer[] =
    Array.isArray(initialOffers) && initialOffers
      ? (initialOffers as unknown as Offer[])
      : ((initialOffers as Paginated<Offer> | null)?.data ?? [])

  const productsTotal =
    (initialMarketplaceProducts as Paginated<MarketplaceProductRow> | null | undefined)?.total ?? 0

  const productsData: MarketplaceProductRow[] =
    (initialMarketplaceProducts as Paginated<MarketplaceProductRow> | null)?.data ?? []

  const offerPaginationLinks = (initialOffers as Paginated<Offer> | null)?.links
  const productPaginationLinks = (initialMarketplaceProducts as Paginated<MarketplaceProductRow> | null)?.links
  const offersLastPage = (initialOffers as Paginated<Offer> | null)?.last_page
  const productsLastPage = (initialMarketplaceProducts as Paginated<MarketplaceProductRow> | null)?.last_page

  const allOfferCategoriesList = ['All', ...initialCategories.map((cat) => cat.name)]
  const offerCategories = initialCategories.length > 0 ? allOfferCategoriesList : ['All']

  const allProductCategoriesList = ['All', ...initialProductCategories.map((c) => c.name)]
  const productCategoryNames = initialProductCategories.length > 0 ? allProductCategoriesList : ['All']

  const buildQuery = (overrides: Record<string, string | number | undefined | null> = {}) => {
    const tab = currentTab
    const base: Record<string, string | number | undefined> = {
      tab,
      search: searchQuery || undefined,
      ...overrides,
    }
    if (tab === 'offers') {
      base.category = selectedCategorySlug || undefined
    } else {
      base.pcategory = selectedProductCategoryId != null ? String(selectedProductCategoryId) : undefined
    }
    return base
  }

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const timeoutId = setTimeout(() => {
      router.get(route('merchant-hub.index'), buildQuery(), {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      })
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedCategorySlug, selectedProductCategoryId])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.get(route('merchant-hub.index'), buildQuery(), {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }

  const goTab = (t: 'offers' | 'products') => {
    router.get(
      route('merchant-hub.index'),
      {
        tab: t,
        search: searchQuery || undefined,
      },
      { preserveState: false, preserveScroll: false }
    )
  }

  const handleOfferCategoryChange = (categoryName: string) => {
    if (categoryName === 'All') {
      setSelectedCategorySlug(null)
      router.get(
        route('merchant-hub.index'),
        { tab: 'offers', search: searchQuery || undefined },
        { preserveState: true, preserveScroll: true, replace: true }
      )
    } else {
      const categoryData = initialCategories.find((cat) => cat.name === categoryName)
      if (categoryData) {
        setSelectedCategorySlug(categoryData.slug)
        router.get(
          route('merchant-hub.index'),
          {
            tab: 'offers',
            search: searchQuery || undefined,
            category: categoryData.slug,
          },
          { preserveState: true, preserveScroll: true, replace: true }
        )
      }
    }
  }

  const handleProductCategoryChange = (categoryName: string) => {
    if (categoryName === 'All') {
      setSelectedProductCategoryId(null)
      router.get(
        route('merchant-hub.index'),
        { tab: 'products', search: searchQuery || undefined },
        { preserveState: true, preserveScroll: true, replace: true }
      )
    } else {
      const row = initialProductCategories.find((c) => c.name === categoryName)
      if (row) {
        setSelectedProductCategoryId(row.id)
        router.get(
          route('merchant-hub.index'),
          {
            tab: 'products',
            search: searchQuery || undefined,
            pcategory: String(row.id),
          },
          { preserveState: true, preserveScroll: true, replace: true }
        )
      }
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Gift Cards': 'bg-purple-500/25 text-purple-200 border-purple-400/40',
      Services: 'bg-blue-500/25 text-blue-200 border-blue-400/40',
      Electronics: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40',
      Dining: 'bg-orange-500/25 text-orange-200 border-orange-400/40',
      Entertainment: 'bg-pink-500/25 text-pink-200 border-pink-400/40',
    }
    return colors[category] || 'bg-white/15 text-white/90 border-white/25'
  }

  const searchPlaceholder =
    currentTab === 'products'
      ? 'Search products, merchants, categories…'
      : 'Search offers, merchants, categories…'

  return (
    <FrontendLayout>
      <PageHead
        title="Merchant Hub"
        description="Browse reward offers and merchant products from partner businesses."
      />
      <div className="min-h-screen bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(120,80,255,0.35),transparent)] dark:bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(80,40,120,0.4),transparent)]">
        {/* Full-width hero */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-full overflow-hidden border-b border-white/10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-950" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.04%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="relative z-10 w-full max-w-[1600px] mx-auto px-3 sm:px-8 lg:px-12 pt-7 pb-9 sm:pt-11 sm:pb-12 md:pt-16 md:pb-16">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-5 sm:py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/95 text-xs sm:text-sm font-medium mb-4 sm:mb-6 shadow-lg"
              >
                <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Merchant Hub · Partners
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-3 sm:mb-4 leading-[1.12]"
              >
                Offers &amp;{' '}
                <span className="bg-gradient-to-r from-amber-200 via-pink-200 to-violet-200 bg-clip-text text-transparent">
                  Products
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm sm:text-base md:text-lg text-white/75 mb-5 sm:mb-6 max-w-2xl mx-auto leading-snug sm:leading-relaxed px-1"
              >
                {currentTab === 'offers'
                  ? 'Use reward points for real value from local merchants who give back.'
                  : 'Shop curated items from verified merchants — same secure checkout as the rest of Believe In Unity.'}
              </motion.p>

              {/* Tab switch — full width bar */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex w-full max-w-xl mx-auto p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-black/25 backdrop-blur-xl border border-white/15 shadow-2xl mb-5 sm:mb-8"
              >
                <button
                  type="button"
                  onClick={() => goTab('offers')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] sm:min-h-[48px] rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all duration-300',
                    currentTab === 'offers'
                      ? 'bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Gift className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Offers
                </button>
                <button
                  type="button"
                  onClick={() => goTab('products')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] sm:min-h-[48px] rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all duration-300',
                    currentTab === 'products'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Products
                </button>
              </motion.div>

              <motion.form
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onSubmit={handleSearchSubmit}
                className="relative max-w-3xl mx-auto"
              >
                <Search className="absolute left-3.5 sm:left-5 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-11 sm:pl-14 pr-[5.5rem] sm:pr-36 md:pr-44 h-11 sm:h-12 md:h-14 text-sm sm:text-base md:text-lg rounded-xl sm:rounded-2xl border-0 bg-white/95 dark:bg-gray-900/95 shadow-xl text-foreground placeholder:text-muted-foreground"
                />
                <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 sm:h-11 md:h-12 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-md text-xs sm:text-sm"
                  >
                    Search
                  </Button>
                  {auth?.user && (
                    <Link href={route('merchant-hub.my-purchases')} className="hidden sm:block">
                      <Button
                        type="button"
                        size="lg"
                        variant="secondary"
                        className="h-11 md:h-12 rounded-xl gap-2 bg-white/90 dark:bg-gray-800/90"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        My Purchases
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.form>
              {auth?.user && (
                <div className="sm:hidden mt-3 flex justify-center">
                  <Link href={route('merchant-hub.my-purchases')}>
                    <Button type="button" size="sm" variant="secondary" className="rounded-xl gap-2 bg-white/15 text-white border border-white/20">
                      <ShoppingBag className="h-4 w-4" />
                      My purchases
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Main content — full width */}
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-8 lg:px-12 py-6 sm:py-10 md:py-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-8 md:mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                {currentTab === 'offers' ? 'Reward offers' : 'Merchant products'}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                {currentTab === 'offers'
                  ? `${offersTotal} offer${offersTotal === 1 ? '' : 's'} available`
                  : `${productsTotal} product${productsTotal === 1 ? '' : 's'} in the catalog`}
              </p>
            </div>
            <Badge variant="secondary" className="w-fit text-sm px-4 py-1.5 rounded-full">
              {currentTab === 'offers' ? 'Points & perks' : 'Buy & support'}
            </Badge>
          </div>

          {/* Category chips — full width */}
          <div className="mb-5 sm:mb-8 md:mb-10">
            <div className="flex items-center gap-2 mb-2 sm:mb-3 text-xs sm:text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-violet-500" />
              {currentTab === 'offers' ? 'Browse by category' : 'Filter by category'}
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {currentTab === 'offers' &&
                offerCategories.map((category) => {
                  const categoryData =
                    category === 'All' ? null : initialCategories.find((cat) => cat.name === category)
                  const count = category === 'All' ? offersTotal : categoryData?.offers_count || 0
                  const isSelected =
                    category === 'All' ? !selectedCategorySlug : categoryData?.slug === selectedCategorySlug
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleOfferCategoryChange(category)}
                      className={cn(
                        'inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all border',
                        isSelected
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-transparent shadow-lg'
                          : 'bg-muted/60 hover:bg-muted border-border/80 text-foreground'
                      )}
                    >
                      {category}
                      {count > 0 && (
                        <span className={cn('text-xs tabular-nums', isSelected ? 'text-white/90' : 'text-muted-foreground')}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              {currentTab === 'products' &&
                productCategoryNames.map((category) => {
                  const row = category === 'All' ? null : initialProductCategories.find((c) => c.name === category)
                  const count = category === 'All' ? productsTotal : row?.products_count || 0
                  const isSelected =
                    category === 'All' ? selectedProductCategoryId == null : row?.id === selectedProductCategoryId
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleProductCategoryChange(category)}
                      className={cn(
                        'inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all border',
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-lg'
                          : 'bg-muted/60 hover:bg-muted border-border/80 text-foreground'
                      )}
                    >
                      {category}
                      {count > 0 && (
                        <span className={cn('text-xs tabular-nums', isSelected ? 'text-white/90' : 'text-muted-foreground')}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
            </div>
          </div>

          {/* Grids */}
          {currentTab === 'offers' && (
            <>
              {offersData.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-4 md:gap-6">
                    {offersData.map((offer, index) => (
                      <motion.div
                        key={offer.id}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
                      >
                        <Card className="group h-full overflow-hidden rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300">
                          <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                            <img
                              src={offerImageSrc(offer.image)}
                              alt={offer.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).src = '/placeholder.jpg'
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80" />
                            <Badge
                              className={cn('absolute top-3 right-3 border backdrop-blur-sm', getCategoryColor(offer.category))}
                            >
                              {offer.category}
                            </Badge>
                          </div>
                          <CardHeader className="pb-2">
                            <CardTitle className="line-clamp-2 text-lg leading-snug">{offer.title}</CardTitle>
                            <CardDescription className="flex items-center gap-1.5 pt-1">
                              <Store className="w-3.5 h-3.5 shrink-0" />
                              {offer.merchantName}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {offer.description && (
                              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{offer.description}</p>
                            )}
                            <div className="flex items-center justify-between text-sm mb-4">
                              <span className="text-muted-foreground">Points</span>
                              <span className="font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                                {offer.pointsRequired.toLocaleString()}
                              </span>
                            </div>
                            {offer.cashRequired != null && offer.cashRequired > 0 && (
                              <div className="flex items-center justify-between text-sm mb-4">
                                <span className="text-muted-foreground">Cash option</span>
                                <span className="font-semibold">${offer.cashRequired.toFixed(2)}</span>
                              </div>
                            )}
                            <Link href={`/merchant-hub/offers/${offer.id}`}>
                              <Button className="w-full rounded-xl h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 gap-2">
                                View offer
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                  <PaginationBar links={offerPaginationLinks} lastPage={offersLastPage} />
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-20 text-center px-4">
                  <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-60" />
                  <h3 className="text-xl font-semibold mb-2">No offers found</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">Try another search or category.</p>
                </div>
              )}
            </>
          )}

          {currentTab === 'products' && (
            <>
              {productsData.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-4 md:gap-6">
                    {productsData.map((p, index) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
                      >
                        <Link href={p.url} className="block h-full group">
                          <Card className="h-full overflow-hidden rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300">
                            <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                              <img
                                src={p.image || '/placeholder.jpg'}
                                alt={p.name}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              {p.category ? (
                                <Badge className="absolute top-3 right-3 bg-emerald-600/95 text-white border-0 backdrop-blur-sm">
                                  {p.category}
                                </Badge>
                              ) : null}
                              <div className="absolute bottom-3 left-3 right-3">
                                <p className="text-2xl font-bold text-white drop-shadow-md tabular-nums">{p.price_display}</p>
                              </div>
                            </div>
                            <CardHeader className="pb-2">
                              <CardTitle className="line-clamp-2 text-lg leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                {p.name}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5 shrink-0" />
                                {p.merchantName}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                              {p.description ? (
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{p.description}</p>
                              ) : (
                                <div className="mb-4 h-10" />
                              )}
                              <span className="inline-flex items-center justify-center w-full rounded-xl h-11 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md group-hover:from-emerald-500 group-hover:to-teal-500 transition-colors">
                                View product
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </span>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                  <PaginationBar links={productPaginationLinks} lastPage={productsLastPage} />
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-20 text-center px-4">
                  <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-60" />
                  <h3 className="text-xl font-semibold mb-2">No products yet</h3>
                  <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base leading-relaxed">
                    Merchants need to publish products as <strong className="text-foreground">Active</strong> with available
                    stock (or unlimited inventory). If you just added a product, set status to Active in the merchant
                    dashboard and refresh.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}

"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Badge } from "@/components/frontend/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/frontend/ui/accordion"
import {
  Search,
  Filter,
  Star,
  Clock,
  Sparkles,
  Plus,
  SlidersHorizontal,
  X,
  Heart,
  Tag,
  DollarSign,
  Timer,
  Award,
  Package,
  ShoppingBag,
  BarChart3,
  Menu,
} from "lucide-react"
import { Link, router, usePage } from "@inertiajs/react"
import { useState, useEffect } from "react"
import { PageHead } from "@/components/frontend/PageHead"

interface Gig {
  id: number
  slug: string
  title: string
  description: string
  price: number
  deliveryTime: string
  rating: number
  reviews: number
  image: string | null
  seller: {
    id: number
    name: string
    avatar: string | null
  }
  category: string
  tags: string[]
}

interface Category {
  id: number
  name: string
  slug: string
}

interface PageProps extends Record<string, unknown> {
  gigs: {
    data: Gig[]
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  categories: Category[]
  favoriteIds: number[]
  totalUnread?: number
  filters: {
    search: string
    category: string
    price_min: number
    price_max: number
    min_rating: number
    delivery_time: string | null
    sort_by: string
  }
}

const sortOptions = [
  { label: "Best Selling", value: "best_selling" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_low" },
  { label: "Price: High to Low", value: "price_high" },
  { label: "Rating", value: "rating" },
]

export default function ServiceHubIndex() {
  const pageProps = usePage<PageProps>().props as any
  const { gigs, categories, favoriteIds, totalUnread: initialUnreadCount = 0, filters: initialFilters } = pageProps
  const isAdmin = pageProps?.auth?.user?.role === "admin"

  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "")
  const [selectedCategory, setSelectedCategory] = useState(initialFilters.category || "all")
  const [sortBy, setSortBy] = useState(initialFilters.sort_by || "best_selling")
  const [showFilters, setShowFilters] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [priceRange, setPriceRange] = useState({
    min: initialFilters.price_min || 0,
    max: initialFilters.price_max || 1000,
  })
  const [deliveryTime, setDeliveryTime] = useState<string | null>(initialFilters.delivery_time || null)
  const [minRating, setMinRating] = useState(initialFilters.min_rating || 0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const services = gigs.data.map((gig) => ({
    ...gig,
    isFavorite: favoriteIds.includes(gig.id),
  }))

  const applyFilters = () => {
    const params: any = {
      search: searchQuery || undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      price_min: priceRange.min > 0 ? priceRange.min : undefined,
      price_max: priceRange.max < 1000 ? priceRange.max : undefined,
      min_rating: minRating > 0 ? minRating : undefined,
      delivery_time: deliveryTime || undefined,
      sort_by: sortBy,
    }

    router.get("/service-hub", params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }

  useEffect(() => {
    if (searchQuery === initialFilters.search) return
    const timeoutId = setTimeout(() => {
      applyFilters()
    }, 500)
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  useEffect(() => {
    if (
      selectedCategory === initialFilters.category &&
      priceRange.min === initialFilters.price_min &&
      priceRange.max === initialFilters.price_max &&
      minRating === initialFilters.min_rating &&
      deliveryTime === initialFilters.delivery_time &&
      sortBy === initialFilters.sort_by
    )
      return
    applyFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, sortBy, priceRange, deliveryTime, minRating])

  const clearAllFilters = () => {
    setSelectedCategory("all")
    setPriceRange({ min: 0, max: 1000 })
    setDeliveryTime(null)
    setMinRating(0)
    setSearchQuery("")
    router.get("/service-hub")
  }

  const hasActiveFilters =
    selectedCategory !== "all" || priceRange.min > 0 || priceRange.max < 1000 || deliveryTime !== null || minRating > 0

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch("/service-hub/chats/unreadcountget")
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.total_unread || 0)
        }
      } catch (error) {
        console.error("Error fetching unread count:", error)
      }
    }

    const interval = setInterval(fetchUnreadCount, 10000)
    return () => clearInterval(interval)
  }, [])

  const toggleFavorite = async (slug: string, gigId: number) => {
    try {
      const response = await fetch(`/service-hub/${slug}/favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
        credentials: "same-origin",
      })
      const data = await response.json()
      if (data.favorited) {
        favoriteIds.push(gigId)
      } else {
        const index = favoriteIds.indexOf(gigId)
        if (index > -1) favoriteIds.splice(index, 1)
      }
      router.reload({ only: ["favoriteIds"] })
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  const categoryList = [
    { name: "All Categories", slug: "all" },
    ...categories.map((cat) => ({ name: cat.name, slug: cat.slug })),
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  }

  return (
    <FrontendLayout>
      <PageHead title="Service Hub" description="Find professional services from verified sellers. Book freelancers and support causes through our marketplace." />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 md:py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">Service Hub</h1>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-2">
                {!isAdmin && (
                  <>
                    <Link href="/service-hub/my-orders">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Package className="h-4 w-4" />
                        <span className="hidden lg:inline">My Orders</span>
                      </Button>
                    </Link>
                    <Link href="/service-hub/seller-dashboard">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden lg:inline">Seller Dashboard</span>
                      </Button>
                    </Link>
                    <Link href="/service-hub/seller-orders">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        <span className="hidden lg:inline">My Sales</span>
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && !isAdmin && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="md:hidden flex flex-col gap-2 mt-4 pt-4 border-t"
              >
                <Link href="/service-hub/my-orders" className="w-full">
                  <Button variant="outline" className="w-full gap-2 justify-start bg-transparent">
                    <Package className="h-4 w-4" />
                    My Orders
                  </Button>
                </Link>
                <Link href="/service-hub/seller-dashboard" className="w-full">
                  <Button variant="outline" className="w-full gap-2 justify-start bg-transparent">
                    <BarChart3 className="h-4 w-4" />
                    Seller Dashboard
                  </Button>
                </Link>
                <Link href="/service-hub/seller-orders" className="w-full">
                  <Button variant="outline" className="w-full gap-2 justify-start bg-transparent">
                    <ShoppingBag className="h-4 w-4" />
                    My Sales
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>
        </div>

        {!isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border-b border-border/50"
          >
            <div className="container mx-auto px-4 py-6 md:py-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Ready to offer your services?</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Join thousands of professionals and start earning by offering your skills
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto flex-col sm:flex-row">
                  <Link href="/service-hub/seller-dashboard" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/service-hub/create" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Service
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 py-16 md:py-24"
        >
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,transparent)]" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6 mx-auto"
              >
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">Service Hub</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-3xl md:text-5xl font-bold text-white mb-4 text-center text-balance"
              >
                Find the Perfect Service for Your Needs
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-base md:text-lg text-white/90 mb-8 text-center"
              >
                Connect with talented professionals offering services from design to development
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="relative max-w-2xl mx-auto"
              >
                <div className="relative flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0">
                  <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search services... (e.g., logo design, web development)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 h-12 md:h-14 text-base bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-0 shadow-xl text-foreground placeholder:text-muted-foreground rounded-lg sm:rounded-l-lg sm:rounded-r-none"
                  />
                  <Button
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700 h-12 md:h-14 rounded-lg sm:rounded-r-lg sm:rounded-l-none w-full sm:w-auto"
                    onClick={() => applyFilters()}
                  >
                    <Search className="h-5 w-5 sm:hidden" />
                    <span className="hidden sm:inline">Search</span>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className={`${showFilters ? "block" : "hidden lg:block"} lg:w-72 flex-shrink-0`}
            >
              <Card className="sticky top-24 border shadow-lg bg-card overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg flex items-center gap-2 font-bold">
                      <Filter className="h-5 w-5 text-blue-600" />
                      <span>Filters</span>
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)} className="lg:hidden">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {hasActiveFilters && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-3"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="w-full text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear All Filters
                      </Button>
                    </motion.div>
                  )}
                </CardHeader>

                <CardContent>
                  <Accordion
                    type="multiple"
                    defaultValue={["categories", "price", "delivery", "rating"]}
                    className="w-full"
                  >
                    <AccordionItem value="categories" className="border-b border-border/40">
                      <AccordionTrigger className="hover:no-underline py-3 px-0 group">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 group-hover:bg-blue-100 dark:group-hover:bg-blue-950/50 transition-colors">
                            <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="font-semibold text-sm">Categories</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-3 pb-4">
                        <div className="space-y-1.5">
                          {categoryList.map((category) => (
                            <button
                              key={category.slug}
                              onClick={() => setSelectedCategory(category.slug)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                                selectedCategory === category.slug
                                  ? "bg-blue-600 text-white font-medium shadow-md"
                                  : "hover:bg-muted hover:shadow-sm"
                              }`}
                            >
                              {category.name}
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="price" className="border-b border-border/40">
                      <AccordionTrigger className="hover:no-underline py-3 px-0 group">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/30 group-hover:bg-green-100 dark:group-hover:bg-green-950/50 transition-colors">
                            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="font-semibold text-sm">Price Range</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-3 pb-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="Min"
                              value={priceRange.min || ""}
                              onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) || 0 })}
                              className="h-10 text-sm"
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                              type="number"
                              placeholder="Max"
                              value={priceRange.max || ""}
                              onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) || 1000 })}
                              className="h-10 text-sm"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${priceRange.min} - ${priceRange.max}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="delivery" className="border-b border-border/40">
                      <AccordionTrigger className="hover:no-underline py-3 px-0 group">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 group-hover:bg-purple-100 dark:group-hover:bg-purple-950/50 transition-colors">
                            <Timer className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="font-semibold text-sm">Delivery Time</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-3 pb-4">
                        <div className="space-y-1.5">
                          {["1 day", "2 days", "3 days", "5 days", "7 days"].map((time) => (
                            <button
                              key={time}
                              onClick={() => setDeliveryTime(deliveryTime === time ? null : time)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
                                deliveryTime === time
                                  ? "bg-purple-600 text-white font-medium shadow-md"
                                  : "hover:bg-muted hover:shadow-sm"
                              }`}
                            >
                              <Clock className="h-3.5 w-3.5" />
                              <span>{time}</span>
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="rating" className="border-b-0">
                      <AccordionTrigger className="hover:no-underline py-3 px-0 group">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 group-hover:bg-yellow-100 dark:group-hover:bg-yellow-950/50 transition-colors">
                            <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <span className="font-semibold text-sm">Minimum Rating</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-3 pb-4">
                        <div className="space-y-1.5">
                          {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => setMinRating(minRating === rating ? 0 : rating)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
                                minRating === rating
                                  ? "bg-yellow-500 text-white font-medium shadow-md"
                                  : "hover:bg-muted hover:shadow-sm"
                              }`}
                            >
                              <Star className={`h-4 w-4 ${minRating === rating ? "fill-white" : "fill-yellow-400"}`} />
                              <span>{rating}+ Stars</span>
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </motion.aside>

            <div className="flex-1">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">{gigs.total} Services</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {selectedCategory !== "all" && `in ${categoryList.find((c) => c.slug === selectedCategory)?.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden gap-2 bg-transparent"
                    onClick={() => setShowFilters(true)}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </Button>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-background text-sm flex-1 sm:flex-none"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6"
              >
                <AnimatePresence mode="wait">
                  {services.map((service) => (
                    <motion.div key={service.id} variants={itemVariants} whileHover={{ y: -4 }} className="group">
                      <Card className="h-full overflow-hidden border hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer">
                        <Link href={`/service-hub/${service.slug}`}>
                          <div className="relative">
                            <div className="aspect-video w-full overflow-hidden bg-muted">
                              <img
                                src={service.image || "/placeholder-image.jpg"}
                                alt={service.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background"
                              onClick={(e) => {
                                e.preventDefault()
                                toggleFavorite(service.slug, service.id)
                              }}
                            >
                              <Heart className={`h-5 w-5 ${service.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                            </Button>
                            <Badge className="absolute top-2 left-2 bg-primary/90 backdrop-blur-sm text-xs">
                              {service.category}
                            </Badge>
                          </div>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-base md:text-lg line-clamp-2 group-hover:text-primary transition-colors">
                                {service.title}
                              </CardTitle>
                              <div className="text-right flex-shrink-0">
                                <div className="text-xl md:text-2xl font-bold text-primary">${service.price}</div>
                                <div className="text-xs text-muted-foreground">from</div>
                              </div>
                            </div>
                            <CardDescription className="line-clamp-2 text-xs md:text-sm">
                              {service.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Seller Info */}
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={service.seller.avatar || undefined} />
                                <AvatarFallback>{service.seller.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs md:text-sm font-medium truncate">{service.seller.name}</p>
                              </div>
                            </div>

                            {/* Rating & Delivery */}
                            <div className="flex items-center justify-between text-xs md:text-sm gap-2">
                              <div className="flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold">{service.rating}</span>
                                <span className="text-muted-foreground">({service.reviews})</span>
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                <span className="hidden sm:inline">{service.deliveryTime}</span>
                              </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1">
                              {service.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Link>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {services.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 md:py-16">
                  <Sparkles className="h-12 md:h-16 w-12 md:w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg md:text-xl font-semibold mb-2">No services found</h3>
                  <p className="text-muted-foreground text-sm md:text-base">
                    Try adjusting your filters or search query
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {!isAdmin && (
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-12 md:py-16 mt-12 md:mt-20"
          >
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Ready to offer your services?</h2>
              <p className="text-white/90 mb-6 md:mb-8 max-w-2xl mx-auto text-sm md:text-base">
                Join thousands of professionals and start earning by offering your skills
              </p>
              <div className="flex items-center gap-3 md:gap-4 justify-center flex-col sm:flex-row flex-wrap">
                <Link href="/service-hub/seller-dashboard" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full bg-white text-blue-600 hover:bg-white/90">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/service-hub/create" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full bg-white/10 text-white border-white/30 hover:bg-white/20"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your Service
                  </Button>
                </Link>
              </div>
            </div>
          </motion.section>
        )}
      </div>
    </FrontendLayout>
  )
}

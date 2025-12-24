"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Badge } from "@/components/frontend/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/frontend/ui/accordion"
import {
  Search,
  Filter,
  Star,
  Clock,
  TrendingUp,
  Sparkles,
  Plus,
  SlidersHorizontal,
  X,
  Check,
  ArrowRight,
  Heart,
  Eye,
  Tag,
  DollarSign,
  Timer,
  Award,
  ChevronDown,
} from "lucide-react"
import { Link, router } from "@inertiajs/react"
import { useState, useEffect } from "react"
import { Head } from "@inertiajs/react"

// Mock data - replace with real data from backend
const mockServices = [
  {
    id: 1,
    title: "Professional Logo Design",
    description: "I will create a stunning, modern logo design for your brand with unlimited revisions",
    price: 25,
    deliveryTime: "3 days",
    rating: 4.9,
    reviews: 1247,
    image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400",
    seller: {
      name: "DesignPro",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
      level: "Level 2 Seller",
      responseTime: "1 hour",
    },
    category: "Graphics & Design",
    tags: ["Logo", "Branding", "Vector"],
    isFavorite: false,
  },
  {
    id: 2,
    title: "Website Development - React & Next.js",
    description: "Full-stack web development with modern technologies, responsive design, and SEO optimization",
    price: 150,
    deliveryTime: "7 days",
    rating: 5.0,
    reviews: 892,
    image: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400",
    seller: {
      name: "CodeMaster",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
      level: "Top Rated",
      responseTime: "30 min",
    },
    category: "Programming & Tech",
    tags: ["Web Development", "React", "Next.js"],
    isFavorite: true,
  },
  {
    id: 3,
    title: "Social Media Content Creation",
    description: "Engaging social media posts, stories, and reels for Instagram, Facebook, and TikTok",
    price: 45,
    deliveryTime: "2 days",
    rating: 4.8,
    reviews: 634,
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400",
    seller: {
      name: "SocialBoost",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
      level: "Level 1 Seller",
      responseTime: "2 hours",
    },
    category: "Digital Marketing",
    tags: ["Social Media", "Content", "Marketing"],
    isFavorite: false,
  },
  {
    id: 4,
    title: "Voice Over Recording",
    description: "Professional voice over in English, Spanish, or French. Commercial, narration, or character voices",
    price: 80,
    deliveryTime: "1 day",
    rating: 4.9,
    reviews: 445,
    image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400",
    seller: {
      name: "VoiceStudio",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
      level: "Level 2 Seller",
      responseTime: "1 hour",
    },
    category: "Music & Audio",
    tags: ["Voice Over", "Audio", "Recording"],
    isFavorite: false,
  },
  {
    id: 5,
    title: "Video Editing & Post-Production",
    description: "Professional video editing with color grading, transitions, effects, and motion graphics",
    price: 120,
    deliveryTime: "5 days",
    rating: 4.7,
    reviews: 321,
    image: "https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=400",
    seller: {
      name: "VideoPro",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100",
      level: "Top Rated",
      responseTime: "45 min",
    },
    category: "Video & Animation",
    tags: ["Video Editing", "Post-Production", "Motion Graphics"],
    isFavorite: false,
  },
  {
    id: 6,
    title: "SEO Optimization & Content Writing",
    description: "SEO-optimized blog posts, articles, and web content that ranks high on Google",
    price: 60,
    deliveryTime: "4 days",
    rating: 4.8,
    reviews: 789,
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400",
    seller: {
      name: "ContentKing",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100",
      level: "Level 2 Seller",
      responseTime: "1 hour",
    },
    category: "Writing & Translation",
    tags: ["SEO", "Content Writing", "Blog"],
    isFavorite: false,
  },
]

const categories = [
  "All Categories",
  "Graphics & Design",
  "Programming & Tech",
  "Digital Marketing",
  "Writing & Translation",
  "Video & Animation",
  "Music & Audio",
  "Business",
  "Lifestyle",
]

const sortOptions = [
  { label: "Best Selling", value: "best_selling" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_low" },
  { label: "Price: High to Low", value: "price_high" },
  { label: "Rating", value: "rating" },
]

export default function ServiceHubIndex() {
  const [services, setServices] = useState(mockServices)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [sortBy, setSortBy] = useState("best_selling")
  const [showFilters, setShowFilters] = useState(false)
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 })
  const [deliveryTime, setDeliveryTime] = useState<string | null>(null)
  const [minRating, setMinRating] = useState(0)

  const clearAllFilters = () => {
    setSelectedCategory("All Categories")
    setPriceRange({ min: 0, max: 1000 })
    setDeliveryTime(null)
    setMinRating(0)
    setSearchQuery("")
  }

  const hasActiveFilters = selectedCategory !== "All Categories" || 
    priceRange.min > 0 || priceRange.max < 1000 || 
    deliveryTime !== null || minRating > 0

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All Categories" || service.category === selectedCategory
    const matchesPrice = service.price >= priceRange.min && service.price <= priceRange.max
    const matchesRating = service.rating >= minRating
    const matchesDelivery = !deliveryTime || service.deliveryTime === deliveryTime

    return matchesSearch && matchesCategory && matchesPrice && matchesRating && matchesDelivery
  })

  const sortedServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case "price_low":
        return a.price - b.price
      case "price_high":
        return b.price - a.price
      case "rating":
        return b.rating - a.rating
      case "newest":
        return b.id - a.id
      default:
        return b.reviews - a.reviews
    }
  })

  const toggleFavorite = (id: number) => {
    setServices(services.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s))
  }

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
      <Head title="Service Hub - Find Professional Services" />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
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
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">Service Hub</span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-4xl md:text-6xl font-bold text-white mb-4"
              >
                Find the Perfect Service
                <br />
                <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                  for Your Needs
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-lg md:text-xl text-white/90 mb-8"
              >
                Connect with talented professionals offering services from design to development
              </motion.p>

              {/* Search Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="relative max-w-2xl mx-auto"
              >
                <div className="relative flex items-center">
                  <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search for services... (e.g., logo design, web development)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-32 h-14 text-lg bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                  <Button
                    size="lg"
                    className="absolute right-2 h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Search
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters */}
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
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg flex items-center gap-2 font-bold">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      >
                        <Filter className="h-5 w-5 text-blue-600" />
                      </motion.div>
                      <span>Filters</span>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="lg:hidden"
                    >
                      {showFilters ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
                    </Button>
                  </div>
                  {hasActiveFilters && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
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
                <CardContent className={`relative ${showFilters ? "block" : "hidden lg:block"}`}>
                  <Accordion type="multiple" defaultValue={["categories", "price", "delivery", "rating"]} className="w-full">
                    {/* Categories */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <AccordionItem value="categories" className="border-b border-border/40">
                        <AccordionTrigger className="hover:no-underline py-4 px-0 group">
                          <div className="flex items-center gap-3 flex-1">
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 group-hover:bg-blue-100 dark:group-hover:bg-blue-950/50 transition-colors"
                            >
                              <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </motion.div>
                            <span className="font-semibold text-sm">Categories</span>
                            {selectedCategory !== "All Categories" && (
                              <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs">
                                1
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-3 pb-4">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-1.5"
                          >
                            {categories.map((category, index) => (
                              <motion.button
                                key={category}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedCategory(category)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                                  selectedCategory === category
                                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-md"
                                    : "hover:bg-muted hover:shadow-sm"
                                }`}
                              >
                                {category}
                              </motion.button>
                            ))}
                          </motion.div>
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>

                    {/* Price Range */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <AccordionItem value="price" className="border-b border-border/40">
                        <AccordionTrigger className="hover:no-underline py-4 px-0 group">
                          <div className="flex items-center gap-3 flex-1">
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 group-hover:bg-green-100 dark:group-hover:bg-green-950/50 transition-colors"
                            >
                              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </motion.div>
                            <span className="font-semibold text-sm">Price Range</span>
                            {(priceRange.min > 0 || priceRange.max < 1000) && (
                              <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                                Set
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-3 pb-4">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-3"
                          >
                            <div className="flex items-center gap-2">
                              <motion.div whileHover={{ scale: 1.02 }} className="flex-1">
                                <Input
                                  type="number"
                                  placeholder="Min"
                                  value={priceRange.min || ""}
                                  onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) || 0 })}
                                  className="h-10 border-2 focus:border-blue-500 transition-colors text-foreground dark:text-white placeholder:text-muted-foreground"
                                />
                              </motion.div>
                              <span className="text-muted-foreground font-medium">-</span>
                              <motion.div whileHover={{ scale: 1.02 }} className="flex-1">
                                <Input
                                  type="number"
                                  placeholder="Max"
                                  value={priceRange.max || ""}
                                  onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) || 1000 })}
                                  className="h-10 border-2 focus:border-blue-500 transition-colors text-foreground dark:text-white placeholder:text-muted-foreground"
                                />
                              </motion.div>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <span>Range: ${priceRange.min} - ${priceRange.max}</span>
                            </div>
                          </motion.div>
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>

                    {/* Delivery Time */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <AccordionItem value="delivery" className="border-b border-border/40">
                        <AccordionTrigger className="hover:no-underline py-4 px-0 group">
                          <div className="flex items-center gap-3 flex-1">
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 group-hover:bg-purple-100 dark:group-hover:bg-purple-950/50 transition-colors"
                            >
                              <Timer className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </motion.div>
                            <span className="font-semibold text-sm">Delivery Time</span>
                            {deliveryTime && (
                              <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs">
                                1
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-3 pb-4">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-1.5"
                          >
                            {["1 day", "2 days", "3 days", "5 days", "7 days"].map((time, index) => (
                              <motion.button
                                key={time}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setDeliveryTime(deliveryTime === time ? null : time)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
                                  deliveryTime === time
                                    ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium shadow-md"
                                    : "hover:bg-muted hover:shadow-sm"
                                }`}
                              >
                                <Clock className="h-3.5 w-3.5" />
                                <span>{time}</span>
                              </motion.button>
                            ))}
                          </motion.div>
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>

                    {/* Rating */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <AccordionItem value="rating" className="border-b-0">
                        <AccordionTrigger className="hover:no-underline py-4 px-0 group">
                          <div className="flex items-center gap-3 flex-1">
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className="p-1.5 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 group-hover:bg-yellow-100 dark:group-hover:bg-yellow-950/50 transition-colors"
                            >
                              <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            </motion.div>
                            <span className="font-semibold text-sm">Minimum Rating</span>
                            {minRating > 0 && (
                              <Badge variant="secondary" className="ml-auto bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 text-xs">
                                {minRating}+
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-3 pb-4">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-1.5"
                          >
                            {[4.5, 4.0, 3.5, 3.0].map((rating, index) => (
                              <motion.button
                                key={rating}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setMinRating(minRating === rating ? 0 : rating)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
                                  minRating === rating
                                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium shadow-md"
                                    : "hover:bg-muted hover:shadow-sm"
                                }`}
                              >
                                <Star className={`h-4 w-4 ${minRating === rating ? "fill-white text-white" : "fill-yellow-400 text-yellow-400"}`} />
                                <span>{rating}+ Stars</span>
                              </motion.button>
                            ))}
                          </motion.div>
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  </Accordion>
                </CardContent>
              </Card>
            </motion.aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    {sortedServices.length} Services Found
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {selectedCategory !== "All Categories" && `in ${selectedCategory}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 rounded-md border bg-background text-sm"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Services Grid */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                <AnimatePresence mode="wait">
                  {sortedServices.map((service) => (
                    <motion.div
                      key={service.id}
                      variants={itemVariants}
                      whileHover={{ y: -8, transition: { duration: 0.2 } }}
                      className="group"
                    >
                      <Card className="h-full overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 cursor-pointer">
                        <Link href={`/service-hub/${service.id}`}>
                          <div className="relative">
                            <div className="aspect-video w-full overflow-hidden bg-muted">
                              <img
                                src={service.image}
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
                                toggleFavorite(service.id)
                              }}
                            >
                              <Heart
                                className={`h-5 w-5 ${
                                  service.isFavorite ? "fill-red-500 text-red-500" : ""
                                }`}
                              />
                            </Button>
                            <Badge className="absolute top-2 left-2 bg-primary/90 backdrop-blur-sm">
                              {service.category}
                            </Badge>
                          </div>
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                                {service.title}
                              </CardTitle>
                              <div className="text-right flex-shrink-0">
                                <div className="text-2xl font-bold text-primary">${service.price}</div>
                                <div className="text-xs text-muted-foreground">Starting at</div>
                              </div>
                            </div>
                            <CardDescription className="line-clamp-2 mt-2">
                              {service.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {/* Seller Info */}
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={service.seller.avatar} />
                                  <AvatarFallback>{service.seller.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{service.seller.name}</p>
                                  <p className="text-xs text-muted-foreground">{service.seller.level}</p>
                                </div>
                              </div>

                              {/* Rating & Reviews */}
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="font-semibold">{service.rating}</span>
                                  <span className="text-muted-foreground">({service.reviews})</span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>{service.deliveryTime}</span>
                                </div>
                              </div>

                              {/* Tags */}
                              <div className="flex flex-wrap gap-1">
                                {service.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Link>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {sortedServices.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <Sparkles className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No services found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search query</p>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 py-16 mt-16"
        >
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to offer your services?</h2>
            <p className="text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of professionals and start earning by offering your skills
            </p>
            <Link href="/service-hub/create">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                <Plus className="mr-2 h-5 w-5" />
                Create Your Service
              </Button>
            </Link>
          </div>
        </motion.section>
      </div>
    </FrontendLayout>
  )
}


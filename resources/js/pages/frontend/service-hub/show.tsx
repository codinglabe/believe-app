"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import {
  Star,
  Clock,
  Check,
  Heart,
  Share2,
  ArrowLeft,
  MessageCircle,
  Award,
  TrendingUp,
  Users,
  Calendar,
  Shield,
  Sparkles,
  Package,
  Zap,
} from "lucide-react"
import { Link, router, usePage } from "@inertiajs/react"
import { useState, useEffect } from "react"
import { Head } from "@inertiajs/react"

interface Gig {
  id: number
  slug: string
  title: string
  description: string
  fullDescription: string
  price: number
  deliveryTime: string
  rating: number
  reviews: number
  category: string
  tags: string[]
  images: string[]
  packages: Array<{
    id: number
    name: string
    price: number
    deliveryTime: string
    description: string
    features: string[]
    popular: boolean
  }>
  seller: {
    id: number
    name: string
    avatar: string | null
  }
}

interface Review {
  id: number
  user: {
    name: string
    avatar: string | null
  }
  rating: number
  comment: string
  date: string
}

interface PageProps extends Record<string, unknown> {
  gig: Gig
  recentReviews: Review[]
  isFavorite: boolean
}

export default function ServiceShow() {
  const { gig, recentReviews, isFavorite: initialIsFavorite, auth } = usePage<PageProps & { auth?: { user?: { id: number } } }>().props

  const defaultPackage = gig.packages.length > 1 ? gig.packages[1] : gig.packages[0]
  const [selectedPackage, setSelectedPackage] = useState(defaultPackage)
  const [selectedImage, setSelectedImage] = useState(0)
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    setSelectedPackage(defaultPackage)
  }, [gig.id])

  // Fetch unread count
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

    if (auth?.user) {
      fetchUnreadCount()
      // Refresh every 10 seconds
      const interval = setInterval(fetchUnreadCount, 10000)
      return () => clearInterval(interval)
    }
  }, [auth?.user])

  const toggleFavorite = async () => {
    try {
      const response = await fetch(`/service-hub/${gig.slug}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        credentials: 'same-origin',
      })
      const data = await response.json()
      setIsFavorite(data.favorited)
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleOrder = () => {
    router.visit(`/service-hub/order?serviceId=${gig.id}&packageId=${selectedPackage.id}`)
  }

  return (
    <FrontendLayout>
      <Head title={`${gig.title} - Service Hub`} />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/service-hub">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <Badge variant="secondary">{gig.category}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/service-hub/chats/list">
                  <Button variant="ghost" size="sm" className="gap-2 relative">
                    <MessageCircle className="h-4 w-4" />
                    View Chats
                    {unreadCount > 0 && (
                      <Badge variant="default" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-blue-600 text-white rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFavorite}
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Image Gallery */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                  <img
                    src={gig.images[selectedImage] || '/placeholder-image.jpg'}
                    alt={gig.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  {gig.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-video w-24 overflow-hidden rounded-md border-2 transition-all ${
                        selectedImage === index ? "border-blue-600 dark:border-blue-400" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={image || '/placeholder-image.jpg'} alt={`${gig.title} ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Title & Rating */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h1 className="text-3xl md:text-4xl font-bold mb-4">{gig.title}</h1>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-lg">{gig.rating}</span>
                    <span className="text-muted-foreground">({gig.reviews.toLocaleString()} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{gig.deliveryTime}</span>
                  </div>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">{gig.description}</p>
              </motion.div>

              {/* Seller Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle>About the Seller</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={gig.seller.avatar || undefined} />
                        <AvatarFallback>{gig.seller.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">{gig.seller.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">Service Seller</p>
                        <div className="flex items-center gap-2">
                          <Link href={`/service-hub/seller/${gig.seller.id}`}>
                            <Button variant="outline" size="sm">
                              View Profile
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!auth?.user) {
                                router.visit('/login');
                                return;
                              }
                              try {
                                const response = await fetch(`/service-hub/${gig.slug}/chat`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                  },
                                  credentials: 'same-origin',
                                });
                                if (response.ok) {
                                  const data = await response.json();
                                  if (data.chat) {
                                    router.visit(`/service-hub/chat/${data.chat.id}`);
                                  }
                                } else if (response.status === 401) {
                                  router.visit('/login');
                                }
                              } catch (error) {
                                console.error('Error creating chat:', error);
                              }
                            }}
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Contact
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tabs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Tabs defaultValue="description" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews ({gig.reviews.toLocaleString()})</TabsTrigger>
                    <TabsTrigger value="faq">FAQ</TabsTrigger>
                  </TabsList>
                  <TabsContent value="description" className="mt-6">
                    <Card className="border shadow-sm">
                      <CardContent className="pt-6">
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: gig.fullDescription || gig.description }}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="reviews" className="mt-6">
                    <Card className="border shadow-sm">
                      <CardContent className="pt-6 space-y-6">
                        {recentReviews.map((review) => (
                          <div key={review.id} className="border-b last:border-0 pb-6 last:pb-0">
                            <div className="flex items-start gap-4">
                              <Avatar>
                                <AvatarImage src={review.user.avatar || undefined} />
                                <AvatarFallback>{review.user.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold">{review.user.name}</span>
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-4 w-4 ${
                                          i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm text-muted-foreground">{review.date}</span>
                                </div>
                                <p className="text-sm">{review.comment}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        <Link href={`/service-hub/${gig.slug}/reviews`}>
                          <Button variant="outline" className="w-full">
                            View All Reviews
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="faq" className="mt-6">
                    <Card className="border shadow-sm">
                      <CardContent className="pt-6 space-y-4">
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No FAQ available for this service.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </motion.div>
            </div>

            {/* Sidebar - Packages & Order */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky top-24 space-y-6"
              >
                {/* Packages */}
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle>Select a Package</CardTitle>
                    <CardDescription>Choose the package that best fits your needs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs
                      value={gig.packages.find(p => p.id === selectedPackage.id)?.name.toLowerCase() || gig.packages[0]?.name.toLowerCase() || "basic"}
                      onValueChange={(value) => {
                        const pkg = gig.packages.find(p => p.name.toLowerCase() === value)
                        if (pkg) setSelectedPackage(pkg)
                      }}
                      className="w-full"
                    >
                      <TabsList className={`grid w-full ${gig.packages.length === 3 ? 'grid-cols-3' : gig.packages.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} mb-6`}>
                        {gig.packages.map((pkg) => (
                          <TabsTrigger
                            key={pkg.id}
                            value={pkg.name.toLowerCase()}
                            className="relative"
                          >
                            {pkg.name}
                            {pkg.popular && (
                              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-purple-600 text-white">
                                ⭐
                              </Badge>
                            )}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {gig.packages.map((pkg) => (
                        <TabsContent key={pkg.id} value={pkg.name.toLowerCase()} className="mt-0">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4"
                          >
                            <div className="flex items-center justify-between pb-4 border-b">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-xl font-bold">{pkg.name}</h3>
                                  {pkg.popular && (
                                    <Badge className="bg-purple-600 text-white">Most Popular</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{pkg.description}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">${pkg.price}</div>
                                <div className="text-xs text-muted-foreground">Starting at</div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                <Package className="h-4 w-4" />
                                <span>What's Included:</span>
                              </div>
                              <div className="space-y-2.5">
                                {pkg.features.map((feature, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-start gap-3 text-sm"
                                  >
                                    <Check className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                    <span className="flex-1">{feature}</span>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                            <div className="pt-4 border-t">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                <Clock className="h-4 w-4" />
                                <span>Delivery in {pkg.deliveryTime}</span>
                              </div>
                              <Button
                                onClick={() => {
                                  setSelectedPackage(pkg)
                                  handleOrder()
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                size="lg"
                              >
                                <Package className="mr-2 h-5 w-5" />
                                Continue with {pkg.name} (${pkg.price})
                              </Button>
                            </div>
                          </motion.div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>


                {/* Trust Badges */}
                <Card className="border shadow-sm">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span>Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span>Fast Delivery</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span>Quality Guaranteed</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}


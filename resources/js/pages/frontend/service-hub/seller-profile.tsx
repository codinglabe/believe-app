"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import {
  ArrowLeft,
  Star,
  Clock,
  TrendingUp,
  MessageCircle,
  MapPin,
  Globe,
  Calendar,
  Award,
  Shield,
  CheckCircle2,
  Package,
  Heart,
  Share2,
  Mail,
  Sparkles,
  Users,
  DollarSign,
  Zap,
  User,
} from "lucide-react"
import { Link, router } from "@inertiajs/react"
import { useState } from "react"
import { Head } from "@inertiajs/react"

// Mock data - replace with real data from backend
const mockSeller = {
  id: 1,
  name: "DesignPro",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
  level: "Level 2 Seller",
  responseTime: "1 hour",
  memberSince: "2020",
  totalSales: 1247,
  rating: 4.9,
  totalReviews: 892,
  location: "United States",
  languages: ["English", "Spanish"],
  description: "Professional graphic designer with over 5 years of experience specializing in logo design and brand identity. I've helped hundreds of businesses establish their visual identity with memorable, modern designs that tell their unique story.",
  bio: "I'm a passionate designer who loves creating visual identities that make brands stand out. My approach combines modern design principles with a deep understanding of brand psychology. Every project is an opportunity to create something meaningful.",
  skills: ["Logo Design", "Brand Identity", "Vector Graphics", "Typography", "Color Theory"],
  verified: true,
  services: [
    {
      id: 1,
      title: "Professional Logo Design",
      price: 25,
      rating: 4.9,
      reviews: 1247,
      image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400",
      category: "Graphics & Design",
    },
    {
      id: 2,
      title: "Complete Brand Identity Package",
      price: 150,
      rating: 5.0,
      reviews: 234,
      image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400",
      category: "Graphics & Design",
    },
    {
      id: 3,
      title: "Business Card Design",
      price: 35,
      rating: 4.8,
      reviews: 456,
      image: "https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=400",
      category: "Graphics & Design",
    },
  ],
  recentReviews: [
    {
      id: 1,
      user: "John D.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
      rating: 5,
      comment: "Amazing work! The logo perfectly represents my brand. Fast delivery and great communication.",
      service: "Professional Logo Design",
      date: "2 days ago",
    },
    {
      id: 2,
      user: "Sarah M.",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
      rating: 5,
      comment: "Professional designer with great attention to detail. Highly recommend!",
      service: "Complete Brand Identity Package",
      date: "5 days ago",
    },
    {
      id: 3,
      user: "Mike T.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
      rating: 4,
      comment: "Good quality work, though I needed a couple of revisions. Overall satisfied.",
      service: "Professional Logo Design",
      date: "1 week ago",
    },
  ],
  stats: {
    ordersCompleted: 1247,
    repeatBuyers: 456,
    averageResponseTime: "1 hour",
    onTimeDelivery: 98,
    orderCompletion: 100,
  },
}

export default function SellerProfile() {
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState("services")

  return (
    <FrontendLayout>
      <Head title={`${mockSeller.name} - Seller Profile`} />
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
                <h1 className="text-xl font-bold">Seller Profile</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFavorite(!isFavorite)}
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
          <div className="max-w-6xl mx-auto">
            {/* Profile Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card className="border shadow-lg overflow-hidden bg-gradient-to-br from-background to-muted/30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                <CardContent className="pt-8 pb-6 relative">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar Section */}
                    <div className="flex-shrink-0">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="relative"
                      >
                        <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                          <AvatarImage src={mockSeller.avatar} alt={mockSeller.name} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-3xl">
                            {mockSeller.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        {mockSeller.verified && (
                          <div className="absolute bottom-0 right-0 p-1.5 bg-background rounded-full shadow-lg">
                            <CheckCircle2 className="h-5 w-5 text-blue-600 fill-blue-600" />
                          </div>
                        )}
                      </motion.div>
                    </div>

                    {/* Info Section */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-3xl font-bold">{mockSeller.name}</h2>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {mockSeller.level}
                          </Badge>
                          {mockSeller.verified && (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-foreground">{mockSeller.rating}</span>
                            <span>({mockSeller.totalReviews} reviews)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            <span>{mockSeller.totalSales} Sales</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Responds in {mockSeller.responseTime}</span>
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{mockSeller.description}</p>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{mockSeller.stats.ordersCompleted}</div>
                          <div className="text-xs text-muted-foreground">Orders</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{mockSeller.stats.repeatBuyers}</div>
                          <div className="text-xs text-muted-foreground">Repeat Buyers</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{mockSeller.stats.onTimeDelivery}%</div>
                          <div className="text-xs text-muted-foreground">On-Time</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{mockSeller.stats.orderCompletion}%</div>
                          <div className="text-xs text-muted-foreground">Completion</div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Contact Seller
                        </Button>
                        <Button variant="outline">
                          <Mail className="mr-2 h-4 w-4" />
                          Send Message
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="services">Services ({mockSeller.services.length})</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews ({mockSeller.totalReviews})</TabsTrigger>
                    <TabsTrigger value="about">About</TabsTrigger>
                  </TabsList>

                  {/* Services Tab */}
                  <TabsContent value="services" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {mockSeller.services.map((service, index) => (
                        <motion.div
                          key={service.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ y: -4 }}
                        >
                          <Card className="h-full border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group">
                            <Link href={`/service-hub/${service.id}`}>
                              <div className="aspect-video w-full overflow-hidden bg-muted">
                                <img
                                  src={service.image}
                                  alt={service.title}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              </div>
                              <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                  <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                                    {service.title}
                                  </CardTitle>
                                  <div className="text-right flex-shrink-0">
                                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">${service.price}</div>
                                  </div>
                                </div>
                                <CardDescription className="line-clamp-1">{service.category}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-semibold">{service.rating}</span>
                                    <span className="text-muted-foreground">({service.reviews})</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Link>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Reviews Tab */}
                  <TabsContent value="reviews" className="mt-6">
                    <Card className="border shadow-sm">
                      <CardContent className="pt-6 space-y-6">
                        {mockSeller.recentReviews.map((review, index) => (
                          <motion.div
                            key={review.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="border-b last:border-0 pb-6 last:pb-0"
                          >
                            <div className="flex items-start gap-4">
                              <Avatar>
                                <AvatarImage src={review.avatar} />
                                <AvatarFallback>{review.user[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold">{review.user}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {review.service}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                          <Star
                                            key={i}
                                            className={`h-3 w-3 ${
                                              i < review.rating
                                                ? "fill-yellow-400 text-yellow-400"
                                                : "text-muted-foreground"
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span>•</span>
                                      <span>{review.date}</span>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-sm leading-relaxed mt-2">{review.comment}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        <Link href={`/service-hub/${mockSeller.services[0]?.id}/reviews`}>
                          <Button variant="outline" className="w-full">
                            View All Reviews
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* About Tab */}
                  <TabsContent value="about" className="mt-6">
                    <div className="space-y-6">
                      <Card className="border shadow-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            About {mockSeller.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground leading-relaxed mb-6">{mockSeller.bio}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-blue-600" />
                                Location
                              </h4>
                              <p className="text-sm text-muted-foreground">{mockSeller.location}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Globe className="h-4 w-4 text-blue-600" />
                                Languages
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {mockSeller.languages.map((lang) => (
                                  <Badge key={lang} variant="secondary">
                                    {lang}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                Member Since
                              </h4>
                              <p className="text-sm text-muted-foreground">{mockSeller.memberSince}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                Response Time
                              </h4>
                              <p className="text-sm text-muted-foreground">{mockSeller.responseTime}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border shadow-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-blue-600" />
                            Skills & Expertise
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {mockSeller.skills.map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-sm py-1.5 px-3">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* Stats Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="border shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Performance Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">Orders Completed</span>
                          </div>
                          <span className="font-bold text-blue-600">{mockSeller.stats.ordersCompleted}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Repeat Buyers</span>
                          </div>
                          <span className="font-bold text-green-600">{mockSeller.stats.repeatBuyers}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-purple-600" />
                            <span className="text-sm">On-Time Delivery</span>
                          </div>
                          <span className="font-bold text-purple-600">{mockSeller.stats.onTimeDelivery}%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm">Order Completion</span>
                          </div>
                          <span className="font-bold text-yellow-600">{mockSeller.stats.orderCompletion}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Trust Badges */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Why Choose This Seller</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span>Verified Seller</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span>Fast Response Time</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span>High Quality Work</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span>98% On-Time Delivery</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}


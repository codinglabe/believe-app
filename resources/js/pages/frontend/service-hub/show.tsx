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
import { Link, router } from "@inertiajs/react"
import { useState } from "react"
import { Head } from "@inertiajs/react"

// Mock data - replace with real data from backend
const mockService = {
  id: 1,
  title: "Professional Logo Design",
  description: "I will create a stunning, modern logo design for your brand with unlimited revisions. Perfect for startups, businesses, and personal brands looking to establish a strong visual identity.",
  fullDescription: `
    <h3>What You'll Get:</h3>
    <ul>
      <li>Professional logo design in multiple formats (PNG, SVG, PDF, AI)</li>
      <li>Unlimited revisions until you're 100% satisfied</li>
      <li>3 initial concepts to choose from</li>
      <li>Color variations and black & white versions</li>
      <li>Social media profile picture sizes</li>
      <li>Brand guidelines document</li>
      <li>Fast delivery (3 days or less)</li>
    </ul>
    
    <h3>Why Choose Me:</h3>
    <p>With over 5 years of experience and 1000+ satisfied clients, I specialize in creating memorable logos that tell your brand's story. I understand the psychology of colors, typography, and design principles that make logos stand out.</p>
    
    <h3>Process:</h3>
    <ol>
      <li>We discuss your brand, vision, and requirements</li>
      <li>I create 3 initial concepts based on your brief</li>
      <li>You provide feedback and select your favorite</li>
      <li>I refine the design with unlimited revisions</li>
      <li>You receive all final files and brand guidelines</li>
    </ol>
  `,
  price: 25,
  deliveryTime: "3 days",
  rating: 4.9,
  reviews: 1247,
  images: [
    "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800",
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
    "https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=800",
  ],
  seller: {
    id: 1,
    name: "DesignPro",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    level: "Level 2 Seller",
    responseTime: "1 hour",
    memberSince: "2020",
    totalSales: 1247,
    rating: 4.9,
    location: "United States",
    languages: ["English", "Spanish"],
    description: "Professional graphic designer specializing in logo design and brand identity",
  },
  category: "Graphics & Design",
  tags: ["Logo", "Branding", "Vector", "Modern", "Professional"],
  isFavorite: false,
  packages: [
    {
      id: 1,
      name: "Basic",
      price: 25,
      deliveryTime: "3 days",
      description: "Perfect for small businesses",
      features: [
        "1 Logo Concept",
        "2 Revisions",
        "PNG & JPG Files",
        "Source File",
      ],
      popular: false,
    },
    {
      id: 2,
      name: "Standard",
      price: 50,
      deliveryTime: "2 days",
      description: "Most popular choice",
      features: [
        "3 Logo Concepts",
        "Unlimited Revisions",
        "PNG, JPG, SVG, PDF Files",
        "Source File",
        "Color Variations",
        "Social Media Sizes",
      ],
      popular: true,
    },
    {
      id: 3,
      name: "Premium",
      price: 100,
      deliveryTime: "1 day",
      description: "Complete brand identity",
      features: [
        "5 Logo Concepts",
        "Unlimited Revisions",
        "All File Formats",
        "Source File",
        "Color Variations",
        "Social Media Sizes",
        "Brand Guidelines",
        "Business Card Design",
        "Letterhead Design",
      ],
      popular: false,
    },
  ],
  faq: [
    {
      question: "What file formats will I receive?",
      answer: "You'll receive PNG, JPG, SVG, and PDF formats. Source files (AI/PSD) are included in Standard and Premium packages.",
    },
    {
      question: "How many revisions are included?",
      answer: "Basic package includes 2 revisions, while Standard and Premium include unlimited revisions until you're satisfied.",
    },
    {
      question: "Can I use the logo commercially?",
      answer: "Yes! Once you purchase the service, you have full commercial rights to use the logo for your business.",
    },
    {
      question: "What if I'm not satisfied?",
      answer: "I offer unlimited revisions to ensure you're completely happy with the final design. Your satisfaction is my priority.",
    },
  ],
  recentReviews: [
    {
      id: 1,
      user: "John D.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
      rating: 5,
      comment: "Amazing work! The logo perfectly represents my brand. Fast delivery and great communication.",
      date: "2 days ago",
    },
    {
      id: 2,
      user: "Sarah M.",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
      rating: 5,
      comment: "Professional designer with great attention to detail. Highly recommend!",
      date: "5 days ago",
    },
    {
      id: 3,
      user: "Mike T.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
      rating: 4,
      comment: "Good quality work, though I needed a couple of revisions. Overall satisfied.",
      date: "1 week ago",
    },
  ],
}

export default function ServiceShow() {
  const [selectedPackage, setSelectedPackage] = useState(mockService.packages[1])
  const [selectedImage, setSelectedImage] = useState(0)
  const [isFavorite, setIsFavorite] = useState(mockService.isFavorite)

  const handleOrder = () => {
    router.visit(`/service-hub/order`, {
      data: { serviceId: mockService.id, packageId: selectedPackage.id },
    })
  }

  return (
    <FrontendLayout>
      <Head title={`${mockService.title} - Service Hub`} />
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
                <Badge variant="secondary">{mockService.category}</Badge>
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
                    src={mockService.images[selectedImage]}
                    alt={mockService.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  {mockService.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-video w-24 overflow-hidden rounded-md border-2 transition-all ${
                        selectedImage === index ? "border-blue-600 dark:border-blue-400" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={image} alt={`${mockService.title} ${index + 1}`} className="w-full h-full object-cover" />
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
                <h1 className="text-3xl md:text-4xl font-bold mb-4">{mockService.title}</h1>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-lg">{mockService.rating}</span>
                    <span className="text-muted-foreground">({mockService.reviews.toLocaleString()} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{mockService.deliveryTime}</span>
                  </div>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">{mockService.description}</p>
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
                        <AvatarImage src={mockService.seller.avatar} />
                        <AvatarFallback>{mockService.seller.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">{mockService.seller.name}</h3>
                          <Badge variant="secondary">{mockService.seller.level}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{mockService.seller.rating} Rating</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4" />
                            <span>{mockService.seller.totalSales} Sales</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            <span>Responds in {mockService.seller.responseTime}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            <span>Member since {mockService.seller.memberSince}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{mockService.seller.description}</p>
                        <div className="flex items-center gap-2">
                          <Link href={`/service-hub/seller/${mockService.seller.id}`}>
                            <Button variant="outline" size="sm">
                              View Profile
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm">
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
                    <TabsTrigger value="reviews">Reviews ({mockService.reviews.toLocaleString()})</TabsTrigger>
                    <TabsTrigger value="faq">FAQ</TabsTrigger>
                  </TabsList>
                  <TabsContent value="description" className="mt-6">
                    <Card className="border shadow-sm">
                      <CardContent className="pt-6">
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: mockService.fullDescription }}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="reviews" className="mt-6">
                    <Card className="border shadow-sm">
                      <CardContent className="pt-6 space-y-6">
                        {mockService.recentReviews.map((review) => (
                          <div key={review.id} className="border-b last:border-0 pb-6 last:pb-0">
                            <div className="flex items-start gap-4">
                              <Avatar>
                                <AvatarImage src={review.avatar} />
                                <AvatarFallback>{review.user[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold">{review.user}</span>
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
                        <Link href={`/service-hub/${mockService.id}/reviews`}>
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
                        {mockService.faq.map((item, index) => (
                          <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
                            <h4 className="font-semibold mb-2">{item.question}</h4>
                            <p className="text-sm text-muted-foreground">{item.answer}</p>
                          </div>
                        ))}
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
                      value={mockService.packages.find(p => p.id === selectedPackage.id)?.name.toLowerCase() || "basic"}
                      onValueChange={(value) => {
                        const pkg = mockService.packages.find(p => p.name.toLowerCase() === value)
                        if (pkg) setSelectedPackage(pkg)
                      }}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-3 mb-6">
                        {mockService.packages.map((pkg) => (
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
                      {mockService.packages.map((pkg) => (
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


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
  Briefcase,
  Edit,
} from "lucide-react"
import { Link, router, usePage } from "@inertiajs/react"
import { useState } from "react"
import { Head } from "@inertiajs/react"

interface Seller {
  id: number
  name: string
  avatar: string | null
  description: string
}

interface Service {
  id: number
  slug: string
  title: string
  price: number
  rating: number
  reviews: number
  image: string | null
  category: string
}

interface Review {
  id: number
  user: {
    name: string
    avatar: string | null
  }
  rating: number
  comment: string
  service: string
  date: string
}

interface Stats {
  totalSales: number
  totalReviews: number
  avgRating: number
  totalServices: number
  repeatBuyers: number
  onTimeDelivery: number
  orderCompletion: number
}

interface SellerProfile {
  id: number
  bio: string | null
  location: string | null
  phone: string | null
  response_time: string | null
  website: string | null
  linkedin: string | null
  twitter: string | null
  facebook: string | null
  instagram: string | null
  profile_image: string | null
  skills: string[]
  languages: Array<{ name: string; level: string }>
  education: Array<{ institution: string; degree: string; year: number | null }>
  experience: Array<{ company: string; position: string; duration: string }>
}

interface PageProps extends Record<string, unknown> {
  seller: Seller
  sellerProfile?: SellerProfile | null
  services: Service[]
  stats: Stats
  recentReviews: Review[]
  isOwner?: boolean
}

export default function SellerProfile() {
  const { seller, sellerProfile, services = [], stats, recentReviews = [], isOwner = false } = usePage<PageProps>().props
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState("services")

  return (
    <FrontendLayout>
      <Head title={`${seller.name} - Seller Profile`} />
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
              {!isOwner && (
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
              )}
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
                          <AvatarImage
                            src={sellerProfile?.profile_image ? `/storage/${sellerProfile.profile_image}` : (seller.avatar || undefined)}
                            alt={seller.name}
                          />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-3xl">
                            {seller.name[0]}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                    </div>

                    {/* Info Section */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-3xl font-bold">{seller.name}</h2>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-foreground">{stats.avgRating}</span>
                            <span>({stats.totalReviews} reviews)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            <span>{stats.totalSales} Sales</span>
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{sellerProfile?.bio || seller.description}</p>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalSales}</div>
                          <div className="text-xs text-muted-foreground">Orders</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.repeatBuyers}</div>
                          <div className="text-xs text-muted-foreground">Repeat Buyers</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.onTimeDelivery}%</div>
                          <div className="text-xs text-muted-foreground">On-Time</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.orderCompletion}%</div>
                          <div className="text-xs text-muted-foreground">Completion</div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        {isOwner ? (
                          <Link href="/service-hub/seller-profile/edit">
                            <Button className="bg-blue-600 hover:bg-blue-700">
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Profile
                            </Button>
                          </Link>
                        ) : (
                          <>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Contact Seller
                            </Button>
                            <Button variant="outline">
                              <Mail className="mr-2 h-4 w-4" />
                              Send Message
                            </Button>
                          </>
                        )}
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
                    <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews ({stats.totalReviews})</TabsTrigger>
                    <TabsTrigger value="about">About</TabsTrigger>
                  </TabsList>

                  {/* Services Tab */}
                  <TabsContent value="services" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {services.map((service, index) => (
                        <motion.div
                          key={service.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ y: -4 }}
                        >
                          <Card className="h-full border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group">
                            <Link href={`/service-hub/${service.slug}`}>
                              <div className="aspect-video w-full overflow-hidden bg-muted">
                                <img
                                  src={service.image || '/placeholder-image.jpg'}
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
                        {recentReviews.map((review, index) => (
                          <motion.div
                            key={review.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="border-b last:border-0 pb-6 last:pb-0"
                          >
                            <div className="flex items-start gap-4">
                              <Avatar>
                                <AvatarImage src={review.user.avatar || undefined} />
                                <AvatarFallback>{review.user.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold">{review.user.name}</span>
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
                        <Link href={`/service-hub/seller/${seller.id}/reviews`}>
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
                      {/* Bio */}
                      <Card className="border shadow-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            About {seller.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground leading-relaxed mb-6">
                            {sellerProfile?.bio || seller.description}
                          </p>
                          {sellerProfile && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                              {sellerProfile.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{sellerProfile.location}</span>
                                </div>
                              )}
                              {sellerProfile.phone && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{sellerProfile.phone}</span>
                                </div>
                              )}
                              {sellerProfile.response_time && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{sellerProfile.response_time}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Skills */}
                      {sellerProfile?.skills && sellerProfile.skills.length > 0 && (
                        <Card className="border shadow-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Award className="h-5 w-5 text-blue-600" />
                              Skills
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {sellerProfile.skills.map((skill, index) => (
                                <Badge key={index} variant="secondary">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Languages */}
                      {sellerProfile?.languages && sellerProfile.languages.length > 0 && (
                        <Card className="border shadow-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Globe className="h-5 w-5 text-blue-600" />
                              Languages
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {sellerProfile.languages.map((lang, index) => (
                                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                                  <span className="font-medium">{lang.name}</span>
                                  <Badge variant="outline" className="capitalize">
                                    {lang.level}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Education */}
                      {sellerProfile?.education && sellerProfile.education.length > 0 && (
                        <Card className="border shadow-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Award className="h-5 w-5 text-blue-600" />
                              Education
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {sellerProfile.education.map((edu, index) => (
                                <div key={index} className="pb-4 border-b last:border-0 last:pb-0">
                                  <h4 className="font-semibold">{edu.degree}</h4>
                                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                                  {edu.year && (
                                    <p className="text-xs text-muted-foreground mt-1">{edu.year}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Experience */}
                      {sellerProfile?.experience && sellerProfile.experience.length > 0 && (
                        <Card className="border shadow-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Briefcase className="h-5 w-5 text-blue-600" />
                              Professional Experience
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {sellerProfile.experience.map((exp, index) => (
                                <div key={index} className="pb-4 border-b last:border-0 last:pb-0">
                                  <h4 className="font-semibold">{exp.position}</h4>
                                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{exp.duration}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Social Links */}
                      {sellerProfile && (
                        (sellerProfile.website || sellerProfile.linkedin || sellerProfile.twitter ||
                         sellerProfile.facebook || sellerProfile.instagram) && (
                          <Card className="border shadow-sm">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-blue-600" />
                                Links & Portfolio
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex flex-wrap gap-3">
                                {sellerProfile.website && (
                                  <a
                                    href={sellerProfile.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-2"
                                  >
                                    <Globe className="h-4 w-4" />
                                    Website
                                  </a>
                                )}
                                {sellerProfile.linkedin && (
                                  <a
                                    href={sellerProfile.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    LinkedIn
                                  </a>
                                )}
                                {sellerProfile.twitter && (
                                  <a
                                    href={sellerProfile.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    Twitter
                                  </a>
                                )}
                                {sellerProfile.facebook && (
                                  <a
                                    href={sellerProfile.facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    Facebook
                                  </a>
                                )}
                                {sellerProfile.instagram && (
                                  <a
                                    href={sellerProfile.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    Instagram
                                  </a>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      )}
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
                          <span className="font-bold text-blue-600">{stats.totalSales}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Repeat Buyers</span>
                          </div>
                          <span className="font-bold text-green-600">{stats.repeatBuyers}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-purple-600" />
                            <span className="text-sm">On-Time Delivery</span>
                          </div>
                          <span className="font-bold text-purple-600">{stats.onTimeDelivery}%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm">Order Completion</span>
                          </div>
                          <span className="font-bold text-yellow-600">{stats.orderCompletion}%</span>
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


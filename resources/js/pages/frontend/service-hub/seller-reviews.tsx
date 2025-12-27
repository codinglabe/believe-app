"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import {
  ArrowLeft,
  Star,
  Calendar,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react"
import { Link, router, usePage } from "@inertiajs/react"
import { Head } from "@inertiajs/react"
import { Pagination } from "@/components/frontend/ui/pagination"

interface Seller {
  id: number
  name: string
  avatar: string | null
}

interface Review {
  id: number
  user: {
    name: string
    avatar: string | null
  }
  rating: number
  comment: string
  service: {
    id: number
    title: string
    slug: string
  }
  date: string
  created_at: string
}

interface PageProps extends Record<string, unknown> {
  seller: Seller
  reviews: {
    data: Review[]
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  ratingDistribution: {
    [key: number]: number
  }
  avgRating: number
  totalReviews: number
}

export default function SellerReviews() {
  const { seller, reviews, ratingDistribution, avgRating, totalReviews } = usePage<PageProps>().props

  const handlePageChange = (page: number) => {
    router.get(`/service-hub/seller/${seller.id}/reviews`, { page }, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  return (
    <FrontendLayout>
      <Head title={`Reviews - ${seller.name}`} />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href={`/service-hub/seller/${seller.id}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Seller Reviews</h1>
                <p className="text-sm text-muted-foreground">{seller.name}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Rating Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Overall Rating */}
                    <div className="text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        <span className="text-5xl font-bold">{avgRating.toFixed(1)}</span>
                        <div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-5 w-5 ${
                                  i < Math.round(avgRating)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Rating Distribution */}
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-20">
                            <span className="text-sm font-medium">{rating}</span>
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          </div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400 transition-all"
                              style={{ width: `${ratingDistribution[rating]}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {ratingDistribution[rating]}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Seller Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={seller.avatar || undefined} />
                      <AvatarFallback>{seller.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-bold">{seller.name}</h2>
                      <p className="text-sm text-muted-foreground">Seller Profile</p>
                    </div>
                    <div className="ml-auto">
                      <Link href={`/service-hub/seller/${seller.id}`}>
                        <Button variant="outline">
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Reviews List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>All Reviews ({reviews.total})</CardTitle>
                  <CardDescription>Reviews from buyers across all services</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {reviews.data.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No reviews yet.</p>
                    </div>
                  ) : (
                    <>
                      {reviews.data.map((review, index) => (
                        <motion.div
                          key={review.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
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
                                    <Link href={`/service-hub/${review.service.slug}`}>
                                      <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                                        <LinkIcon className="h-3 w-3 mr-1" />
                                        {review.service.title}
                                      </Badge>
                                    </Link>
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
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>{review.date}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm leading-relaxed mt-2">{review.comment}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {/* Pagination */}
                      {reviews.last_page > 1 && (
                        <div className="pt-4 flex justify-center gap-2">
                          {[...Array(reviews.last_page)].map((_, i) => {
                            const page = i + 1
                            return (
                              <Button
                                key={page}
                                variant={page === reviews.current_page ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(page)}
                              >
                                {page}
                              </Button>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}


"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Label } from "@/components/frontend/ui/label"
import { Badge } from "@/components/frontend/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Separator } from "@/components/frontend/ui/separator"
import {
  ArrowLeft,
  Star,
  Send,
  ThumbsUp,
  MessageCircle,
  Calendar,
  CheckCircle,
  Sparkles,
} from "lucide-react"
import { Link, router, usePage } from "@inertiajs/react"
import { useState } from "react"
import { Head } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface Gig {
  id: number
  slug: string
  title: string
  rating: number
  totalReviews: number
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
  helpful: number
  verified: boolean
}

interface PageProps extends Record<string, unknown> {
  gig: Gig
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
}

export default function ServiceReviews() {
  const { gig, reviews, ratingDistribution } = usePage<PageProps>().props

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [helpfulReviews, setHelpfulReviews] = useState<number[]>([])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return

    setIsSubmitting(true)

    // Get order_id from URL params or use a default - you may need to pass this from the controller
    const urlParams = new URLSearchParams(window.location.search)
    const orderId = urlParams.get('order_id')

    if (!orderId) {
      showErrorToast("Order ID is required to submit a review")
      setIsSubmitting(false)
      return
    }

    router.post(`/service-hub/${gig.slug}/reviews`, {
      order_id: orderId,
      rating: rating,
      comment: comment,
    }, {
      onSuccess: () => {
        showSuccessToast("Review submitted successfully!")
        setComment("")
        setIsSubmitting(false)
        router.reload()
      },
      onError: () => {
        setIsSubmitting(false)
      },
    })
  }

  const toggleHelpful = (reviewId: number) => {
    setHelpfulReviews((prev) =>
      prev.includes(reviewId)
        ? prev.filter((id) => id !== reviewId)
        : [...prev, reviewId]
    )
  }

  const averageRating = gig.rating

  return (
    <FrontendLayout>
      <Head title={`Reviews - ${gig.title}`} />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href={`/service-hub/${gig.slug}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Reviews & Ratings</h1>
                <p className="text-sm text-muted-foreground">{gig.title}</p>
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
                        <span className="text-5xl font-bold">{averageRating.toFixed(1)}</span>
                        <div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-6 w-6 ${
                                  i < Math.round(averageRating)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {gig.totalReviews} reviews
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Rating Distribution */}
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((stars) => (
                        <div key={stars} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-20">
                            <span className="text-sm font-medium">{stars}</span>
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          </div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${ratingDistribution[stars] || 0}%` }}
                              transition={{ duration: 0.8, delay: stars * 0.1 }}
                              className="h-full bg-yellow-400"
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {ratingDistribution[stars] || 0}%
                          </span>
                        </div>
                      ))}
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">All Reviews</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sort by:</span>
                    <select className="px-3 py-2 rounded-md border bg-background text-sm">
                      <option>Most Recent</option>
                      <option>Most Helpful</option>
                      <option>Highest Rated</option>
                      <option>Lowest Rated</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  {reviews.data.map((review, index) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={review.user.avatar || undefined} />
                              <AvatarFallback>{review.user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">{review.user.name}</span>
                                    {review.verified && (
                                      <Badge variant="secondary" className="text-xs">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Verified Purchase
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-4 w-4 ${
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
                              <p className="text-sm mb-4 leading-relaxed">{review.comment}</p>
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => toggleHelpful(review.id)}
                                  className={`flex items-center gap-2 text-sm transition-colors ${
                                    helpfulReviews.includes(review.id)
                                      ? "text-primary"
                                      : "text-muted-foreground hover:text-primary"
                                  }`}
                                >
                                  <ThumbsUp
                                    className={`h-4 w-4 ${
                                      helpfulReviews.includes(review.id) ? "fill-current" : ""
                                    }`}
                                  />
                                  <span>Helpful ({review.helpful})</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Load More */}
                <div className="text-center pt-4">
                  <Button variant="outline">Load More Reviews</Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}


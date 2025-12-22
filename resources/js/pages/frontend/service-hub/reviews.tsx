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
import { Link, router } from "@inertiajs/react"
import { useState } from "react"
import { Head } from "@inertiajs/react"
import { showSuccessToast } from "@/lib/toast"

// Mock data
const mockService = {
  id: 1,
  title: "Professional Logo Design",
  image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400",
  rating: 4.9,
  totalReviews: 1247,
}

const mockReviews = [
  {
    id: 1,
    user: "John D.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
    rating: 5,
    comment: "Amazing work! The logo perfectly represents my brand. Fast delivery and great communication. The designer was very responsive and made all the changes I requested. Highly recommend!",
    date: "2 days ago",
    helpful: 12,
    verified: true,
  },
  {
    id: 2,
    user: "Sarah M.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    rating: 5,
    comment: "Professional designer with great attention to detail. The final logo exceeded my expectations. The process was smooth and the seller was very patient with my revisions.",
    date: "5 days ago",
    helpful: 8,
    verified: true,
  },
  {
    id: 3,
    user: "Mike T.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
    rating: 4,
    comment: "Good quality work, though I needed a couple of revisions. Overall satisfied with the result. The delivery was on time and the files were well organized.",
    date: "1 week ago",
    helpful: 5,
    verified: true,
  },
  {
    id: 4,
    user: "Emily R.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
    rating: 5,
    comment: "Exceptional service! The logo design is modern and professional. The seller understood my vision perfectly and delivered exactly what I wanted. Will definitely order again!",
    date: "1 week ago",
    helpful: 15,
    verified: true,
  },
  {
    id: 5,
    user: "David K.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    rating: 5,
    comment: "Top-notch quality and professionalism. The communication was excellent throughout the project. The final logo is perfect for my business. Thank you!",
    date: "2 weeks ago",
    helpful: 9,
    verified: true,
  },
]

const ratingDistribution = {
  5: 89,
  4: 8,
  3: 2,
  2: 0.5,
  1: 0.5,
}

export default function ServiceReviews() {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [helpfulReviews, setHelpfulReviews] = useState<number[]>([])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return

    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    showSuccessToast("Review submitted successfully!")
    setComment("")
    setIsSubmitting(false)
  }

  const toggleHelpful = (reviewId: number) => {
    setHelpfulReviews((prev) =>
      prev.includes(reviewId)
        ? prev.filter((id) => id !== reviewId)
        : [...prev, reviewId]
    )
  }

  const averageRating =
    mockReviews.reduce((sum, review) => sum + review.rating, 0) / mockReviews.length

  return (
    <FrontendLayout>
      <Head title={`Reviews - ${mockService.title}`} />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href={`/service-hub/${mockService.id}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Reviews & Ratings</h1>
                <p className="text-sm text-muted-foreground">{mockService.title}</p>
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
                            {mockService.totalReviews} reviews
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
                              animate={{ width: `${ratingDistribution[stars as keyof typeof ratingDistribution]}%` }}
                              transition={{ duration: 0.8, delay: stars * 0.1 }}
                              className="h-full bg-yellow-400"
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {ratingDistribution[stars as keyof typeof ratingDistribution]}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Write Review */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Write a Review
                  </CardTitle>
                  <CardDescription>Share your experience with this service</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <Label>Your Rating</Label>
                      <div className="flex items-center gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map((stars) => (
                          <button
                            key={stars}
                            type="button"
                            onClick={() => setRating(stars)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-8 w-8 transition-all ${
                                stars <= rating
                                  ? "fill-yellow-400 text-yellow-400 scale-110"
                                  : "text-muted-foreground hover:text-yellow-400"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-muted-foreground">
                          {rating === 5
                            ? "Excellent"
                            : rating === 4
                            ? "Very Good"
                            : rating === 3
                            ? "Good"
                            : rating === 2
                            ? "Fair"
                            : "Poor"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="comment">
                        Your Review <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="comment"
                        placeholder="Tell others about your experience with this service..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="mt-2"
                        rows={5}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={!comment.trim() || isSubmitting}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {isSubmitting ? (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Submit Review
                        </>
                      )}
                    </Button>
                  </form>
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
                  {mockReviews.map((review, index) => (
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
                              <AvatarImage src={review.avatar} />
                              <AvatarFallback>{review.user[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">{review.user}</span>
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
                                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                                  <MessageCircle className="h-4 w-4" />
                                  <span>Reply</span>
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


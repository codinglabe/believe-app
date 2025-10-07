"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Head } from "@inertiajs/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  User,
  Tag,
  ArrowLeft,
  Share2,
  BookmarkPlus,
  Heart,
  MessageCircle,
  Eye,
  BookOpen,
  Clock,
  MapPin
} from "lucide-react"
import { router } from "@inertiajs/react"
import { useState } from "react"

interface ContentItem {
  id: number
  title: string
  body: string
  type: string
  status: string
  meta?: {
    tags?: string[]
    image_url?: string
    scripture_ref?: string
    author?: string
    reading_time?: string
    location?: string
    featured?: boolean
  }
  created_at: string
  updated_at: string
  organization?: {
    id: number
    name: string
  }
}

interface Props {
  contentItem: ContentItem
}

export default function Show({ contentItem }: Props) {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(42)

  const handleBack = () => {
    router.visit("/dashboard")
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: contentItem.title,
          text: contentItem.body.substring(0, 100) + '...',
          url: window.location.href,
        })
      } catch (err) {
        console.log("Share failed:", err)
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      // You can add a toast notification here
    }
  }

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    // Add your bookmark logic here
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
  }

  const getReadingTime = () => {
    const wordsPerMinute = 200
    const words = contentItem.body.split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return `${minutes} min read`
  }

  return (
    <FrontendLayout>
      <Head title={contentItem.title} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />

        <div className="relative container max-w-4xl mx-auto px-4 py-8">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-2 group hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20 transition-colors"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleBookmark}
                className={`hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-950/20 transition-colors ${
                  isBookmarked ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : ''
                }`}
              >
                <BookmarkPlus className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-3xl mx-auto">
              <div className="flex justify-center gap-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className="capitalize px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {contentItem.type}
                </Badge>
                <Badge
                  variant={contentItem.status === "approved" ? "default" : "outline"}
                  className="capitalize px-3 py-1 text-sm"
                >
                  {contentItem.status}
                </Badge>
                {contentItem.meta?.featured && (
                  <Badge className="px-3 py-1 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                    Featured
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold leading-tight text-balance bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                {contentItem.title}
              </h1>

              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
                {contentItem.organization && (
                  <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 px-3 py-1.5 rounded-full border">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{contentItem.organization.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 px-3 py-1.5 rounded-full border">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(contentItem.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                {/* <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 px-3 py-1.5 rounded-full border">
                  <Clock className="h-4 w-4" />
                  <span>{getReadingTime()}</span>
                </div> */}
              </div>
            </div>

            {/* Featured Image */}
            {contentItem.meta?.image_url && (
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border">
                <img
                  src={contentItem.meta.image_url}
                  alt={contentItem.title}
                  className="w-full h-64 md:h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            )}

            {/* Content Card */}
            <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardContent className="p-8">
                {/* Engagement Bar */}
                {/* <div className="flex items-center justify-between mb-8 pb-6 border-b">
                  <div className="flex items-center gap-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLike}
                      className={`gap-2 transition-all ${
                        isLiked
                          ? 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                      {likeCount}
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <MessageCircle className="h-4 w-4" />
                      Comment
                    </Button>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      <span>1.2k views</span>
                    </div>
                  </div>
                </div> */}

                {/* Main Content */}
                <article className="prose prose-lg dark:prose-invert max-w-none">
                  <div className="text-lg leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-pretty">
                    {contentItem.body}
                  </div>
                </article>

                {/* Scripture Reference */}
                {contentItem.meta?.scripture_ref && (
                  <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Scripture Reference</h3>
                        <p className="text-blue-800 dark:text-blue-200 text-lg leading-relaxed">
                          "{contentItem.meta.scripture_ref}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Meta Information */}
                {contentItem.meta && Object.keys(contentItem.meta).length > 0 && (
                  <div className="mt-12 space-y-6">
                    <Separator />
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Additional Details
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tags */}
                        {contentItem.meta.tags && contentItem.meta.tags.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                              <Tag className="h-4 w-4" />
                              Tags
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {contentItem.meta.tags.map((tag, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="px-3 py-1.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Author */}
                        {contentItem.meta.author && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                              <User className="h-4 w-4" />
                              Author
                            </div>
                            <p className="text-lg font-medium">{contentItem.meta.author}</p>
                          </div>
                        )}

                        {/* Location */}
                        {contentItem.meta.location && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              Location
                            </div>
                            <p className="text-lg">{contentItem.meta.location}</p>
                          </div>
                        )}

                        {/* Reading Time */}
                        {contentItem.meta.reading_time && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              Reading Time
                            </div>
                            <p className="text-lg">{contentItem.meta.reading_time}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span>Last updated: {new Date(contentItem.updated_at).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="sm" onClick={handleBack}>
                  Back to Dashboard
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  Share this Content
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}

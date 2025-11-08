"use client"

import type React from "react"
import { useState } from "react"

import { MapPin, Star, ArrowRight, Heart, UserCheck, UserPlus, Building2, Target } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { motion } from "framer-motion"
import { Link, router } from "@inertiajs/react"

interface Organization {
  id: number
  ein: string
  name: string
  ico?: string
  street: string
  city: string
  state: string
  zip: string
  ntee_code?: string
  classification?: string
  created_at: string
  is_favorited?: boolean
  is_registered?: boolean // Add is_registered field
}

interface OrganizationCardProps {
  organization: Organization
  index?: number
  showRating?: boolean
  rating?: number
  linkUrl?: string
  customButton?: React.ReactNode
  showFavorite?: boolean
}

export default function OrganizationCard({
  organization,
  index = 0,
  showRating = false,
  rating = 4.8,
  linkUrl,
  customButton,
  showFavorite = true,
}: OrganizationCardProps) {
  const defaultLinkUrl = linkUrl || `/organizations/${organization.id}`
  const [isFavorited, setIsFavorited] = useState(organization.is_favorited || false)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isLoading) return

    if (!organization.is_registered) {
      return // Don't allow favoriting unregistered organizations
    }

    setIsLoading(true)
    const newFavoriteState = !isFavorited

    // Optimistic UI update
    setIsFavorited(newFavoriteState)

    try {
      router.post(route("user.organizations.toggle-favorite", organization.id),{},
        {
          preserveScroll: true,
          onSuccess: () => {
            setIsFavorited(newFavoriteState)
          },
          onError: () => {
            // Revert on error
            setIsFavorited(!newFavoriteState)
          },
          onFinish: () => {
            setIsLoading(false)
          },
        },
      )
    } catch (error) {
      setIsFavorited(!newFavoriteState)
      setIsLoading(false)
    }
  }

  // Generate a gradient based on organization ID for consistent colors
  const gradientColors = [
    "from-blue-500 to-purple-600",
    "from-green-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-600",
    "from-emerald-500 to-green-600"
  ]
  const gradientClass = gradientColors[organization.id % gradientColors.length]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group"
    >
      <Card className="h-full border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white dark:bg-gray-800 overflow-hidden relative">
        {/* Header with gradient background */}
        <div className={`bg-gradient-to-r ${gradientClass} p-6 text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -translate-x-12 translate-y-12"></div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm border-0 font-medium">
                    {organization.ntee_code === ' - ' || !organization.ntee_code
                      ? "Non-Profit"
                      : `${organization.ntee_code}`
                    }
                  </Badge>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${organization.is_registered ? 'bg-green-300' : 'bg-amber-300'}`}></div>
                    <span className="text-sm font-medium text-white/90">
                      {organization.is_registered ? "Registered" : "Listed"}
                    </span>
                  </div>
                </div>
              </div>

              {showFavorite && organization.is_registered && (
                <div className="cursor-pointer">
                  <button
                    onClick={handleToggleFavorite}
                    disabled={isLoading}
                    className={`bg-white/20 rounded-lg p-2 backdrop-blur-sm transition-all duration-200 ${
                      isFavorited ? "text-white bg-white/30" : "text-white/80 hover:bg-white/30"
                    } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isFavorited ? (
                      <UserCheck className="h-5 w-5" />
                    ) : (
                      <UserPlus className="h-5 w-5" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <CardTitle className="text-xl font-bold text-white line-clamp-2 mb-2">
              {organization.name}
            </CardTitle>
            <CardDescription className="text-white/80 line-clamp-2 leading-relaxed">
              {organization.classification || "Non-profit organization serving the community"}
            </CardDescription>
          </div>
        </div>

        <CardContent className="p-6">
          {/* Location and Rating */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {organization.city}, {organization.state}
              </span>
            </div>
            {showRating && (
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                <Star className="h-4 w-4 text-amber-400 fill-current" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{rating}</span>
              </div>
            )}
          </div>

          {/* Category and Details */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <Target className="h-4 w-4 text-gray-400" />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {organization.ntee_code === ' - ' || !organization.ntee_code
                    ? "Not Available"
                    : organization.ntee_code
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-gray-400" />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {organization.is_registered ? "Fully Registered Organization" : "Pending Registration"}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {customButton ? (
            customButton
          ) : (
            <Link href={defaultLinkUrl}>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold py-3 text-base shadow-lg hover:shadow-xl transition-all duration-300 group/btn">
                <span>Learn More</span>
                <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
          )}
        </CardContent>

        {/* Subtle border for better separation in light mode */}
        <div className="absolute inset-0 border border-gray-100 dark:border-gray-700 pointer-events-none rounded-lg"></div>
      </Card>
    </motion.div>
  )
}

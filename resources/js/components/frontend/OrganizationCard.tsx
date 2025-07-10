"use client"

import type React from "react"

import { MapPin, Star, CheckCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { motion } from "framer-motion"
import { Link } from "@inertiajs/react"

interface Organization {
  id: number
  name: string
  description: string
  mission: string
  city: string
  state: string
  zip: string
  website?: string
  ico?: string
  ntee_code?: string
  created_at: string
  ntee_code_relation?: {
    category: string
  }
  user?: {
    image?: string
    email_verified_at?: string
  }
}

interface OrganizationCardProps {
  organization: Organization
  index?: number
  showRating?: boolean
  rating?: number
  linkUrl?: string
  customButton?: React.ReactNode
}

export default function OrganizationCard({
  organization,
  index = 0,
  showRating = true,
  rating = 4.8,
  linkUrl,
  customButton,
}: OrganizationCardProps) {
  const defaultLinkUrl = linkUrl || `/organizations/${organization.id}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      className="group"
    >
      <Card className="h-full border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="relative overflow-hidden">
          <img
            src={
              organization.user?.image
                ? "/storage/" + organization.user.image
                : "/placeholder.svg?height=300&width=400&text=Organization"
            }
            alt={organization.name}
            width={400}
            height={300}
            className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

          <div className="absolute top-4 left-4">
            <Badge variant="secondary" className="bg-white/90 text-gray-700 font-medium">
              {organization.ntee_code_relation?.category || "General"}
            </Badge>
          </div>

          <div className="absolute top-4 right-4">
            <div className="bg-white/90 rounded-full p-1.5">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center justify-between text-white text-sm">
              {organization.user?.email_verified_at && <span className="font-semibold">Verified</span>}
              <span className="font-semibold">Active</span>
            </div>
          </div>
        </div>

        <CardHeader className="pb-3">
          <CardTitle className="text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
            {organization.name}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {organization.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {organization.city}, {organization.state}
              </span>
            </div>
            {showRating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm font-semibold">{rating}</span>
              </div>
            )}
          </div>

          {customButton ? (
            customButton
          ) : (
            <Link href={defaultLinkUrl}>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold">
                Learn More
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

"use client"

import type React from "react"
import { useState } from 'react';
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { UserIcon, Heart, CreditCard, Package, Settings, Shield, Camera, Calendar, MapPin, Edit3 } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Badge } from "@/components/frontend/ui/badge"
import { Link, usePage, Head } from "@inertiajs/react"


interface ProfileLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
}

interface PageProps {
  auth: {
    user: {
      id: number
      name: string
      email: string
      phone?: string
      image?: string
      joined: string
      total_donated?: number
      favorite_organizations_count?: number
      total_orders?: number
      impact_score?: number
    }
  }
}

const navigationItems = [
  {
    name: "Overview",
    href: "/profile",
    icon: UserIcon,
  },
  {
    name: "Favorites",
    href: "/profile/favorites",
    icon: Heart,
  },
  {
    name: "Donations",
    href: "/profile/donations",
    icon: CreditCard,
  },
  {
    name: "Orders",
    href: "/profile/orders",
    icon: Package,
  },
  {
    name: "Node Boss",
    href: "/nodeboss/shares",
    icon: Package,
  },
  {
    name: "Change Password",
    href: "/profile/change-password",
    icon: Shield,
  },

]

export default function ProfileLayout({ children, title, description }: ProfileLayoutProps) {
  const { auth } = usePage<PageProps>().props
  const user = auth.user

  const [copied, setCopied] = useState(false);
  const currentPath = typeof window !== "undefined" ? window.location.pathname : ""

  const handleCopy = () => {
    navigator.clipboard.writeText(user?.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/* Profile Header */}
            <Card className="mb-6 sm:mb-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6">
                  <div className="relative mx-auto sm:mx-0">
                    <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                      <AvatarImage
                        src={user.image ? `${user.image}` : "/placeholder.svg?height=96&width=96"}
                        alt="Profile"
                      />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xl sm:text-2xl">
                        {auth.user.name?.split(" ")[0]?.[0] || "J"}
                        {auth.user.name?.split(" ")[1]?.[0] || "D"}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {user.name}
                      </h1>
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 mx-auto sm:mx-0 w-fit"
                      >
                        Verified Supporter
                      </Badge>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 text-sm sm:text-base">
                      {user.email || "example@example.com"}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-500">
                      <div className="flex items-center justify-center sm:justify-start gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined{" "}{user.joined}
                      </div>
                    </div>
                    <div >
                      <small className="mb-2 mt-5">Share Your Referral Link</small>
                      <div className="flex items-center mb-4">
                        <input
                          type="text"
                          value={user?.referral_link}
                          readOnly
                          className="flex-1 px-3 py-2 border rounded bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200 "
                        />
                        <Button onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</Button>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Invite friends using your referral link. When they register, you'll both receive rewards!
                      </p>
                    </div>

                  </div>

                  <div className="flex justify-center items-center text-center gap-2 w-full sm:w-auto">
                    <Link href="/profile/edit">
                      <Button variant="outline" className="flex-1 sm:flex-none bg-transparent">
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </Link>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total Donated</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        ${user.total_donated || 0}
                      </p>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900 p-2 sm:p-3 rounded-full">
                      <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Favorite Organizations</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {user.favorite_organizations_count || 0}
                      </p>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 sm:p-3 rounded-full">
                      <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total Orders</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {user.total_orders || 0}
                      </p>
                    </div>
                    <div className="bg-orange-100 dark:bg-orange-900 p-2 sm:p-3 rounded-full">
                      <Package className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Impact Score</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {user.impact_score || 8.5}/10
                      </p>
                    </div>
                    <div className="bg-purple-100 dark:bg-purple-900 p-2 sm:p-3 rounded-full">
                      <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Navigation */}
            <Card className="mb-6 sm:mb-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-2 sm:p-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4">
                  {navigationItems.map((item) => {
                    const isActive = currentPath === item.href
                    return (
                      <Link key={item.name} href={item.href}>
                        <div
                          className={`p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${isActive
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                            }`}
                        >
                          <div className="flex flex-col items-center text-center gap-2">
                            <div>
                              <h3
                                className={`font-medium text-sm ${isActive ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"
                                  }`}
                              >
                                {item.name}
                              </h3>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Page Content */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="pt-4 sm:pt-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
                  {description && <p className="text-gray-600 dark:text-gray-300">{description}</p>}
                </div>
                {children}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </FrontendLayout>
  )
}

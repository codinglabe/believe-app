"use client"

import type { BreadcrumbItem, SharedData } from "@/types"
import { Head, Link, usePage } from "@inertiajs/react"
import { useState } from "react"
import { motion } from "framer-motion"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Badge } from "@/components/frontend/ui/badge"
import { Calendar, Camera, Edit3, MapPin, User, Lock, Bell, Shield, CreditCard, Image } from "lucide-react"
import type { PropsWithChildren } from "react"

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Settings',
    href: '/settings/profile',
  },
];

interface SettingsLayoutProps extends PropsWithChildren {
  activeTab?: string
}

export default function SettingsLayout({ children, activeTab = "profile" }: SettingsLayoutProps) {
  const { auth } = usePage<SharedData>().props

  // Mock profile data - replace with real data from auth.user
  const profileData = {
    firstName: auth.user.name?.split(" ")[0] || "John",
    lastName: auth.user.name?.split(" ")[1] || "Doe",
    email: auth.user.email,
    avatar: auth.user.image,
    phone: auth.user.contact_number || "",
    email_verified_at: auth.user.email_verified_at || "",
    location: auth.user.organization?.address || "",
    joinDate: auth.user.joined || "",
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Profile Settings" />

      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="container mx-auto px-4 py-6 lg:py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-7xl mx-auto"
          >
            {/* Profile Header Card */}
            <Card className="mb-6 lg:mb-8 bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
                  {/* Avatar Section */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-24 h-24 lg:w-32 lg:h-32 border-4 border-white dark:border-gray-700 shadow-lg">
                      <AvatarImage src={profileData.avatar || "/placeholder.svg"} alt="Profile" />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-2xl lg:text-3xl font-semibold">
                        {auth.user.role === "organization" ? auth.user.organization?.name?.split(" ")[0] + auth.user.organization?.name?.split(" ")[1] : profileData.firstName[0] + profileData.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    {/* <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 bg-white dark:bg-transparent border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Camera className="h-4 w-4" />
                    </Button> */}
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 text-center lg:text-left min-w-0">
                    <div className="mb-4">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-2">
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">
                          {auth.user.role === "organization" ? auth.user.organization?.name : profileData.firstName + profileData.lastName}
                        </h1>
                        {profileData?.email_verified_at ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            ✓ Verified Account
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                            ✗ Unverified Account
                          </Badge>
                        )}

                      </div>
                      {/* <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-base leading-relaxed">
                        {profileData.bio}
                      </p> */}
                    </div>

                    {/* Profile Stats */}
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center justify-center lg:justify-start gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span>Joined {profileData.joinDate}</span>
                      </div>
                      {
                        auth.user.role === "organization" && (
                          <div className="flex items-center justify-center lg:justify-start gap-2">
                            <MapPin className="h-4 w-4 text-red-500" />
                            <span>{profileData.location}</span>
                          </div>
                        )
                      }

                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings Navigation & Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
              {/* Sidebar Navigation - Hidden on mobile, shown as tabs */}
              <div className="lg:col-span-1">
                <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 shadow-sm">
                  <CardContent className="p-0">
                    {/* Mobile Tabs */}
                    <div className="lg:hidden">
                      <Tabs value={activeTab} className="w-full">
                        <TabsList className="w-full h-auto p-1 bg-gray-100 dark:bg-gray-700 grid grid-cols-3 gap-1">
                          <TabsTrigger value="profile" asChild>
                            <Link href={route("profile.edit")}
                              className="flex items-center gap-2 px-3 py-2 text-sm">
                              <User className="h-4 w-4" />
                              Profile
                            </Link>
                          </TabsTrigger>
                          <TabsTrigger value="password" asChild>
                            <Link href={route("password.edit")}
                              className="flex items-center gap-2 px-3 py-2 text-sm">
                              <Lock className="h-4 w-4" />
                              Security
                            </Link>
                          </TabsTrigger>
                          <TabsTrigger value="payment-methods" asChild>
                            <Link href={route("payment-methods.index")}
                              className="flex items-center gap-2 px-3 py-2 text-sm">
                              <Lock className="h-4 w-4" />
                              Payment methods
                            </Link>
                                                  </TabsTrigger>
                          <TabsTrigger value="referral" asChild>
                            <Link href={route("referral.edit")}
                              className="flex items-center gap-2 px-3 py-2 text-sm">
                              <Shield className="h-4 w-4" />
                              Referral Link
                            </Link>
                          </TabsTrigger>
                            <TabsTrigger value="interested-topic" asChild>
                            <Link href={route("auth.topics.select")}
                              className="flex items-center gap-2 px-3 py-2 text-sm">
                              <Shield className="h-4 w-4" />
                                Interested Topics
                            </Link>
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    {/* Desktop Sidebar */}
                    <nav className="hidden lg:block p-2">
                      <div className="space-y-1">
                        <Link
                          href={route("profile.edit")}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "profile"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            }`}
                        >
                          <User className="h-4 w-4" />
                          Profile Information
                        </Link>
                        <Link
                          href={route("password.edit")}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "password"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            }`}
                        >
                          <Lock className="h-4 w-4" />
                          Password & Security
                        </Link>

                        <Link
                          href={route("payment-methods.index")}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "payment-methods"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            }`}
                        >
                          <CreditCard className="h-4 w-4" />
                          Payment methods
                        </Link>
                        <Link
                          href={route("referral.edit")}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "referral"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            }`}
                        >
                          <Shield className="h-4 w-4" />
                          Referral Link
                                              </Link>
                        <Link
                          href={route("auth.topics.select")}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "interested-topic"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            }`}
                        >
                          <Shield className="h-4 w-4" />
                          Interested Topics
                        </Link>
                      </div>
                    </nav>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-3">{children}</div>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  )
}

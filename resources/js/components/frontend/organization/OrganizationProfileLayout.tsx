"use client"

import { motion } from "framer-motion"
import {
  Heart,
  MapPin,
  Globe,
  Phone,
  Mail,
  Calendar,
  Award,
  Share2,
  DollarSign,
  Star,
  ShoppingCart,
  UserCheck,
  Info,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Link, router } from "@inertiajs/react"
import { route } from "ziggy-js"
import DonationModal from "@/components/frontend/donation-modal"
import { useState } from "react"
import OrgFollowButton from "@/components/ui/OrgFollowButtonProps"
import type React from "react"

interface OrganizationProfileLayoutProps {
  organization: any
  auth: any
  children: React.ReactNode
  showDonationModal?: boolean
  setShowDonationModal?: (show: boolean) => void
  cart?: any[]
  getCartItemCount?: () => number
  setShowCartModal?: (show: boolean) => void
}

export default function OrganizationProfileLayout({
  organization,
  auth,
  children,
  showDonationModal: externalShowDonationModal,
  setShowDonationModal: externalSetShowDonationModal,
  cart = [],
  getCartItemCount = () => 0,
  setShowCartModal,
}: OrganizationProfileLayoutProps) {
  const [internalShowDonationModal, setInternalShowDonationModal] = useState(false)
  const showDonationModal = externalShowDonationModal ?? internalShowDonationModal
  const setShowDonationModal = externalSetShowDonationModal ?? setInternalShowDonationModal

  const handleDonateNow = () => {
    if (!organization.is_registered) {
      return
    }

    if (!auth?.user) {
      router.visit(route("login", { redirect: route("organizations.show", { slug: organization?.user?.slug }) }), {
        replace: true,
      })
    } else {
      setShowDonationModal(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="relative h-96 overflow-hidden">
        <img
          src={organization.user?.cover_img ? "/storage/" + organization.user.cover_img : "/placeholder.svg"}
          alt={organization.name}
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-black bg-opacity-50" />
        <div
          className="absolute inset-0 flex items-end"
          style={{
            backgroundImage: `url(${organization.user?.cover_img ? "/storage/" + organization.user.cover_img : "/placeholder.svg"})`,
            backgroundColor: "#101828",
            backgroundBlendMode: "soft-light",
          }}
        >
          <div className="container mx-auto px-4 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center md:flex-row md:items-end gap-6"
            >
              {/* Organization Logo */}
              <div className="relative flex-shrink-0">
                <div className="relative">
                  <img
                    src={organization.user?.image ? "/storage/" + organization.user.image : "/placeholder.svg"}
                    alt={`${organization.name} logo`}
                    width={120}
                    height={120}
                    className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full border-4 border-white shadow-lg bg-white object-cover"
                    priority
                  />
                  {organization.is_registered && organization.registration_status === "approved" && (
                    <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-blue-600 rounded-full p-1">
                      <Award className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Organization Info */}
              <div className="flex-1 text-white text-center md:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 leading-tight">{organization.name}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">
                      {organization.city}, {organization.state}
                    </span>
                  </div>
                  {organization.is_registered && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm">4.8 (234 reviews)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {organization.is_registered && (
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Button
                    onClick={handleDonateNow}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 w-full sm:w-auto"
                  >
                    <Heart className="mr-2 h-5 w-5" />
                    Donate Now
                  </Button>
                  {organization.registered_organization?.user?.slug && (
                    <Link
                      href={route('organizations.enrollments', { slug: organization.registered_organization.user.slug })}
                    >
                      <Button
                        size="lg"
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 px-6 sm:px-8 w-full sm:w-auto"
                      >
                        <UserCheck className="mr-2 h-5 w-5" />
                        Enrolled
                      </Button>
                    </Link>
                  )}
                  <OrgFollowButton
                    organization={organization}
                    auth={auth}
                    initialIsFollowing={organization.is_favorited || false}
                    initialNotifications={organization.notifications_enabled || false}
                  />
                  {getCartItemCount() > 0 && setShowCartModal && (
                    <Button
                      onClick={() => setShowCartModal(true)}
                      variant="outline"
                      size="lg"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 relative w-full sm:w-auto"
                    >
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Cart ({getCartItemCount()})
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Modern Navigation Menu */}
            <div className="mb-8">
              <div className={`grid gap-3 ${organization.is_registered ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-4" : "grid-cols-2"}`}>
                <Link
                  href={route('organizations.about', organization.id)}
                  className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <Info className="h-4 w-4" />
                  <span className="text-sm">About</span>
                </Link>

                <Link
                  href={route('organizations.details', organization.id)}
                  className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium hover:from-teal-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <Info className="h-4 w-4" />
                  <span className="text-sm">Details</span>
                </Link>

                {organization.is_registered && (
                  <>
                    <Link
                      href={route('organizations.products', organization.id)}
                      className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span className="text-sm">Products</span>
                    </Link>

                    <Link
                      href={route('organizations.jobs', organization.id)}
                      className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span className="text-sm">Jobs</span>
                    </Link>

                    <Link
                      href={route('organizations.events', organization.id)}
                      className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Events</span>
                    </Link>

                    <Link
                      href={route('organizations.social-media', organization.id)}
                      className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">Social</span>
                    </Link>

                    <Link
                      href={route('organizations.contact', organization.id)}
                      className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium hover:from-violet-600 hover:to-fuchsia-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">Contact</span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Tab Content */}
            {children}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {organization.is_registered && (
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white flex items-center">
                    <DollarSign className="mr-2 h-5 w-5 text-green-600" />
                    Quick Donate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {[25, 50, 100, 250].map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        onClick={() => setShowDonationModal(true)}
                        className="h-12"
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                  <Button onClick={() => setShowDonationModal(true)} className="w-full bg-blue-600 hover:bg-blue-700">
                    Custom Amount
                  </Button>
                </CardContent>
              </Card>
            )}

            {!organization.is_registered && (
              <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <CardHeader>
                  <CardTitle className="text-yellow-800 dark:text-yellow-200 flex items-center">
                    <Info className="mr-2 h-5 w-5" />
                    Organization Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                    This organization is listed in our database but has not yet registered for additional features
                    like donations, detailed profiles, and community engagement.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Share */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Share This Organization</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {organization.is_registered && (
        <DonationModal
          isOpen={showDonationModal}
          onClose={() => setShowDonationModal(false)}
          organization={organization}
        />
      )}
    </div>
  )
}


"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState } from "react"
import { Heart, Plus, ExternalLink, Building, UserMinus, Sparkles } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/frontend/ui/alert-dialog"
import { usePage, router, Link } from "@inertiajs/react"
import { toast } from "sonner"
import DonationModal from "@/components/frontend/donation-modal"
type DonationModalOrganization = {
  id: number
  name: string
  image: string
  description: string
  category: string
  rating: number
  user: {
    image: string
    name: string
    email: string
    phone: string
  }
}

interface Organization {
  id: number
  name: string
  description: string
  mission?: string
  ein: string
  slug: string
  user?: {
    image?: string
  }
  nteeCode?: {
    category: string
    description: string
  }
  excel_data_id?: number
}

interface PageProps extends Record<string, unknown> {
  favoriteOrganizations: Organization[]
}

export default function ProfileFavorites() {
  const { favoriteOrganizations } = usePage<PageProps>().props
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false)
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [isUnfollowDialogOpen, setIsUnfollowDialogOpen] = useState(false)
  const [organizationToUnfollow, setOrganizationToUnfollow] = useState<Organization | null>(null)
  const [isUnfollowing, setIsUnfollowing] = useState(false)

  const handleUnfollowOrganization = (org: Organization) => {
    setOrganizationToUnfollow(org)
    setIsUnfollowDialogOpen(true)
  }

  const confirmUnfollow = () => {
    if (!organizationToUnfollow?.id) {
      toast.error("Unable to unfollow: Organization ID not found")
      setIsUnfollowDialogOpen(false)
      return
    }

    setIsUnfollowing(true)

    // Use the removeFavorite route which directly deletes the favorite
    router.delete(route("user.profile.favorites.remove", organizationToUnfollow.id), {
      preserveScroll: true,
      onSuccess: () => {
        toast.success(`Unfollowed ${organizationToUnfollow.name}`)
        setIsUnfollowDialogOpen(false)
        setOrganizationToUnfollow(null)
        router.reload({ only: ['favoriteOrganizations'] })
      },
      onError: () => {
        toast.error("Failed to unfollow organization")
        setIsUnfollowing(false)
      },
      onFinish: () => {
        setIsUnfollowing(false)
      },
    })
  }

  const handleDonateToFavorite = (org: Organization) => {
    setSelectedOrganization(org)
    setIsDonationModalOpen(true)
  }

  const handleViewOrganization = (org: Organization) => {
    if (org.excel_data_id) {
      router.visit(`/organizations/${org.excel_data_id}`)
    }
  }

  return (
    <ProfileLayout
      title="Following Organizations"
      description="Organizations you follow and support regularly"
    >
      <div className="space-y-6">
        {/* Favorites List */}
        {favoriteOrganizations.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4 sm:gap-6">
            {favoriteOrganizations.map((org) => (
              <Card
                key={org.id}
                className="border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:bg-gray-900/50 transition-all duration-300 hover:border-blue-200 dark:hover:border-blue-800 group"
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {/* Organization Image */}
                    <div className="shrink-0 flex justify-center sm:justify-start">
                      <div className="relative">
                        <img
                          src={org.user?.image ? '/storage/' + org.user.image : "/placeholder.svg"}
                          alt={org.name}
                          className="w-20 h-20 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-600 group-hover:border-blue-300 transition-colors"
                        />
                        <div className="absolute -top-2 -right-2">
                          <Badge variant="secondary" className="bg-red-500 text-white px-2 py-1 text-xs">
                            <Heart className="h-3 w-3 mr-1 fill-current" />
                            Following
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Organization Details */}
                    <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                      {/* Header */}
                      <div className="flex flex-col gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white break-words group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {org.name}
                          </h3>

                          {/* Category and Location */}
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 sm:mt-2">
                            {org.nteeCode && (
                              <Badge variant="outline" className="text-xs">
                                <Building className="h-3 w-3 mr-1" />
                                {org.nteeCode.category}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 sm:line-clamp-3">
                          {org.description || org.mission || "No description available."}
                        </p>
                      </div>

                      {/* Action Buttons - Mobile: Full width, Desktop: Inline */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 pt-2 sm:pt-0">
                        <Button
                          size="sm"
                          onClick={() => handleDonateToFavorite(org)}
                          className="bg-blue-600 hover:bg-blue-700 shadow-sm w-full sm:w-auto"
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          Donate
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewOrganization(org)}
                            className="border-gray-300 dark:border-gray-600 flex-1 sm:flex-initial"
                            title="View Organization"
                          >
                            <ExternalLink className="h-4 w-4 sm:mr-0" />
                            <span className="sm:hidden ml-2">View</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnfollowOrganization(org)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 border-red-200 dark:border-red-800 flex-1 sm:flex-initial"
                          >
                            <UserMinus className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Unfollow</span>
                            <span className="sm:hidden">Unfollow</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {/* Follow More Great Organizations Section */}
        {favoriteOrganizations.length > 0 && (
          <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <div className="shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Follow More Great Organizations
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 sm:mb-0">
                    Discover and follow more verified non-profit organizations making a difference.
                    Build your network and stay connected with causes you care about.
                  </p>
                </div>
                <div className="shrink-0">
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                  >
                    <Link href={route("organizations")} className="flex items-center">
                      <Plus className="h-5 w-5 mr-2" />
                      Explore Organizations
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {favoriteOrganizations.length === 0 && (
          /* Empty State */
          <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600">
            <CardContent className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Heart className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  No favorites yet
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                  Start building your impact network. Follow organizations you care about to
                  keep track of their work, receive updates, and support their causes easily.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                    <Link href={route("organizations")} className="flex items-center">
                      <Plus className="h-5 w-5 mr-2" />
                      Explore Organizations
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href={route("donate")}>
                      Make a Donation
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Donation Modal */}
      {selectedOrganization && (
        <DonationModal
          isOpen={isDonationModalOpen}
          onClose={() => {
            setIsDonationModalOpen(false)
            setSelectedOrganization(null)
          }}
          organization={selectedOrganization as unknown as DonationModalOrganization}
        />
      )}

      {/* Unfollow Confirmation Dialog */}
      <AlertDialog open={isUnfollowDialogOpen} onOpenChange={setIsUnfollowDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <UserMinus className="h-5 w-5 text-red-600 dark:text-red-400" />
              Unfollow Organization?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              Are you sure you want to unfollow <strong className="text-gray-900 dark:text-white">{organizationToUnfollow?.name}</strong>?
              You'll stop receiving updates from them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isUnfollowing}
              className="border-gray-300 dark:border-gray-600"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnfollow}
              disabled={isUnfollowing}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              {isUnfollowing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Unfollowing...
                </>
              ) : (
                "Yes, Unfollow"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProfileLayout>
  )
}

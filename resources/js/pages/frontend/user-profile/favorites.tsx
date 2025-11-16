"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState } from "react"
import { Heart, Plus, Star, Trash2, ExternalLink, MapPin, Building, Calendar } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { usePage, useForm, router, Link } from "@inertiajs/react"
import { toast } from "sonner"
import DonationModal from "@/components/frontend/donation-modal"

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

interface PageProps {
  favoriteOrganizations: Organization[]
}

export default function ProfileFavorites() {
  const { favoriteOrganizations } = usePage<PageProps>().props
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false)
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)

  const removeFavoriteOrganization = (orgId: number) => {
    router.delete(`/profile/favorites/${orgId}`, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success("Organization removed from favorites")
      },
      onError: () => {
        toast.error("Failed to remove from favorites")
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-6">
            {favoriteOrganizations.map((org) => (
              <Card
                key={org.id}
                className="border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:bg-gray-900/50 transition-all duration-300 hover:border-blue-200 dark:hover:border-blue-800 group"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Organization Image */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <img
                          src={org.user?.image ? '/storage/' + org.user.image : "/placeholder.svg"}
                          alt={org.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-600 group-hover:border-blue-300 transition-colors"
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
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {org.name}
                          </h3>

                          {/* Category and Location */}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {org.nteeCode && (
                              <Badge variant="outline" className="text-xs">
                                <Building className="h-3 w-3 mr-1" />
                                {org.nteeCode.category}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleDonateToFavorite(org)}
                            className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                          >
                            <Heart className="h-4 w-4 mr-2" />
                            Donate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewOrganization(org)}
                            className="border-gray-300 dark:border-gray-600"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFavoriteOrganization(org.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {org.description || org.mission || "No description available."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
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
          organization={selectedOrganization}
        />
      )}
    </ProfileLayout>
  )
}

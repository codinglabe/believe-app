"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState } from "react"
import { Heart, Plus, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"

import { usePage, useForm, router, Link } from "@inertiajs/react"
import { toast } from "sonner"
import DonationModal from "@/components/frontend/donation-modal"

interface Organization {
  id: number
  name: string
  category: string
  rating: number
  description: string
  total_donated?: number
    last_donation?: string
    user?: {
        image?: string
    }
    nteeCode?: {
        category: string
        description: string
    }
}

interface PageProps {
  favoriteOrganizations: Organization[]
  availableOrganizations: Organization[]
}

export default function ProfileFavorites() {
  const { favoriteOrganizations, availableOrganizations } = usePage<PageProps>().props
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false)
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)

  const removeFavoriteOrganization = (orgId: number) => {
    router.delete(`/profile/favorites/${orgId}`, {
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

  return (
    <ProfileLayout title="Following Organizations" description="Organizations you follow and support regularly">
      <div className="space-y-6">
        {/* Favorites List */}
        {favoriteOrganizations.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {favoriteOrganizations.map((org) => (
              <Card
                key={org.id}
                className="border border-gray-200 dark:border-gray-600 hover:shadow-md dark:bg-gray-900 transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={org.user?.image ? '/storage/' + org.user?.image : "/placeholder.svg?height=64&width=64"}
                      alt={org.name}
                      width={64}
                      height={64}
                      className="rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                            {org.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2">
                            <span>{org.nteeCode?.category}</span>
                                            <div className="flex items-center gap-1">
                                                {
                                                    org.rating && (
                                                        <>
                                                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                                            <span>{org.rating}</span>
                                                        </>
                                                    )
                                                }
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{org.description}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleDonateToFavorite(org)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Heart className="h-4 w-4 mr-1" />
                            Donate
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFavoriteOrganization(org.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs sm:text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Total donated:</span>
                          <span className="font-medium text-gray-900 dark:text-white">${org.total_donated || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Last donation:</span>
                          <span className="text-gray-900 dark:text-white">{org.last_donation || "Never"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No favorites yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
              Add organizations you care about to keep track of them easily and support their causes.
                          </p>
            <Button>
            <Link href={route("organizations")} className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Favorite
            </Link>
            </Button>
          </div>
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

"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState } from "react"
import { Heart, Plus, Search, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Badge } from "@/components/frontend/ui/badge"
import { Card, CardContent } from "@/components/frontend/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/frontend/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import { usePage, useForm } from "@inertiajs/react"
import { toast } from "sonner"
import DonationModal from "@/components/frontend/donation-modal"

interface Organization {
  id: number
  name: string
  image?: string
  category: string
  rating: number
  description: string
  total_donated?: number
  last_donation?: string
}

interface PageProps {
  favoriteOrganizations: Organization[]
  availableOrganizations: Organization[]
}

export default function ProfileFavorites() {
  const { favoriteOrganizations, availableOrganizations } = usePage<PageProps>().props

  const [isAddingFavorite, setIsAddingFavorite] = useState(false)
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false)
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const { post, delete: destroy } = useForm()

  // Filter available organizations based on search and category
  const filteredAvailableOrganizations = availableOrganizations
    .filter((org) => !favoriteOrganizations.find((fav) => fav.id === org.id))
    .filter((org) => {
      const matchesSearch =
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || org.category === selectedCategory
      return matchesSearch && matchesCategory
    })

  // Get unique categories for filter
  const categories = ["all", ...Array.from(new Set(availableOrganizations.map((org) => org.category)))]

  const addFavoriteOrganization = (org: Organization) => {
    post(`/profile/favorites/${org.id}`, {
      onSuccess: () => {
        toast.success(`${org.name} added to favorites!`)
        setIsAddingFavorite(false)
        setSearchQuery("")
        setSelectedCategory("all")
      },
      onError: () => {
        toast.error("Failed to add to favorites")
      },
    })
  }

  const removeFavoriteOrganization = (orgId: number) => {
    destroy(`/profile/favorites/${orgId}`, {
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
    <ProfileLayout title="Favorite Organizations" description="Organizations you follow and support regularly">
      <div className="space-y-6">
        {/* Add Favorite Button */}
        <div className="flex justify-end">
          <Dialog open={isAddingFavorite} onOpenChange={setIsAddingFavorite}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Favorite
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-w-2xl mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">Add Favorite Organization</DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-300">
                  Search and choose an organization to add to your favorites
                </DialogDescription>
              </DialogHeader>

              {/* Search and Filter Controls */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search organizations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category === "all" ? "All Categories" : category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Organizations List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredAvailableOrganizations.length > 0 ? (
                  filteredAvailableOrganizations.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <img
                        src={org.image || "/placeholder.svg?height=48&width=48"}
                        alt={org.name}
                        width={48}
                        height={48}
                        className="rounded-full flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">{org.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">{org.description}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                          <Badge variant="secondary" className="text-xs">
                            {org.category}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span>{org.rating}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addFavoriteOrganization(org)}
                        className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                      >
                        Add
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No organizations found</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Try adjusting your search terms or category filter
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Favorites List */}
        {favoriteOrganizations.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {favoriteOrganizations.map((org) => (
              <Card
                key={org.id}
                className="border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={org.image || "/placeholder.svg?height=64&width=64"}
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
                            <span>{org.category}</span>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span>{org.rating}</span>
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
            <Button onClick={() => setIsAddingFavorite(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Favorite
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

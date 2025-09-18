"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Badge } from "@/components/frontend/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import { motion } from "framer-motion"

interface SearchSectionProps {
  filters: {
    search?: string
    category?: string
    state?: string
    city?: string
    zip?: string
    sort?: string
    per_page?: string
  }
  filterOptions: {
    categories: string[]
    states: string[]
    cities: string[]
  }
  hasActiveFilters: boolean
  onSearch: (params: Record<string, string>) => void
  onClearFilters: () => void
  isLoading?: boolean
  showQuickFilters?: boolean
  quickFilterTags?: string[]
}

export default function SearchSection({
  filters,
  filterOptions,
  hasActiveFilters,
  onSearch,
  onClearFilters,
  isLoading = false,
  showQuickFilters = true,
  quickFilterTags = ["Education", "Environment", "Health", "Emergency Relief"],
}: SearchSectionProps) {
  // State for search inputs
  const [searchQuery, setSearchQuery] = useState(filters.search || "")
  const [selectedCategory, setSelectedCategory] = useState(filters.category || "All Categories")
  const [selectedState, setSelectedState] = useState(filters.state || "All States")
  const [selectedCity, setSelectedCity] = useState(filters.city || "All Cities")
  const [zipCode, setZipCode] = useState(filters.zip || "")
  const [cities, setCities] = useState<string[]>(filterOptions.cities || ["All Cities"])
  const [isLoadingCities, setIsLoadingCities] = useState(false)

  // Handle state change and update cities
  const handleStateChange = async (state: string) => {
    setSelectedState(state)
    setSelectedCity("All Cities")

    if (state !== "All States") {
      setIsLoadingCities(true)
      try {
        const response = await fetch(`/api/cities-by-state?state=${encodeURIComponent(state)}`)
        const newCities = await response.json()
        setCities(newCities)
      } catch (error) {
        console.error("Error fetching cities:", error)
        setCities(["All Cities"])
      } finally {
        setIsLoadingCities(false)
      }
    } else {
      setCities(["All Cities"])
    }
  }

  // Handle search
  const handleSearch = () => {
    const params = {
      search: searchQuery,
      category: selectedCategory,
      state: selectedState,
      city: selectedCity,
      zip: zipCode,
    }
    onSearch(params)
  }

  // Handle quick filter
  const handleQuickFilter = (category: string) => {
    setSelectedCategory(category)
  }

  // Reset form when clear filters is clicked
  useEffect(() => {
    if (!hasActiveFilters) {
      setSearchQuery("")
      setSelectedCategory("All Categories")
      setSelectedState("All States")
      setSelectedCity("All Cities")
      setZipCode("")
      setCities(["All Cities"])
    }
  }, [hasActiveFilters])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="mb-8"
    >
      <div className="relative group max-w-6xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
          {/* Main Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search organizations by name, mission, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 pr-4 h-14 text-lg border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl"
              />
            </div>
          </div>

          {/* Filters and Search Button */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                {filterOptions.categories.map((category) => (
                  <SelectItem key={category} value={category} className="text-gray-900 dark:text-white">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedState} onValueChange={handleStateChange}>
              <SelectTrigger className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                {filterOptions.states.map((state) => (
                  <SelectItem key={state} value={state} className="text-gray-900 dark:text-white">
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCity} onValueChange={setSelectedCity} disabled={isLoadingCities || selectedState === "All States"}>
              <SelectTrigger className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl">
                <SelectValue placeholder={isLoadingCities ? "Loading cities..." : "All Cities"} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                {cities.map((city) => (
                  <SelectItem key={city} value={city} className="text-gray-900 dark:text-white">
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="text"
              placeholder="ZIP Code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl"
            />

            <Button
              onClick={handleSearch}
              disabled={isLoading}
              size="lg"
              className="h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold rounded-xl"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Search className="mr-2 h-5 w-5" />
              )}
              Search
            </Button>
          </div>

          {/* Popular Quick Filters */}
          {showQuickFilters && (
            <div className="flex flex-wrap gap-2 items-center mb-4">
              <span className="text-sm text-gray-600 dark:text-gray-300 mr-2">Popular:</span>
              {quickFilterTags.map((tag) => (
                <Button
                  key={tag}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter(tag)}
                  className="h-8 text-xs bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/30 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  {tag}
                </Button>
              ))}
            </div>
          )}

          {/* Active Filters & Clear */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex flex-wrap gap-2">
                {filters.search && (
                  <Badge variant="secondary" className="px-3 py-1">
                    Search: {filters.search}
                  </Badge>
                )}
                {filters.category && filters.category !== "All Categories" && (
                  <Badge variant="secondary" className="px-3 py-1">
                    Category: {filters.category}
                  </Badge>
                )}
                {filters.state && filters.state !== "All States" && (
                  <Badge variant="secondary" className="px-3 py-1">
                    State: {filters.state}
                  </Badge>
                )}
                {filters.city && filters.city !== "All Cities" && (
                  <Badge variant="secondary" className="px-3 py-1">
                    City: {filters.city}
                  </Badge>
                )}
                {filters.zip && (
                  <Badge variant="secondary" className="px-3 py-1">
                    Zip: {filters.zip}
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="text-gray-600 hover:text-gray-800 bg-transparent border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

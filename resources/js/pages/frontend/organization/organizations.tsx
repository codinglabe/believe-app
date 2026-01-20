"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState } from "react"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import { motion } from "framer-motion"
import { router, usePage } from "@inertiajs/react"
import SearchSection from "@/components/frontend/SearchSection"
import OrganizationCard from "@/components/frontend/OrganizationCard"
import SignInPopup from "@/components/frontend/SignInPopup"

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
  created_at: string
}

interface PageProps {
  organizations: {
    data: Organization[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number
    to: number
  }
  filters: {
    search?: string
    category?: string
    category_description?: string // Add this
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
    categoryDescriptions: string[] // Add this
  }
  hasActiveFilters: boolean
  auth?: {
    user?: {
      id: number
      name: string
      email: string
    } | null
  }
}

const sortOptions = [
  { value: "id", label: "ID (Ascending)" },
  { value: "name", label: "Name (A-Z)" },
  { value: "state", label: "State" },
  { value: "city", label: "City" },
]

export default function OrganizationsPage() {
  const { organizations, filters, filterOptions, hasActiveFilters, auth } = usePage<PageProps>().props

  const [sortBy, setSortBy] = useState(filters.sort || "id")
  const [resultsPerPage, setResultsPerPage] = useState(Number(filters.per_page) || 12)
  const [isLoading, setIsLoading] = useState(false)
  const [showSignInPopup, setShowSignInPopup] = useState(false)

  // Check if user is authenticated
  const isAuthenticated = auth?.user !== null && auth?.user !== undefined

  // Handle search from SearchSection component
  const handleSearch = (params: Record<string, string>) => {
    // Check if user is trying to search with actual search terms
    const hasSearchQuery = params.search && params.search.trim() !== ""
    const hasFilters =
      (params.category && params.category !== "All Categories") ||
      (params.state && params.state !== "All States") ||
      (params.city && params.city !== "All Cities") ||
      (params.zip && params.zip.trim() !== "")

    // If user is not authenticated and trying to search, show popup
    if (!isAuthenticated && (hasSearchQuery || hasFilters)) {
      setShowSignInPopup(true)
      return
    }

    setIsLoading(true)
    const searchParams = new URLSearchParams()

    // Add current sort and per_page to search params
    const allParams = {
      ...params,
      sort: sortBy,
      per_page: resultsPerPage.toString(),
    }

    Object.entries(allParams).forEach(([key, value]) => {
      if (value && value !== "All Categories" && value !== "All States" && value !== "All Cities") {
        searchParams.set(key, value)
      }
    })

    const url = searchParams.toString() ? `/organizations?${searchParams.toString()}` : "/organizations"

    router.visit(url, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setIsLoading(false),
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setSortBy("id")
    setResultsPerPage(12)

    router.visit("/organizations", {
      preserveState: true,
      preserveScroll: true,
    })
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set("page", page.toString())

    router.visit(`/organizations?${params.toString()}`, {
      preserveState: true,
      preserveScroll: false,
    })

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Handle results per page change
  const handleResultsPerPageChange = (value: string) => {
    const num = Number.parseInt(value) || 12
    setResultsPerPage(Math.max(1, num))

    const params = new URLSearchParams(window.location.search)
    params.set("per_page", num.toString())
    params.delete("page") // Reset to first page

    router.visit(`/organizations?${params.toString()}`, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value)

    const params = new URLSearchParams(window.location.search)
    params.set("sort", value)
    params.delete("page") // Reset to first page

    router.visit(`/organizations?${params.toString()}`, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, organizations.current_page - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(organizations.last_page, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <FrontendLayout>
      {/* Sign In Popup */}
      <SignInPopup
        isOpen={showSignInPopup}
        onClose={() => setShowSignInPopup(false)}
        onSignIn={() => setShowSignInPopup(false)}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Discover Organizations
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Find verified non-profit organizations from our database.
            </p>
          </motion.div>

          {/* Search Section Component */}
          <SearchSection
  filters={filters}
  filterOptions={filterOptions} // Add this line
  hasActiveFilters={hasActiveFilters}
  onSearch={handleSearch}
  onClearFilters={clearFilters}
  isLoading={isLoading}
  showQuickFilters={true}
/>

          {/* Results Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              <p className="text-gray-600 dark:text-gray-400">
                Showing{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {organizations.from || 0}-{organizations.to || 0}
                </span>{" "}
                of <span className="font-semibold text-gray-900 dark:text-white">{organizations.total}</span>{" "}
                organizations
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Results per page:</label>
                <Input
                  type="number"
                  min="1"
                  value={resultsPerPage}
                  onChange={(e) => handleResultsPerPageChange(e.target.value)}
                  className="w-20 h-8 text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
              </div>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-48 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-gray-900 dark:text-white">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Organizations Grid */}
          {organizations.data.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {organizations.data.map((org, index) => (
                  <OrganizationCard key={org.id} organization={org} index={index} showRating={false} />
                ))}
              </div>

              {/* Pagination */}
              {organizations.last_page > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex justify-center items-center gap-2"
                >
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(organizations.current_page - 1)}
                    disabled={organizations.current_page === 1}
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex gap-1">
                    {getPageNumbers().map((page) => (
                      <Button
                        key={page}
                        variant={organizations.current_page === page ? "default" : "outline"}
                        onClick={() => handlePageChange(page)}
                        className={
                          organizations.current_page === page
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        }
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(organizations.current_page + 1)}
                    disabled={organizations.current_page === organizations.last_page}
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>

                  <div className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                    Page {organizations.current_page} of {organizations.last_page}
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            /* No Results */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No organizations found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Try adjusting your search criteria or browse all organizations to discover amazing causes.
              </p>
              <Button onClick={clearFilters} className="bg-blue-600 hover:bg-blue-700">
                Clear All Filters
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}

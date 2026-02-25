"use client"

import { useState } from "react"
import { Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Heart } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import { motion } from "framer-motion"
import { router, usePage, Link } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import SearchSection from "@/components/frontend/SearchSection"
import SignInPopup from "@/components/frontend/SignInPopup"
import { PageHead } from "@/components/frontend/PageHead"
import toast from "react-hot-toast"

interface Organization {
  id: number
  ein: string
  name: string
  city: string
  state: string
  zip: string
  ntee_code?: string
  ntee_code_raw?: string
  ntee_category?: string
  ntee_category_description?: string
  classification?: string
  created_at: string
  is_registered?: boolean
  is_favorited?: boolean
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
    category_description?: string
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
    categoryDescriptions: string[]
  }
  hasActiveFilters: boolean
  auth?: { user?: { id: number; name: string; email: string; organization?: { ein: string } } | null }
}

const sortOptions = [
  { value: "id", label: "ID (Ascending)" },
  { value: "name", label: "Name (A-Z)" },
  { value: "state", label: "State" },
  { value: "city", label: "City" },
]

const perPageOptions = [6, 12, 24, 48]

declare global {
  function route(name: string, params?: number | string): string
}

export default function OrganizationsPage() {
  const { organizations, filters, filterOptions, hasActiveFilters, auth } = usePage<PageProps>().props

  const [sortBy, setSortBy] = useState(filters.sort || "id")
  const [resultsPerPage, setResultsPerPage] = useState(Number(filters.per_page) || 6)
  const [isLoading, setIsLoading] = useState(false)
  const [showSignInPopup, setShowSignInPopup] = useState(false)
  const [favoritingId, setFavoritingId] = useState<number | null>(null)

  const isAuthenticated = !!auth?.user

  const handleSearch = (params: Record<string, string>) => {
    const hasSearchQuery = params.search?.trim()
    const hasFilters =
      (params.category && params.category !== "All Categories") ||
      (params.category_description && params.category_description !== "All Descriptions") ||
      (params.state && params.state !== "All States") ||
      (params.city && params.city !== "All Cities") ||
      (params.zip?.trim() ?? "")

    if (!isAuthenticated && (hasSearchQuery || hasFilters)) {
      setShowSignInPopup(true)
      return
    }

    setIsLoading(true)
    const searchParams = new URLSearchParams()
    const allParams = { ...params, sort: sortBy, per_page: resultsPerPage.toString() }
    Object.entries(allParams).forEach(([key, value]) => {
      if (value && value !== "All Categories" && value !== "All States" && value !== "All Cities" && value !== "All Descriptions")
        searchParams.set(key, value)
    })
    const url = searchParams.toString() ? `/organizations?${searchParams.toString()}` : "/organizations"
    router.visit(url, { preserveState: true, preserveScroll: true, onFinish: () => setIsLoading(false) })
  }

  const clearFilters = () => {
    setSortBy("id")
    setResultsPerPage(6)
    router.visit("/organizations", { preserveState: true, preserveScroll: true })
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set("page", page.toString())
    router.visit(`/organizations?${params.toString()}`, { preserveState: true, preserveScroll: false })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleResultsPerPageChange = (value: string) => {
    const num = Math.min(50, Math.max(1, Number(value) || 6))
    setResultsPerPage(num)
    const params = new URLSearchParams(window.location.search)
    params.set("per_page", num.toString())
    params.delete("page")
    router.visit(`/organizations?${params.toString()}`, { preserveState: true, preserveScroll: true })
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
    const params = new URLSearchParams(window.location.search)
    params.set("sort", value)
    params.delete("page")
    router.visit(`/organizations?${params.toString()}`, { preserveState: true, preserveScroll: true })
  }

  const handleToggleFavorite = (org: Organization, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!org.is_registered || favoritingId !== null) return
    if (!isAuthenticated) {
      setShowSignInPopup(true)
      return
    }
    setFavoritingId(org.id)
    const newState = !org.is_favorited
    router.post(route("organizations.toggle-favorite", org.id), {}, {
      preserveScroll: true,
      onSuccess: () => setFavoritingId(null),
      onError: () => {
        toast.error("Following is for supporter accounts only.")
        setFavoritingId(null)
      },
      onFinish: () => setFavoritingId(null),
    })
  }

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = []
    const cur = organizations.current_page
    const last = organizations.last_page
    const show = 5
    let start = Math.max(1, cur - Math.floor(show / 2))
    let end = Math.min(last, start + show - 1)
    if (end - start + 1 < show) start = Math.max(1, end - show + 1)
    if (start > 1) {
      pages.push(1)
      if (start > 2) pages.push("ellipsis")
    }
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < last) {
      if (end < last - 1) pages.push("ellipsis")
      pages.push(last)
    }
    return pages
  }

  return (
    <FrontendLayout>
      <PageHead
        title="Organizations"
        description="Find verified non-profit organizations from our database. Search by name, mission, location, and category."
      />
      <SignInPopup isOpen={showSignInPopup} onClose={() => setShowSignInPopup(false)} onSignIn={() => setShowSignInPopup(false)} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6 sm:mb-8"
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              Find verified non-profit organizations from our database.
            </h1>
          </motion.header>

          <SearchSection
            filters={filters}
            filterOptions={filterOptions}
            hasActiveFilters={hasActiveFilters}
            onSearch={handleSearch}
            onClearFilters={clearFilters}
            isLoading={isLoading}
            showQuickFilters={true}
          />

          {/* Results bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4"
          >
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Showing{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {organizations.from ?? 0}-{organizations.to ?? 0}
              </span>{" "}
              of <span className="font-semibold text-gray-900 dark:text-white">{organizations.total.toLocaleString()}</span> organizations
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Results per page:</label>
                <Select
                  value={String(resultsPerPage)}
                  onValueChange={handleResultsPerPageChange}
                >
                  <SelectTrigger className="w-[72px] h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    {perPageOptions.map((n) => (
                      <SelectItem key={n} value={String(n)} className="text-gray-900 dark:text-white">
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[180px] h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    {sortOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-gray-900 dark:text-white">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Table (desktop) / Card list (mobile) */}
          {organizations.data.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                          <button
                            type="button"
                            onClick={() => handleSortChange(sortBy === "name" ? "id" : "name")}
                            className="inline-flex items-center hover:text-violet-600 dark:hover:text-violet-400"
                          >
                            Organization Name
                            {sortBy === "name" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4 opacity-50" />}
                          </button>
                        </th>
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">City, State</th>
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">Category</th>
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">Code</th>
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">Status</th>
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">View</th>
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">Follow</th>
                      </tr>
                    </thead>
                    <tbody>
                      {organizations.data.map((org) => (
                        <tr
                          key={org.id}
                          className="border-b border-gray-100 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{org.name || "—"}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {[org.city, org.state].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {org.ntee_category_description || org.ntee_code || "Not Available"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{org.ntee_code_raw || org.classification || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className="text-gray-600 dark:text-gray-300">Listed</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/organizations/${org.id}`}
                              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                            >
                              View
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            {org.is_registered ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                onClick={(e) => handleToggleFavorite(org, e)}
                                disabled={favoritingId === org.id}
                              >
                                <Heart
                                  className={`h-4 w-4 mr-1 ${org.is_favorited ? "fill-current" : ""}`}
                                />
                                Follow
                              </Button>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile card list */}
              <div className="lg:hidden space-y-3">
                {organizations.data.map((org) => (
                  <motion.div
                    key={org.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{org.name || "—"}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {[org.city, org.state].filter(Boolean).join(", ") || "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <span><strong className="text-gray-700 dark:text-gray-300">Category:</strong> {org.ntee_category_description || org.ntee_code || "Not Available"}</span>
                        <span><strong className="text-gray-700 dark:text-gray-300">Code:</strong> {org.ntee_code_raw || org.classification || "—"}</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Listed
                        </span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Link
                          href={`/organizations/${org.id}`}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          View
                        </Link>
                        {org.is_registered && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                            onClick={(e) => handleToggleFavorite(org, e)}
                            disabled={favoritingId === org.id}
                          >
                            <Heart className={`h-4 w-4 mr-1 ${org.is_favorited ? "fill-current" : ""}`} />
                            Follow
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {organizations.last_page > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 order-2 sm:order-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Results per page:</span>
                    <Select value={String(resultsPerPage)} onValueChange={handleResultsPerPageChange}>
                      <SelectTrigger className="w-[72px] h-9 bg-white dark:bg-gray-800 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {perPageOptions.map((n) => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {sortOptions.find((o) => o.value === sortBy)?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => handlePageChange(organizations.current_page - 1)}
                      disabled={organizations.current_page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-0.5" />
                      Previous
                    </Button>
                    {getPageNumbers().map((page, i) =>
                      page === "ellipsis" ? (
                        <span key={`e-${i}`} className="px-2 text-gray-500">…</span>
                      ) : (
                        <Button
                          key={page}
                          variant={organizations.current_page === page ? "default" : "outline"}
                          size="sm"
                          className="h-9 min-w-9"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => handlePageChange(organizations.current_page + 1)}
                      disabled={organizations.current_page === organizations.last_page}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-0.5" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No organizations found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                Try adjusting your search or filters to discover organizations.
              </p>
              <Button onClick={clearFilters} className="bg-violet-600 hover:bg-violet-700">
                Clear filters
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}

"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Badge } from "@/components/frontend/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import { Combobox } from "@/components/frontend/ui/combobox"
import { motion } from "framer-motion"
import { CauseBadge } from "@/components/frontend/cause-badge"

export type PopularCauseChip = {
  id: number
  name: string
  slug?: string
}

interface SearchSectionProps {
  filters: {
    search?: string
    category?: string
    category_description?: string // Add this
    state?: string
    city?: string
    zip?: string
    cause_id?: string | null
    status?: string
    sort?: string
    per_page?: string
  }
  filterOptions: {
    categories: string[]
    categoryDescriptions: string[] // Add this
    states: string[]
    cities: string[]
    causes?: { id: number; name: string }[]
  }
  hasActiveFilters: boolean
  onSearch: (params: Record<string, string>) => void
  onClearFilters: () => void
  isLoading?: boolean
  showQuickFilters?: boolean
  /** When false, hides the NTEE "category" combobox (Organizations directory mock). */
  showCategoryFilter?: boolean
  /** When false, hides the NTEE "category description" combobox. */
  showCategoryDescriptionFilter?: boolean
  /** When false, hides the ZIP code input. */
  showZipFilter?: boolean
  /** When true, shows Joined/Not-yet-joined status filter. */
  showStatusFilter?: boolean
  /** When true, shows Primary Action Category (cause) combobox in the filters row. */
  showCauseFilter?: boolean
  /** Visual skin: `directory` matches the dark nonprofits directory mockup. */
  variant?: "default" | "directory"
  quickFilterTags?: string[]
  /** Profile “Causes & Interest” — shown as chips inside the search card (directory). */
  popularCauses?: PopularCauseChip[]
  /**
   * When set to a positive number, hides the Search button and automatically calls `onSearch`
   * after the user stops changing filters (debounced). Enter still runs an immediate search.
   */
  autoSearchDebounceMs?: number
}

function localSearchParamsMatchFiltersProps(
  local: Record<string, string>,
  f: SearchSectionProps["filters"],
): boolean {
  const norm = (s: string | undefined | null) => (typeof s === "string" ? s.trim() : "")
  if (norm(local.search) !== norm(f.search)) return false
  if ((local.category || "All Categories") !== (f.category || "All Categories")) return false
  if ((local.category_description || "All Descriptions") !== (f.category_description || "All Descriptions")) return false
  if ((local.state || "All States") !== (f.state || "All States")) return false
  if ((local.city || "All Cities") !== (f.city || "All Cities")) return false
  if (norm(local.zip) !== norm(f.zip)) return false
  if ((local.status || "All Status") !== (f.status || "All Status")) return false
  const lCause = local.cause_id && local.cause_id !== "0" ? String(local.cause_id) : ""
  const fCause = f.cause_id && String(f.cause_id) !== "0" ? String(f.cause_id) : ""
  if (lCause !== fCause) return false
  return true
}

export default function SearchSection({
  filters,
  filterOptions,
  hasActiveFilters,
  onSearch,
  onClearFilters,
  isLoading = false,
  showQuickFilters = true,
  showCategoryFilter = true,
  showCategoryDescriptionFilter = true,
  showZipFilter = true,
  showStatusFilter = false,
  showCauseFilter = false,
  variant = "default",
  quickFilterTags = ["Education", "Environment", "Health", "Emergency Relief"],
  popularCauses = [],
  autoSearchDebounceMs = 0,
}: SearchSectionProps) {
  const isDirectory = variant === "directory"
  const useAutoDebouncedSearch = typeof autoSearchDebounceMs === "number" && autoSearchDebounceMs > 0

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestParamsRef = useRef<Record<string, string>>({})
  const filtersRef = useRef(filters)
  const onSearchRef = useRef(onSearch)

  // State for search inputs
  const [searchQuery, setSearchQuery] = useState(filters.search || "")
  const [selectedCategory, setSelectedCategory] = useState(filters.category || "All Categories")
  const [selectedCategoryDescription, setSelectedCategoryDescription] = useState(filters.category_description || "All Descriptions") // Add this
  const [selectedState, setSelectedState] = useState(filters.state || "All States")
  const [selectedCity, setSelectedCity] = useState(filters.city || "All Cities")
  const [zipCode, setZipCode] = useState(filters.zip || "")
  const [selectedStatus, setSelectedStatus] = useState(filters.status || "All Status")
  const [selectedCauseId, setSelectedCauseId] = useState(
    filters.cause_id && filters.cause_id !== "0" ? String(filters.cause_id) : "All Causes"
  )
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

  const baseSearchParams = (): Record<string, string> => {
    const params: Record<string, string> = {
      search: searchQuery,
      category: selectedCategory,
      category_description: selectedCategoryDescription,
      state: selectedState,
      city: selectedCity,
      zip: zipCode,
      status: selectedStatus,
    }
    if (selectedCauseId && selectedCauseId !== "All Causes") {
      params.cause_id = selectedCauseId
    }
    return params
  }

  latestParamsRef.current = baseSearchParams()
  filtersRef.current = filters
  onSearchRef.current = onSearch

  // Handle search
  const handleSearch = () => {
    onSearch(baseSearchParams())
  }

  const flushDebouncedSearchNow = () => {
    if (!useAutoDebouncedSearch) return
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    const next = latestParamsRef.current
    if (localSearchParamsMatchFiltersProps(next, filtersRef.current)) return
    onSearchRef.current(next)
  }

  const handlePopularCauseClick = (causeId: number) => {
    setSelectedCauseId(String(causeId))
    if (!useAutoDebouncedSearch) {
      onSearch({
        ...baseSearchParams(),
        cause_id: String(causeId),
      })
    }
  }

  // Handle quick filter
  const handleQuickFilter = (category: string) => {
    setSelectedCategory(category)
  }

  useEffect(() => {
    setSelectedCauseId(filters.cause_id && filters.cause_id !== "0" ? String(filters.cause_id) : "All Causes")
  }, [filters.cause_id])

  useEffect(() => {
    if (!useAutoDebouncedSearch) return undefined

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      const next = latestParamsRef.current
      if (localSearchParamsMatchFiltersProps(next, filtersRef.current)) return
      onSearchRef.current(next)
    }, autoSearchDebounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [
    useAutoDebouncedSearch,
    autoSearchDebounceMs,
    searchQuery,
    selectedCategory,
    selectedCategoryDescription,
    selectedState,
    selectedCity,
    zipCode,
    selectedStatus,
    selectedCauseId,
    filters,
  ])

  // Reset form when clear filters is clicked
  useEffect(() => {
    if (!hasActiveFilters) {
      setSearchQuery("")
      setSelectedCategory("All Categories")
      setSelectedCategoryDescription("All Descriptions") // Add this
      setSelectedState("All States")
      setSelectedCity("All Cities")
      setZipCode("")
      setSelectedStatus("All Status")
      setSelectedCauseId("All Causes")
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
      <div className={isDirectory ? "relative group w-full" : "relative group max-w-6xl mx-auto"}>
        <div
          className={`absolute inset-0 rounded-2xl blur opacity-15 dark:opacity-30 group-hover:opacity-35 transition duration-300 ${
            isDirectory ? "bg-gradient-to-r from-blue-600 to-purple-600" : "bg-gradient-to-r from-violet-600 to-purple-600"
          }`}
        />
        <div
          className={`relative rounded-2xl shadow-xl border p-4 sm:p-6 ${
            isDirectory
              ? "border-slate-200/80 bg-white/95 shadow-slate-200/40 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/90 dark:shadow-black/40"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          }`}
        >
          {/* Main Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search
                className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 pointer-events-none ${
                  isDirectory ? "text-slate-400 dark:text-gray-500" : "text-gray-400 dark:text-gray-500"
                }`}
              />
              <Input
                type="text"
                placeholder="Search by name, keywords, city, state, or ZIP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return
                  e.preventDefault()
                  if (useAutoDebouncedSearch) flushDebouncedSearchNow()
                  else handleSearch()
                }}
                className={`pl-12 pr-4 h-14 text-lg rounded-xl ${
                  isDirectory
                    ? "border-slate-200 bg-white text-slate-900 placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-violet-400 dark:focus:ring-violet-500/25"
                    : "border-gray-300 dark:border-gray-600 focus:border-violet-500 dark:focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:focus:ring-violet-400/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                }`}
              />
            </div>
          </div>

          {/* Filters (+ optional Search button) */}
          <div
            className={`grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 mb-6 ${
              useAutoDebouncedSearch ? "lg:grid-cols-5" : "lg:grid-cols-6"
            }`}
          >
            {showCauseFilter && (filterOptions.causes?.length ?? 0) > 0 ? (
              <Combobox
                options={[
                  { value: "All Causes", label: "All Causes" },
                  ...(filterOptions.causes ?? []).map((c) => ({
                    value: String(c.id),
                    label: c.name,
                  })),
                ]}
                value={selectedCauseId}
                onChange={(value) => setSelectedCauseId(value?.trim() ? value : "All Causes")}
                placeholder="Cause"
                searchPlaceholder="Search causes..."
                className={
                  isDirectory
                    ? "h-12 border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:hover:bg-slate-900/60"
                    : undefined
                }
              />
            ) : null}

            {showCategoryFilter && (
              <Combobox
                options={[
                  { value: "All Categories", label: "All Categories" },
                  ...filterOptions.categories
                    .filter((category) => category !== "All Categories")
                    .map((category) => ({
                      value: category,
                      label: category,
                    })),
                ]}
                value={selectedCategory}
                onChange={(value) => setSelectedCategory(value || "All Categories")}
                placeholder="All Categories"
                searchPlaceholder="Search categories..."
                className={
                  isDirectory
                    ? "h-12 border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:hover:bg-slate-900/60"
                    : undefined
                }
              />
            )}

            {/* Category Description Filter */}
            {showCategoryDescriptionFilter && (
              <Combobox
                options={[
                  { value: "All Descriptions", label: "All Descriptions" },
                  ...(filterOptions.categoryDescriptions || [])
                    .filter((description) => description !== "All Descriptions")
                    .map((description) => ({
                      value: description,
                      label: description,
                    })),
                ]}
                value={selectedCategoryDescription}
                onChange={(value) => setSelectedCategoryDescription(value || "All Descriptions")}
                placeholder="All Descriptions"
                searchPlaceholder="Search descriptions..."
                className={
                  isDirectory
                    ? "h-12 border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:hover:bg-slate-900/60"
                    : undefined
                }
              />
            )}

            <Combobox
              options={[
                { value: "All States", label: "All States" },
                ...filterOptions.states
                  .filter((state) => state !== "All States")
                  .map((state) => ({
                    value: state,
                    label: state,
                  })),
              ]}
              value={selectedState}
              onChange={(value) => handleStateChange(value || "All States")}
              placeholder="All States"
              searchPlaceholder="Search states..."
              className={
                isDirectory
                  ? "h-12 border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:hover:bg-slate-900/60"
                  : undefined
              }
            />

            <Select value={selectedCity} onValueChange={setSelectedCity} disabled={isLoadingCities || selectedState === "All States"}>
              <SelectTrigger
                className={`h-12 rounded-xl ${
                  isDirectory
                    ? "border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
                    : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                }`}
              >
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

            {showZipFilter && (
              <Input
                type="text"
                placeholder="ZIP Code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return
                  e.preventDefault()
                  if (useAutoDebouncedSearch) flushDebouncedSearchNow()
                  else handleSearch()
                }}
                className={`h-12 rounded-xl ${
                  isDirectory
                    ? "border-slate-200 bg-white text-slate-900 placeholder:text-slate-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-400"
                    : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                }`}
              />
            )}

            {showStatusFilter && (
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger
                  className={`h-12 rounded-xl ${
                    isDirectory
                      ? "border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
                      : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  }`}
                >
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectItem value="All Status" className="text-gray-900 dark:text-white">
                    All Status
                  </SelectItem>
                  <SelectItem value="joined" className="text-gray-900 dark:text-white">
                    Joined BIU
                  </SelectItem>
                  <SelectItem value="not_joined" className="text-gray-900 dark:text-white">
                    Not Yet Joined
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {!useAutoDebouncedSearch ? (
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                size="lg"
                className="h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold rounded-xl text-white shadow-lg shadow-violet-500/25 dark:shadow-violet-600/20"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                ) : (
                  <Search className="mr-2 h-5 w-5" />
                )}
                Search
              </Button>
            ) : null}
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

          {/* Active filter badges + Popular causes + Clear (same row / strip) */}
          {(hasActiveFilters || popularCauses.length > 0) && (
            <div
              className={`flex flex-col gap-3 pt-4 border-t sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                isDirectory
                  ? "border-slate-200 dark:border-white/10"
                  : "border-gray-200 dark:border-gray-600"
              }`}
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {hasActiveFilters ? (
                  <>
                    {filters.search ? (
                      <Badge
                        variant="secondary"
                        className={`px-3 py-1 ${isDirectory ? "border-slate-200 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" : ""}`}
                      >
                        Search: {filters.search}
                      </Badge>
                    ) : null}
                    {filters.category && filters.category !== "All Categories" ? (
                      <Badge variant="secondary" className={`px-3 py-1 ${isDirectory ? "border-slate-200 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" : ""}`}>
                        Category: {filters.category}
                      </Badge>
                    ) : null}
                    {filters.category_description && filters.category_description !== "All Descriptions" ? (
                      <Badge variant="secondary" className={`px-3 py-1 ${isDirectory ? "border-slate-200 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" : ""}`}>
                        Description: {filters.category_description}
                      </Badge>
                    ) : null}
                    {filters.state && filters.state !== "All States" ? (
                      <Badge variant="secondary" className={`px-3 py-1 ${isDirectory ? "border-slate-200 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" : ""}`}>
                        State: {filters.state}
                      </Badge>
                    ) : null}
                    {filters.city && filters.city !== "All Cities" ? (
                      <Badge variant="secondary" className={`px-3 py-1 ${isDirectory ? "border-slate-200 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" : ""}`}>
                        City: {filters.city}
                      </Badge>
                    ) : null}
                    {filters.zip ? (
                      <Badge variant="secondary" className={`px-3 py-1 ${isDirectory ? "border-slate-200 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" : ""}`}>
                        Zip: {filters.zip}
                      </Badge>
                    ) : null}
                    {filters.status && filters.status !== "All Status" ? (
                      <Badge
                        variant="secondary"
                        className={`px-3 py-1 ${isDirectory ? "border-slate-200 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" : ""}`}
                      >
                        Status: {filters.status === "joined" ? "Joined BIU" : "Not Yet Joined"}
                      </Badge>
                    ) : null}
                    {filters.cause_id ? (
                      <Badge variant="secondary" className={`px-3 py-1 ${isDirectory ? "border-slate-200 bg-slate-100 text-slate-800 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" : ""}`}>
                        Cause:{" "}
                        {popularCauses.find((c) => c.id === Number(filters.cause_id))?.name ??
                          filterOptions.causes?.find((c) => String(c.id) === String(filters.cause_id))?.name ??
                          `Cause #${filters.cause_id}`}
                      </Badge>
                    ) : null}
                  </>
                ) : null}

                {popularCauses.length > 0 ? (
                  <div
                    className={`flex min-w-0 flex-wrap items-center gap-2 ${
                      hasActiveFilters ? "border-slate-200 pt-2 sm:ml-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0 dark:border-white/15" : ""
                    }`}
                  >
                    <span
                      className={`shrink-0 text-sm font-medium ${
                        isDirectory ? "text-slate-600 dark:text-slate-400" : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      Popular causes:
                    </span>
                    {popularCauses.map((c) => (
                      <CauseBadge
                        key={c.id}
                        c={c}
                        onClick={() => handlePopularCauseClick(c.id)}
                        selected={filters.cause_id === String(c.id)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearFilters}
                  className={
                    isDirectory
                      ? "shrink-0 border-slate-200 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800"
                      : "text-gray-600 hover:text-gray-800 bg-transparent border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }
                >
                  <X className="mr-1 h-4 w-4" />
                  Clear Filters
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

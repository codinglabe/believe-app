"use client"

import React, { useState, useCallback, useMemo } from "react"
import { Link, router } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { usePage } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Card, CardContent } from "@/components/frontend/ui/card"
import {
  Search,
  MapPin,
  ChevronDown,
  Check,
  Heart,
  MessageCircle,
  Share2,
  User,
  Loader2,
  X,
} from "lucide-react"

const SORT_OPTIONS = [
  { value: "best_match", label: "Best Match" },
  { value: "most_active", label: "Most Active" },
  { value: "new_supporters", label: "New Supporters" },
] as const

interface Supporter {
  id: number
  name: string
  email?: string
  slug?: string
  image?: string | null
  is_following: boolean
  location?: string | null
  interests?: string[]
  shared_organizations_count?: number
  reactions_count?: number
  comments_count?: number
  shares_count?: number
}

interface PaginatedSupporters {
  data: Supporter[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  next_page_url: string | null
  prev_page_url: string | null
}

interface InterestOption {
  id: number
  name: string
}

interface Filters {
  same_causes: boolean
  interests: number[]
  location: string
  radius: string
  sort: string
}

interface PageProps {
  seo?: { title: string; description?: string }
  supporters: PaginatedSupporters
  searchQuery: string
  filters: Filters
  interestOptions: InterestOption[]
  auth?: { user?: { id: number; name?: string } }
}

function buildParams(
  q: string,
  filters: Filters
): Record<string, string | number | boolean | number[] | undefined> {
  const params: Record<string, string | number | boolean | number[] | undefined> = {}
  if (q.trim()) params.q = q.trim()
  if (filters.same_causes) params.same_causes = true
  if (filters.interests.length) params.interests = filters.interests
  if (filters.location?.trim()) params.location = filters.location.trim()
  if (filters.radius?.trim()) params.radius = filters.radius
  if (filters.sort && filters.sort !== "best_match") params.sort = filters.sort
  return params
}

export default function FindSupportersPage() {
  const {
    seo,
    supporters: initialSupporters,
    searchQuery: initialQuery,
    filters: initialFilters,
    interestOptions = [],
    auth,
  } = usePage<PageProps>().props

  const currentUser = auth?.user
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? "")
  const [supporters, setSupporters] = useState(initialSupporters)
  const [filters, setFilters] = useState<Filters>({
    same_causes: initialFilters?.same_causes ?? false,
    interests: Array.isArray(initialFilters?.interests) ? initialFilters.interests : [],
    location: initialFilters?.location ?? "",
    radius: initialFilters?.radius ?? "",
    sort: initialFilters?.sort ?? "best_match",
  })
  const [locationInput, setLocationInput] = useState(initialFilters?.location ?? "")
  const [followingStates, setFollowingStates] = useState<Record<number, boolean>>(() => {
    const map: Record<number, boolean> = {}
    initialSupporters?.data?.forEach((s: Supporter) => {
      map[s.id] = s.is_following ?? false
    })
    return map
  })
  const [loadingFollow, setLoadingFollow] = useState<Record<number, boolean>>({})
  const [interestsExpanded, setInterestsExpanded] = useState(true)
  const [showAllInterests, setShowAllInterests] = useState(false)
  const [locationExpanded, setLocationExpanded] = useState(true)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [expandedInterestCards, setExpandedInterestCards] = useState<Set<number>>(new Set())

  const INTERESTS_VISIBLE_COUNT = 5
  const visibleInterestOptions = showAllInterests
    ? interestOptions
    : interestOptions.slice(0, INTERESTS_VISIBLE_COUNT)
  const hasMoreInterests = interestOptions.length > INTERESTS_VISIBLE_COUNT

  const toggleCardInterests = (supporterId: number) => {
    setExpandedInterestCards((prev) => {
      const next = new Set(prev)
      if (next.has(supporterId)) next.delete(supporterId)
      else next.add(supporterId)
      return next
    })
  }

  const applyLocation = useCallback(
    (locationValue: string) => {
      const trimmed = locationValue.trim()
      const nextFilters = { ...filters, location: trimmed }
      setFilters(nextFilters)
      setLocationInput(trimmed)
      router.get(route("find-supporters.index"), buildParams(searchQuery, nextFilters), {
        preserveState: false,
      })
    },
    [filters, searchQuery]
  )

  // Auto-apply location when user stops typing (debounced)
  const locationInputRef = React.useRef(locationInput)
  locationInputRef.current = locationInput
  React.useEffect(() => {
    const current = locationInputRef.current.trim()
    if (current === (filters.location || "")) return
    const timer = setTimeout(() => {
      applyLocation(locationInputRef.current)
    }, 600)
    return () => clearTimeout(timer)
  }, [locationInput, filters.location, applyLocation])

  // Auto-search when user stops typing (debounced)
  const searchQueryRef = React.useRef(searchQuery)
  searchQueryRef.current = searchQuery
  const isInitialMountRef = React.useRef(true)
  React.useEffect(() => {
    // Skip on initial mount to avoid searching when query is already set from URL
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return
    }
    const current = searchQueryRef.current.trim()
    if (current === (initialQuery || "")) return
    const timer = setTimeout(() => {
      router.get(route("find-supporters.index"), buildParams(searchQueryRef.current, filters), {
        preserveState: false,
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, filters, initialQuery])

  const clearSameCauses = useCallback(() => {
    const next = { ...filters, same_causes: false }
    setFilters(next)
    router.get(route("find-supporters.index"), buildParams(searchQuery, next), {
      preserveState: false,
    })
  }, [filters, searchQuery])

  const clearLocation = useCallback(() => {
    setLocationInput("")
    const next = { ...filters, location: "" }
    setFilters(next)
    router.get(route("find-supporters.index"), buildParams(searchQuery, next), {
      preserveState: false,
    })
  }, [filters, searchQuery])

  // Sync from server when props change (e.g. after navigation)
  React.useEffect(() => {
    setSupporters(initialSupporters)
    setSearchQuery(initialQuery ?? "")
    setFilters({
      same_causes: initialFilters?.same_causes ?? false,
      interests: Array.isArray(initialFilters?.interests) ? initialFilters.interests : [],
      location: initialFilters?.location ?? "",
      radius: initialFilters?.radius ?? "",
      sort: initialFilters?.sort ?? "best_match",
    })
    setLocationInput(initialFilters?.location ?? "")
    const map: Record<number, boolean> = {}
    initialSupporters?.data?.forEach((s: Supporter) => {
      map[s.id] = s.is_following ?? false
    })
    setFollowingStates(map)
  }, [initialSupporters, initialQuery, initialFilters])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Clear any pending debounce and search immediately
    router.get(route("find-supporters.index"), buildParams(searchQuery, filters), {
      preserveState: false,
    })
  }

  const setSort = useCallback(
    (sort: string) => {
      setSortDropdownOpen(false)
      const next = { ...filters, sort }
      setFilters(next)
      router.get(route("find-supporters.index"), buildParams(searchQuery, next), {
        preserveState: false,
      })
    },
    [filters, searchQuery]
  )

  const toggleSameCauses = useCallback(() => {
    const next = { ...filters, same_causes: !filters.same_causes }
    setFilters(next)
    router.get(route("find-supporters.index"), buildParams(searchQuery, next), {
      preserveState: false,
    })
  }, [filters, searchQuery])

  const toggleInterest = useCallback(
    (topicId: number) => {
      const next = filters.interests.includes(topicId)
        ? filters.interests.filter((id) => id !== topicId)
        : [...filters.interests, topicId]
      const nextFilters = { ...filters, interests: next }
      setFilters(nextFilters)
      router.get(route("find-supporters.index"), buildParams(searchQuery, nextFilters), {
        preserveState: false,
      })
    },
    [filters, searchQuery]
  )

  const applySortChip = useCallback(
    (value: string) => {
      const next = { ...filters, sort: value }
      setFilters(next)
      router.get(route("find-supporters.index"), buildParams(searchQuery, next), {
        preserveState: false,
      })
    },
    [filters, searchQuery]
  )

  const removeInterestChip = useCallback(
    (topicId: number) => {
      const next = filters.interests.filter((id) => id !== topicId)
      const nextFilters = { ...filters, interests: next }
      setFilters(nextFilters)
      router.get(route("find-supporters.index"), buildParams(searchQuery, nextFilters), {
        preserveState: false,
      })
    },
    [filters, searchQuery]
  )

  const handleFollow = (supporter: Supporter) => {
    if (!currentUser || supporter.id === currentUser.id) return
    setLoadingFollow((prev) => ({ ...prev, [supporter.id]: true }))
    const newState = !followingStates[supporter.id]
    setFollowingStates((prev) => ({ ...prev, [supporter.id]: newState }))
    setSupporters((prev) => ({
      ...prev,
      data: prev.data.map((s) => (s.id === supporter.id ? { ...s, is_following: newState } : s)),
    }))
    router.post(route("users.toggle-follow", supporter.id), {}, {
      preserveScroll: true,
      preserveState: false,
      onFinish: () => setLoadingFollow((prev) => ({ ...prev, [supporter.id]: false })),
    })
  }

  const sortLabel = useMemo(
    () => SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? "Best Match",
    [filters.sort]
  )

  const selectedInterestNames = useMemo(
    () =>
      filters.interests
        .map((id) => interestOptions.find((t) => t.id === id)?.name)
        .filter(Boolean) as string[],
    [filters.interests, interestOptions]
  )

  const primaryBlue = "#3B82F6"
  const lightBlueBg = "bg-blue-50 dark:bg-blue-950/30"

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Find Supporters"} description={seo?.description} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
              Find Supporters
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
              Discover and connect with people who share your interests and values.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Sidebar - Filter Supporters */}
            <aside className="lg:col-span-3">
              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-2xl overflow-hidden sticky top-6">
                <CardContent className="p-6">
                  <h2 className="font-semibold text-gray-900 dark:text-white mb-6 text-lg">Filter Supporters</h2>

                  <button
                    type="button"
                    onClick={toggleSameCauses}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium mb-6 transition-all duration-200 ${
                      filters.same_causes
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {filters.same_causes && <Check className="w-4 h-4" />}
                    Same Causes as Me
                  </button>

                  <div className="mb-6">
                    <button
                      type="button"
                      onClick={() => setInterestsExpanded(!interestsExpanded)}
                      className="w-full flex items-center justify-between font-semibold text-gray-900 dark:text-white text-sm mb-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      Interests
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${interestsExpanded ? "" : "-rotate-90"}`}
                      />
                    </button>
                    {interestsExpanded && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {visibleInterestOptions.map((topic) => {
                          const isSelected = filters.interests.includes(topic.id)
                          return (
                            <button
                              key={topic.id}
                              type="button"
                              onClick={() => toggleInterest(topic.id)}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                                isSelected
                                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-sm hover:shadow-md"
                                  : "bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                              {topic.name}
                            </button>
                          )
                        })}
                        {hasMoreInterests && (
                          <button
                            type="button"
                            onClick={() => setShowAllInterests(!showAllInterests)}
                            className="w-full mt-3 flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/70 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${showAllInterests ? "rotate-180" : ""}`}
                            />
                            {showAllInterests ? "Show less" : `Show more (${interestOptions.length - INTERESTS_VISIBLE_COUNT} more)`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <button
                      type="button"
                      onClick={() => setLocationExpanded(!locationExpanded)}
                      className="w-full flex items-center justify-between font-semibold text-gray-900 dark:text-white text-sm mb-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      Location
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${locationExpanded ? "" : "-rotate-90"}`}
                      />
                    </button>
                    {locationExpanded && (
                      <div className="space-y-3 mt-3">
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            value={locationInput}
                            onChange={(e) => setLocationInput(e.target.value)}
                            placeholder="City, state or zip"
                            className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </aside>

            {/* Main Content - Search bar and active filters only (selected items show here) */}
            <div className="lg:col-span-9 space-y-6">
              <form onSubmit={handleSearch} className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  type="text"
                  placeholder="Search supporters by name, email, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-5 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-base shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 transition-all"
                />
              </form>

              {/* Only selected/active filters appear as chips below search bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-2.5">
                  {filters.same_causes && (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-sm">
                      Same causes as me
                      <button
                        type="button"
                        onClick={clearSameCauses}
                        className="ml-0.5 rounded-full hover:bg-white/20 p-0.5 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                  {filters.location && (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                      <MapPin className="w-3.5 h-3.5" />
                      {filters.location}
                      <button
                        type="button"
                        onClick={clearLocation}
                        className="ml-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 p-0.5 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                  {selectedInterestNames.map((name) => {
                    const id = interestOptions.find((t) => t.name === name)?.id
                    return (
                      <span
                        key={id ?? name}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-sm"
                      >
                        <Heart className="w-3.5 h-3.5" />
                        {name}
                        <button
                          type="button"
                          onClick={() => id != null && removeInterestChip(id)}
                          className="ml-0.5 rounded-full hover:bg-white/20 p-0.5 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )
                  })}
                  {SORT_OPTIONS.filter((o) => o.value !== "best_match").map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => applySortChip(opt.value)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                        filters.sort === opt.value
                          ? "text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-sm"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="text-sm text-gray-600 dark:text-gray-400 mr-2 font-medium">Sort:</span>
                  <button
                    type="button"
                    onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                    className="font-semibold text-gray-900 dark:text-white inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {sortLabel}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${sortDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {sortDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setSortDropdownOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 z-20 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl min-w-[180px]">
                        {SORT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setSort(opt.value)}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                              filters.sort === opt.value ? "font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30" : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {selectedInterestNames.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedInterestNames.join(", ")}
                  {supporters.total > 0 && ` • ${supporters.total} supporter${supporters.total !== 1 ? "s" : ""}`}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supporters?.data?.map((supporter) => (
                  <Card
                    key={supporter.id}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-xl rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Link
                          href={
                            supporter.slug
                              ? `/users/${supporter.slug}`
                              : `/users/${supporter.id}`
                          }
                          className="flex-shrink-0"
                        >
                          <Avatar className="w-14 h-14">
                            <AvatarImage src={supporter.image ?? undefined} />
                            <AvatarFallback className="bg-blue-500 text-white text-lg">
                              {supporter.name?.charAt(0)?.toUpperCase() ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div>
                            <Link
                              href={
                                supporter.slug
                                  ? `/users/${supporter.slug}`
                                  : `/users/${supporter.id}`
                              }
                              className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base block truncate"
                            >
                              {supporter.name}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {supporter.location || "Location not set"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Heart className="w-4 h-4 text-blue-500" />
                            <span>
                              {(supporter.shared_organizations_count ?? 0) > 0
                                ? `${supporter.shared_organizations_count} shared organization${supporter.shared_organizations_count !== 1 ? "s" : ""}`
                                : "No shared organizations yet"}
                            </span>
                          </div>
                          {supporter.interests && supporter.interests.length > 0 && (() => {
                            const showAll = expandedInterestCards.has(supporter.id)
                            const visible = showAll ? supporter.interests : supporter.interests.slice(0, INTERESTS_VISIBLE_COUNT)
                            const remaining = supporter.interests.length - INTERESTS_VISIBLE_COUNT
                            const hasMore = remaining > 0
                            return (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {visible.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {hasMore && (
                                  <button
                                    type="button"
                                    onClick={() => toggleCardInterests(supporter.id)}
                                    className="inline-flex items-center gap-0.5 rounded-md border border-dashed border-gray-400 dark:border-gray-500 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
                                  >
                                    {showAll ? "Show less" : `+${remaining} more`}
                                  </button>
                                )}
                              </div>
                            )
                          })()}
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-5 text-sm">
                              <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                                <span className="font-medium">{supporter.reactions_count ?? 0}</span>
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                <MessageCircle className="w-4 h-4 text-blue-500" />
                                <span className="font-medium">{supporter.comments_count ?? 0}</span>
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                <Share2 className="w-4 h-4 text-green-500" />
                                <span className="font-medium">{supporter.shares_count ?? 0}</span>
                              </span>
                            </div>
                            {currentUser && supporter.id !== currentUser.id && (
                              <Button
                                size="sm"
                                className={`rounded-xl font-semibold flex-shrink-0 px-5 transition-all ${
                                  followingStates[supporter.id]
                                    ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg"
                                }`}
                                onClick={() => handleFollow(supporter)}
                                disabled={loadingFollow[supporter.id]}
                              >
                                {loadingFollow[supporter.id] ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : followingStates[supporter.id] ? (
                                  "Following"
                                ) : (
                                  "Follow"
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {supporters?.next_page_url && (
                <div className="flex justify-center pt-6">
                  <Button
                    variant="outline"
                    onClick={() => router.get(supporters.next_page_url!)}
                    className="rounded-xl px-8 py-2.5 border-2 border-gray-300 dark:border-gray-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-all"
                  >
                    Load more supporters
                  </Button>
                </div>
              )}

              {!supporters?.data?.length && (
                <Card className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No supporters found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or search terms to find more supporters.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}

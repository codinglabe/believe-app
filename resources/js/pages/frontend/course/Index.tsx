"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  X,
  Loader2,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { router, usePage, Link } from "@inertiajs/react"
import { useNotification } from "@/components/frontend/notification-provider"
import { PageHead } from "@/components/frontend/PageHead"
import { connectionHubTypeLabel, isEventsHubType } from "@/lib/connection-hub-type"
import type { ConnectionHubType } from "@/lib/connection-hub-type"
import { CauseBadge, type CauseBadgeCause } from "@/components/frontend/cause-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/frontend/ui/table"
import { cn } from "@/lib/utils"
import LearningConnectionHubLanding, {
  type LearningFeaturedCourse,
  type LearningHubStats,
  type LearningSpotlightCourse,
  type LearningTopicCount,
} from "@/components/frontend/course/LearningConnectionHubLanding"
import EventsConnectionHubLanding, {
  type EventsHubCourse,
  type EventsHubStats,
  type EventsEventTypeCount,
} from "@/components/frontend/course/EventsConnectionHubLanding"

interface PrimaryActionCategoryRef {
  id: number
  name: string
  slug?: string | null
}

interface Topic {
  id: number
  name: string
}

interface EventType {
  id: number
  name: string
  category: string
}

interface Organization {
  id: number
  name: string
  email: string
  slug?: string
}

interface Creator {
  id: number
  name: string
  email: string
}

interface Course {
  id: number
  topic_id: number | null
  event_type_id: number | null
  organization_id: number
  user_id: number
  name: string
  slug: string
  description: string
  type: ConnectionHubType
  pricing_type: "free" | "paid"
  course_fee: number | null
  start_date: string
  start_time: string
  end_date: string | null
  session_duration_minutes: number
  format: "online" | "in_person" | "hybrid"
  max_participants: number
  language: string
  target_audience: string
  community_impact: string | null
  learning_outcomes: string[] | null
  prerequisites: string[] | null
  materials_needed: string[] | null
  accessibility_features: string[] | null
  certificate_provided: boolean
  volunteer_opportunities: boolean
  image: string | null
  enrolled: number
  rating: number
  total_reviews: number
  last_updated: string | null
  created_at: string
  updated_at: string
  topic: Topic | null
  event_type: EventType | null
  /** Causes chosen at create (primary_action_categories); snake_case from Laravel */
  primary_action_categories?: PrimaryActionCategoryRef[]
  organization: Organization
  organization_name: string | null
  creator: Creator
  image_url: string | null
  formatted_price: string
  formatted_duration: string
  formatted_program_length?: string | null
  formatted_format: string
}

interface CourseListUser {
  name: string
  email: string
}

interface FrontendCoursesListPageProps {
  seo?: { title?: string; description?: string }
  /** Catalog topics (same as backend `Topic::orderBy('name')`); used as fallback for learning hub categories */
  topics?: Topic[]
  organizations: Organization[]
  courses: {
    data: Course[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
  /** Every active primary-action category for the Cause(s) filter dropdown */
  causesForFilter?: PrimaryActionCategoryRef[]
  user?: CourseListUser | null
  message?: string
  filters: {
    search?: string
    topic_id?: string
    format?: string
    pricing_type?: string
    type?: string
    event_type_id?: string
    organization?: string
    /** Filter listings that include this primary-action category (cause) */
    cause_id?: string
  }
  learningTopicCounts?: LearningTopicCount[]
  /** Learning hub category strip uses event types + `event_type_id` instead of topics */
  learningExploreUsesEventTypes?: boolean
  learningSpotlightCourses?: LearningSpotlightCourse[]
  learningFeaturedCourses?: LearningFeaturedCourse[]
  learningStats?: LearningHubStats | null
  eventsEventTypeCounts?: EventsEventTypeCount[]
  eventsFeaturedCourses?: EventsHubCourse[]
  eventsLiveCourses?: EventsHubCourse[]
  eventsStats?: EventsHubStats | null
}

function stripHtmlToText(html: string, maxLen = 140): string {
  if (typeof window === "undefined") {
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
  }
  const doc = new DOMParser().parseFromString(html, "text/html")
  const text = doc.body.textContent?.replace(/\s+/g, " ").trim() ?? ""
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
}

/** Causes actually saved on this listing (course_pac), not the filter catalog. */
function coursePrimaryCauses(course: Course): CauseBadgeCause[] {
  const raw =
    course.primary_action_categories ??
    (course as unknown as { primaryActionCategories?: PrimaryActionCategoryRef[] }).primaryActionCategories
  if (!raw?.length) return []
  return raw.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug ?? undefined,
  }))
}

/** Event type or legacy topic — the required “Topic” field on the listing form (not PAC causes). */
function courseTopicLabel(course: Course): string | null {
  if (isEventsHubType(course.type) && course.event_type) {
    const et = course.event_type
    return et.category ? `${et.category} · ${et.name}` : et.name
  }
  if (course.topic?.name) {
    return course.topic.name
  }
  return null
}

function listingStatus(course: Course): { label: string; variant: "live" | "muted" } {
  const now = new Date()
  const end = course.end_date ? new Date(course.end_date) : null
  if (end && end < now) {
    return { label: "Ended", variant: "muted" }
  }
  const start = new Date(course.start_date)
  if (start > now) {
    return { label: "Upcoming", variant: "live" }
  }
  return { label: "Active", variant: "live" }
}

const PER_PAGE_OPTIONS = [6, 9, 12, 18] as const

export default function FrontendCoursesListPage({
  seo,
  courses: initialCourses,
  topics = [],
  causesForFilter = [],
  filters,
  learningTopicCounts = [],
  learningExploreUsesEventTypes = false,
  learningSpotlightCourses = [],
  learningFeaturedCourses = [],
  learningStats = null,
  eventsEventTypeCounts = [],
  eventsFeaturedCourses = [],
  eventsLiveCourses = [],
  eventsStats = null,
}: FrontendCoursesListPageProps) {
  const flash = usePage().props
  const { showNotification } = useNotification()
  const [searchQuery, setSearchQuery] = useState(filters.search || "")
  const [selectedType, setSelectedType] = useState(filters.type || "all")
  const [selectedCauseId, setSelectedCauseId] = useState<number | null>(
    filters.cause_id ? Number.parseInt(filters.cause_id, 10) : null,
  )
  const [selectedPricing, setSelectedPricing] = useState(filters.pricing_type || "all")
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  /** Avoid Inertia remount + preserveState merge right after load (causes stale UI / scroll glitches). */
  const skipInitialDebouncedFetch = useRef(true)

  /** Keep type filter in sync with URL/server so `?type=learning` always drives hub + requests. */
  useEffect(() => {
    setSelectedType(filters.type || "all")
  }, [filters.type])

  /** Full navigation from another route often keeps scroll position; reset once per mount. */
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [])

  const performSearch = useCallback(
    (query: string, type: string, causeId: number | null, pricing: string) => {
      setIsSearching(true)

      const params: Record<string, string> = { page: "1" }
      if (query) params.search = query
      if (type !== "all") params.type = type
      if (causeId) params.cause_id = causeId.toString()
      if (pricing !== "all") params.pricing_type = pricing

      const urlParams = new URLSearchParams(window.location.search)
      const perPage = urlParams.get("per_page")
      if (perPage && PER_PAGE_OPTIONS.includes(Number(perPage) as (typeof PER_PAGE_OPTIONS)[number])) {
        params.per_page = perPage
      }

      router.get("/courses", params, {
        preserveScroll: true,
        preserveState: false,
        replace: true,
        onFinish: () => setIsSearching(false),
      })
    },
    [],
  )

  useEffect(() => {
    if (skipInitialDebouncedFetch.current) {
      skipInitialDebouncedFetch.current = false
      return
    }
    const timer = setTimeout(() => {
      performSearch(searchQuery, selectedType, selectedCauseId, selectedPricing)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedType, selectedCauseId, selectedPricing, performSearch])

  useEffect(() => {
    if (flash?.success) {
      showNotification({
        type: "success",
        message: typeof flash.success === "string" ? flash.success : "Success",
      })
    }
    if (flash?.warning) {
      showNotification({
        type: "warning",
        message: typeof flash.warning === "string" ? flash.warning : "Warning",
      })
    }
  }, [flash, showNotification])

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set("page", page.toString())
    router.get(`${window.location.pathname}?${params.toString()}`, {}, {
      preserveScroll: false,
      preserveState: false,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePerPageChange = (perPage: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set("per_page", String(perPage))
    params.set("page", "1")
    router.get(`${window.location.pathname}?${params.toString()}`, {}, {
      preserveScroll: false,
      preserveState: false,
    })
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedType("all")
    setSelectedCauseId(null)
    setSelectedPricing("all")
    router.get("/courses", {}, { preserveScroll: false, replace: true, preserveState: false })
  }

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedType !== "all" ||
    selectedCauseId != null ||
    selectedPricing !== "all"

  const shellClass =
    "relative isolate min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100"

  const panelClass =
    "rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none"

  const inputClass =
    "h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-12 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500"

  const selectClass =
    "h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"

  const tableHeaderClass =
    "border-slate-200 bg-slate-100/90 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400"

  const tableRowClass =
    "border-slate-100 hover:bg-slate-50/80 dark:border-slate-800/90 dark:hover:bg-slate-900/60"

  const showLearningLanding = filters.type === "learning"
  const showEventsLanding = filters.type === "events"
  /** Hub landings are standalone; do not stack the searchable table + pagination below. */
  const showConnectionHubTable = !showLearningLanding && !showEventsLanding

  /** Server sends only categories with learning listings; do not inject zero-count chips from `topics`. */
  const learningHubTopicRows = useMemo((): LearningTopicCount[] => {
    if (!showLearningLanding) return learningTopicCounts
    return learningTopicCounts
  }, [showLearningLanding, learningTopicCounts])

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Connection Hub"} description={seo?.description} />
      <div className={shellClass}>
        {showLearningLanding && (
          <LearningConnectionHubLanding
            learningTopicCounts={learningHubTopicRows}
            learningExploreUsesEventTypes={learningExploreUsesEventTypes}
            learningSpotlightCourses={learningSpotlightCourses}
            learningFeaturedCourses={learningFeaturedCourses}
            learningStats={learningStats}
          />
        )}
        {showEventsLanding && (
          <EventsConnectionHubLanding
            eventsEventTypeCounts={eventsEventTypeCounts}
            eventsFeaturedCourses={eventsFeaturedCourses}
            eventsLiveCourses={eventsLiveCourses}
            eventsStats={eventsStats}
          />
        )}
        {showConnectionHubTable && (
        <div className="container mx-auto px-4 py-8 lg:py-10">
          <motion.section
            id="browse-courses"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={cn("mb-8 p-5 sm:p-6", panelClass)}
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Search &amp; Filter</h2>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                >
                  Clear all
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search courses, events, topics, organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={inputClass}
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 text-slate-500 hover:bg-transparent dark:text-slate-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {isSearching && (
                  <div className="absolute right-11 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-5 w-5 animate-spin text-violet-600 dark:text-violet-400" />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  aria-expanded={showFilters}
                  aria-controls="courses-filter-panel"
                  id="courses-filters-toggle"
                  onClick={() => setShowFilters((open) => !open)}
                  className="flex h-11 items-center gap-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/80"
                >
                  <Filter className="h-4 w-4 shrink-0" aria-hidden />
                  <span>Filters</span>
                  {hasActiveFilters && (
                    <Badge className="border-0 bg-violet-600 px-2 py-0.5 text-[11px] text-white hover:bg-violet-600">
                      Active
                    </Badge>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      showFilters ? "rotate-180" : "",
                    )}
                    aria-hidden
                  />
                </Button>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    id="courses-filter-panel"
                    role="region"
                    aria-labelledby="courses-filters-toggle"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3 dark:border-slate-800"
                  >
                    <div>
                      <Label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Type
                      </Label>
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className={selectClass}
                      >
                        <option value="all">All Types</option>
                        <option value="companion">Companion</option>
                        <option value="learning">Learning</option>
                        <option value="events">Events</option>
                      </select>
                    </div>

                    <div>
                      <Label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Cause(s)
                      </Label>
                      <select
                        value={selectedCauseId ?? ""}
                        onChange={(e) =>
                          setSelectedCauseId(e.target.value ? Number.parseInt(e.target.value, 10) : null)
                        }
                        className={selectClass}
                      >
                        <option value="">All Causes</option>
                        {causesForFilter.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Pricing
                      </Label>
                      <select
                        value={selectedPricing}
                        onChange={(e) => setSelectedPricing(e.target.value)}
                        className={selectClass}
                      >
                        <option value="all">All Pricing</option>
                        <option value="free">Free</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Connection Hub{" "}
                {initialCourses.total > 0 && (
                  <span className="text-violet-600 dark:text-violet-400">({initialCourses.total})</span>
                )}
              </h2>
              {hasActiveFilters && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Filtered results ·{" "}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="font-medium text-violet-600 hover:underline dark:text-violet-400"
                  >
                    Show all
                  </button>
                </p>
              )}
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {initialCourses.total === 0
                ? "Showing 0 of 0"
                : `Showing ${initialCourses.from ?? 0}-${initialCourses.to ?? 0} of ${initialCourses.total}`}
            </p>
          </div>

          {initialCourses.data.length > 0 ? (
            <div className={cn("overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800", panelClass)}>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                    <TableHead className={cn("min-w-[140px] pl-5", tableHeaderClass)}>Type</TableHead>
                    <TableHead className={cn("min-w-[180px]", tableHeaderClass)}>Cause(s)</TableHead>
                    <TableHead className={cn("min-w-[280px]", tableHeaderClass)}>
                      Course / Event / Organization
                    </TableHead>
                    <TableHead className={cn("min-w-[100px]", tableHeaderClass)}>Pricing</TableHead>
                    <TableHead className={cn("min-w-[110px]", tableHeaderClass)}>Status</TableHead>
                    <TableHead className={cn("min-w-[130px] pr-5 text-right", tableHeaderClass)}>
                      View Details
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialCourses.data.map((course) => {
                    const causes = coursePrimaryCauses(course)
                    const topicLabel = courseTopicLabel(course)
                    const status = listingStatus(course)
                    const orgLabel = course.organization_name ?? course.organization.name

                    return (
                      <TableRow key={course.id} className={tableRowClass}>
                        <TableCell className="pl-5 align-middle">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                              <Users className="h-4 w-4" aria-hidden />
                            </span>
                            <Badge
                              className={cn(
                                "max-w-[10rem] truncate border-0 font-medium",
                                course.pricing_type === "free"
                                  ? "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                                  : "bg-violet-500/15 text-violet-800 dark:bg-violet-500/25 dark:text-violet-100",
                              )}
                            >
                              {course.pricing_type === "free"
                                ? "Free"
                                : connectionHubTypeLabel(course.type)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex max-w-[min(22rem,42vw)] flex-wrap gap-1.5">
                            {causes.map((c) => (
                              <CauseBadge key={`${course.id}-cause-${c.id}`} c={c} />
                            ))}
                            {causes.length === 0 && (
                              <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex gap-3">
                            <img
                              src={course.image_url || "/placeholder.svg?height=80&width=112&query=course"}
                              alt=""
                              className="h-16 w-28 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-700"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold leading-snug text-slate-900 dark:text-white">{course.name}</p>
                              <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                {stripHtmlToText(course.description)}
                              </p>
                              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-500">{orgLabel}</p>
                              {topicLabel ? (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="font-medium text-slate-600 dark:text-slate-300">Topic:</span>{" "}
                                  {topicLabel}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          <span className="text-base font-bold text-violet-600 dark:text-violet-400">
                            {course.pricing_type === "free" ? "Free" : course.formatted_price}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2 w-2 shrink-0 rounded-full",
                                status.variant === "live"
                                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                                  : "bg-slate-400",
                              )}
                              aria-hidden
                            />
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{status.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="pr-5 text-right align-middle">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="border-violet-300 bg-transparent font-medium text-violet-700 shadow-none hover:bg-violet-50 dark:border-violet-500/50 dark:text-violet-100 dark:hover:bg-violet-500/10"
                          >
                            <Link href={route("course.show", course.slug)}>View Details</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900/40">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No courses found</h3>
              <p className="mt-2 max-w-md mx-auto text-sm text-slate-600 dark:text-slate-400">
                Try adjusting your search or filters to find courses and events.
              </p>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-500/50 dark:text-violet-200 dark:hover:bg-violet-500/10"
                  onClick={clearFilters}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          )}

          {initialCourses.total > 0 && (
            <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="whitespace-nowrap">Results per page</span>
                <select
                  value={initialCourses.per_page}
                  onChange={(e) => handlePerPageChange(Number.parseInt(e.target.value, 10))}
                  className={cn(selectClass, "h-10 w-[4.5rem] py-0")}
                >
                  {PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(initialCourses.current_page - 1)}
                  disabled={initialCourses.current_page <= 1}
                  className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/80"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>

                <div className="flex flex-wrap justify-center gap-1">
                  {(() => {
                    const maxVisible = 7
                    const pages: number[] = []
                    const last = initialCourses.last_page
                    if (last <= maxVisible) {
                      for (let i = 1; i <= last; i++) pages.push(i)
                    } else {
                      const cur = initialCourses.current_page
                      const half = Math.floor(maxVisible / 2)
                      let start = Math.max(1, cur - half)
                      let end = Math.min(last, start + maxVisible - 1)
                      if (end - start < maxVisible - 1) {
                        start = Math.max(1, end - maxVisible + 1)
                      }
                      for (let i = start; i <= end; i++) pages.push(i)
                    }
                    return pages.map((page) => (
                      <Button
                        key={page}
                        type="button"
                        variant={initialCourses.current_page === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={cn(
                          "min-w-[2.25rem]",
                          initialCourses.current_page === page
                            ? "border-violet-600 bg-violet-600 text-white hover:bg-violet-600 dark:border-violet-500 dark:bg-violet-600"
                            : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/80",
                        )}
                      >
                        {page}
                      </Button>
                    ))
                  })()}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(initialCourses.current_page + 1)}
                  disabled={initialCourses.current_page >= initialCourses.last_page}
                  className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/80"
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </FrontendLayout>
  )
}

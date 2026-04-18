"use client"
import { useEffect, useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Button } from "@/components/admin/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
import { Input } from "@/components/admin/ui/input"
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Users,
  DollarSign,
  TrendingUp,
  Heart,
  Star,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Globe,
  MapPin,
  Calendar,
  Award,
  Copy,
  ExternalLink,
  BookOpen,
  GraduationCap,
  Filter,
  Sparkles,
} from "lucide-react"
import { showSuccessToast } from "@/lib/toast"
import type { Auth } from "@/types"
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal"
import { connectionHubTypeLabel, CONNECTION_HUB_TYPES, type ConnectionHubType } from "@/lib/connection-hub-type"

const filterSelectClass =
  "flex h-10 w-full min-w-0 max-w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"

interface EventTypeOption {
  id: number
  name: string
  category: string
}

interface Organization {
  id: number
  name: string
  email: string
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
  learning_outcomes: string[]
  prerequisites: string[]
  materials_needed: string[]
  accessibility_features: string[]
  certificate_provided: boolean
  volunteer_opportunities: boolean
  image: string | null
  enrolled: number
  rating: number
  total_reviews: number
  last_updated: string | null
  created_at: string
  updated_at: string
  /** Connection Hub type: companion | learning | events | earning */
  type?: ConnectionHubType | string | null
  topic: { id: number; name: string } | null
  event_type: { id: number; name: string; category?: string } | null
  organization: Organization
  creator: Creator
  image_url: string | null
  formatted_price: string
  formatted_duration: string
  formatted_program_length?: string | null
  formatted_format: string
}

interface LaravelPagination<T> {
  data: T[]
  current_page: number
  first_page_url: string
  from: number | null
  last_page: number
  last_page_url: string
  links: Array<{
    url: string | null
    label: string
    active: boolean
  }>
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}

interface Statistics {
  total_courses: number
  free_courses: number
  paid_courses: number
  active_courses: number
  total_enrolled: number
  total_revenue: number
  average_rating: number
}

interface Props {
  auth: Auth
  courses: LaravelPagination<Course>
  eventTypes: EventTypeOption[]
  filters: {
    courses_search: string
    courses_status: string
    courses_type: string
    courses_format: string
    courses_event_type: string
    courses_hub_type?: string
  }
  statistics: Statistics
}

export default function CoursesIndex({ courses, eventTypes, filters, statistics }: Props) {
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Filter states
  const [coursesSearch, setCoursesSearch] = useState(filters.courses_search || "")
  const [coursesStatus, setCoursesStatus] = useState(filters.courses_status || "")
  const [coursesType, setCoursesType] = useState(filters.courses_type || "")
  const [coursesFormat, setCoursesFormat] = useState(filters.courses_format || "")
  const [coursesEventType, setCoursesEventType] = useState(filters.courses_event_type || "")
  const [coursesHubType, setCoursesHubType] = useState(filters.courses_hub_type || "")

  // Modal states
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    id: string | null
    title: string
    message: string
  }>({
    isOpen: false,
    id: null,
    title: "",
    message: "",
  })
  const [isDeleting, setIsDeleting] = useState(false)

  // Auto-filter with debounce
  useEffect(() => {
    if (!coursesSearch && !coursesStatus && !coursesType && !coursesFormat && !coursesEventType && !coursesHubType) {
      return
    }

    const timeoutId = setTimeout(() => {
      const params: Record<string, string> = {}
      if (coursesSearch.trim()) params.courses_search = coursesSearch
      if (coursesStatus) params.courses_status = coursesStatus
      if (coursesType) params.courses_type = coursesType
      if (coursesFormat) params.courses_format = coursesFormat
      if (coursesEventType) params.courses_event_type = coursesEventType
      if (coursesHubType) params.courses_hub_type = coursesHubType

      router.get(route("profile.course.index"), params, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      })
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [coursesSearch, coursesStatus, coursesType, coursesFormat, coursesEventType, coursesHubType])

  const clearAllFilters = () => {
    setCoursesSearch("")
    setCoursesStatus("")
    setCoursesType("")
    setCoursesFormat("")
    setCoursesEventType("")
    setCoursesHubType("")
    router.get(
      route("profile.course.index"),
      {},
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      },
    )
  }

  const handleDeleteConfirm = () => {
    if (!deleteModal.id) return

    setIsDeleting(true)
    router.delete(route("profile.course.destroy", deleteModal.id), {
      preserveScroll: true,
      onSuccess: () => {
        setDeleteModal({ isOpen: false, id: null, title: "", message: "" })
        showSuccessToast("Listing deleted successfully.")
      },
      onFinish: () => {
        setIsDeleting(false)
      },
    })
  }

  const openDeleteModal = (slug: string, courseName: string) => {
    setDeleteModal({
      isOpen: true,
      id: slug,
      title: "Delete listing",
      message: `Are you sure you want to delete "${courseName}"? This action cannot be undone and will affect all enrolled participants.`,
    })
  }

  const copyCourseLink = async (slug: string, courseName: string) => {
    try {
      const url = `${window.location.origin}/courses/${slug}`
      await navigator.clipboard.writeText(url)
      setCopiedLink(slug)
      showSuccessToast(`Connection Hub link for "${courseName}" copied to clipboard!`)
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  const getStatusIcon = (enrolled: number, maxParticipants: number, startDate: string) => {
    const now = new Date()
    const courseStart = new Date(startDate)
    const enrollmentPercentage = (enrolled / maxParticipants) * 100

    if (courseStart < now) {
      return <CheckCircle className="h-3 w-3" />
    } else if (enrollmentPercentage >= 100) {
      return <Ban className="h-3 w-3" />
    } else if (enrollmentPercentage >= 80) {
      return <Clock className="h-3 w-3" />
    } else {
      return <Users className="h-3 w-3" />
    }
  }

  const getStatusVariant = (enrolled: number, maxParticipants: number, startDate: string) => {
    const now = new Date()
    const courseStart = new Date(startDate)
    const enrollmentPercentage = (enrolled / maxParticipants) * 100

    if (courseStart < now) {
      return "default" // Started
    } else if (enrollmentPercentage >= 100) {
      return "destructive" // Full
    } else if (enrollmentPercentage >= 80) {
      return "secondary" // Almost Full
    } else {
      return "outline" // Available
    }
  }

  const getStatusText = (enrolled: number, maxParticipants: number, startDate: string) => {
    const now = new Date()
    const courseStart = new Date(startDate)
    const enrollmentPercentage = (enrolled / maxParticipants) * 100

    if (courseStart < now) {
      return "Started"
    } else if (enrollmentPercentage >= 100) {
      return "Full"
    } else if (enrollmentPercentage >= 80) {
      return "Almost Full"
    } else {
      return "Available"
    }
  }

  const getFormatBadge = (format: string) => {
    switch (format) {
      case "online":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 max-w-max">
            <Globe className="h-3 w-3 mr-1" />
            Online
          </Badge>
        )
      case "in_person":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 max-w-max">
            <MapPin className="h-3 w-3 mr-1" />
            In-Person
          </Badge>
        )
      case "hybrid":
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 max-w-max">
            <Users className="h-3 w-3 mr-1" />
            Hybrid
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="max-w-max">
            {format}
          </Badge>
        )
    }
  }

  const getPricingBadge = (pricingType: string, courseFee: number | null) => {
    if (pricingType === "free") {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 max-w-max">
          <Heart className="h-3 w-3 mr-1" />
          Free
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 max-w-max">
          <DollarSign className="h-3 w-3 mr-1" />
          ${courseFee}
        </Badge>
      )
    }
  }

  // Helper function to get numeric page links only
  const getNumericLinks = (links: LaravelPagination<any>["links"]) => {
    return links.filter((link) => {
      const label = link.label.replace(/&laquo;|&raquo;/g, "").trim()
      return !isNaN(Number(label)) && label !== "Previous" && label !== "Next"
    })
  }

  const hasActiveFilters =
    coursesSearch || coursesStatus || coursesType || coursesFormat || coursesEventType || coursesHubType

  const statCardClass =
    "rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm transition hover:border-purple-200/60 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-purple-900/50"

  const enrollPercent = (enrolled: number, max: number) => {
    if (!max || max <= 0) return 0
    return Math.min(100, Math.round((enrolled / max) * 100))
  }

  return (
    <ProfileLayout
      title="Connection Hub"
      description="Manage your Connection Hub listings, enrollments, and impact"
    >
      <Head title="Connection Hub" />
      <div className="mx-auto max-w-7xl animate-in fade-in duration-500 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-purple-50/40 p-6 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950/30 sm:p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-purple-500/15 blur-3xl dark:bg-purple-500/10"
            aria-hidden
          />
          <div className="pointer-events-none absolute -bottom-8 left-1/4 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl" aria-hidden />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-2xl gap-4">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25 sm:flex">
                <Sparkles className="h-7 w-7" aria-hidden />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                  Connection Hub
                </h1>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  Create and manage your listings, track enrollments, and share public links — all in one place.
                </p>
              </div>
            </div>
            <Link href={route("profile.course.create")} preserveScroll preserveState>
              <Button
                size="lg"
                className="w-full min-w-[200px] bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20 transition hover:from-purple-700 hover:to-blue-700 hover:shadow-xl sm:w-auto"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create listing
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats — primary row then secondary */}
        <section className="mb-8 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Overview</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <div className={statCardClass}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total listings</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                    {statistics?.total_courses}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-100 p-2.5 dark:bg-blue-900/40">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className={statCardClass}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Active</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-300">
                    {statistics?.active_courses}
                  </p>
                </div>
                <div className="rounded-xl bg-purple-100 p-2.5 dark:bg-purple-900/40">
                  <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
            <div className={statCardClass}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Enrolled</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-orange-600 dark:text-orange-300">
                    {statistics?.total_enrolled}
                  </p>
                </div>
                <div className="rounded-xl bg-orange-100 p-2.5 dark:bg-orange-900/40">
                  <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
            <div className={statCardClass}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Revenue</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-300">
                    ${Number(statistics?.total_revenue).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-100 p-2.5 dark:bg-emerald-900/40">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:gap-4">
            <div className={statCardClass}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Free</p>
              <p className="mt-0.5 text-lg font-semibold text-green-600 dark:text-green-400">{statistics?.free_courses}</p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Paid</p>
              <p className="mt-0.5 text-lg font-semibold text-blue-600 dark:text-blue-400">{statistics?.paid_courses}</p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Avg rating</p>
              <p className="mt-0.5 flex items-center gap-1 text-lg font-semibold text-amber-600 dark:text-amber-400">
                <Star className="h-4 w-4 fill-current" />
                {Number(statistics.average_rating).toFixed(1)}
              </p>
            </div>
          </div>
        </section>

        {/* Search + filters + listings */}
        <Card className="overflow-hidden border-gray-200/90 shadow-lg dark:border-gray-800">
          <CardHeader className="space-y-6 border-b border-gray-100 bg-gray-50/50 pb-6 dark:border-gray-800 dark:bg-gray-900/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900 dark:text-white">
                  <Heart className="h-5 w-5 text-rose-500" />
                  Your listings
                  <Badge variant="secondary" className="ml-1 font-normal">
                    {courses.total}
                  </Badge>
                </CardTitle>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Cards show schedule, enrollment, and quick actions — no horizontal scrolling.
                </p>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="shrink-0 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear filters
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="course-list-search" className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Search
                </label>
                <Input
                  id="course-list-search"
                  placeholder="Name, description, audience, instructor…"
                  value={coursesSearch}
                  onChange={(e) => setCoursesSearch(e.target.value)}
                  className="h-11 w-full border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                />
              </div>

              <div className="rounded-xl border border-gray-200/90 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/50">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  <Filter className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  Filters
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="filter-hub-type" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Hub type
                    </label>
                    <select
                      id="filter-hub-type"
                      value={coursesHubType}
                      onChange={(e) => setCoursesHubType(e.target.value)}
                      className={filterSelectClass}
                    >
                      <option value="">All</option>
                      {CONNECTION_HUB_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {connectionHubTypeLabel(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="filter-topic" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Topic
                    </label>
                    <select
                      id="filter-topic"
                      value={coursesEventType}
                      onChange={(e) => setCoursesEventType(e.target.value)}
                      className={filterSelectClass}
                    >
                      <option value="">All topics</option>
                      {eventTypes.map((et) => (
                        <option key={et.id} value={et.id.toString()}>
                          {et.category ? `${et.category} — ${et.name}` : et.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="filter-pricing" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Pricing
                    </label>
                    <select
                      id="filter-pricing"
                      value={coursesType}
                      onChange={(e) => setCoursesType(e.target.value)}
                      className={filterSelectClass}
                    >
                      <option value="">All</option>
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="filter-format" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Format
                    </label>
                    <select
                      id="filter-format"
                      value={coursesFormat}
                      onChange={(e) => setCoursesFormat(e.target.value)}
                      className={filterSelectClass}
                    >
                      <option value="">All</option>
                      <option value="online">Online</option>
                      <option value="in_person">In-Person</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="filter-status" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </label>
                    <select
                      id="filter-status"
                      value={coursesStatus}
                      onChange={(e) => setCoursesStatus(e.target.value)}
                      className={filterSelectClass}
                    >
                      <option value="">All</option>
                      <option value="available">Available</option>
                      <option value="almost_full">Almost Full</option>
                      <option value="full">Full</option>
                      <option value="started">Started</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {courses.data.length > 0 ? (
              <ul className="space-y-4">
                {courses.data.map((course) => {
                  const pct = enrollPercent(course.enrolled, course.max_participants)
                  return (
                    <li
                      key={course.id}
                      className="group rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm transition hover:border-purple-200/80 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-purple-900/60 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
                        <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 sm:h-36 sm:w-44">
                          <img
                            src={
                              course.image_url ||
                              "/placeholder.svg?height=200&width=320&query=community%20course"
                            }
                            alt=""
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-semibold leading-snug text-gray-900 dark:text-white">
                                  {course.name}
                                </h2>
                                <Badge variant="secondary" className="max-w-max shrink-0 font-normal">
                                  {connectionHubTypeLabel(course.type || "companion")}
                                </Badge>
                                <Badge
                                  variant={getStatusVariant(
                                    course.enrolled,
                                    course.max_participants,
                                    course.start_date,
                                  )}
                                  className="max-w-max gap-1"
                                >
                                  {getStatusIcon(course.enrolled, course.max_participants, course.start_date)}
                                  {getStatusText(course.enrolled, course.max_participants, course.start_date)}
                                </Badge>
                              </div>
                              {course.target_audience ? (
                                <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                                  {course.target_audience}
                                </p>
                              ) : null}
                              <p className="text-xs text-blue-600 dark:text-blue-400">by {course.organization.name}</p>
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9"
                                onClick={() => copyCourseLink(course.slug, course.name)}
                              >
                                {copiedLink === course.slug ? (
                                  <CheckCircle className="mr-1.5 h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="mr-1.5 h-4 w-4" />
                                )}
                                Copy link
                              </Button>
                              <Link href={`/courses/${course.slug}`} target="_blank">
                                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                                  <ExternalLink className="h-4 w-4" />
                                  View
                                </Button>
                              </Link>
                              <Link href={route("profile.course.show", course.slug)}>
                                <Button variant="secondary" size="sm" className="h-9 gap-1.5">
                                  <Eye className="h-4 w-4" />
                                  Manage
                                </Button>
                              </Link>
                              <Link href={route("profile.course.edit", course.slug)}>
                                <Button variant="default" size="sm" className="h-9 gap-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white">
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                                onClick={() => openDeleteModal(course.slug, course.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                            {course.event_type ? (
                              <Badge variant="outline" className="font-normal">
                                {course.event_type.name}
                              </Badge>
                            ) : course.topic ? (
                              <Badge variant="outline" className="font-normal">
                                {course.topic.name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-400">No topic</span>
                            )}
                            {getFormatBadge(course.format)}
                            {getPricingBadge(course.pricing_type, course.course_fee)}
                            <Badge variant="outline" className="font-normal text-gray-600">
                              {course.language}
                            </Badge>
                          </div>

                          <div className="grid gap-4 border-t border-gray-100 pt-3 dark:border-gray-800 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Enrollment
                              </p>
                              <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                                {course.enrolled} / {course.max_participants}
                              </p>
                              <div className="mt-2 h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="mt-1 text-xs text-gray-500">{pct}% full</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Schedule
                              </p>
                              <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-900 dark:text-white">
                                <Calendar className="h-4 w-4 shrink-0 text-purple-500" />
                                {new Date(course.start_date).toLocaleDateString()}
                              </div>
                              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                                {course.start_time} · {course.formatted_duration}
                                {course.formatted_program_length ? ` · ${course.formatted_program_length}` : ""}
                              </p>
                              {course.end_date ? (
                                <p className="text-xs text-gray-500">
                                  Until {new Date(course.end_date).toLocaleDateString()}
                                </p>
                              ) : null}
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Rating
                              </p>
                              <div className="mt-1 flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
                                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                {course.rating}{" "}
                                <span className="font-normal text-gray-500 dark:text-gray-400">
                                  ({course.total_reviews} reviews)
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Public URL
                              </p>
                              <p className="mt-1 truncate font-mono text-xs text-purple-600 dark:text-purple-400">
                                /courses/{course.slug}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {course.certificate_provided && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    <Award className="mr-1 h-3 w-3" />
                                    Cert
                                  </Badge>
                                )}
                                {course.volunteer_opportunities && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    <Heart className="mr-1 h-3 w-3" />
                                    Volunteer
                                  </Badge>
                                )}
                                {course.accessibility_features.length > 0 && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Access
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 py-16 text-center dark:border-gray-700 dark:bg-gray-900/30">
                <BookOpen className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium text-gray-900 dark:text-white">No listings match</p>
                <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                  Try adjusting search or filters, or create your first Connection Hub listing.
                </p>
                <Link href={route("profile.course.create")} className="mt-6">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create listing
                  </Button>
                </Link>
              </div>
            )}

            {courses.last_page > 1 && (
              <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-6 dark:border-gray-800 sm:flex-row">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing <span className="font-medium text-gray-900 dark:text-white">{courses.from || 0}</span>–
                  <span className="font-medium text-gray-900 dark:text-white">{courses.to || 0}</span> of{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{courses.total}</span>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {courses.prev_page_url && (
                    <Link href={courses.prev_page_url}>
                      <Button variant="outline" size="sm" className="h-9 rounded-full px-3">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  {getNumericLinks(courses.links).map((link, index) => (
                    <div key={index}>
                      {link.url ? (
                        <Link href={link.url}>
                          <Button
                            variant={link.active ? "default" : "outline"}
                            size="sm"
                            className={`h-9 min-w-[2.25rem] rounded-full px-3 ${
                              link.active ? "bg-purple-600 hover:bg-purple-700" : ""
                            }`}
                          >
                            {link.label}
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="outline" size="sm" disabled className="h-9 rounded-full">
                          {link.label}
                        </Button>
                      )}
                    </div>
                  ))}
                  {courses.next_page_url && (
                    <Link href={courses.next_page_url}>
                      <Button variant="outline" size="sm" className="h-9 rounded-full px-3">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, title: "", message: "" })}
        onConfirm={handleDeleteConfirm}
        title={deleteModal.title}
        message={deleteModal.message}
        isLoading={isDeleting}
      />
    </ProfileLayout>
  )
}

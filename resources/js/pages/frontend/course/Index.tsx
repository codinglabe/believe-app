"use client"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, Search, X, Loader2, BookOpen, Users, Clock, Calendar, Globe, MapPin, Star, Award, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter } from "@/components/frontend/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { router, usePage, Link } from "@inertiajs/react"
import { useNotification } from "@/components/frontend/notification-provider"
import { PageHead } from "@/components/frontend/PageHead"
import parse from 'html-react-parser';
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
  type: "course" | "event"
  pricing_type: "free" | "paid"
  course_fee: number | null
  start_date: string
  start_time: string
  end_date: string | null
  duration: "1_session" | "1_week" | "2_weeks" | "1_month" | "6_weeks" | "3_months"
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
  topic: Topic | null
  event_type: EventType | null
  organization: Organization
  organization_name: string | null
  creator: Creator
  image_url: string | null
  formatted_price: string
  formatted_duration: string
  formatted_format: string
}

interface CourseListUser {
  name: string
  email: string
}

interface FrontendCoursesListPageProps {
  organizations: Organization[]
  courses: {
    data: Course[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number
    to: number
  }
  topics: Topic[]
  eventTypes: EventType[]
  user?: CourseListUser | null
  message?: string
  filters: {
    search?: string
    topic_id?: string
    format?: string
    pricing_type?: string
    type?: string
    event_type_id?: string
  }
}

export default function FrontendCoursesListPage({
  seo,
  courses: initialCourses,
  topics,
  eventTypes,
  organizations,
  user,
  filters,
}: FrontendCoursesListPageProps) {
  const flash = usePage().props
  const { showNotification } = useNotification()
  const [searchQuery, setSearchQuery] = useState(filters.search || "")
  const [selectedType, setSelectedType] = useState(filters.type || "all")
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(
    filters.topic_id ? Number.parseInt(filters.topic_id) : null,
  )
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | null>(
    filters.event_type_id ? Number.parseInt(filters.event_type_id) : null,
  )
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(
    filters.organization ? filters.organization : null,
  )
  const [selectedFormat, setSelectedFormat] = useState(filters.format || "all")
  const [selectedPricing, setSelectedPricing] = useState(filters.pricing_type || "all")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Perform search with debouncing
  const performSearch = useCallback(async (query: string, type: string, topicId: number | null, eventTypeId: number | null, format: string, pricing: string, organization: string) => {
    setIsSearching(true)

    const params: any = {}
    if (query) params.search = query
    if (type !== "all") params.type = type
    if (topicId) params.topic_id = topicId.toString()
    if (eventTypeId) params.event_type_id = eventTypeId.toString()
    if (organization) {
      params.organization = organization
      setSelectedOrganization(params.organization)
    }
    if (format !== "all") params.format = format
    if (pricing !== "all") params.pricing_type = pricing

    router.get("/courses", params, {
      preserveScroll: true,
      preserveState: true,
      replace: true,
      onFinish: () => setIsSearching(false),
    })
  }, [])

  // Clear topic/event type when type changes
  useEffect(() => {
    setSelectedTopicId(null)
    setSelectedEventTypeId(null)
  }, [selectedType])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery, selectedType, selectedTopicId, selectedEventTypeId, selectedFormat, selectedPricing, selectedOrganization)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedType, selectedTopicId, selectedEventTypeId, selectedFormat, selectedPricing, selectedOrganization, performSearch])

  // Close search/filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false)
        setShowFilters(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Show flash notifications
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

    router.get(
      `${window.location.pathname}?${params.toString()}`,
      {},
      {
        preserveState: true,
      },
    )

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedType("all")
    setSelectedTopicId(null)
    setSelectedEventTypeId(null)
    setSelectedFormat("all")
    setSelectedPricing("all")
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "online":
        return <Globe className="w-4 h-4" />
      case "in_person":
        return <MapPin className="w-4 h-4" />
      case "hybrid":
        return <Users className="w-4 h-4" />
      default:
        return <Globe className="w-4 h-4" />
    }
  }

  const getFormatColor = (format: string) => {
    switch (format) {
      case "online":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "in_person":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "hybrid":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getDurationColor = (duration: string) => {
    switch (duration) {
      case "1_session":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "1_week":
      case "2_weeks":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "1_month":
      case "6_weeks":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "3_months":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const hasActiveFilters = searchQuery || selectedType !== "all" || selectedTopicId || selectedEventTypeId || selectedFormat !== "all" || selectedPricing !== "all"

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Courses & Events"} description={seo?.description} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 py-12 sm:py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <div className="inline-flex items-center justify-center mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                Courses & Events
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
                Discover courses and events that make a difference. Learn new skills while contributing to your community's growth
                and development.
              </p>
            </motion.div>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Search and Filter Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-8"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Search & Filter</h2>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm font-medium"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
              <div className="space-y-4" ref={searchContainerRef}>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search courses, events, topics, organizations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    className="w-full pl-12 pr-12 h-12 sm:h-14 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 shadow-sm"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:bg-transparent"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {isSearching && (
                    <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                    </div>
                  )}
                </div>

                {/* Filter Toggle */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 h-12 border-gray-300 dark:border-gray-600"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 bg-purple-600 text-white">
                        Active
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* Expandable Filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600"
                    >
                      {/* Type Filter */}
                      <div>
                        <Label className="text-sm font-semibold text-gray-900 dark:text-white mb-2 block">Type</Label>
                        <select
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value)}
                          className="w-full px-3 py-2.5 h-12 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                        >
                          <option value="all">All Types</option>
                          <option value="course">Course</option>
                          <option value="event">Event</option>
                        </select>
                      </div>

                      {/* Topic/Event Type Filter - Dynamic */}
                      {selectedType === "event" ? (
                        <div>
                          <Label className="text-sm font-semibold text-gray-900 dark:text-white mb-2 block">Event Type</Label>
                          <select
                            value={selectedEventTypeId || ""}
                            onChange={(e) => setSelectedEventTypeId(e.target.value ? Number.parseInt(e.target.value) : null)}
                            className="w-full px-3 py-2.5 h-12 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                          >
                            <option value="">All Event Types</option>
                            {eventTypes.map((eventType) => (
                              <option key={eventType.id} value={eventType.id}>
                                {eventType.category ? `${eventType.category} - ${eventType.name}` : eventType.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <Label className="text-sm font-semibold text-gray-900 dark:text-white mb-2 block">Course Topic</Label>
                          <select
                            value={selectedTopicId || ""}
                            onChange={(e) => setSelectedTopicId(e.target.value ? Number.parseInt(e.target.value) : null)}
                            className="w-full px-3 py-2.5 h-12 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                          >
                            <option value="">All Topics</option>
                            {topics.map((topic) => (
                              <option key={topic.id} value={topic.id}>
                                {topic.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-semibold text-gray-900 dark:text-white mb-2 block">Organization</Label>
                        <select
                          value={selectedOrganization || ""}
                          onChange={(e) => setSelectedOrganization(e.target.value ? e.target.value : null)}
                          className="w-full px-3 py-2.5 h-12 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                        >
                          <option value="">All Organizations</option>
                          {organizations.map((organization) => (
                            <option key={organization.slug} value={organization.slug}>
                              {organization.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Format Filter */}
                      <div>
                        <Label className="text-sm font-semibold text-gray-900 dark:text-white mb-2 block">
                          Format
                        </Label>
                        <select
                          value={selectedFormat}
                          onChange={(e) => setSelectedFormat(e.target.value)}
                          className="w-full px-3 py-2.5 h-12 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                        >
                          <option value="all">All Formats</option>
                          <option value="online">Online</option>
                          <option value="in_person">In-Person</option>
                          <option value="hybrid">Hybrid</option>
                        </select>
                      </div>

                      {/* Pricing Filter */}
                      <div>
                        <Label className="text-sm font-semibold text-gray-900 dark:text-white mb-2 block">
                          Pricing
                        </Label>
                        <select
                          value={selectedPricing}
                          onChange={(e) => setSelectedPricing(e.target.value)}
                          className="w-full px-3 py-2.5 h-12 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
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
            </div>
          </motion.section>

          {/* Results Info */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Courses & Events {initialCourses.total > 0 && <span className="text-purple-600 dark:text-purple-400">({initialCourses.total})</span>}
              </h2>
              {hasActiveFilters && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Filtered results •{" "}
                  <button onClick={clearFilters} className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline font-medium">
                    Show all
                  </button>
                </p>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Showing {initialCourses.from}-{initialCourses.to} of {initialCourses.total}
            </div>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {initialCourses.data.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Card className="h-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 overflow-hidden hover:border-purple-300 dark:hover:border-purple-600">
                  {/* Course Image */}
                  <div className="relative overflow-hidden">
                    <img
                      src={course.image_url || "/placeholder.svg?height=200&width=300&query=community course"}
                      alt={course.name}
                      className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className={course.pricing_type === "free" ? "bg-green-500 text-white shadow-md" : "bg-purple-600 text-white shadow-md"}>
                        {course.formatted_price}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge className={`${getFormatColor(course.format)} shadow-md backdrop-blur-sm`}>
                        <span className="flex items-center gap-1">
                          {getFormatIcon(course.format)}
                          {course.format.replace("_", " ")}
                        </span>
                      </Badge>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <Badge className={course.type === "course" ? "bg-blue-600 text-white shadow-md" : "bg-purple-600 text-white shadow-md"}>
                        {course.type === "course" ? "Course" : "Event"}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {course.name}
                      </h3>
                      <CardDescription className="line-clamp-3 text-sm text-gray-600 dark:text-gray-300 min-h-[3.75rem]">{parse(course.description)}</CardDescription>
                    </div>

                    <div className="flex justify-between items-start mb-2">
                      {course.type === "course" && course.topic && (
                        <Badge variant="outline" className="text-xs">
                          {course.topic.name}
                        </Badge>
                      )}
                      {course.type === "event" && course.event_type && (
                        <Badge variant="outline" className="text-xs">
                          {course.event_type.name}
                        </Badge>
                      )}
                    </div>

                    {/* Target Audience */}
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 pb-3 border-b border-gray-100 dark:border-gray-700">
                      <Users className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span className="truncate">{course.target_audience}</span>
                    </div>

                    {/* Organization */}
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                      <Avatar className="w-8 h-8 border-2 border-purple-200 dark:border-purple-800">
                        <AvatarImage src={`/placeholder.svg?height=32&width=32&query=${course.organization.name}`} />
                        <AvatarFallback className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                          {course.organization.name}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {course?.organization_name ? course?.organization_name:course?.organization.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{course?.creator?.role}</p>
                      </div>
                    </div>

                    {/* Course Stats */}
                    <div className="grid grid-cols-2 gap-3 text-sm pb-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Users className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span>
                          {course.enrolled}/{course.max_participants}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span>{new Date(course.start_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span>{course.start_time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span>{course.language}</span>
                      </div>
                    </div>

                    {/* Enrollment Progress */}
                    <div className="space-y-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Enrollment</span>
                        <span className="text-gray-900 dark:text-white font-bold text-purple-600 dark:text-purple-400">
                          {course.max_participants > 0 
                            ? Math.round((course.enrolled / course.max_participants) * 100)
                            : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={course.max_participants > 0 
                          ? (course.enrolled / course.max_participants) * 100 
                          : 0} 
                        className="h-2" 
                      />
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-1">
                      {course.certificate_provided && (
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          <Award className="w-3 h-3 mr-1" />
                          Certificate
                        </Badge>
                      )}
                      {course.volunteer_opportunities && (
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          <Heart className="w-3 h-3 mr-1" />
                          Volunteer Ops
                        </Badge>
                      )}
                      {course.learning_outcomes.length > 0 && (
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          {course.learning_outcomes.length} Outcomes
                        </Badge>
                      )}
                      {course.accessibility_features.length > 0 && (
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          Accessible
                        </Badge>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 pb-5">
                    <div className="flex justify-between items-center w-full gap-3">
                      <div className="flex items-center gap-1">
                        {course.pricing_type === "free" ? (
                          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">Free</span>
                        ) : (
                          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">${course.course_fee}</span>
                        )}
                      </div>
                      <Link href={`/courses/${course.slug}`} className="flex-1">
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* No Results */}
          {initialCourses.data.length === 0 && (
            <div className="text-center py-16 sm:py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                <BookOpen className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                No courses found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Try adjusting your search or filter criteria to find the perfect course for you.
              </p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-900/20 h-11 px-6">
                  Clear all filters
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {initialCourses.last_page > 1 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(initialCourses.current_page - 1)}
                  disabled={initialCourses.current_page === 1}
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 h-10"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <div className="flex gap-1 flex-wrap justify-center max-w-full">
                  {(() => {
                    const maxVisible = 10;
                    const pages: number[] = [];
                    
                    if (initialCourses.last_page <= maxVisible) {
                      // Show all pages if total is less than max
                      for (let i = 1; i <= initialCourses.last_page; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Show pages around current page
                      const current = initialCourses.current_page;
                      const half = Math.floor(maxVisible / 2);
                      
                      let start = Math.max(1, current - half);
                      let end = Math.min(initialCourses.last_page, start + maxVisible - 1);
                      
                      // Adjust if we're near the end
                      if (end - start < maxVisible - 1) {
                        start = Math.max(1, end - maxVisible + 1);
                      }
                      
                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }
                    }
                    
                    return pages.map((page) => (
                      <Button
                        key={page}
                        variant={initialCourses.current_page === page ? "default" : "outline"}
                        onClick={() => handlePageChange(page)}
                        className={`h-10 min-w-[2.5rem] ${
                          initialCourses.current_page === page
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md"
                            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        {page}
                      </Button>
                    ));
                  })()}
                </div>

                <Button
                  variant="outline"
                  onClick={() => handlePageChange(initialCourses.current_page + 1)}
                  disabled={initialCourses.current_page === initialCourses.last_page}
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 h-10"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}

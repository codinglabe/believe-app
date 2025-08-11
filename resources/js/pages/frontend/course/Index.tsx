"use client"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, Search, X, Loader2, BookOpen, Users, Clock, Calendar, Globe, MapPin, Star, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter } from "@/components/frontend/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { router, usePage, Link } from "@inertiajs/react"
import { useNotification } from "@/components/frontend/notification-provider"
import parse from 'html-react-parser';
interface Topic {
  id: number
  name: string
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
  user?: CourseListUser | null
  message?: string
  filters: {
    search?: string
    topic_id?: string
    format?: string
    pricing_type?: string
  }
}

export default function FrontendCoursesListPage({
  courses: initialCourses,
  topics,
  organizations,
  user,
  filters,
}: FrontendCoursesListPageProps) {
  const flash = usePage().props
  const { showNotification } = useNotification()
  const [searchQuery, setSearchQuery] = useState(filters.search || "")
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(
    filters.topic_id ? Number.parseInt(filters.topic_id) : null,
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
  const performSearch = useCallback(async (query: string, topicId: number | null, format: string, pricing: string, organization: string) => {
    setIsSearching(true)

    const params: any = {}
    if (query) params.search = query
    if (topicId) params.topic_id = topicId.toString()
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

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery, selectedTopicId, selectedFormat, selectedPricing, selectedOrganization)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedTopicId, selectedFormat, selectedPricing, selectedOrganization, performSearch])

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
    setSelectedTopicId(null)
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

  const hasActiveFilters = searchQuery || selectedTopicId || selectedFormat !== "all" || selectedPricing !== "all"

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-600 to-green-600 py-12 sm:py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-white flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                <Heart className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 text-red-300" />
                <span>Community Courses</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 opacity-90 text-white px-4 sm:px-0">
                Discover courses that make a difference. Learn new skills while contributing to your community's growth
                and development.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-3xl mx-auto px-4 sm:px-0">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold mb-2 text-white">{initialCourses.total}+</div>
                  <div className="opacity-90 text-blue-100 text-sm sm:text-base">Active Courses</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold mb-2 text-white">5,000+</div>
                  <div className="opacity-90 text-blue-100 text-sm sm:text-base">Students Enrolled</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold mb-2 text-white">200+</div>
                  <div className="opacity-90 text-blue-100 text-sm sm:text-base">Organizations</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
          {/* Search and Filter Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-6 sm:mb-8"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <div className="space-y-4" ref={searchContainerRef}>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
                  <Input
                    type="text"
                    placeholder="Search courses, topics, organizations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-3 text-base sm:text-lg rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:bg-transparent w-8 h-8 sm:w-10 sm:h-10"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  )}
                  {isSearching && (
                    <div className="absolute right-10 sm:right-12 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-blue-500" />
                    </div>
                  )}
                </div>

                {/* Filter Toggle */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start"
                  >
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2">
                        Active
                      </Badge>
                    )}
                  </Button>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="text-blue-600 hover:text-blue-700 w-full sm:w-auto text-sm"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>

                {/* Expandable Filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-600"
                    >
                      {/* Topic Filter */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Topic</Label>
                        <select
                          value={selectedTopicId || ""}
                          onChange={(e) => setSelectedTopicId(e.target.value ? Number.parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">All Topics</option>
                          {topics.map((topic) => (
                            <option key={topic.id} value={topic.id}>
                              {topic.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Topic</Label>
                        <select
                          value={selectedOrganization || ""}
                          onChange={(e) => setSelectedOrganization(e.target.value ? e.target.value : null)}
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">All Organization</option>
                          {organizations.map((organization) => (
                            <option key={organization.slug} value={organization.slug}>
                              {organization.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Format Filter */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                          Format
                        </Label>
                        <select
                          value={selectedFormat}
                          onChange={(e) => setSelectedFormat(e.target.value)}
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All Formats</option>
                          <option value="online">💻 Online</option>
                          <option value="in_person">🏢 In-Person</option>
                          <option value="hybrid">🔄 Hybrid</option>
                        </select>
                      </div>

                      {/* Pricing Filter */}
                      <div className="sm:col-span-2 lg:col-span-1">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                          Pricing
                        </Label>
                        <select
                          value={selectedPricing}
                          onChange={(e) => setSelectedPricing(e.target.value)}
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All Pricing</option>
                          <option value="free">🆓 Free</option>
                          <option value="paid">💰 Paid</option>
                        </select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.section>

          {/* Results Info */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-6 sm:mb-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
                Showing {initialCourses.from}-{initialCourses.to} of {initialCourses.total} courses
              </p>
              {hasActiveFilters && (
                <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                  Filtered results •{" "}
                  <button onClick={clearFilters} className="underline">
                    Show all
                  </button>
                </p>
              )}
            </motion.div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Page {initialCourses.current_page} of {initialCourses.last_page}
            </div>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {initialCourses.data.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="group"
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-md overflow-hidden">
                  {/* Course Image */}
                  <div className="relative overflow-hidden">
                    <img
                      src={course.image_url || "/placeholder.svg?height=200&width=300&query=community course"}
                      alt={course.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge variant={course.pricing_type === "free" ? "secondary" : "default"}>
                        {course.formatted_price}
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Badge className={getFormatColor(course.format)}>
                        <span className="flex items-center gap-1">
                          {getFormatIcon(course.format)}
                          {course.format.replace("_", " ")}
                        </span>
                      </Badge>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <Badge className={getDurationColor(course.duration)}>{course.formatted_duration}</Badge>
                    </div>
                  </div>

                  <CardContent className="pb-3 space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-white line-clamp-2 mb-2">
                        {course.name}
                      </h3>
                      <CardDescription className="line-clamp-2 text-sm">{parse(course.description)}</CardDescription>
                    </div>

                    <div className="flex justify-between items-start mb-2">
                      {course.topic && (
                        <Badge variant="outline" className="text-xs">
                          {course.topic.name}
                        </Badge>
                      )}
                      <div className="flex items-center text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium ml-1">{course.rating}</span>
                        <span className="text-xs text-slate-500 ml-1">({course.total_reviews})</span>
                      </div>
                    </div>

                    {/* Target Audience */}
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Users className="w-4 h-4" />
                      <span className="truncate">{course.target_audience}</span>
                    </div>

                    {/* Organization */}
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={`/placeholder.svg?height=32&width=32&query=${course.organization.name}`} />
                        <AvatarFallback className="text-xs">
                          {course.organization.name}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {course?.organization_name ? course?.organization_name:course?.organization.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Organization</p>
                      </div>
                    </div>

                    {/* Course Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Users className="w-4 h-4" />
                        <span>
                          {course.enrolled}/{course.max_participants}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(course.start_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>{course.start_time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Globe className="w-4 h-4" />
                        <span>{course.language}</span>
                      </div>
                    </div>

                    {/* Enrollment Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Enrollment</span>
                        <span className="text-slate-900 dark:text-white font-medium">
                          {Math.round((course.enrolled / course.max_participants) * 100)}%
                        </span>
                      </div>
                      <Progress value={(course.enrolled / course.max_participants) * 100} className="h-2" />
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

                  <CardFooter className="pt-0">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-1">
                        {course.pricing_type === "free" ? (
                          <span className="text-2xl font-bold text-green-600">Free</span>
                        ) : (
                          <>
                            <span className="text-2xl font-bold text-green-600">${course.course_fee}</span>
                          </>
                        )}
                      </div>
                      <Link href={`/courses/${course.slug}`}>
                        <Button className="bg-primary hover:bg-primary/90">View Details</Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* No Results */}
          {initialCourses.data.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 sm:py-16 px-4">
              <BookOpen className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400 mx-auto mb-4 sm:mb-6" />
              <h3 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">
                No courses found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base max-w-md mx-auto">
                Try adjusting your search or filter criteria to find the perfect course for you.
              </p>
              <Button onClick={clearFilters} variant="outline" className="w-full sm:w-auto bg-transparent">
                Clear all filters
              </Button>
            </motion.div>
          )}

          {/* Pagination */}
          {initialCourses.last_page > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col items-center space-y-4 sm:space-y-6"
            >
              {/* Page Info */}
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                  Page {initialCourses.current_page} of {initialCourses.last_page} • {initialCourses.total} total
                  courses
                </p>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-wrap justify-center gap-1 sm:gap-2 px-4">
                {Array.from(
                  { length: Math.min(initialCourses.last_page, window.innerWidth < 640 ? 5 : 10) },
                  (_, i) => {
                    let pageNum
                    const maxPages = window.innerWidth < 640 ? 5 : 10
                    if (initialCourses.last_page <= maxPages) {
                      pageNum = i + 1
                    } else {
                      if (initialCourses.current_page <= Math.floor(maxPages / 2)) {
                        pageNum = i + 1
                      } else if (initialCourses.current_page >= initialCourses.last_page - Math.floor(maxPages / 2)) {
                        pageNum = initialCourses.last_page - maxPages + 1 + i
                      } else {
                        pageNum = initialCourses.current_page - Math.floor(maxPages / 2) + i
                      }
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={initialCourses.current_page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full text-xs sm:text-sm ${initialCourses.current_page === pageNum
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                          : "hover:bg-blue-50 dark:hover:bg-blue-900"
                          }`}
                      >
                        {pageNum}
                      </Button>
                    )
                  },
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-2 sm:gap-4 w-full max-w-xs">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(initialCourses.current_page - 1)}
                  disabled={initialCourses.current_page === 1}
                  className="flex items-center gap-1 sm:gap-2 flex-1 text-xs sm:text-sm"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(initialCourses.current_page + 1)}
                  disabled={initialCourses.current_page === initialCourses.last_page}
                  className="flex items-center gap-1 sm:gap-2 flex-1 text-xs sm:text-sm"
                >
                  Next
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}

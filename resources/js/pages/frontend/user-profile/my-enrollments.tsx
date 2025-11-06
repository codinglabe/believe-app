"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState, useEffect, useRef } from "react"
import {
  BookOpen,
  Eye,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Copy,
  Video,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Input } from "@/components/frontend/ui/input"
import { usePage, router, Link } from "@inertiajs/react"

interface Enrollment {
  id: number
  course: {
    id: number
    name: string
    slug: string
    type?: "course" | "event"
    image: string | null
    image_url: string | null
    description: string
    course_fee: number | null
    pricing_type: string
    start_date: string
    start_time: string | null
    end_date: string | null
    end_time: string | null
    max_participants: number
    enrolled: number
    meeting_link?: string | null
    organization: {
      name: string
      logo?: string
    } | null
    topic: {
      name: string
    } | null
    event_type: {
      name: string
    } | null
  }
  status: string
  amount_paid: number
  payment_method: string | null
  enrolled_at: string
  enrollment_id: string | null
  transaction_id?: string | null
}

interface EnrollmentStats {
  total_spent: number
  total_enrolled: number
  active_enrollments: number
  completed_enrollments: number
}

interface PageProps {
  enrollments: {
    data: Enrollment[]
    total: number
    current_page: number
    last_page: number
    per_page: number
  }
  enrollmentStats: EnrollmentStats
  filters: {
    search: string
    status: string
  }
}

export default function MyEnrollments() {
  const { enrollments, enrollmentStats, filters } = usePage<PageProps>().props
  
  // Ensure we have default values if data is missing
  const safeEnrollments = enrollments || {
    data: [],
    total: 0,
    current_page: 1,
    last_page: 1,
    per_page: 10,
  }
  
  const safeEnrollmentStats = enrollmentStats || {
    total_spent: 0,
    total_enrolled: 0,
    active_enrollments: 0,
    completed_enrollments: 0,
  }
  
  const safeFilters = filters || { search: '', status: '' }
  
  const [search, setSearch] = useState(safeFilters.search)
  const [statusFilter, setStatusFilter] = useState(safeFilters.status)
  const isInitialMount = useRef(true)

  // Auto-filter when search/status changes, but not on initial mount or pagination
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const params: Record<string, string> = {}
    if (search.trim()) params.search = search
    if (statusFilter) params.status = statusFilter

    const urlParams = new URLSearchParams(window.location.search)
    const currentPage = urlParams.get("page")
    if (currentPage) params.page = currentPage

    router.get("/profile/my-enrollments", params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }, [search, statusFilter])

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("")
    const urlParams = new URLSearchParams(window.location.search)
    const currentPage = urlParams.get("page")
    const params: Record<string, string> = {}
    if (currentPage) params.page = currentPage

    router.get("/profile/my-enrollments", params, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  const handlePageChange = (page: number) => {
    const params: Record<string, string> = {}
    if (search.trim()) params.search = search
    if (statusFilter) params.status = statusFilter
    params.page = page.toString()

    router.get("/profile/my-enrollments", params, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-3 w-3" />
      case "completed":
        return <CheckCircle className="h-3 w-3" />
      case "pending":
        return <Clock className="h-3 w-3" />
      case "cancelled":
        return <XCircle className="h-3 w-3" />
      default:
        return <AlertCircle className="h-3 w-3" />
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "completed":
        return "default"
      case "pending":
        return "secondary"
      case "cancelled":
        return "outline"
      default:
        return "outline"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 dark:text-green-400"
      case "completed":
        return "text-blue-600 dark:text-blue-400"
      case "pending":
        return "text-yellow-600 dark:text-yellow-400"
      case "cancelled":
        return "text-gray-600 dark:text-gray-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  const getCourseStatus = (startDate: string, endDate: string | null) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : null

    if (now < start) return "start"
    if (end && now > end) return "end"
    if (!end && now >= start) return "live"
    if (end && now >= start && now <= end) return "live"
    return "closed"
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "live":
        return "Live"
      case "start":
        return "Starting Soon"
      case "end":
        return "Ended"
      case "closed":
        return "Closed"
      default:
        return "Unknown"
    }
  }

  const getCourseStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "text-green-600 dark:text-green-400"
      case "start":
        return "text-blue-600 dark:text-blue-400"
      case "end":
        return "text-gray-600 dark:text-gray-400"
      case "closed":
        return "text-red-600 dark:text-red-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  const hasActiveFilters = search || statusFilter

  return (
    <ProfileLayout
      title="My Course Enrollments"
      description="Track your course enrollments and manage your learning journey"
    >
      <div className="w-full space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Spent</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                    ${safeEnrollmentStats.total_spent.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-green-500 rounded-full shadow-lg">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="mt-4 h-2 w-full bg-green-200 dark:bg-green-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full animate-pulse" style={{ width: "100%" }}></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Enrolled</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {safeEnrollmentStats.total_enrolled}
                  </p>
                </div>
                <div className="p-4 bg-blue-500 rounded-full shadow-lg">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="mt-4 h-2 w-full bg-blue-200 dark:bg-blue-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: "100%" }}></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Active</p>
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                    {safeEnrollmentStats.active_enrollments}
                  </p>
                </div>
                <div className="p-4 bg-purple-500 rounded-full shadow-lg">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="mt-4 h-2 w-full bg-purple-200 dark:bg-purple-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full animate-pulse"
                  style={{
                    width: `${safeEnrollmentStats.total_enrolled ? (safeEnrollmentStats.active_enrollments / safeEnrollmentStats.total_enrolled) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Completed</p>
                  <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                    {safeEnrollmentStats.completed_enrollments}
                  </p>
                </div>
                <div className="p-4 bg-orange-500 rounded-full shadow-lg">
                  <Clock className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="mt-4 h-2 w-full bg-orange-200 dark:bg-orange-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full animate-pulse"
                  style={{
                    width: `${safeEnrollmentStats.total_enrolled ? (safeEnrollmentStats.completed_enrollments / safeEnrollmentStats.total_enrolled) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="border border-gray-200 dark:border-gray-600 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search by course name, organization, or enrollment ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-12 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 text-base"
                />
              </div>
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-w-[140px] focus:ring-2 focus:ring-blue-500 h-12"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="lg"
                  className="bg-red-50 text-red-600 border-red-300 hover:border-red-400 hover:bg-red-100"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enrollments List */}
        {safeEnrollments.data && safeEnrollments.data.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {safeEnrollments.data.map((enrollment, index) => (
              <Card
                key={enrollment.id}
                className="border border-gray-200 dark:border-gray-600 hover:shadow-xl dark:bg-gray-900 transition-all duration-300 hover:scale-[1.02] animate-in fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate text-lg">
                            {enrollment.course.name}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 mb-3">
                            {enrollment.course.organization && (
                              <>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {enrollment.course.organization.name}
                            </span>
                            <span>•</span>
                              </>
                            )}
                            {(enrollment.course.topic || enrollment.course.event_type) && (
                              <>
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                                  {enrollment.course.topic?.name || enrollment.course.event_type?.name}
                            </span>
                            <span>•</span>
                              </>
                            )}
                            <span className={`capitalize font-medium ${getStatusColor(enrollment.status)}`}>
                              {enrollment.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-3 flex-shrink-0">
                          <Link href={`/courses/${enrollment.course.slug}`}>
                            <Button
                              size="lg"
                              className="bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-transform shadow-lg"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Course
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {enrollment.course.meeting_link && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
                              <span className="font-medium text-green-700 dark:text-green-300">Meeting Link</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(enrollment.course.meeting_link!)}
                                className="border-green-300 text-green-600 hover:bg-green-50"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => window.open(enrollment.course.meeting_link, "_blank")}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Join Meeting
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                              Amount Paid
                            </span>
                          </div>
                          <span className="text-lg font-bold text-green-700 dark:text-green-300">
                            ${Number(enrollment.amount_paid).toLocaleString()}
                          </span>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                              Status
                            </span>
                          </div>
                          <span
                            className={`text-lg font-bold ${getCourseStatusColor(getCourseStatus(enrollment.course.start_date, enrollment.course.end_date))}`}
                          >
                            {getStatusDisplay(
                              getCourseStatus(enrollment.course.start_date, enrollment.course.end_date),
                            )}
                          </span>
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                              Start Date
                            </span>
                          </div>
                          <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                            {new Date(enrollment.course.start_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        {enrollment.course.end_date && (
                          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                              <span className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                                End Date
                              </span>
                            </div>
                            <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
                              {new Date(enrollment.course.end_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}

                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              Enrolled
                            </span>
                          </div>
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            {new Date(enrollment.enrolled_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
            <Activity className="h-20 w-20 text-gray-400 mx-auto mb-8" />
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              {hasActiveFilters ? "No enrollments found" : "No course enrollments yet"}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-10 max-w-md mx-auto text-lg">
              {hasActiveFilters
                ? "Try adjusting your search filters to find your enrollments."
                : "Start your learning journey by enrolling in courses that interest you."}
            </p>
            {!hasActiveFilters && (
              <Link href="/courses">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-transform shadow-lg"
                >
                  <BookOpen className="h-5 w-5 mr-2" />
                  Browse Courses
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Pagination */}
        {safeEnrollments.last_page > 1 && (
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between pt-8">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
              Showing{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {(safeEnrollments.current_page - 1) * safeEnrollments.per_page + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {Math.min(safeEnrollments.current_page * safeEnrollments.per_page, safeEnrollments.total)}
              </span>{" "}
              of <span className="font-semibold text-gray-900 dark:text-white">{safeEnrollments.total}</span> enrollments
            </div>
            <div className="flex items-center justify-center space-x-2">
              {/* Previous Button */}
              {safeEnrollments.current_page > 1 && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handlePageChange(safeEnrollments.current_page - 1)}
                  className="w-12 h-12 rounded-full hover:shadow-lg transition-all duration-200 hover:scale-110 bg-transparent p-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}

              {/* Page Numbers */}
              {Array.from({ length: Math.min(safeEnrollments.last_page, 5) }).map((_, index) => {
                const pageNumber = index + 1
                const isActive = pageNumber === safeEnrollments.current_page
                return (
                  <Button
                    key={pageNumber}
                    variant={isActive ? "default" : "outline"}
                    size="lg"
                    onClick={() => handlePageChange(pageNumber)}
                    className={`w-12 h-12 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-110 p-0 ${
                      isActive ? "bg-blue-600 text-white shadow-xl scale-110" : "hover:shadow-lg"
                    }`}
                  >
                    {pageNumber}
                  </Button>
                )
              })}

              {/* Next Button */}
              {safeEnrollments.current_page < safeEnrollments.last_page && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handlePageChange(safeEnrollments.current_page + 1)}
                  className="w-12 h-12 rounded-full hover:shadow-lg transition-all duration-200 hover:scale-110 bg-transparent p-0"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </ProfileLayout>
  )
}

"use client"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState, useEffect, useRef } from "react"
import {
  BookOpen,
  Eye,
  Calendar,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  Ban,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  MapPin,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Input } from "@/components/frontend/ui/input"
import { usePage, router, Link } from "@inertiajs/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Enrollment {
  id: number
  course: {
    id: number
    name: string
    slug: string
    image: string
    image_url: string
    description: string
    course_fee: number
    pricing_type: string
    start_date: string
    start_time: string
    end_date: string
    end_time: string
    location: string
    max_participants: number
    enrolled: number
    organization: {
      name: string
      logo?: string
    }
    topic: {
      name: string
    }
  }
  status: string
  amount_paid: number
  payment_method: string
  enrolled_at: string
  enrollment_id: string
  transaction_id?: string
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
  const [search, setSearch] = useState(filters.search)
  const [statusFilter, setStatusFilter] = useState(filters.status)
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null)
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-3 w-3" />
      case "completed":
        return <CheckCircle className="h-3 w-3" />
      case "pending":
        return <Clock className="h-3 w-3" />
      case "cancelled":
        return <Ban className="h-3 w-3" />
      case "refunded":
        return <RefreshCw className="h-3 w-3" />
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
      case "refunded":
        return "destructive"
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
      case "refunded":
        return "text-red-600 dark:text-red-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  const handleCancelEnrollment = (enrollment: Enrollment) => {
    router.post(
      `/courses/${enrollment.course.slug}/cancel`,
      {},
      {
        onSuccess: () => {
          // Refresh the page data
          router.reload()
        },
      },
    )
  }

  const handleRefundRequest = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment)
    setIsRefundDialogOpen(true)
  }

  const processRefund = () => {
    if (selectedEnrollment) {
      router.post(
        `/courses/${selectedEnrollment.course.slug}/refund`,
        {},
        {
          onSuccess: () => {
            setIsRefundDialogOpen(false)
            setSelectedEnrollment(null)
            router.reload()
          },
        },
      )
    }
  }

  const hasActiveFilters = search || statusFilter
  return (
    <ProfileLayout
      title="My Course Enrollments"
      description="Track your course enrollments and manage your learning journey"
    >
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Spent</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    ${enrollmentStats.total_spent.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-500 rounded-full">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-green-200 dark:bg-green-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }}></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Enrolled</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {enrollmentStats.total_enrolled}
                  </p>
                </div>
                <div className="p-3 bg-blue-500 rounded-full">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-blue-200 dark:bg-blue-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }}></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Active</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {enrollmentStats.active_enrollments}
                  </p>
                </div>
                <div className="p-3 bg-purple-500 rounded-full">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-purple-200 dark:bg-purple-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${enrollmentStats.total_enrolled ? (enrollmentStats.active_enrollments / enrollmentStats.total_enrolled) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Completed</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {enrollmentStats.completed_enrollments}
                  </p>
                </div>
                <div className="p-3 bg-orange-500 rounded-full">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full bg-orange-200 dark:bg-orange-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{
                    width: `${enrollmentStats.total_enrolled ? (enrollmentStats.completed_enrollments / enrollmentStats.total_enrolled) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="border border-gray-200 dark:border-gray-600 shadow-md hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by course name, organization, or enrollment ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-w-[120px] focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                  className="bg-red-50 text-red-600 border-red-300 hover:border-red-400"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enrollments List */}
        {enrollments.data.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {enrollments.data.map((enrollment, index) => (
              <Card
                key={enrollment.id}
                className="border border-gray-200 dark:border-gray-600 hover:shadow-lg dark:bg-gray-900 transition-all duration-300 hover:scale-[1.01] animate-in fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <img
                        src={
                          enrollment.course.image_url
                            ? `${enrollment.course.image_url}`
                            : "/placeholder.svg?height=64&width=64"
                        }
                        alt={enrollment.course.organization.name}
                        width={64}
                        height={64}
                        className="rounded-lg flex-shrink-0 object-cover"
                      />
                      <Badge variant={getStatusVariant(enrollment.status)} className="absolute -bottom-2 -right-2">
                        {getStatusIcon(enrollment.status)}
                      </Badge>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                            {enrollment.course.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2">
                            <span className="text-blue-600 dark:text-blue-400">
                              {enrollment.course.organization.name}
                            </span>
                            <span>•</span>
                            <span className="text-purple-600 dark:text-purple-400">{enrollment.course.topic.name}</span>
                            <span>•</span>
                            <span className={`capitalize ${getStatusColor(enrollment.status)}`}>
                              {enrollment.status}
                            </span>
                          </div>
                          {/* <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                            {enrollment.course.description}
                          </p> */}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Link href={`/courses/${enrollment.course.slug}`}>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-transform"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Course
                            </Button>
                          </Link>
                          {enrollment.status === "active" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelEnrollment(enrollment)}
                                className="border-red-300 text-red-600 hover:scale-105 transition-transform"
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              {enrollment.amount_paid > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRefundRequest(enrollment)}
                                  className="border-orange-300 text-orange-600 hover:scale-105 transition-transform"
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Refund
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 text-xs sm:text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Amount Paid:</span>
                          <span className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {Number(enrollment.amount_paid).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Enrolled Date:</span>
                          <span className="text-gray-900 dark:text-white flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(enrollment.enrolled_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Course Dates:</span>
                          <span className="text-gray-900 dark:text-white flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(enrollment.course.start_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            -{" "}
                            {new Date(enrollment.course.end_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Location:</span>
                          <span className="text-gray-900 dark:text-white flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {enrollment.course.location}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Enrollment ID:</span>
                          <code className="text-xs font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                            {enrollment.enrollment_id}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <Activity className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {hasActiveFilters ? "No enrollments found" : "No course enrollments yet"}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
              {hasActiveFilters
                ? "Try adjusting your search filters to find your enrollments."
                : "Start your learning journey by enrolling in courses that interest you."}
            </p>
            {!hasActiveFilters && (
              <Link href="/courses">
                <Button className="bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-transform">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Courses
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Pagination */}
        {enrollments.last_page > 1 && (
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between pt-6">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
              Showing{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {(enrollments.current_page - 1) * enrollments.per_page + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(enrollments.current_page * enrollments.per_page, enrollments.total)}
              </span>{" "}
              of <span className="font-medium text-gray-900 dark:text-white">{enrollments.total}</span> enrollments
            </div>
            <div className="flex items-center justify-center space-x-2">
              {/* Previous Button */}
              {enrollments.current_page > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(enrollments.current_page - 1)}
                  className="w-10 h-10 rounded-full hover:shadow-md transition-all duration-200 hover:scale-110 bg-transparent p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}

              {/* Page Numbers */}
              {Array.from({ length: enrollments.last_page }).map((_, index) => {
                const pageNumber = index + 1
                const isActive = pageNumber === enrollments.current_page
                return (
                  <Button
                    key={pageNumber}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNumber)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-all duration-200 hover:scale-110 p-0 ${
                      isActive ? "bg-blue-600 text-white shadow-lg scale-110" : "hover:shadow-md"
                    }`}
                  >
                    {pageNumber}
                  </Button>
                )
              })}

              {/* Next Button */}
              {enrollments.current_page < enrollments.last_page && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(enrollments.current_page + 1)}
                  className="w-10 h-10 rounded-full hover:shadow-md transition-all duration-200 hover:scale-110 bg-transparent p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Refund Confirmation Dialog */}
        <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-orange-600" />
                Request Refund
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to request a refund for this enrollment? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedEnrollment && (
              <div className="py-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">{selectedEnrollment.course.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    Amount to be refunded:{" "}
                    <span className="font-medium text-green-600">${selectedEnrollment.amount_paid}</span>
                  </p>
                  <p className="text-xs text-gray-500">Refunds are processed within 5-7 business days.</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={processRefund} className="bg-orange-600 hover:bg-orange-700">
                Request Refund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProfileLayout>
  )
}

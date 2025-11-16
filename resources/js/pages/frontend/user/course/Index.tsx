"use client"
import { useEffect, useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Button } from "@/components/admin/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
import { Input } from "@/components/admin/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import { Plus, Eye, Edit, Trash2, Users, DollarSign, TrendingUp, Heart, Star, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Ban, Globe, MapPin, Calendar, Award, Copy, ExternalLink, BookOpen, GraduationCap } from 'lucide-react'
import { showSuccessToast } from "@/lib/toast"
import type { Auth } from "@/types"
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal"

interface Topic {
  id: number
  name: string
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
  creator: Creator
  image_url: string | null
  formatted_price: string
  formatted_duration: string
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
  topics: Topic[]
  filters: {
    courses_search: string
    courses_status: string
    courses_type: string
    courses_format: string
    courses_topic: string
  }
  statistics: Statistics
}

export default function CoursesIndex({ courses, topics, filters, statistics }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Filter states
  const [coursesSearch, setCoursesSearch] = useState(filters.courses_search || "")
  const [coursesStatus, setCoursesStatus] = useState(filters.courses_status || "")
  const [coursesType, setCoursesType] = useState(filters.courses_type || "")
  const [coursesFormat, setCoursesFormat] = useState(filters.courses_format || "")
  const [coursesTopic, setCoursesTopic] = useState(filters.courses_topic || "")

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
    if (!coursesSearch && !coursesStatus && !coursesType && !coursesFormat && !coursesTopic) {
      return
    }

    const timeoutId = setTimeout(() => {
      const params: Record<string, string> = {}
      if (coursesSearch.trim()) params.courses_search = coursesSearch
      if (coursesStatus) params.courses_status = coursesStatus
      if (coursesType) params.courses_type = coursesType
      if (coursesFormat) params.courses_format = coursesFormat
      if (coursesTopic) params.courses_topic = coursesTopic

      router.get(route("profile.course.index"), params, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      })
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [coursesSearch, coursesStatus, coursesType, coursesFormat, coursesTopic])

  const clearAllFilters = () => {
    setCoursesSearch("")
    setCoursesStatus("")
    setCoursesType("")
    setCoursesFormat("")
    setCoursesTopic("")
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
        showSuccessToast("Course deleted successfully.")
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
      title: "Delete Course",
      message: `Are you sure you want to delete the course "${courseName}"? This action cannot be undone and will affect all enrolled students.`,
    })
  }

  const copyCourseLink = async (slug: string, courseName: string) => {
    try {
      const url = `${window.location.origin}/courses/${slug}`
      await navigator.clipboard.writeText(url)
      setCopiedLink(slug)
      showSuccessToast(`Course link for "${courseName}" copied to clipboard!`)
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

  const hasActiveFilters = coursesSearch || coursesStatus || coursesType || coursesFormat || coursesTopic

  return (
    <ProfileLayout title="Course Management" description="Track all your courses and their impact">
      <Head title="Course Management" />
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-end">
          <div className="animate-in slide-in-from-right duration-700">
            <Link href={route("profile.course.create")} preserveScroll={true} preserveState={true}>
              <Button
                size="lg"
                className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Create Course</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 sm:gap-6">
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Courses</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics?.total_courses}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                  <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Free Courses</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics?.free_courses}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <Heart className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Paid Courses</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statistics?.paid_courses}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                  <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Courses</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{statistics?.active_courses}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                  <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Enrolled</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{statistics?.total_enrolled}</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-full">
                  <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${Number(statistics?.total_revenue).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Rating</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {Number(statistics.average_rating).toFixed(1)}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-full">
                  <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses Table */}
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
                <Heart className="h-5 w-5 text-red-500" />
                Community Courses ({courses.total})
              </CardTitle>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="hover:scale-105 transition-all duration-200 bg-transparent text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col lg:flex-row gap-3 mt-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by course name, description, target audience, or instructor..."
                  value={coursesSearch}
                  onChange={(e) => setCoursesSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={coursesTopic}
                  onChange={(e) => setCoursesTopic(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">All Topics</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id.toString()}>
                      {topic.name}
                    </option>
                  ))}
                </select>
                <select
                  value={coursesType}
                  onChange={(e) => setCoursesType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">All Pricing</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
                <select
                  value={coursesFormat}
                  onChange={(e) => setCoursesFormat(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">All Formats</option>
                  <option value="online">Online</option>
                  <option value="in_person">In-Person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <select
                  value={coursesStatus}
                  onChange={(e) => setCoursesStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="available">Available</option>
                  <option value="almost_full">Almost Full</option>
                  <option value="full">Full</option>
                  <option value="started">Started</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Course</TableHead>
                    <TableHead className="font-semibold">Topic</TableHead>
                    <TableHead className="font-semibold">Format</TableHead>
                    <TableHead className="font-semibold">Pricing</TableHead>
                    <TableHead className="font-semibold">Enrollment</TableHead>
                    <TableHead className="font-semibold">Schedule</TableHead>
                    <TableHead className="font-semibold">Rating</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Features</TableHead>
                    <TableHead className="font-semibold">Link</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.data.length > 0 ? (
                    courses.data.map((course) => (
                      <TableRow
                        key={course.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900 dark:text-white line-clamp-2 max-w-[200px]">
                              {course.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[200px]">
                              {course.target_audience}
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              by {course.organization.name}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {course.topic ? (
                            <Badge variant="outline" className="max-w-max">
                              {course.topic.name}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">No topic</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            {getFormatBadge(course.format)}
                            <div className="text-xs text-gray-500 dark:text-gray-400">{course.language}</div>
                          </div>
                        </TableCell>

                        <TableCell>{getPricingBadge(course.pricing_type, course.course_fee)}</TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {course.enrolled}/{course.max_participants}
                            </div>
                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min((course.enrolled / course.max_participants) * 100, 100)}%`,
                                }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {Math.round((course.enrolled / course.max_participants) * 100)}% full
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {new Date(course.start_date).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {course.start_time} • {course.formatted_duration}
                            </div>
                            {course.end_date && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Until {new Date(course.end_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span className="font-medium">{course.rating}</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {course.total_reviews} reviews
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={getStatusVariant(course.enrolled, course.max_participants, course.start_date)}>
                            {getStatusIcon(course.enrolled, course.max_participants, course.start_date)}
                            <span className="ml-1">
                              {getStatusText(course.enrolled, course.max_participants, course.start_date)}
                            </span>
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {course.certificate_provided && (
                              <Badge variant="secondary" className="text-xs px-2 py-1">
                                <Award className="w-3 h-3 mr-1" />
                                Cert
                              </Badge>
                            )}
                            {course.volunteer_opportunities && (
                              <Badge variant="secondary" className="text-xs px-2 py-1">
                                <Heart className="w-3 h-3 mr-1" />
                                Vol
                              </Badge>
                            )}
                            {course.accessibility_features.length > 0 && (
                              <Badge variant="secondary" className="text-xs px-2 py-1">
                                ♿ Access
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-mono text-gray-600 dark:text-gray-400 max-w-[80px] truncate">
                              /{course.slug}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyCourseLink(course.slug, course.name)}
                              >
                                {copiedLink === course.slug ? (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                              <Link href={`/courses/${course.slug}`} target="_blank">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link href={route("profile.course.show", course.slug)}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={route("profile.course.edit", course.slug)}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => openDeleteModal(course.slug, course.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No courses found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Laravel Pagination */}
            {courses.last_page > 1 && (
              <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between pt-6 sm:pt-8">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                  Showing <span className="font-medium text-gray-900 dark:text-white">{courses.from || 0}</span> to{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{courses.to || 0}</span> of{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{courses.total}</span> courses
                </div>
                <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                  {/* Previous Button */}
                  {courses.prev_page_url && (
                    <Link href={courses.prev_page_url}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:shadow-md transition-all duration-200 hover:scale-110"
                      >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </Link>
                  )}

                  {/* Page Numbers */}
                  {getNumericLinks(courses.links).map((link, index) => (
                    <div key={index}>
                      {link.url ? (
                        <Link href={link.url}>
                          <Button
                            variant={link.active ? "default" : "outline"}
                            size="sm"
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 hover:scale-110 ${
                              link.active
                                ? "bg-blue-600 text-white shadow-lg scale-110"
                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:shadow-md"
                            }`}
                          >
                            {link.label}
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        >
                          {link.label}
                        </Button>
                      )}
                    </div>
                  ))}

                  {/* Next Button */}
                  {courses.next_page_url && (
                    <Link href={courses.next_page_url}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:shadow-md transition-all duration-200 hover:scale-110"
                      >
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="rounded-lg p-6 shadow-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
            </div>
          </div>
        )}
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

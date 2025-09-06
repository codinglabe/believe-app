"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  MapPin,
  Star,
  CheckCircle,
  Award,
  Globe,
  DollarSign,
  BookOpen,
  Heart,
  Share2,
  Play,
  Download,
  User,
  Mail,
  UserCheck,
  XCircle,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { usePage, Link, router, useForm } from "@inertiajs/react"

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

interface Enrollment {
  id: number
  status: string
  amount_paid: number
  enrolled_at: string
  can_be_cancelled: boolean
  can_be_refunded: boolean
  status_label: string
}

interface EnrollmentStats {
  total_enrolled: number
  max_participants: number
  available_spots: number
  enrollment_percentage: number
}

interface FrontendCourseShowProps {
  course: Course
  userEnrollment?: Enrollment
  enrollmentStats: EnrollmentStats
  status: string
  canEnroll: boolean
}

export default function FrontendCourseShow({
  course,
  userEnrollment,
  enrollmentStats,
  status,
  canEnroll,
}: FrontendCourseShowProps) {
  const { auth } = usePage().props as any

  const { data, setData, post, processing } = useForm({
    terms_accepted: true,
  })

  const handleEnroll = () => {
    if (!auth.user) {
      router.visit("/login")
      return
    }

    // Show confirmation dialog
    post(`/courses/${course.slug}/enroll`)
  }

  const handleCancelEnrollment = () => {
    if (!userEnrollment) return

    if (confirm("Are you sure you want to cancel your enrollment? This action cannot be undone.")) {
      router.post(`/courses/${course.slug}/cancel`, {
        reason: "User requested cancellation",
      })
    }
  }

  const handleRequestRefund = () => {
    if (!userEnrollment) return

    if (
      confirm(
        "Are you sure you want to request a refund? This will cancel your enrollment and process a refund to your original payment method.",
      )
    ) {
      router.post(`/courses/${course.slug}/refund`)
    }
  }

  const getDurationLabel = (duration: string) => {
    const labels = {
      "1_session": "Single Session (2-3 hours)",
      "1_week": "1 Week",
      "2_weeks": "2 Weeks",
      "1_month": "1 Month",
      "6_weeks": "6 Weeks",
      "3_months": "3 Months",
    }
    return labels[duration as keyof typeof labels] || duration
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "online":
        return "💻"
      case "in_person":
        return "🏢"
      case "hybrid":
        return "🔄"
      default:
        return "📍"
    }
  }

  const getEnrollmentStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      case "refunded":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-600 to-green-600 py-16 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-6xl mx-auto"
            >
              {/* Back Button */}
              <div className="mb-6">
                <Link href="/courses">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Courses
                  </Button>
                </Link>
              </div>

              {/* Enrollment Status Alert */}
              {userEnrollment && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6"
                >
                  <Alert
                    className={`border-2 ${userEnrollment.status === "active"
                      ? "border-green-200 bg-green-50/90 dark:bg-green-900/20"
                      : userEnrollment.status === "cancelled"
                        ? "border-gray-200 bg-gray-50/90 dark:bg-gray-900/20"
                        : userEnrollment.status === "refunded"
                          ? "border-orange-200 bg-orange-50/90 dark:bg-orange-900/20"
                          : "border-blue-200 bg-blue-50/90 dark:bg-blue-900/20"
                      }`}
                  >
                    {userEnrollment.status === "active" && <UserCheck className="h-4 w-4 text-green-600" />}
                    {userEnrollment.status === "cancelled" && <XCircle className="h-4 w-4 text-gray-600" />}
                    {userEnrollment.status === "refunded" && <RefreshCw className="h-4 w-4 text-orange-600" />}
                    {userEnrollment.status === "completed" && <CheckCircle className="h-4 w-4 text-blue-600" />}
                    <AlertDescription
                      className={`${userEnrollment.status === "active"
                        ? "text-green-800 dark:text-green-200"
                        : userEnrollment.status === "cancelled"
                          ? "text-gray-800 dark:text-gray-200"
                          : userEnrollment.status === "refunded"
                            ? "text-orange-800 dark:text-orange-200"
                            : "text-blue-800 dark:text-blue-200"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <strong>Enrollment Status: {userEnrollment.status_label}</strong>
                          <br />
                          Enrolled on {new Date(userEnrollment.enrolled_at).toLocaleDateString()}
                          {userEnrollment.amount_paid > 0 && ` • Paid: $${userEnrollment.amount_paid}`}
                        </div>
                        <div className="flex gap-2 ml-4">
                          {userEnrollment.can_be_cancelled && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEnrollment}
                              className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                          {userEnrollment.can_be_refunded && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRequestRefund}
                              className="text-orange-600 border-orange-200 hover:bg-orange-50 bg-transparent"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Refund
                            </Button>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Course Image */}
                <div className="lg:col-span-1">
                  <div className="relative rounded-xl overflow-hidden shadow-2xl">
                    <img
                      src={course.image_url || "/placeholder.svg?height=400&width=600&query=course"}
                      alt={course.name}
                      className="w-full h-64 sm:h-80 object-cover"
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {/* Course Info */}
                <div className="lg:col-span-2 text-white">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge variant="outline" className="bg-white/20 text-white border-white/50">
                      {course.topic?.name || "General"}
                    </Badge>
                    <Badge variant="outline" className="bg-white/20 text-white border-white/50">
                      {course.language}
                    </Badge>
                    {course.certificate_provided && (
                      <Badge variant="outline" className="bg-white/20 text-white border-white/50">
                        <Award className="mr-1 h-3 w-3" />
                        Certificate
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">{course.name}</h1>
                  <div
                    className="text-lg sm:text-xl text-white/90 mb-6 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: course.description }}
                  />
                  {/* Course Stats */}
                  <div className="flex flex-wrap items-center gap-6 text-white/90">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 mr-2" />
                      <span className="font-semibold">{course.rating}</span>
                      <span className="text-sm ml-1">({course.total_reviews} reviews)</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      <span className="font-semibold">{course.enrolled}</span>
                      <span className="text-sm ml-1">students enrolled</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      <span>{getDurationLabel(course.duration)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Instructor Section */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                >
                  <Card className="bg-white dark:bg-gray-800 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl sm:text-2xl flex items-center text-gray-900 dark:text-white">
                        <User className="mr-3 h-6 w-6 text-blue-500" />
                        Meet Your Instructor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-start gap-6">
                      <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-blue-500">
                        <AvatarImage src={`/placeholder.svg?height=80&width=80&query=${course.creator.name}`} />
                        <AvatarFallback className="text-lg font-bold text-blue-600">
                          {course.creator.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{course.creator.name}</h3>
                        <p className="text-blue-600 dark:text-blue-400 font-medium mb-3">Course Instructor</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            {course.creator.email}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                {/* Course Overview */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <Card className="bg-white dark:bg-gray-800 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl sm:text-2xl flex items-center text-gray-900 dark:text-white">
                        <BookOpen className="mr-3 h-6 w-6 text-green-500" />
                        Course Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="prose prose-gray dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: course.description }}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
                {/* Community Impact */}
                {course.community_impact && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  >
                    <Card className="bg-white dark:bg-gray-800 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl flex items-center text-gray-900 dark:text-white">
                          <Heart className="mr-3 h-6 w-6 text-red-500" />
                          Community Impact
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div
                          className="prose prose-gray dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: course.community_impact }}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
                {/* Learning Outcomes */}
                {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    <Card className="bg-white dark:bg-gray-800 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl flex items-center text-gray-900 dark:text-white">
                          <CheckCircle className="mr-3 h-6 w-6 text-green-500" />
                          What You'll Learn
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {course.learning_outcomes.map((outcome, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                              <span className="text-gray-700 dark:text-gray-300">{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
                {/* Prerequisites */}
                {course.prerequisites && course.prerequisites.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  >
                    <Card className="bg-white dark:bg-gray-800 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl flex items-center text-gray-900 dark:text-white">
                          <BookOpen className="mr-3 h-6 w-6 text-purple-500" />
                          Prerequisites
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {course.prerequisites.map((prerequisite, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                              <span className="text-gray-700 dark:text-gray-300">{prerequisite}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
                {/* Materials Needed */}
                {course.materials_needed && course.materials_needed.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    <Card className="bg-white dark:bg-gray-800 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl flex items-center text-gray-900 dark:text-white">
                          <Download className="mr-3 h-6 w-6 text-orange-500" />
                          Materials Needed
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {course.materials_needed.map((material, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                              <span className="text-gray-700 dark:text-gray-300">{material}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
              {/* Sidebar */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="sticky top-8 space-y-6"
                >
                  {/* Enrollment Card */}
                  <Card className="bg-white dark:bg-gray-800 shadow-lg">
                    <CardContent className="p-6">
                      {/* Price */}
                      <div className="text-center mb-6">
                        <div className="text-4xl font-bold text-green-600 mb-2">
                          {course.pricing_type === "free" ? (
                            <span className="text-green-600">FREE</span>
                          ) : (
                            <span className="flex items-center justify-center">
                              <DollarSign className="w-8 h-8" />
                              {course.course_fee}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">
                          {course.pricing_type === "free" ? "No cost to enroll" : "One-time payment"}
                        </p>
                      </div>
                      {/* Enrollment Progress */}
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Enrollment Progress
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {enrollmentStats.total_enrolled}/{enrollmentStats.max_participants}
                          </span>
                        </div>
                        <Progress value={enrollmentStats.enrollment_percentage} className="h-2" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {enrollmentStats.available_spots} spots remaining
                        </p>
                      </div>

                      {/* Enrollment Button */}
                      <div className="mb-4">
                        {userEnrollment ? (
                          <div className="text-center">
                            <Badge
                              variant="secondary"
                              className={`mb-3 px-4 py-2 ${getEnrollmentStatusColor(userEnrollment.status)}`}
                            >
                              {userEnrollment.status === "active" && "✓ Enrolled"}
                              {userEnrollment.status === "completed" && "✓ Completed"}
                              {userEnrollment.status === "cancelled" && "✗ Cancelled"}
                              {userEnrollment.status === "refunded" && "↻ Refunded"}
                            </Badge>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {userEnrollment.status === "active" && "You're enrolled in this course!"}
                              {userEnrollment.status === "completed" && "You've completed this course!"}
                              {userEnrollment.status === "cancelled" && "Your enrollment was cancelled"}
                              {userEnrollment.status === "refunded" && "Your enrollment was refunded"}
                            </p>
                          </div>
                        ) : canEnroll ? (
                          <>
                            {!auth.user ? (
                              <div className="space-y-2">
                                <Button
                                  onClick={handleEnroll}
                                  className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
                                >
                                  <Play className="mr-2 h-5 w-5" />
                                  Sign In to Enroll
                                </Button>
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                  You need to sign in to enroll in this course
                                </p>
                              </div>
                            ) : (
                              <Button
                                onClick={handleEnroll}
                                disabled={processing}
                                className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
                              >
                                <Play className="mr-2 h-5 w-5" />
                                {processing
                                  ? "Processing..."
                                  : `Enroll Now${course.pricing_type === "paid" ? ` - ${course.formatted_price}` : " - Free"}`}
                              </Button>
                            )}
                          </>
                        ) : (
                          <div className="text-center">
                            <Button disabled className="w-full" size="lg">
                              {status === "full" ? "Course Full" : status === "unavailable" ? "Enrollment Unavailable" : "Enrollment Closed"}
                            </Button>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                              {status === "full" ? "No spots available" : status === "unavailable" ? "You are not authorized to enroll in this course" : "Registration has ended"}
                            </p>
                          </div>
                        )}
                      </div>

                      <Separator className="my-4" />
                      {/* Course Details */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Start Date</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(course.start_date).toLocaleDateString()} at {course.start_time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Duration</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {getDurationLabel(course.duration)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Format</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {getFormatIcon(course.format)} {course.formatted_format}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Target Audience</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{course.target_audience}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Language</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{course.language}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Course Features */}
                  <Card className="bg-white dark:bg-gray-800 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">Course Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {course.certificate_provided && (
                          <div className="flex items-center gap-3">
                            <Award className="w-5 h-5 text-yellow-600" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Certificate of Completion</span>
                          </div>
                        )}
                        {course.volunteer_opportunities && (
                          <div className="flex items-center gap-3">
                            <Heart className="w-5 h-5 text-red-600" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Volunteer Opportunities</span>
                          </div>
                        )}
                        {course.accessibility_features && course.accessibility_features.length > 0 && (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Accessibility Features
                              </p>
                              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                {course.accessibility_features.map((feature, index) => (
                                  <li key={index}>• {feature}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  {/* Organization Info */}
                  <Card className="bg-white dark:bg-gray-800 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">Hosted By</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={`/placeholder.svg?height=48&width=48&query=${course.organization.name}`} />
                          <AvatarFallback className="text-sm font-bold">
                            {course.organization.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{course.organization.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{course.organization.email}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}

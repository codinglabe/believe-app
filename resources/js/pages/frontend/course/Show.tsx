"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Calendar,
  CalendarRange,
  Clock,
  Users,
  MapPin,
  CheckCircle,
  Award,
  Globe,
  BookOpen,
  Heart,
  User,
  UserCheck,
  XCircle,
  RefreshCw,
  Laptop,
  Building2,
  Layers,
  Sparkles,
  ChevronRight,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { usePage, Link, router } from "@inertiajs/react"
import { connectionHubTypeLabel, isEventsHubType } from "@/lib/connection-hub-type"
import type { ConnectionHubType } from "@/lib/connection-hub-type"

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
  organization: Organization | null
  /** Nonprofit / org profile name from `organizations` table (preferred over account display name). */
  organization_name?: string | null
  creator: Creator
  image_url: string | null
  formatted_price: string
  formatted_duration: string
  formatted_program_length?: string | null
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

function formatIconForFormat(format: string) {
  switch (format) {
    case "online":
      return Laptop
    case "in_person":
      return Building2
    case "hybrid":
      return Layers
    default:
      return MapPin
  }
}

export default function FrontendCourseShow({
  course,
  userEnrollment,
  enrollmentStats,
  status,
  canEnroll,
}: FrontendCourseShowProps) {
  const { auth } = usePage().props as { auth?: { user?: unknown } }

  const handleEnroll = () => {
    if (!auth?.user) {
      router.visit("/login")
      return
    }
    router.visit(`/courses/${course.slug}/enroll`)
  }

  const handleCancelEnrollment = () => {
    if (!userEnrollment) return
    if (
      confirm(
        `Are you sure you want to cancel your ${!isEventsHubType(course.type) ? "enrollment" : "registration"}? This action cannot be undone.`,
      )
    ) {
      router.post(`/courses/${course.slug}/cancel`, {
        reason: "User requested cancellation",
      })
    }
  }

  const handleRequestRefund = () => {
    if (!userEnrollment) return
    if (
      confirm(
        `Are you sure you want to request a refund? This will cancel your ${!isEventsHubType(course.type) ? "enrollment" : "registration"} and process a refund to your original payment method.`,
      )
    ) {
      router.post(`/courses/${course.slug}/refund`)
    }
  }

  const getEnrollmentStatusColor = (s: string) => {
    switch (s) {
      case "active":
        return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
      case "completed":
        return "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100"
      case "cancelled":
        return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
      case "refunded":
        return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
    }
  }

  const FormatIcon = formatIconForFormat(course.format)
  const orgName = course.organization_name ?? course.organization?.name ?? "Organization"

  /**
   * Registered nonprofit/org profile name from the backend — not merely the presence of `organization`
   * (that relation is the listing owner user and is usually set). Avoids showing “Organization” /
   * “Official organization listing” for individual hosts without an org profile.
   */
  const isOfficialOrganizationListing = Boolean((course.organization_name ?? "").trim())

  /** Listing host: org profile name when present, else the owner account or creator display name. */
  const hostName = course.organization
    ? (course.organization_name ?? course.organization.name)
    : course.creator.name
  const hostInitials = hostName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

  /** Backend only sends active/pending/completed; this guards stale props or other entry points. */
  const hasCurrentEnrollment =
    !!userEnrollment && ["active", "completed", "pending"].includes(userEnrollment.status)

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        {/* Top bar */}
        <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-purple-700 dark:text-slate-400 dark:hover:text-purple-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Connection Hub
            </Link>
          </div>
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-blue-950 text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 20%, white 0%, transparent 45%), radial-gradient(circle at 80% 60%, #a855f7 0%, transparent 40%)`,
            }}
          />
          <div className="relative container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 pb-14 sm:pt-10 sm:pb-16">
            {hasCurrentEnrollment && userEnrollment && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <Alert
                  className={`border backdrop-blur-sm ${
                    userEnrollment.status === "active"
                      ? "border-emerald-400/40 bg-emerald-950/40"
                      : userEnrollment.status === "pending"
                        ? "border-amber-400/40 bg-amber-950/30"
                        : "border-blue-400/40 bg-blue-950/40"
                  }`}
                >
                  {userEnrollment.status === "active" && <UserCheck className="h-4 w-4 text-emerald-300" />}
                  {userEnrollment.status === "pending" && <RefreshCw className="h-4 w-4 text-amber-300" />}
                  {userEnrollment.status === "completed" && <CheckCircle className="h-4 w-4 text-blue-300" />}
                  <AlertDescription className="text-white/95">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="font-semibold">
                          {!isEventsHubType(course.type) ? "Enrollment" : "Registration"}: {userEnrollment.status_label}
                        </p>
                        <p className="text-sm text-white/80 mt-1">
                          {!isEventsHubType(course.type) ? "Enrolled" : "Registered"}{" "}
                          {new Date(userEnrollment.enrolled_at).toLocaleDateString()}
                          {userEnrollment.amount_paid > 0 && ` · Paid $${userEnrollment.amount_paid}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {userEnrollment.can_be_cancelled && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEnrollment}
                            className="border-red-300/50 text-white hover:bg-red-500/20 bg-transparent"
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
                            className="border-amber-300/50 text-white hover:bg-amber-500/20 bg-transparent"
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              <div className="lg:col-span-5">
                <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/15 shadow-2xl shadow-black/30">
                  <img
                    src={course.image_url || "/placeholder.svg?height=400&width=600&query=community%20course"}
                    alt=""
                    className="aspect-[4/3] w-full object-cover sm:aspect-auto sm:h-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent sm:hidden" />
                </div>
              </div>

              <div className="lg:col-span-7 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-md bg-white/15 text-white hover:bg-white/20 border border-white/20">
                    {connectionHubTypeLabel(course.type)}
                  </Badge>
                  {!isEventsHubType(course.type) && course.topic && (
                    <Badge className="rounded-md bg-white/10 text-white/95 border border-white/20">{course.topic.name}</Badge>
                  )}
                  {isEventsHubType(course.type) && course.event_type && (
                    <Badge className="rounded-md bg-white/10 text-white/95 border border-white/20">{course.event_type.name}</Badge>
                  )}
                  <Badge className="rounded-md bg-white/10 text-white/95 border border-white/20">{course.language}</Badge>
                  {course.certificate_provided && (
                    <Badge className="rounded-md bg-white/10 text-white/95 border border-white/20">
                      <Award className="mr-1 h-3 w-3" />
                      Certificate
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15]">{course.name}</h1>

                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
                  <span className="font-medium">{orgName}</span>
                  <span className="text-white/40">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <FormatIcon className="h-4 w-4 opacity-90" />
                    {course.formatted_format}
                  </span>
                </p>

                <div className="flex flex-wrap gap-4 pt-1">
                  <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                    <Users className="h-5 w-5 text-white/90" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/60">Enrolled</p>
                      <p className="text-sm font-semibold">
                        {course.enrolled} / {course.max_participants}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                    <Clock className="h-5 w-5 text-white/90" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/60">Session</p>
                      <p className="text-sm font-semibold">{course.formatted_duration}</p>
                      {course.formatted_program_length ? (
                        <p className="text-xs text-white/75 mt-0.5">Program · {course.formatted_program_length}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                    <Sparkles className="h-5 w-5 text-white/90" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/60">Price</p>
                      <p className="text-sm font-semibold">{course.formatted_price}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Body */}
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-8 space-y-8">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <Card className="overflow-hidden border-slate-200/90 shadow-xl shadow-slate-200/30 dark:border-gray-800 dark:shadow-none">
                  <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4 dark:from-gray-900 dark:to-gray-900/80 dark:border-gray-800">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                      {isOfficialOrganizationListing ? (
                        <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      )}
                      {isOfficialOrganizationListing
                        ? !isEventsHubType(course.type)
                          ? "Organization"
                          : "Host organization"
                        : !isEventsHubType(course.type)
                          ? "Instructor"
                          : "Organizer"}
                    </CardTitle>
                  </div>
                  <CardContent className="flex flex-col sm:flex-row sm:items-start gap-5 p-6">
                    <Avatar className="h-16 w-16 shrink-0 ring-2 ring-purple-200 dark:ring-purple-900">
                      <AvatarImage src={`/placeholder.svg?height=80&width=80&query=${encodeURIComponent(hostName)}`} />
                      <AvatarFallback className="text-lg font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200">
                        {hostInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{hostName}</h3>
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mt-0.5">
                        {isOfficialOrganizationListing
                          ? "Official organization listing"
                          : !isEventsHubType(course.type)
                            ? "Course instructor"
                            : "Event organizer"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
                <Card className="border-slate-200/90 shadow-lg dark:border-gray-800">
                  <div className="border-b border-slate-100 px-6 py-4 dark:border-gray-800">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                      <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      {isEventsHubType(course.type) ? "About this event" : "About this listing"}
                    </CardTitle>
                  </div>
                  <CardContent className="p-6">
                    <div
                      className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-purple-600"
                      dangerouslySetInnerHTML={{ __html: course.description }}
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {course.community_impact && (
                <Card className="border-slate-200/90 shadow-lg dark:border-gray-800">
                  <div className="border-b border-slate-100 px-6 py-4 dark:border-gray-800">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                      <Heart className="h-5 w-5 text-rose-500" />
                      Community impact
                    </CardTitle>
                  </div>
                  <CardContent className="p-6">
                    <div
                      className="prose prose-slate dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: course.community_impact }}
                    />
                  </CardContent>
                </Card>
              )}

              {(course.learning_outcomes?.length ?? 0) > 0 && (
                <Card className="border-slate-200/90 shadow-lg dark:border-gray-800">
                  <div className="border-b border-slate-100 px-6 py-4 dark:border-gray-800">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      {!isEventsHubType(course.type) ? "What you'll learn" : "Highlights"}
                    </CardTitle>
                  </div>
                  <CardContent className="p-6">
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {course.learning_outcomes!.map((outcome, index) => (
                        <li key={index} className="flex gap-3 text-slate-700 dark:text-slate-300">
                          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                          <span>{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {(course.prerequisites?.length ?? 0) > 0 && (
                <Card className="border-slate-200/90 shadow-lg dark:border-gray-800">
                  <div className="border-b border-slate-100 px-6 py-4 dark:border-gray-800">
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Prerequisites</CardTitle>
                  </div>
                  <CardContent className="p-6">
                    <ul className="space-y-2">
                      {course.prerequisites!.map((prerequisite, index) => (
                        <li key={index} className="flex gap-3 text-slate-700 dark:text-slate-300">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                          <span>{prerequisite}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {(course.materials_needed?.length ?? 0) > 0 && (
                <Card className="border-slate-200/90 shadow-lg dark:border-gray-800">
                  <div className="border-b border-slate-100 px-6 py-4 dark:border-gray-800">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                      <Download className="h-5 w-5 text-orange-500" />
                      Materials needed
                    </CardTitle>
                  </div>
                  <CardContent className="p-6">
                    <ul className="space-y-2">
                      {course.materials_needed!.map((material, index) => (
                        <li key={index} className="flex gap-3 text-slate-700 dark:text-slate-300">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                          <span>{material}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-24 space-y-6">
                <Card className="overflow-hidden border-slate-200/90 shadow-xl dark:border-gray-800">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-5 text-white">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Investment</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums">
                      {course.pricing_type === "free" ? "Free" : course.formatted_price}
                    </p>
                    <p className="mt-1 text-sm text-white/85">
                      {course.pricing_type === "free"
                        ? !isEventsHubType(course.type)
                          ? "No cost to enroll"
                          : "No cost to register"
                        : "One-time payment"}
                    </p>
                  </div>
                  <CardContent className="space-y-5 p-6">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {!isEventsHubType(course.type) ? "Enrollment" : "Registration"}
                        </span>
                        <span className="tabular-nums text-slate-600 dark:text-slate-400">
                          {enrollmentStats.total_enrolled}/{enrollmentStats.max_participants}
                        </span>
                      </div>
                      <Progress value={enrollmentStats.enrollment_percentage} className="h-2" />
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        {enrollmentStats.available_spots} spots left
                      </p>
                    </div>

                    {hasCurrentEnrollment && userEnrollment ? (
                      <div className="text-center space-y-2">
                        <Badge className={`px-4 py-1.5 ${getEnrollmentStatusColor(userEnrollment.status)}`}>
                          {userEnrollment.status === "active" && (!isEventsHubType(course.type) ? "Enrolled" : "Registered")}
                          {userEnrollment.status === "pending" && "Pending"}
                          {userEnrollment.status === "completed" && "Completed"}
                        </Badge>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {userEnrollment.status === "active" &&
                            (!isEventsHubType(course.type)
                              ? "You're enrolled in this listing."
                              : "You're registered for this event.")}
                          {userEnrollment.status === "pending" &&
                            (!isEventsHubType(course.type)
                              ? "Complete payment to confirm your spot."
                              : "Complete payment to confirm your registration.")}
                          {userEnrollment.status === "completed" &&
                            (!isEventsHubType(course.type) ? "You've completed this listing." : "Event completed.")}
                        </p>
                      </div>
                    ) : canEnroll ? (
                      !auth?.user ? (
                        <div className="space-y-2">
                          <Button
                            onClick={handleEnroll}
                            className="h-12 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-base font-semibold shadow-md hover:from-purple-700 hover:to-blue-700"
                          >
                            Sign in to {!isEventsHubType(course.type) ? "enroll" : "register"}
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                            Account required to continue
                          </p>
                        </div>
                      ) : (
                        <Button
                          onClick={handleEnroll}
                          className="h-12 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-base font-semibold shadow-md hover:from-purple-700 hover:to-blue-700"
                        >
                          {!isEventsHubType(course.type) ? "Enroll" : "Register"} now
                          <span className="ml-2 opacity-95">
                            {course.pricing_type === "paid" ? ` · ${course.formatted_price}` : " · Free"}
                          </span>
                        </Button>
                      )
                    ) : (
                      <div className="text-center space-y-2">
                        <Button disabled className="h-11 w-full" size="lg" variant="secondary">
                          {status === "full" && (!isEventsHubType(course.type) ? "Listing full" : "Event full")}
                          {status === "started" && (!isEventsHubType(course.type) ? "Already started" : "Already started")}
                          {status === "unavailable" &&
                            (!isEventsHubType(course.type) ? "Enrollment unavailable" : "Registration unavailable")}
                          {status !== "full" &&
                            status !== "started" &&
                            status !== "unavailable" &&
                            (!isEventsHubType(course.type) ? "Enrollment closed" : "Registration closed")}
                        </Button>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {status === "full" && "No spots available."}
                          {status === "started" && (!isEventsHubType(course.type) ? "This listing has already started." : "This event has already started.")}
                          {status === "unavailable" &&
                            (!isEventsHubType(course.type)
                              ? "You can't enroll in your own listing from this view."
                              : "You can't register for your own event from this view.")}
                          {status !== "full" &&
                            status !== "started" &&
                            status !== "unavailable" &&
                            (!isEventsHubType(course.type) ? "Enrollment is no longer open." : "Registration is no longer open.")}
                        </p>
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-4 text-sm">
                      <div className="flex gap-3">
                        <Calendar className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">Starts</p>
                          <p className="text-slate-600 dark:text-slate-400">
                            {new Date(course.start_date).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}{" "}
                            · {course.start_time}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Clock className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">Session duration</p>
                          <p className="text-slate-600 dark:text-slate-400">{course.formatted_duration}</p>
                        </div>
                      </div>
                      {course.formatted_program_length ? (
                        <div className="flex gap-3">
                          <CalendarRange className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">Program length</p>
                            <p className="text-slate-600 dark:text-slate-400">{course.formatted_program_length}</p>
                          </div>
                        </div>
                      ) : null}
                      <div className="flex gap-3">
                        <FormatIcon className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">Format</p>
                          <p className="text-slate-600 dark:text-slate-400">{course.formatted_format}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Users className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">Audience</p>
                          <p className="text-slate-600 dark:text-slate-400">{course.target_audience}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Globe className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">Language</p>
                          <p className="text-slate-600 dark:text-slate-400">{course.language}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {(course.certificate_provided || course.volunteer_opportunities || (course.accessibility_features?.length ?? 0) > 0) && (
                  <Card className="border-slate-200/90 shadow-md dark:border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Features</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {course.certificate_provided && (
                        <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                          <Award className="h-5 w-5 text-amber-500" />
                          Certificate of completion
                        </div>
                      )}
                      {course.volunteer_opportunities && (
                        <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                          <Heart className="h-5 w-5 text-rose-500" />
                          Volunteer opportunities
                        </div>
                      )}
                      {(course.accessibility_features?.length ?? 0) > 0 && (
                        <div>
                          <p className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">Accessibility</p>
                          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                            {course.accessibility_features!.map((feature, index) => (
                              <li key={index}>· {feature}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {course.organization && (
                  <Card className="border-slate-200/90 shadow-md dark:border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Hosted by</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-slate-100 dark:ring-gray-700">
                        <AvatarImage src={`/placeholder.svg?height=48&width=48&query=${encodeURIComponent(hostName)}`} />
                        <AvatarFallback className="text-sm font-semibold">
                          {hostInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{hostName}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}

"use client"
import { Head, Link } from "@inertiajs/react"
import {
  Users,
  Calendar,
  Clock,
  Globe,
  MapPin,
  Star,
  Award,
  Heart,
  BookOpen,
  ExternalLink,
  Copy,
  ArrowLeft,
  Sparkles,
  Edit,
} from "lucide-react"
import { Button } from "@/components/admin/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
import { Progress } from "@/components/ui/progress"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState } from "react"
import { connectionHubTypeLabel, type ConnectionHubType } from "@/lib/connection-hub-type"

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
  event_type_id: number | null
  organization_id: number
  user_id: number
  name: string
  slug: string
  description: string
  /** Connection Hub type when present */
  type?: ConnectionHubType | string | null
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
  meeting_link: string | null
  topic: Topic | null
  event_type: { id: number; name: string; category?: string } | null
  organization: Organization
  organization_name?: string | null
  creator: Creator
  image_url: string | null
  formatted_price: string
  formatted_duration: string
  formatted_program_length?: string | null
  formatted_format: string
}

interface EnrollmentStats {
  total_enrolled: number
  max_participants: number
  enrollment_percentage: number
  available_spots: number
}

interface RecentEnrollment {
  id: number
  status: string
  enrolled_at: string | null
  user?: { id: number; name: string; email: string } | null
}

interface AdminCoursesShowProps {
  course: Course
  enrollmentStats: EnrollmentStats
  status: string
  recentEnrollments?: RecentEnrollment[]
}

const cardShell =
  "overflow-hidden rounded-2xl border border-gray-200/90 shadow-lg dark:border-gray-800"
const cardHeaderBar =
  "border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30"

export default function AdminCoursesShow({
  course,
  enrollmentStats,
  status,
  recentEnrollments = [],
}: AdminCoursesShowProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case "available":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "almost_full":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "full":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "started":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "online":
        return <Globe className="h-5 w-5 text-blue-500" />
      case "in_person":
        return <MapPin className="h-5 w-5 text-green-500" />
      case "hybrid":
        return <Users className="h-5 w-5 text-purple-500" />
      default:
        return <Globe className="h-5 w-5 text-gray-500" />
    }
  }

  const statCardClass =
    "rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm transition hover:border-purple-200/60 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-purple-900/50"

  const statusLabel = status.replace(/_/g, " ")

  return (
    <ProfileLayout title="Manage listing" description={course.name}>
      <Head title={`Manage · ${course.name}`} />

      <div className="mx-auto max-w-7xl animate-in fade-in duration-500 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-purple-50/40 p-6 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950/30 sm:p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-purple-500/15 blur-3xl dark:bg-purple-500/10"
            aria-hidden
          />
          <Link
            href={route("profile.course.index")}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-purple-700 dark:text-gray-400 dark:hover:text-purple-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Connection Hub
          </Link>
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 max-w-3xl gap-4">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25 sm:flex">
                <Sparkles className="h-7 w-7" aria-hidden />
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Manage listing
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                  {course.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={getStatusColor(status)}>{statusLabel}</Badge>
                  {course.type ? (
                    <Badge variant="secondary" className="font-normal">
                      {connectionHubTypeLabel(course.type as ConnectionHubType)}
                    </Badge>
                  ) : null}
                  <span className="font-mono text-xs text-gray-500 dark:text-gray-400">/{course.slug}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Link href={route("profile.course.edit", course.slug)}>
                <Button className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 shadow-md shadow-purple-500/15 hover:from-purple-700 hover:to-blue-700">
                  <Edit className="h-4 w-4" />
                  Edit listing
                </Button>
              </Link>
              <Link href={`/courses/${course.slug}`} target="_blank" rel="noreferrer">
                <Button variant="outline" className="gap-2 border-gray-200 bg-white/80 dark:border-gray-700 dark:bg-gray-900/50">
                  <ExternalLink className="h-4 w-4" />
                  View public page
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Snapshot */}
        <section className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            At a glance
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <div className={statCardClass}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Enrolled</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    {enrollmentStats.total_enrolled}
                  </p>
                  <p className="text-xs text-gray-500">of {enrollmentStats.max_participants}</p>
                </div>
                <div className="rounded-xl bg-blue-100 p-2.5 dark:bg-blue-900/40">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className={statCardClass}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Avg rating</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {course.rating}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-100 p-2.5 dark:bg-amber-900/40">
                  <Star className="h-5 w-5 fill-amber-500 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </div>
            <div className={statCardClass}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Reviews</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-300">
                    {course.total_reviews}
                  </p>
                </div>
                <div className="rounded-xl bg-purple-100 p-2.5 dark:bg-purple-900/40">
                  <Heart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
            <div className={statCardClass}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Session</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-orange-600 dark:text-orange-300">
                    {course.formatted_duration}
                  </p>
                </div>
                <div className="rounded-xl bg-orange-100 p-2.5 dark:bg-orange-900/40">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            <Card className={cardShell}>
              <CardHeader className={cardHeaderBar}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold">Listing details</CardTitle>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      What participants see on the public page
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {course.event_type && <Badge variant="outline">{course.event_type.name}</Badge>}
                      {!course.event_type && course.topic && <Badge variant="outline">{course.topic.name}</Badge>}
                      <Badge variant={course.pricing_type === "free" ? "secondary" : "default"}>
                        {course.formatted_price}
                      </Badge>
                    </div>
                  </div>
                  {course.image_url && (
                    <img
                      src={course.image_url || "/placeholder.svg"}
                      alt=""
                      className="h-28 w-full max-w-[200px] shrink-0 rounded-xl border border-gray-200 object-cover dark:border-gray-700"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Description</h3>
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: course.description }}
                  />
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Target audience</h3>
                  <p className="text-muted-foreground">{course.target_audience}</p>
                </div>

                {course.community_impact && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Community impact</h3>
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: course.community_impact }}
                    />
                  </div>
                )}

                {course.learning_outcomes.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Learning outcomes</h3>
                    <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                      {course.learning_outcomes.map((outcome, index) => (
                        <li key={index}>{outcome}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {course.prerequisites.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Prerequisites</h3>
                    <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                      {course.prerequisites.map((prerequisite, index) => (
                        <li key={index}>{prerequisite}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {course.materials_needed.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Materials needed</h3>
                    <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                      {course.materials_needed.map((material, index) => (
                        <li key={index}>{material}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {course.accessibility_features.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Accessibility</h3>
                    <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                      {course.accessibility_features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {recentEnrollments.length > 0 && (
              <Card className={cardShell}>
                <CardHeader className={cardHeaderBar}>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Recent enrollments
                  </CardTitle>
                  <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    Latest activity (up to 10)
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recentEnrollments.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-col gap-1 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {row.user?.name ?? "Participant"}
                          </p>
                          {row.user?.email ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{row.user.email}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:text-right">
                          {row.enrolled_at && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(row.enrolled_at).toLocaleString()}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs capitalize">
                            {row.status}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {course.meeting_link && (
              <Card className={cardShell}>
                <CardHeader className={cardHeaderBar}>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <ExternalLink className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Meeting link
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-gray-200/80 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                    <div className="mb-3 break-all font-mono text-xs text-muted-foreground">{course.meeting_link}</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => copyToClipboard(course.meeting_link!)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        onClick={() => window.open(course.meeting_link!, "_blank")}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className={cardShell}>
              <CardHeader className={cardHeaderBar}>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Enrollment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {enrollmentStats.total_enrolled}
                  </div>
                  <div className="text-sm text-muted-foreground">of {enrollmentStats.max_participants} participants</div>
                </div>
                <Progress value={enrollmentStats.enrollment_percentage} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span>{enrollmentStats.enrollment_percentage}% full</span>
                  <span>{enrollmentStats.available_spots} spots left</span>
                </div>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader className={cardHeaderBar}>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Schedule & format
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {getFormatIcon(course.format)}
                  <div>
                    <div className="font-medium">{course.formatted_format}</div>
                    <div className="text-sm text-muted-foreground">Format</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-medium">{new Date(course.start_date).toLocaleDateString()}</div>
                    <div className="text-sm text-muted-foreground">Start date</div>
                  </div>
                </div>

                {course.end_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-red-500" />
                    <div>
                      <div className="font-medium">{new Date(course.end_date).toLocaleDateString()}</div>
                      <div className="text-sm text-muted-foreground">End date</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium">{course.start_time}</div>
                    <div className="text-sm text-muted-foreground">Start time</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="font-medium">{course.formatted_duration}</div>
                    <div className="text-sm text-muted-foreground">Session length</div>
                  </div>
                </div>

                {course.formatted_program_length ? (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-indigo-500" />
                    <div>
                      <div className="font-medium">{course.formatted_program_length}</div>
                      <div className="text-sm text-muted-foreground">Program length</div>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="font-medium">{course.language}</div>
                    <div className="text-sm text-muted-foreground">Language</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader className={cardHeaderBar}>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Star className="h-5 w-5 text-amber-500" />
                  Rating & reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <Star className="h-6 w-6 fill-current text-yellow-500" />
                    <span className="text-2xl font-bold">{course.rating}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Based on {course.total_reviews} reviews</div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader className={cardHeaderBar}>
                <CardTitle className="text-lg font-semibold">Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span className="text-sm">Certificate</span>
                  </div>
                  <Badge variant={course.certificate_provided ? "default" : "secondary"}>
                    {course.certificate_provided ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">Volunteer opportunities</span>
                  </div>
                  <Badge variant={course.volunteer_opportunities ? "default" : "secondary"}>
                    {course.volunteer_opportunities ? "Yes" : "No"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader className={cardHeaderBar}>
                <CardTitle className="text-lg font-semibold">Host</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-gray-900 dark:text-white">
                  {course.organization_name ?? course.organization.name}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProfileLayout>
  )
}

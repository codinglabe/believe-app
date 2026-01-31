"use client"
import { Head, Link, usePage } from "@inertiajs/react"
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
} from "lucide-react"
import { Button } from "@/components/admin/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
import { Progress } from "@/components/ui/progress"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useState } from "react"

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
  meeting_link: string | null
  topic: Topic | null
  organization: Organization
  creator: Creator
  image_url: string | null
  formatted_price: string
  formatted_duration: string
  formatted_format: string
}

interface EnrollmentStats {
  total_enrolled: number
  max_participants: number
  enrollment_percentage: number
  available_spots: number
}

interface AdminCoursesShowProps {
  course: Course
  enrollmentStats: EnrollmentStats
  status: string
}

export default function AdminCoursesShow({ course, enrollmentStats, status }: AdminCoursesShowProps) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
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
        return <Globe className="w-5 h-5 text-blue-500" />
      case "in_person":
        return <MapPin className="w-5 h-5 text-green-500" />
      case "hybrid":
        return <Users className="w-5 h-5 text-purple-500" />
      default:
        return <Globe className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <ProfileLayout title="Course Details" description={course.name}>
      <Head title={`Course Details - ${course.name}`} />

      <div className="space-y-6 m-10">
        {/* Header */}
        <div className="flex items-center gap-4">

          <div className="ml-auto flex gap-2">
            <Link href={route("admin.courses.edit", course.slug)}>
              <Button>Edit Course</Button>
            </Link>
            <Link href={`/courses/${course.slug}`} target="_blank">
              <Button variant="outline">View Public</Button>
            </Link>
          </div>
        </div>

        {/* Course Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Course Info */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">{course.name}</CardTitle>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className={getStatusColor(status)}>{status.replace("_", " ")}</Badge>
                      {course.topic && <Badge variant="outline">{course.topic.name}</Badge>}
                      <Badge variant={course.pricing_type === "free" ? "secondary" : "default"}>
                        {course.formatted_price}
                      </Badge>
                    </div>
                  </div>
                  {course.image_url && (
                    <img
                      src={course.image_url || "/placeholder.svg"}
                      alt={course.name}
                      className="w-32 h-24 object-cover rounded-lg border"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: course.description }} />
                </div>

                {/* Target Audience */}
                <div>
                  <h3 className="font-semibold mb-2">Target Audience</h3>
                  <p className="text-muted-foreground">{course.target_audience}</p>
                </div>

                {/* Community Impact */}
                {course.community_impact && (
                  <div>
                    <h3 className="font-semibold mb-2">Community Impact</h3>
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: course.community_impact }}
                    />
                  </div>
                )}

                {/* Learning Outcomes */}
                {course.learning_outcomes.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Learning Outcomes</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {course.learning_outcomes.map((outcome, index) => (
                        <li key={index} className="text-muted-foreground">
                          {outcome}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prerequisites */}
                {course.prerequisites.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Prerequisites</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {course.prerequisites.map((prerequisite, index) => (
                        <li key={index} className="text-muted-foreground">
                          {prerequisite}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Materials Needed */}
                {course.materials_needed.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Materials Needed</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {course.materials_needed.map((material, index) => (
                        <li key={index} className="text-muted-foreground">
                          {material}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Accessibility Features */}
                {course.accessibility_features.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Accessibility Features</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {course.accessibility_features.map((feature, index) => (
                        <li key={index} className="text-muted-foreground">
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Meeting Link Card */}
            {course.meeting_link && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Meeting Link
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm font-mono break-all text-muted-foreground mb-2">{course.meeting_link}</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(course.meeting_link!)}
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                      <Button size="sm" onClick={() => window.open(course.meeting_link!, "_blank")} className="flex-1">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enrollment Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Enrollment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{enrollmentStats.total_enrolled}</div>
                  <div className="text-sm text-muted-foreground">
                    of {enrollmentStats.max_participants} participants
                  </div>
                </div>
                <Progress value={enrollmentStats.enrollment_percentage} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span>{enrollmentStats.enrollment_percentage}% full</span>
                  <span>{enrollmentStats.available_spots} spots left</span>
                </div>
              </CardContent>
            </Card>

            {/* Course Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Course Details
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
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium">{new Date(course.start_date).toLocaleDateString()}</div>
                    <div className="text-sm text-muted-foreground">Start Date</div>
                  </div>
                </div>

                {/* End Date display if available */}
                {course.end_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-red-500" />
                    <div>
                      <div className="font-medium">{new Date(course.end_date).toLocaleDateString()}</div>
                      <div className="text-sm text-muted-foreground">End Date</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium">{course.start_time}</div>
                    <div className="text-sm text-muted-foreground">Start Time</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="font-medium">{course.formatted_duration}</div>
                    <div className="text-sm text-muted-foreground">Duration</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="font-medium">{course.language}</div>
                    <div className="text-sm text-muted-foreground">Language</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rating & Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Rating & Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="h-6 w-6 text-yellow-500 fill-current" />
                    <span className="text-2xl font-bold">{course.rating}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Based on {course.total_reviews} reviews</div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span className="text-sm">Certificate</span>
                  </div>
                  <Badge variant={course.certificate_provided ? "default" : "secondary"}>
                    {course.certificate_provided ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">Volunteer Opportunities</span>
                  </div>
                  <Badge variant={course.volunteer_opportunities ? "default" : "secondary"}>
                    {course.volunteer_opportunities ? "Yes" : "No"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Organization Info */}
            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="font-medium">{course.organization.name}</div>
                  <div className="text-sm text-muted-foreground">{course.organization.email}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProfileLayout>
  )
}

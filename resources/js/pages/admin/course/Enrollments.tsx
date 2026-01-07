"use client"

import { Head, Link } from "@inertiajs/react"
import {
  ArrowLeft,
  Users,
  Mail,
  UserCheck,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  DollarSign,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/admin/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
import AppLayout from "@/layouts/app-layout"
import { route } from "ziggy-js"

interface User {
  id: number
  name: string
  email: string
}

interface Enrollment {
  id: number
  user: User
  status: string
  enrolled_at: string
  amount_paid: number
  enrollment_id: string
  payment_method?: string | null
}

interface EnrollmentStats {
  total_enrolled: number
  max_participants: number
  enrollment_percentage: number
  available_spots: number
}

interface Course {
  id: number
  name: string
  slug: string
  type: "course" | "event"
  start_date: string
  start_time: string
  topic: { name: string } | null
  event_type: { name: string } | null
}

interface AdminCourseEnrollmentsProps {
  course: Course
  enrollments: Enrollment[]
  enrollmentStats: EnrollmentStats
}

export default function AdminCourseEnrollments({
  course,
  enrollments,
  enrollmentStats,
}: AdminCourseEnrollmentsProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case "completed":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case "cancelled":
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            {status}
          </Badge>
        )
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <AppLayout>
      <Head title={`Enrollments - ${course.name} - Courses & Events`} />

      <div className="space-y-6 m-10">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={route("admin.courses.show", course.slug)}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {course.type === "event" ? "Event" : "Course"} Details
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Enrollments - {course.name}
              </h1>
              <p className="text-muted-foreground">
                View all enrolled users for this {course.type === "event" ? "event" : "course"}
              </p>
            </div>
          </div>
        </div>

        {/* Enrollment Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <div className="text-3xl font-bold text-primary">{enrollmentStats.total_enrolled}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {course.type === "course" ? "Students Enrolled" : "Participants Registered"}
                </div>
              </div>
              <div className="text-center p-4 bg-blue-500/5 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{enrollmentStats.max_participants}</div>
                <div className="text-sm text-muted-foreground mt-1">Max Participants</div>
              </div>
              <div className="text-center p-4 bg-green-500/5 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{enrollmentStats.available_spots}</div>
                <div className="text-sm text-muted-foreground mt-1">Available Spots</div>
              </div>
              <div className="text-center p-4 bg-yellow-500/5 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600">
                  {enrollmentStats.enrollment_percentage}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">Enrollment Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course/Event Info */}
        <Card>
          <CardHeader>
            <CardTitle>{course.type === "event" ? "Event" : "Course"} Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Name</span>
                <div className="font-semibold">{course.name}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Type</span>
                <div>
                  <Badge className={course.type === "event" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}>
                    {course.type === "event" ? "Event" : "Course"}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  {course.type === "course" ? "Topic" : "Event Type"}
                </span>
                <div className="font-semibold">
                  {course.type === "course" ? course.topic?.name : course.event_type?.name || "N/A"}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Start Date & Time</span>
                <div className="font-semibold">
                  {new Date(course.start_date).toLocaleDateString()} at {course.start_time}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollments List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Enrollments ({enrollments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enrollments.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Enrollments Yet</h3>
                <p className="text-muted-foreground">
                  This {course.type === "event" ? "event" : "course"} doesn't have any enrollments yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                        User
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                        Enrolled Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                        Amount Paid
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                        Enrollment ID
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                        Payment Method
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enrollment) => (
                      <tr
                        key={enrollment.id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {enrollment.user.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {enrollment.user.email}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(enrollment.status)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatDate(enrollment.enrolled_at)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {enrollment.amount_paid > 0
                                ? formatCurrency(enrollment.amount_paid)
                                : "Free"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-mono text-muted-foreground">
                            {enrollment.enrollment_id}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {enrollment.payment_method ? (
                            <Badge
                              variant="outline"
                              className={
                                enrollment.payment_method === 'stripe'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                                  : enrollment.payment_method === 'believe_points'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-300 dark:border-purple-700'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              {enrollment.payment_method === 'stripe' ? 'Card/Stripe' : enrollment.payment_method === 'believe_points' ? 'Believe Points' : enrollment.payment_method}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}


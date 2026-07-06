"use client"

import { Head, Link } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
import type { ConnectionHubType } from "@/lib/connection-hub-type"
import { connectionHubTypeLabel, isEventsHubType } from "@/lib/connection-hub-type"

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
  type: ConnectionHubType
  start_date: string
  start_time: string
  topic: { name: string } | null
  event_type: { name: string } | null
}

interface ProfileCourseEnrollmentsProps {
  course: Course
  enrollments: Enrollment[]
  enrollmentStats: EnrollmentStats
}

export default function ProfileCourseEnrollments({
  course,
  enrollments,
  enrollmentStats,
}: ProfileCourseEnrollmentsProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Active
          </Badge>
        )
      case "completed":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            <XCircle className="mr-1 h-3 w-3" />
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
    <ProfileLayout title={`Enrollments — ${course.name}`} description="View enrolled participants for this listing">
      <Head title={`Enrollments — ${course.name}`} />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-8">
          <Link
            href={route("profile.course.show", course.slug)}
            className="mb-4 inline-flex items-center text-sm font-medium text-gray-600 transition hover:text-purple-700 dark:text-gray-400 dark:hover:text-purple-400"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to listing
          </Link>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-100 p-3 dark:bg-purple-900/40">
              <Users className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                Enrollments — {course.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                View all enrolled users for this {connectionHubTypeLabel(course.type)} listing
              </p>
            </div>
          </div>
        </div>

        <Card className="mb-6 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Enrollment statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-purple-50 p-4 text-center dark:bg-purple-950/30">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {enrollmentStats.total_enrolled}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {!isEventsHubType(course.type) ? "Students enrolled" : "Participants registered"}
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-950/30">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {enrollmentStats.max_participants}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">Max participants</div>
              </div>
              <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-950/30">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {enrollmentStats.available_spots}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">Available spots</div>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center dark:bg-amber-950/30">
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {enrollmentStats.enrollment_percentage}%
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">Enrollment rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All enrollments ({enrollments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enrollments.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">No enrollments yet</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This listing does not have any enrollments yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">User</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Enrolled date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Amount paid
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Enrollment ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Payment method
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enrollment) => (
                      <tr
                        key={enrollment.id}
                        className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {enrollment.user.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{enrollment.user.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(enrollment.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(enrollment.enrolled_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {enrollment.amount_paid > 0 ? formatCurrency(enrollment.amount_paid) : "Free"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                            {enrollment.enrollment_id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {enrollment.payment_method ? (
                            <Badge variant="outline" className="text-xs">
                              <CreditCard className="mr-1 h-3 w-3" />
                              {enrollment.payment_method === "stripe"
                                ? "Card/Stripe"
                                : enrollment.payment_method === "believe_points"
                                  ? "Believe Points"
                                  : enrollment.payment_method}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-600 dark:text-gray-400">N/A</span>
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
    </ProfileLayout>
  )
}

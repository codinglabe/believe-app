"use client"

import { Head, Link } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import {
  ArrowLeft,
  Users,
  BookOpen,
  Calendar,
  UserCheck,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
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
  payment_method?: string | null
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

interface EnrollmentByCourse {
  course: Course
  enrollments: Enrollment[]
  total_enrolled: number
}

interface Host {
  id: number
  name: string
}

interface AllEnrollmentsPageProps {
  host: Host
  enrollmentsByCourse: EnrollmentByCourse[]
}

export default function ProfileCourseAllEnrollments({
  host,
  enrollmentsByCourse,
}: AllEnrollmentsPageProps) {
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
    <ProfileLayout title="Enrollments" description="View enrolled participants across your Connection Hub listings">
      <Head title="Connection Hub Enrollments" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-8">
          <Link
            href={route("profile.course.index")}
            className="mb-4 inline-flex items-center text-sm font-medium text-gray-600 transition hover:text-purple-700 dark:text-gray-400 dark:hover:text-purple-400"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Connection Hub
          </Link>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Enrollments — {host.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View all enrolled users for your hosted Connection Hub listings
          </p>
        </div>

        {enrollmentsByCourse.length === 0 ? (
          <Card className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <CardContent className="py-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">No enrollments yet</h3>
              <p className="text-gray-600 dark:text-gray-400">
                When participants enroll in your listings, they will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {enrollmentsByCourse.map((item) => (
              <Card key={item.course.id} className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                          {item.course.name}
                        </CardTitle>
                        <Badge className="bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
                          {connectionHubTypeLabel(item.course.type)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>
                            {!isEventsHubType(item.course.type)
                              ? item.course.topic?.name
                              : item.course.event_type?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(item.course.start_date).toLocaleDateString()} at {item.course.start_time}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{item.total_enrolled} enrolled</span>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={route("profile.course.enrollments.show", item.course.slug)}
                      className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      View full list
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            User
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            Enrolled
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                            Payment
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.enrollments.map((enrollment) => (
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
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {enrollment.user.email}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">{getStatusBadge(enrollment.status)}</td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(enrollment.enrolled_at)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {enrollment.amount_paid > 0 ? formatCurrency(enrollment.amount_paid) : "Free"}
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProfileLayout>
  )
}

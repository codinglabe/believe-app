"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
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
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Link } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"
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
  type: "course" | "event"
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

interface Organization {
  id: number
  name: string
  user: {
    slug: string
  }
}

interface EnrollmentsPageProps {
  organization: Organization
  enrollmentsByCourse: EnrollmentByCourse[]
}

export default function OrganizationEnrollmentsPage({
  organization,
  enrollmentsByCourse,
}: EnrollmentsPageProps) {
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
    <FrontendLayout>
      <PageHead title="Course Enrollments" description="View and manage enrollments for your organization's courses and events." />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={route("organizations.show", { slug: organization.user.slug })}
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Organization
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Enrollments - {organization.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View all enrolled users for courses and events
            </p>
          </div>

          {/* Enrollments by Course/Event */}
          {enrollmentsByCourse.length === 0 ? (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Enrollments Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This organization doesn't have any enrollments yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {enrollmentsByCourse.map((item, index) => (
                <motion.div
                  key={item.course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                              {item.course.name}
                            </CardTitle>
                            <Badge
                              className={
                                item.course.type === "course"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                              }
                            >
                              {item.course.type === "course" ? "Course" : "Event"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              <span>
                                {item.course.type === "course"
                                  ? item.course.topic?.name
                                  : item.course.event_type?.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(item.course.start_date).toLocaleDateString()} at{" "}
                                {item.course.start_time}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{item.total_enrolled} enrolled</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                                  User
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                                  Email
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                                  Status
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                                  Enrolled Date
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                                  Amount Paid
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                                  Payment Method
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.enrollments.map((enrollment) => (
                                <tr
                                  key={enrollment.id}
                                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <UserCheck className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {enrollment.user.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {enrollment.user.email}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">{getStatusBadge(enrollment.status)}</td>
                                  <td className="py-3 px-4">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {formatDate(enrollment.enrolled_at)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {enrollment.amount_paid > 0
                                        ? formatCurrency(enrollment.amount_paid)
                                        : "Free"}
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
                                      <span className="text-sm text-gray-600 dark:text-gray-400">N/A</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}


"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { CheckCircle, Calendar, Clock, MapPin, Download, ArrowRight, Home, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Link } from "@inertiajs/react"
import { route } from "ziggy-js"

interface Course {
  id: number
  name: string
  slug: string
  description: string
  pricing_type: "free" | "paid"
  course_fee: number | null
  start_date: string
  start_time: string | null
  duration: string
  format: string
  formatted_price: string
  formatted_duration: string
  formatted_format: string
  image_url?: string
  meeting_link?: string | null
  topic: {
    name: string
  } | null
  event_type: {
    name: string
  } | null
  organization: {
    name: string
  } | null
}

interface Enrollment {
  id: number
  enrollment_id: string
  status: string
  amount_paid: number
  enrolled_at: string
  transaction_id: string
}

interface Props {
  enrollment: Enrollment
  course: Course
  type: "free" | "paid"
}

export default function EnrollmentSuccess({ enrollment, course, type }: Props) {
  console.log(course)
  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Success Header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full mb-6">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Enrollment Successful! 🎉
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Congratulations! You have successfully enrolled in <strong>{course.name}</strong>.
                {type === "paid" && " Your payment has been processed."}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Enrollment Details */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                >
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Enrollment Confirmation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">Enrollment ID</span>
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          >
                            {enrollment.enrollment_id}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-green-700 dark:text-green-300">Status:</span>
                            <span className="ml-2 font-medium">Active</span>
                          </div>
                          <div>
                            <span className="text-green-700 dark:text-green-300">Enrolled:</span>
                            <span className="ml-2 font-medium">
                              {new Date(enrollment.enrolled_at).toLocaleDateString()}
                            </span>
                          </div>
                          {type === "paid" && (
                            <>
                              <div>
                                <span className="text-green-700 dark:text-green-300">Amount Paid:</span>
                                <span className="ml-2 font-medium">${enrollment.amount_paid}</span>
                              </div>
                              <div>
                                <span className="text-green-700 dark:text-green-300">Transaction ID:</span>
                                <span className="ml-2 font-medium text-xs">{enrollment.transaction_id}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Course Information */}
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Course Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span>
                              <strong>Date:</strong> {new Date(course.start_date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span>
                              <strong>Time:</strong> {course.start_time || "TBD"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span>
                              <strong>Duration:</strong> {course.formatted_duration}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span>
                              <strong>Format:</strong> {course.formatted_format}
                            </span>
                          </div>
                          {course.organization && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-600" />
                              <span>
                                <strong>Organization:</strong> {course.organization.name}
                              </span>
                            </div>
                          )}
                          {course.meeting_link && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-blue-600" />
                              <span>
                                <strong>Meeting Link:</strong>{" "}
                                <a 
                                  href={course.meeting_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  Join Meeting
                                </a>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Next Steps */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle>What's Next?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Check Your Email</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              You'll receive a confirmation email with course details and joining instructions.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Prepare for the Course</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Review the course materials and prerequisites to get the most out of your learning
                              experience.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">3</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Join the Course</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Attend the course on the scheduled date and time. We'll send you reminders!
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="sticky top-8 space-y-6"
                >
                  {/* Course Card */}
                  <Card className="shadow-lg">
                    <CardContent className="p-6">
                      {course.image_url && (
                        <img
                          src={course.image_url || "/placeholder.svg"}
                          alt={course.name}
                          className="w-full h-32 object-cover rounded-lg mb-4"
                        />
                      )}
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{course.name}</h3>
                      {course.organization && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">by {course.organization.name}</p>
                      )}
                      {(course.topic || course.event_type) && (
                        <Badge variant="secondary" className="mb-4">
                          {course.topic?.name || course.event_type?.name}
                        </Badge>
                      )}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Price:</span>
                          <span className="font-medium">{course.formatted_price}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                          <span className="font-medium">{course.formatted_duration}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Format:</span>
                          <span className="font-medium">{course.formatted_format}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Link href={route('enrollments.my')}>
                      <Button className="w-full" variant="default">
                        <Download className="mr-2 h-4 w-4" />
                        View My Enrollments
                      </Button>
                    </Link>
                    <Link href="/courses">
                      <Button className="w-full bg-transparent" variant="outline">
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Browse More Courses
                      </Button>
                    </Link>
                    <Link href="/dashboard">
                      <Button className="w-full bg-transparent" variant="outline">
                        <Home className="mr-2 h-4 w-4" />
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}

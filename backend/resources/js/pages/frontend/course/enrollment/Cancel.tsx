"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { XCircle, ArrowLeft, RefreshCw, Home, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Link } from "@inertiajs/react"

interface Course {
  id: number
  name: string
  slug: string
  description: string
  pricing_type: "free" | "paid"
  course_fee: number | null
  formatted_price: string
  image_url?: string
  topic: {
    name: string
  }
  organization: {
    name: string
  }
}

interface Enrollment {
  id: number
  enrollment_id: string
  status: string
  amount_paid: number
}

interface Props {
  enrollment: Enrollment
  course: Course
}

export default function EnrollmentCancel({ enrollment, course }: Props) {
  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Cancel Header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full mb-6">
                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Enrollment Cancelled
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Your enrollment for <strong>{course.name}</strong> has been cancelled.
                {course.pricing_type === "paid" && " No payment was processed."}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Cancellation Details */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                >
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        Cancellation Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800 dark:text-red-200">
                          Your enrollment process was cancelled before completion. No charges were made to your account.
                        </AlertDescription>
                      </Alert>

                      <div className="mt-6 space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Course Details</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Course:</span>
                              <span className="font-medium">{course.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Organization:</span>
                              <span className="font-medium">{course.organization.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Price:</span>
                              <span className="font-medium">{course.formatted_price}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Status:</span>
                              <span className="font-medium text-red-600">Cancelled</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* What Happened */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle>What Happened?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-400">
                          Your enrollment was cancelled during the payment process. This could happen for several
                          reasons:
                        </p>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                            You clicked the "Cancel" or "Back" button during payment
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                            Payment processing was interrupted
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                            Browser session expired or was closed
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                            Network connectivity issues
                          </li>
                        </ul>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                          <strong>Don't worry!</strong> No payment was processed and you can try enrolling again at any
                          time.
                        </p>
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
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">by {course.organization.name}</p>
                      <div className="text-center">
                        <span className="text-2xl font-bold text-green-600">{course.formatted_price}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Link href={`/courses/${course.slug}`}>
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Enrolling Again
                      </Button>
                    </Link>
                    <Link href="/courses">
                      <Button className="w-full bg-transparent" variant="outline">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Browse Other Courses
                      </Button>
                    </Link>
                    <Link href={`/courses/${course.slug}`}>
                      <Button className="w-full bg-transparent" variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Course
                      </Button>
                    </Link>
                    <Link href="/dashboard">
                      <Button className="w-full bg-transparent" variant="outline">
                        <Home className="mr-2 h-4 w-4" />
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>

                  {/* Help Section */}
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg">Need Help?</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        If you're experiencing issues with enrollment, please contact our support team.
                      </p>
                      <Button variant="outline" className="w-full bg-transparent" size="sm">
                        Contact Support
                      </Button>
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

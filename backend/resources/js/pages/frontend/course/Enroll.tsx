"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
  Calendar,
  Clock,
  Users,
  MapPin,
  LinkIcon,
  Copy,
  Coins,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Link, useForm, usePage } from "@inertiajs/react"
import { type FormEventHandler, useState } from "react"
import { Badge } from "@/components/ui/badge"

interface Course {
  id: number
  name: string
  slug: string
  description: string
  pricing_type: "free" | "paid"
  course_fee: number | null
  start_date: string
  end_date?: string
  start_time: string
  duration: string
  format: string
  max_participants: number
  enrolled: number
  formatted_price: string
  formatted_duration: string
  formatted_format: string
  image_url?: string
  meeting_link?: string
  topic: {
    name: string
  }
  organization: {
    name: string
  }
}

interface Props {
  course: Course
}

export default function FrontendCourseEnroll({ course }: Props) {
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'believe_points'>('stripe')
  const [copied, setCopied] = useState(false)
  const page = usePage()
  const auth = (page.props as any).auth
  const currentBalance = parseFloat(auth?.user?.believe_points) || 0

  const { data, setData, post, processing, errors } = useForm({
    terms_accepted: false,
    payment_method: 'stripe',
  })

  // Update form data when payment method changes
  const handlePaymentMethodChange = (method: 'stripe' | 'believe_points') => {
    setPaymentMethod(method)
    setData("payment_method", method)
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()

    if (course.pricing_type === "paid") {
      setData("payment_method", paymentMethod)
    }

    post(`/courses/${course.slug}/enroll`)
  }

  const pointsRequired = course.pricing_type === "paid" && course.course_fee ? parseFloat(course.course_fee.toString()) || 0 : 0
  const hasEnoughPoints = currentBalance >= pointsRequired

  const copyMeetingLink = () => {
    if (course.meeting_link) {
      navigator.clipboard.writeText(course.meeting_link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const availableSpots = course.max_participants - course.enrolled

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <Link href={`/courses/${course.slug}`}>
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Course
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Enroll in {course.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Complete your enrollment to secure your spot in this course.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Enrollment Form */}
              <div className="lg:col-span-2">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        Enrollment Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={submit} className="space-y-6">
                        {/* Course Summary */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Course Summary</h3>
                          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex justify-between">
                              <span>Course:</span>
                              <span className="font-medium">{course.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Price:</span>
                              <span className="font-medium text-green-600">{course.formatted_price}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Duration:</span>
                              <span className="font-medium">{course.formatted_duration}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Format:</span>
                              <span className="font-medium">{course.formatted_format}</span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Section for Paid Courses */}
                        {course.pricing_type === "paid" && (
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Method</h3>

                            {/* Payment Method Selection */}
                            <div className="space-y-3">
                              {/* Stripe Payment */}
                              <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                paymentMethod === 'stripe'
                                  ? 'border-primary bg-primary/10'
                                  : 'border-input hover:border-primary/50'
                              }`}>
                                <input
                                  type="radio"
                                  name="payment_method"
                                  value="stripe"
                                  checked={paymentMethod === 'stripe'}
                                  onChange={(e) => handlePaymentMethodChange(e.target.value as 'stripe' | 'believe_points')}
                                  className="w-4 h-4 text-primary"
                                />
                                <CreditCard className="h-5 w-5" />
                                <div className="flex-1">
                                  <div className="font-semibold">Pay with Card (Stripe)</div>
                                  <div className="text-sm text-muted-foreground">Secure payment via Stripe</div>
                                </div>
                              </label>

                              {/* Believe Points Payment */}
                              <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                paymentMethod === 'believe_points'
                                  ? 'border-primary bg-primary/10'
                                  : 'border-input hover:border-primary/50'
                              } ${!hasEnoughPoints ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <input
                                  type="radio"
                                  name="payment_method"
                                  value="believe_points"
                                  checked={paymentMethod === 'believe_points'}
                                  onChange={(e) => handlePaymentMethodChange(e.target.value as 'stripe' | 'believe_points')}
                                  disabled={!hasEnoughPoints}
                                  className="w-4 h-4 text-primary"
                                />
                                <Coins className="h-5 w-5 text-yellow-600" />
                                <div className="flex-1">
                                  <div className="font-semibold flex items-center gap-2">
                                    Pay with Believe Points
                                    {!hasEnoughPoints && (
                                      <Badge variant="destructive" className="text-xs">
                                        Insufficient
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Your balance: {currentBalance.toFixed(2)} points
                                    {hasEnoughPoints && (
                                      <span className="text-green-600 ml-2">
                                        (You'll have {(currentBalance - pointsRequired).toFixed(2)} points remaining)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </label>
                            </div>

                            {paymentMethod === 'believe_points' && !hasEnoughPoints && (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  You need {pointsRequired.toFixed(2)} points but only have {currentBalance.toFixed(2)} points.
                                </AlertDescription>
                              </Alert>
                            )}

                            {paymentMethod === 'stripe' && (
                              <Alert>
                                <Shield className="h-4 w-4" />
                                <AlertDescription>
                                  Your payment information is secure and encrypted. We use Stripe for payment processing.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}

                        {/* Terms and Conditions */}
                        <div className="space-y-4">
                          <Separator />
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id="terms"
                              checked={data.terms_accepted}
                              onCheckedChange={(checked) => setData("terms_accepted", checked as boolean)}
                            />
                            <div className="grid gap-1.5 leading-none">
                              <Label
                                htmlFor="terms"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                I accept the terms and conditions
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                By enrolling, you agree to our{" "}
                                <Link href="#" className="text-blue-600 hover:underline">
                                  Terms of Service
                                </Link>{" "}
                                and{" "}
                                <Link href="#" className="text-blue-600 hover:underline">
                                  Privacy Policy
                                </Link>
                                .
                              </p>
                            </div>
                          </div>
                          {errors.terms_accepted && <p className="text-sm text-red-600">{errors.terms_accepted}</p>}
                        </div>

                        {/* Submit Button */}
                        <Button
                          type="submit"
                          className="w-full bg-green-600 hover:bg-green-700"
                          size="lg"
                          disabled={processing || !data.terms_accepted || (course.pricing_type === "paid" && paymentMethod === 'believe_points' && !hasEnoughPoints)}
                        >
                          {processing ? (
                            "Processing..."
                          ) : course.pricing_type === "paid" ? (
                            paymentMethod === 'believe_points' ? (
                              <>
                                <Coins className="mr-2 h-4 w-4" />
                                Pay {pointsRequired.toFixed(2)} Points & Enroll
                              </>
                            ) : (
                              <>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Pay ${course.course_fee} & Enroll
                              </>
                            )
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Enroll for Free
                            </>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Course Info Sidebar */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
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

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span>
                            {new Date(course.start_date).toLocaleDateString()} at {course.start_time}
                            {course.end_date && ` - ${new Date(course.end_date).toLocaleDateString()}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span>{course.formatted_duration}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <span>{course.formatted_format}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span>{availableSpots} spots remaining</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Security Notice */}
                  <Card className="shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Secure Enrollment</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Your personal and payment information is protected with industry-standard encryption.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Refund Policy */}
                  {course.pricing_type === "paid" && (
                    <Card className="shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Refund Policy</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Full refund available within 7 days of enrollment. Cancellations must be made at least 24
                              hours before course start.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Meeting Link Card */}
                  {course.meeting_link && (
                    <Card className="shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                          <LinkIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Meeting Link</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              Join the course using this meeting link after enrollment.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={copyMeetingLink}
                                className="flex-1 bg-transparent"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                {copied ? "Copied!" : "Copy Link"}
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => window.open(course.meeting_link, "_blank")}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                              >
                                Open Meeting
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}

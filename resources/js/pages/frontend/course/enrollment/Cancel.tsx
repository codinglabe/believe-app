"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import {
  XCircle,
  ArrowLeft,
  RefreshCw,
  Home,
  BookOpen,
  Building2,
  Tag,
  ShieldCheck,
  HelpCircle,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
  topic?: {
    name: string
  } | null
  organization?: {
    name: string
  } | null
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
  const orgName = course.organization?.name ?? "Organization"
  const isPaid = course.pricing_type === "paid"

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="border-b border-slate-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-4">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-purple-700 dark:text-slate-400 dark:hover:text-purple-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              All courses
            </Link>
          </div>
        </div>

        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-center mb-10 sm:mb-12"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 ring-1 ring-amber-200/80 dark:from-amber-950/40 dark:to-orange-950/30 dark:ring-amber-900/50">
              <XCircle className="h-8 w-8 text-amber-600 dark:text-amber-500" strokeWidth={1.75} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
              Checkout incomplete
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
              Enrollment wasn&apos;t completed
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              You left before finishing payment for{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{course?.name ?? "this course"}</span>.
              {isPaid && (
                <span className="block sm:inline sm:ml-1 mt-1 sm:mt-0 text-slate-600 dark:text-slate-400">
                  No charge was made.
                </span>
              )}
            </p>
            {enrollment?.enrollment_id && (
              <div className="mt-6 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-mono text-slate-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-slate-300">
                  <span className="text-slate-400 dark:text-slate-500">Ref.</span>
                  {enrollment.enrollment_id}
                </div>
              </div>
            )}
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
            {/* Main column */}
            <div className="lg:col-span-3 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
              >
                <Card className="overflow-hidden border-slate-200/90 shadow-xl shadow-slate-200/40 dark:border-gray-800 dark:shadow-none">
                  <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4 dark:from-gray-900 dark:to-gray-900/50 dark:border-gray-800">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">What this means</h2>
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-200"
                      >
                        Cancelled
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6 sm:p-8 space-y-6">
                    <div className="flex gap-4 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                        <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-emerald-900 dark:text-emerald-100">Your account is unchanged</p>
                        <p className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-200/80 leading-relaxed">
                          {isPaid
                            ? "We did not capture a payment. You can return to the course and try checkout again whenever you're ready."
                            : "You can return to the course and complete enrollment when you're ready."}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Common reasons</h3>
                      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                        {[
                          "Closed the Stripe checkout or clicked back",
                          "Payment was interrupted or declined",
                          "Session timed out or the tab was closed",
                        ].map((line) => (
                          <li key={line} className="flex gap-3">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500/80" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Card className="border-slate-200/90 shadow-md dark:border-gray-800">
                  <CardContent className="p-6 sm:p-8">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-4">
                      Session details
                    </h3>
                    <div className="divide-y divide-slate-100 dark:divide-gray-800">
                      <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
                        <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <BookOpen className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                          Course
                        </span>
                        <span className="text-right text-sm font-medium text-slate-900 dark:text-white max-w-[60%]">
                          {course?.name ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-4 py-3">
                        <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Building2 className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                          Organization
                        </span>
                        <span className="text-right text-sm font-medium text-slate-900 dark:text-white max-w-[60%]">
                          {orgName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-3">
                        <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Tag className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                          Listed price
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                          {course.formatted_price}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.12 }}
                className="lg:sticky lg:top-24 space-y-6"
              >
                <Card className="overflow-hidden border-slate-200/90 shadow-lg dark:border-gray-800">
                  {course.image_url ? (
                    <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-gray-800">
                      <img
                        src={course.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] w-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-950/40 dark:to-blue-950/40" />
                  )}
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-snug mb-1">
                      {course?.name ?? "Course"}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{orgName}</p>
                    <div className="flex items-baseline justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/80">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Price
                      </span>
                      <span className="text-xl font-bold tabular-nums bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        {course.formatted_price}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <Link href={`/courses/${course.slug}/enroll`} className="block">
                    <Button className="h-12 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md hover:from-purple-700 hover:to-blue-700">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Continue to checkout
                      <ChevronRight className="ml-2 h-4 w-4 opacity-80" />
                    </Button>
                  </Link>
                  <Link href={`/courses/${course.slug}`} className="block">
                    <Button variant="outline" className="h-11 w-full border-slate-200 dark:border-gray-700">
                      <BookOpen className="mr-2 h-4 w-4" />
                      View course page
                    </Button>
                  </Link>
                  <Link href="/courses" className="block">
                    <Button variant="ghost" className="h-11 w-full text-slate-600 dark:text-slate-400">
                      Browse all courses
                    </Button>
                  </Link>
                  <Separator className="my-2" />
                  <Link href="/dashboard" className="block">
                    <Button variant="ghost" className="h-11 w-full text-slate-600 dark:text-slate-400">
                      <Home className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                </div>

                <Card className="border-slate-200/80 bg-slate-50/50 dark:border-gray-800 dark:bg-gray-900/30">
                  <CardContent className="p-5 flex gap-3">
                    <HelpCircle className="h-5 w-5 shrink-0 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Need help?</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        If checkout keeps failing, try another card or contact support with your enrollment reference
                        above.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}

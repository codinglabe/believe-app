"use client"

import { Link, router, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import {
  BookOpen,
  Bot,
  Briefcase,
  GraduationCap,
  Heart,
  Home,
  Lightbulb,
  ListChecks,
  Monitor,
  Plus,
  Sparkles,
  User,
  UserCircle,
  Users,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatCourseMonthDayBadge, formatCourseStartDisplay } from "@/lib/course-start-datetime"
import {
  connectionHubMyButtonHref,
  connectionHubTeachButtonHref,
  type ConnectionHubAuth,
} from "@/lib/connection-hub-hero-hrefs"

export interface LearningTopicCount {
  id: number
  name: string
  count: number
}

export interface LearningSpotlightCourse {
  id: number
  slug: string
  name: string
  image_url: string | null
  enrolled: number
  start_date: string
  start_time: string
  organization_name?: string | null
  formatted_format?: string
  creator?: { name: string }
}

/** Featured strip on the learning hub (card grid); mirrors events hub payload shape. */
export interface LearningFeaturedCourse {
  id: number
  slug: string
  name: string
  image_url: string | null
  enrolled: number
  start_date: string
  start_time: string
  end_date: string | null
  format: "online" | "in_person" | "hybrid"
  formatted_format?: string
  organization_name?: string | null
  creator?: { name: string }
}

export interface LearningHubStats {
  active_learners: number
  courses_available: number
  expert_mentors: number
  lessons_completed: number
  lives_impacted: number
}

const WHY_ITEMS = [
  {
    title: "Empower Others",
    body: "Help someone learn and grow.",
  },
  {
    title: "Build Community",
    body: "Stronger together through knowledge.",
  },
  {
    title: "Earn Rewards",
    body: "Earn BRP for teaching and helping.",
  },
  {
    title: "Make an Impact",
    body: "Your knowledge can change lives.",
  },
] as const

const CATEGORY_STYLE = [
  {
    gradient: "from-violet-600 to-purple-700",
    icon: GraduationCap,
  },
  {
    gradient: "from-emerald-600 to-teal-700",
    icon: Briefcase,
  },
  {
    gradient: "from-blue-600 to-indigo-700",
    icon: Monitor,
  },
  {
    gradient: "from-orange-500 to-amber-600",
    icon: Heart,
  },
  {
    gradient: "from-rose-700 to-red-900",
    icon: Home,
  },
  {
    gradient: "from-cyan-600 to-teal-600",
    icon: Sparkles,
  },
] as const

function formatStat(n: number): string {
  return n.toLocaleString()
}

export default function LearningConnectionHubLanding({
  learningTopicCounts,
  learningExploreUsesEventTypes = false,
  learningSpotlightCourses,
  learningFeaturedCourses,
  learningStats,
}: {
  learningTopicCounts: LearningTopicCount[]
  /** When true, category chips filter by `event_type_id` (listings use event types, not topics). */
  learningExploreUsesEventTypes?: boolean
  learningSpotlightCourses: LearningSpotlightCourse[]
  learningFeaturedCourses: LearningFeaturedCourse[]
  learningStats: LearningHubStats | null
}) {
  const auth = usePage().props.auth as ConnectionHubAuth | undefined

  const loginWithRedirect = (path: string) =>
    `${route("login")}?redirect=${encodeURIComponent(path)}`

  const teachHref =
    connectionHubTeachButtonHref(auth) ??
    loginWithRedirect(route("profile.course.create"))
  const myLearningHref =
    connectionHubMyButtonHref(auth) ?? loginWithRedirect(route("enrollments.my"))

  /** Full searchable catalog (all types) — hub pages no longer embed the table below. */
  const goToFullCatalog = () => {
    router.get(route("course.index"), {}, { preserveState: false, preserveScroll: false })
  }

  const filterTopic = (id: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set("type", "learning")
    params.set("page", "1")
    if (learningExploreUsesEventTypes) {
      params.delete("topic_id")
      params.set("event_type_id", String(id))
    } else {
      params.delete("event_type_id")
      params.set("topic_id", String(id))
    }
    router.get(`/courses?${params.toString()}`, {}, { preserveState: false, preserveScroll: false })
  }

  const viewAllCategories = () => {
    goToFullCatalog()
  }

  const viewAllLive = () => {
    goToFullCatalog()
  }

  const stats = learningStats ?? {
    active_learners: 0,
    courses_available: 0,
    expert_mentors: 0,
    lessons_completed: 0,
    lives_impacted: 0,
  }

  const formatLearningFeaturedLabel = (course: LearningFeaturedCourse) =>
    course.formatted_format ||
    ({ online: "Online", in_person: "In Person", hybrid: "Hybrid" }[course.format] ?? "Learning")

  return (
    <div className="space-y-0">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 dark:border-slate-800/80 dark:bg-[#0B0E14]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,58,237,0.5), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(59,130,246,0.15), transparent)`,
          }}
        />
        <div className="relative container mx-auto px-4 py-12 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_320px] lg:items-center lg:gap-10 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-xl"
          >
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
              <BookOpen className="h-4 w-4" aria-hidden />
              Connection Hub
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1] dark:text-white">
              Share Knowledge. Grow Together.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              A community of learners and mentors empowering each other to succeed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={goToFullCatalog}
                className="h-12 rounded-xl bg-violet-600 px-6 text-base font-semibold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500"
              >
                <BookOpen className="mr-2 h-5 w-5" aria-hidden />
                Browse Learning
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-12 rounded-xl border-slate-300 bg-white/80 px-6 text-base font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
              >
                <Link href={teachHref}>
                  <Plus className="mr-2 h-5 w-5" aria-hidden />
                  Teach &amp; Share
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-12 rounded-xl border-slate-300 bg-white/80 px-6 text-base font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
              >
                <Link href={myLearningHref}>
                  <User className="mr-2 h-5 w-5" aria-hidden />
                  My Learning
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="relative mx-auto mt-10 max-w-md lg:mx-0 lg:mt-0"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-white via-violet-50/90 to-slate-100 dark:border-violet-500/25 dark:from-slate-900 dark:via-violet-950/40 dark:to-slate-900">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pb-6">
                <div className="relative mb-4 flex h-24 w-36 items-center justify-center rounded-xl border border-violet-300/60 bg-white/95 shadow-inner shadow-violet-200/30 dark:border-violet-500/30 dark:bg-slate-950/80 dark:shadow-violet-500/20">
                  <Monitor className="h-12 w-12 text-violet-600 dark:text-violet-400" aria-hidden />
                  <span className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 shadow-lg shadow-violet-900/30 dark:shadow-violet-900/50">
                    <Lightbulb className="h-5 w-5 text-white" aria-hidden />
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-violet-700 dark:border-white/10 dark:bg-slate-800/90 dark:text-violet-200",
                        i === 1 && "ring-2 ring-violet-500/50 dark:ring-violet-500/60",
                      )}
                      aria-hidden
                    >
                      <Users className="h-5 w-5 opacity-80" />
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Collaborate • Learn • Teach
            </p>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-md backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-xl lg:mt-0"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Why Share Knowledge?</h2>
            <ul className="mt-5 space-y-4">
              {WHY_ITEMS.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-600/25 dark:text-violet-300">
                    <Sparkles className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{item.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.aside>
        </div>
      </section>

      {/* Categories + Live */}
      <section className="border-b border-slate-200 bg-white py-12 dark:border-slate-800/80 dark:bg-[#0B0E14] sm:py-14">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-12">
            <div className="min-w-0 space-y-12">
              <div>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">Explore by Category</h2>
                  <button
                    type="button"
                    onClick={viewAllCategories}
                    className="text-sm font-medium text-violet-700 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300"
                  >
                    View all categories →
                  </button>
                </div>
                {learningTopicCounts.length > 0 ? (
                  <div className="flex flex-nowrap gap-3 overflow-x-auto pb-3 pt-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                    {learningTopicCounts.map((topic, idx) => {
                      const style = CATEGORY_STYLE[idx % CATEGORY_STYLE.length]
                      const Icon = style.icon
                      return (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => filterTopic(topic.id)}
                          className={cn(
                            "group flex min-h-[112px] w-[min(184px,calc(100vw-2.75rem))] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-gradient-to-br p-4 text-center text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg",
                            style.gradient,
                          )}
                        >
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="w-full break-words text-sm font-semibold leading-snug">
                            {topic.name}
                          </span>
                          <span className="text-xs text-white/85">
                            {formatStat(topic.count)} {topic.count === 1 ? "Course" : "Courses"}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                    <p className="text-sm">Categories will appear as learning listings are added.</p>
                    <button
                      type="button"
                      onClick={viewAllCategories}
                      className="mt-4 text-sm font-medium text-violet-700 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300"
                    >
                      Browse full catalog →
                    </button>
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-6 text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">Upcoming Featured Learning</h2>
                {learningFeaturedCourses.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {learningFeaturedCourses.map((course) => (
                      <Link
                        key={course.id}
                        href={route("course.show", course.slug)}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:border-violet-400 dark:border-slate-700/80 dark:bg-slate-900/60 dark:shadow-lg dark:hover:border-violet-500/40"
                      >
                        <div className="relative aspect-[16/10]">
                          <img
                            src={course.image_url || "/placeholder.svg?height=200&width=320&query=course"}
                            alt=""
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                          <Badge className="absolute left-3 top-3 border-0 bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Featured
                          </Badge>
                          <div className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2 py-1 text-[11px] font-bold tracking-wide text-white">
                            {formatCourseMonthDayBadge(course.start_date)}
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="font-semibold leading-snug text-slate-900 line-clamp-2 dark:text-white">{course.name}</p>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatCourseStartDisplay(course)}</p>
                          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-medium text-violet-700 dark:text-violet-300/90">{formatLearningFeaturedLabel(course)}</span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" aria-hidden />
                              {formatStat(course.enrolled)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500">
                    No featured learning listings yet. Open the full catalog to browse all courses.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/80 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live Learning Now</h2>
                  {learningSpotlightCourses.length > 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={viewAllLive}
                  className="text-xs font-medium text-violet-700 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 sm:text-sm"
                >
                  View all live sessions →
                </button>
              </div>
              <ul className="space-y-4">
                {learningSpotlightCourses.length > 0 ? (
                  learningSpotlightCourses.map((course) => {
                    const when = formatCourseStartDisplay(course)
                    return (
                      <li key={course.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-950/60">
                        <img
                          src={course.image_url || "/placeholder.svg?height=80&width=112&query=course"}
                          alt=""
                          className="h-16 w-24 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-snug text-slate-900 line-clamp-2 dark:text-slate-100">{course.name}</p>
                          {when ? (
                            <p className="mt-1 text-xs font-medium text-violet-700 dark:text-violet-300/90">{when}</p>
                          ) : null}
                        </div>
                        <Button
                          asChild
                          size="sm"
                          className="h-9 shrink-0 self-center rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white hover:bg-violet-500"
                        >
                          <Link href={route("course.show", course.slug)}>Join</Link>
                        </Button>
                      </li>
                    )
                  })
                ) : (
                  <li className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-500">
                    No learning listings are in progress right now. Open the full catalog to see upcoming sessions.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats + AI */}
      <section className="border-b border-slate-200 bg-slate-50 pb-12 pt-2 dark:border-slate-800/80 dark:bg-[#0B0E14] sm:pb-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
            Learning Together, Growing Together
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Active Learners", value: stats.active_learners, icon: Users },
              { label: "Courses Available", value: stats.courses_available, icon: BookOpen },
              { label: "Expert Mentors", value: stats.expert_mentors, icon: UserCircle },
              { label: "Lessons Completed", value: stats.lessons_completed, icon: ListChecks },
              { label: "Lives Impacted", value: stats.lives_impacted, icon: Heart },
            ].map((row) => {
              const StatIcon = row.icon
              return (
              <div
                key={row.label}
                className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
              >
                <StatIcon className="mb-3 h-8 w-8 text-violet-600 dark:text-violet-400" aria-hidden />
                <p className="text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl dark:text-white">{formatStat(row.value)}</p>
                <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm dark:text-slate-400">{row.label}</p>
              </div>
              )
            })}
          </div>

          <div className="mx-auto mt-12 max-w-lg">
            <div className="flex flex-col items-center rounded-2xl border border-violet-200 bg-gradient-to-br from-white to-violet-50 px-8 py-10 text-center shadow-md shadow-violet-200/30 dark:border-violet-500/25 dark:from-slate-900 dark:to-violet-950/50 dark:shadow-[0_0_40px_-10px_rgba(124,58,237,0.35)]">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-600/20 dark:text-violet-300">
                <Bot className="h-9 w-9" aria-hidden />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Learning Assistant</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Get quick answers about courses, schedules, and how to get started on Connection Hub.
              </p>
              <Link
                href={route("contact")}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Ask AI Assistant
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA strip */}
      <section className="border-y border-violet-200/80 bg-gradient-to-r from-violet-100 via-violet-50 to-indigo-100 py-10 dark:border-transparent dark:from-violet-900 dark:via-violet-800 dark:to-indigo-900">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 sm:flex-row">
          <p className="max-w-xl text-center text-base font-medium text-violet-950 sm:text-left dark:text-white/95">
            Share Your Knowledge. Inspire Others. Become a mentor and create courses that help others grow.
          </p>
          <Button
            asChild
            className="h-12 shrink-0 rounded-xl bg-violet-700 px-6 text-base font-semibold text-white hover:bg-violet-800 dark:bg-white dark:text-violet-900 dark:hover:bg-slate-100"
          >
            <Link href={teachHref}>
              <GraduationCap className="mr-2 h-5 w-5" aria-hidden />
              Start Teaching Today
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

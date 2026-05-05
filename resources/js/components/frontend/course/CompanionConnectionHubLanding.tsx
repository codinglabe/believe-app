"use client"

import { Link, router, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import {
  Bot,
  Clock,
  Cross,
  HandHeart,
  Heart,
  MessageCircle,
  Shield,
  Sparkles,
  UserRoundSearch,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatCourseStartDisplay } from "@/lib/course-start-datetime"
import { connectionHubTeachButtonHref, type ConnectionHubAuth } from "@/lib/connection-hub-hero-hrefs"
import type { EventsHubCourse } from "@/components/frontend/course/EventsConnectionHubLanding"

export interface CompanionEventTypeCount {
  id: number
  name: string
  count: number
}

export interface CompanionHubStats {
  active_companions: number
  conversations_today: number
  lives_impacted: number
  companion_volunteers: number
}

const YOU_MATTER_ITEMS = [
  {
    title: "Safe & Respectful",
    body: "A moderated space built on kindness and trust.",
    icon: Shield,
  },
  {
    title: "Faith-Inspired",
    body: "Ground conversations in hope and compassion.",
    icon: Cross,
  },
  {
    title: "Here to Listen",
    body: "Real people ready to walk alongside you.",
    icon: MessageCircle,
  },
  {
    title: "Always Here",
    body: "Reach out day or night — support when you need it.",
    icon: Clock,
  },
] as const

const CATEGORY_STYLE = [
  { gradient: "from-violet-600 to-fuchsia-700" },
  { gradient: "from-emerald-600 to-teal-700" },
  { gradient: "from-blue-600 to-indigo-700" },
  { gradient: "from-orange-500 to-amber-600" },
  { gradient: "from-rose-600 to-red-800" },
  { gradient: "from-cyan-600 to-violet-700" },
] as const

const CATEGORY_ICONS = [Heart, Sparkles, Users, MessageCircle, Heart, Users]

function formatStat(n: number): string {
  return n.toLocaleString()
}

export default function CompanionConnectionHubLanding({
  companionEventTypeCounts,
  companionExploreUsesEventTypes = true,
  companionFeaturedCourses,
  companionLiveCourses,
  companionStats,
}: {
  companionEventTypeCounts: CompanionEventTypeCount[]
  companionExploreUsesEventTypes?: boolean
  companionFeaturedCourses: EventsHubCourse[]
  companionLiveCourses: EventsHubCourse[]
  companionStats: CompanionHubStats | null
}) {
  const auth = usePage().props.auth as ConnectionHubAuth | undefined

  const loginWithRedirect = (path: string) =>
    `${route("login")}?redirect=${encodeURIComponent(path)}`

  const teachHref =
    connectionHubTeachButtonHref(auth) ?? loginWithRedirect(route("profile.course.create"))

  const chatAiHref = auth?.user ? route("chat.index") : loginWithRedirect(route("chat.index"))

  const goToFullCatalog = () => {
    router.get(route("course.index"), { type: "companion", view: "catalog" }, { preserveState: false, preserveScroll: false })
  }

  const filterCategory = (eventTypeId: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set("type", "companion")
    params.set("view", "catalog")
    params.set("page", "1")
    if (companionExploreUsesEventTypes) {
      params.delete("topic_id")
      params.set("event_type_id", String(eventTypeId))
    } else {
      params.delete("event_type_id")
      params.set("topic_id", String(eventTypeId))
    }
    router.get(`/courses?${params.toString()}`, {}, { preserveState: false, preserveScroll: false })
  }

  const viewAllCategories = () => {
    goToFullCatalog()
  }

  const viewAllLive = () => {
    goToFullCatalog()
  }

  const stats = companionStats ?? {
    active_companions: 0,
    conversations_today: 0,
    lives_impacted: 0,
    companion_volunteers: 0,
  }

  const formatFeaturedLabel = (course: EventsHubCourse) =>
    course.formatted_format ||
    ({ online: "Online", in_person: "In Person", hybrid: "Hybrid" }[course.format] ?? "Companion")

  return (
    <div className="relative overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#060814] dark:text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.14]"
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 45% at 50% -15%, rgba(192,38,211,0.35), transparent), radial-gradient(ellipse 50% 35% at 100% 10%, rgba(124,58,237,0.15), transparent), radial-gradient(ellipse 40% 30% at 0% 80%, rgba(99,102,241,0.08), transparent)`,
        }}
      />
      <div className="relative">
        <div className="container mx-auto px-4 py-12 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_300px] lg:items-center lg:gap-8 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-xl"
          >
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-300">
              <Heart className="h-4 w-4 fill-fuchsia-500/30" aria-hidden />
              Companion Hub
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1] dark:text-white">
              <span className="bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-fuchsia-300 dark:via-violet-200 dark:to-white">
                You’re Not Alone.
              </span>
              <br />
              <span className="text-slate-800 dark:text-white/95">Talk to Someone Today.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              Find real people, real conversations, and real connections.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={goToFullCatalog}
                className="h-12 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-6 text-base font-semibold text-white shadow-lg shadow-fuchsia-900/30 hover:from-fuchsia-500 hover:to-violet-500"
              >
                <MessageCircle className="mr-2 h-5 w-5" aria-hidden />
                Join a Companion
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-12 rounded-xl border-slate-300 bg-white/80 px-6 text-base font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
              >
                <Link href={route("find-supporters.index")}>
                  <UserRoundSearch className="mr-2 h-5 w-5" aria-hidden />
                  Find a Companion
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-12 rounded-xl border-slate-300 bg-white/80 px-6 text-base font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
              >
                <Link href={teachHref}>
                  <HandHeart className="mr-2 h-5 w-5" aria-hidden />
                  Become a Companion
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
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-slate-900 via-violet-950/80 to-slate-900 p-6 shadow-[0_0_60px_-12px_rgba(192,38,211,0.45)] dark:border-fuchsia-500/30">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(192,38,211,0.15),transparent_70%)]" />
              <div className="relative flex h-full flex-col items-center justify-center gap-4">
                <div className="flex w-full max-w-[280px] items-end justify-center gap-4">
                  <div className="flex h-20 w-16 flex-col items-center justify-end rounded-t-2xl border border-white/10 bg-slate-800/60 px-2 pb-2">
                    <Users className="h-8 w-8 text-fuchsia-300/90" aria-hidden />
                  </div>
                  <div className="relative flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-fuchsia-500/50 bg-fuchsia-500/20 shadow-[0_0_40px_rgba(192,38,211,0.5)]">
                    <Heart className="h-12 w-12 fill-fuchsia-400/40 text-fuchsia-200" aria-hidden />
                    <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500 text-white shadow-lg">
                      <Users className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                  <div className="flex h-20 w-16 flex-col items-center justify-end rounded-t-2xl border border-white/10 bg-slate-800/60 px-2 pb-2">
                    <Users className="h-8 w-8 text-violet-300/90" aria-hidden />
                  </div>
                </div>
                <p className="text-center text-sm font-medium text-slate-300">Connection · Care · Community</p>
              </div>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-10 rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-lg backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-2xl lg:mt-0"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">You Matter. We Care.</h2>
            <ul className="mt-4 space-y-3.5">
              {YOU_MATTER_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-600/25 dark:text-fuchsia-300">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{item.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{item.body}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </motion.aside>
        </div>

        <div className="container mx-auto px-4 pb-14 pt-4 sm:pb-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-12">
            <div className="min-w-0 space-y-12">
              <div>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">Browse by Category</h2>
                  <button
                    type="button"
                    onClick={viewAllCategories}
                    className="text-sm font-medium text-fuchsia-700 hover:text-fuchsia-800 dark:text-fuchsia-400 dark:hover:text-fuchsia-300"
                  >
                    View all categories →
                  </button>
                </div>
                {companionEventTypeCounts.length > 0 ? (
                  <div className="flex flex-nowrap gap-3 overflow-x-auto pb-3 pt-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                    {companionEventTypeCounts.map((row, idx) => {
                      const style = CATEGORY_STYLE[idx % CATEGORY_STYLE.length]
                      const Icon = CATEGORY_ICONS[idx % CATEGORY_ICONS.length]
                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => filterCategory(row.id)}
                          className={cn(
                            "group flex min-h-[112px] w-[min(184px,calc(100vw-2.75rem))] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-gradient-to-br p-4 text-center text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg",
                            style.gradient,
                          )}
                        >
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="w-full break-words text-sm font-semibold leading-snug">{row.name}</span>
                          <span className="text-xs text-white/85">
                            {formatStat(row.count)} {row.count === 1 ? "Listing" : "Listings"}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                    <p className="text-sm">Categories appear when companion listings are published.</p>
                    <button
                      type="button"
                      onClick={viewAllCategories}
                      className="mt-4 text-sm font-medium text-fuchsia-700 hover:text-fuchsia-800 dark:text-fuchsia-400"
                    >
                      Browse full catalog →
                    </button>
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-6 text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
                  Featured Companion Spaces
                </h2>
                {companionFeaturedCourses.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {companionFeaturedCourses.map((course) => (
                      <Link
                        key={course.id}
                        href={route("course.show", course.slug)}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:border-fuchsia-400 dark:border-slate-700/80 dark:bg-slate-900/60 dark:hover:border-fuchsia-500/40"
                      >
                        <div className="relative aspect-[16/10]">
                          <img
                            src={course.image_url || "/placeholder.svg?height=200&width=320&query=companion"}
                            alt=""
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                          <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                            {formatFeaturedLabel(course)}
                          </span>
                        </div>
                        <div className="p-4">
                          <p className="font-semibold leading-snug text-slate-900 line-clamp-2 dark:text-white">{course.name}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {course.enrolled} {course.enrolled === 1 ? "member" : "members"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-500">
                    No featured listings yet. Check back soon or browse the full catalog.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/80 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live Now</h2>
                    {companionLiveCourses.length > 0 && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={viewAllLive}
                    className="text-xs font-medium text-fuchsia-700 hover:text-fuchsia-800 dark:text-fuchsia-400 sm:text-sm"
                  >
                    View all rooms →
                  </button>
                </div>
                <ul className="space-y-4">
                  {companionLiveCourses.length > 0 ? (
                    companionLiveCourses.map((course) => {
                      const when = formatCourseStartDisplay(course)
                      return (
                        <li
                          key={course.id}
                          className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-950/60"
                        >
                          <img
                            src={course.image_url || "/placeholder.svg?height=80&width=112&query=companion"}
                            alt=""
                            className="h-16 w-24 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold leading-snug text-slate-900 line-clamp-2 dark:text-slate-100">{course.name}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {when ? `${when} · ` : null}
                              {formatStat(course.enrolled)} {course.enrolled === 1 ? "person" : "people"}
                            </p>
                          </div>
                          <Button
                            asChild
                            size="sm"
                            className="h-9 shrink-0 self-center rounded-lg bg-fuchsia-600 px-4 text-xs font-semibold text-white hover:bg-fuchsia-500"
                          >
                            <Link href={route("course.show", course.slug)}>Join</Link>
                          </Button>
                        </li>
                      )
                    })
                  ) : (
                    <li className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-500">
                      No live companion spaces right now. Browse the catalog for upcoming openings.
                    </li>
                  )}
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm sm:p-4 dark:border-slate-700/70 dark:bg-[#0a0f1c] dark:shadow-none">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className="relative flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center rounded-2xl border border-violet-500/35 bg-gradient-to-br from-slate-800 via-violet-950 to-slate-900 shadow-md shadow-violet-950/40 sm:h-[4.25rem] sm:w-[4.25rem]"
                    aria-hidden
                  >
                    <span className="absolute inset-[3px] rounded-[0.875rem] bg-gradient-to-br from-white/10 to-transparent" />
                    <Bot className="relative z-[1] h-8 w-8 text-sky-200 sm:h-9 sm:w-9" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-violet-700 dark:text-[#c4b5fd] sm:text-[1.05rem]">
                      AI Companion
                    </h3>
                    <p className="mt-1 text-[11px] leading-snug text-slate-600 dark:text-slate-300 sm:text-xs">
                      Need someone to talk to right now?
                      <br />
                      I&apos;m here anytime you need me.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      asChild
                      className="mt-2 h-8 rounded-lg border-violet-500/55 bg-transparent px-3 text-[11px] font-semibold text-violet-700 hover:bg-violet-50 dark:border-[#c4b5fd]/45 dark:bg-transparent dark:text-[#c4b5fd] dark:hover:bg-white/5 sm:mt-2.5 sm:h-9 sm:px-3.5 sm:text-xs"
                    >
                      <Link href={chatAiHref}>Chat with AI Companion</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 pb-10 sm:pb-12">
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm sm:p-4 dark:border-slate-700/70 dark:bg-[#0a0f1c] dark:shadow-none">
            <h2 className="mb-2.5 text-left text-base font-bold text-slate-900 sm:text-lg dark:text-white">
              Making a Difference Together
            </h2>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/95 p-2 sm:p-3 dark:border-slate-600/35 dark:bg-[#0f1524]/95">
              <div className="flex flex-col divide-y divide-slate-200/70 dark:divide-white/10 md:flex-row md:divide-y-0 md:divide-x">
                {(
                  [
                    {
                      label: "Active Companions",
                      value: stats.active_companions,
                      icon: Users,
                      iconBg: "bg-violet-600 shadow-md shadow-violet-900/25",
                      valueClass:
                        "text-violet-700 tabular-nums dark:text-[#c4b5fd]",
                    },
                    {
                      label: "Conversations Today",
                      value: stats.conversations_today,
                      icon: MessageCircle,
                      iconBg: "bg-emerald-800 shadow-md shadow-emerald-950/30",
                      valueClass:
                        "text-emerald-700 tabular-nums dark:text-[#6ee7b7]",
                    },
                    {
                      label: "Lives Impacted",
                      value: stats.lives_impacted,
                      icon: Heart,
                      iconBg: "bg-rose-950 shadow-md shadow-rose-950/40",
                      valueClass: "text-rose-700 tabular-nums dark:text-[#fda4af]",
                    },
                    {
                      label: "Companion Volunteers",
                      value: stats.companion_volunteers,
                      icon: HandHeart,
                      iconBg: "bg-blue-900 shadow-md shadow-blue-950/30",
                      valueClass: "text-sky-700 tabular-nums dark:text-[#7dd3fc]",
                    },
                  ] as const
                ).map((row) => {
                  const StatIcon = row.icon
                  return (
                    <div
                      key={row.label}
                      className="flex flex-1 items-center gap-2.5 px-1 py-2.5 sm:gap-3 md:justify-center md:px-2.5 md:py-2"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white sm:h-10 sm:w-10",
                          row.iconBg,
                        )}
                        aria-hidden
                      >
                        <StatIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <p className={cn("text-lg font-bold leading-none tabular-nums sm:text-xl", row.valueClass)}>
                          {formatStat(row.value)}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-500 sm:text-xs dark:text-slate-400">
                          {row.label}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/80 py-5 dark:border-white/10">
          <div className="container mx-auto flex flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-fuchsia-600 dark:text-fuchsia-400" aria-hidden />
              <p>
                Your safety is our priority. All conversations are monitored to ensure a safe and respectful community.
              </p>
            </div>
            <Link
              href={route("terms.service")}
              className="shrink-0 text-sm font-medium text-fuchsia-700 hover:text-fuchsia-800 dark:text-fuchsia-400 dark:hover:text-fuchsia-300"
            >
              Learn more about safety →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

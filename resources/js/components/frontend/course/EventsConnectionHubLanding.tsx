"use client"

import { Link, router, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import {
  Calendar,
  CalendarDays,
  Heart,
  Monitor,
  Plus,
  Sparkles,
  User,
  Users,
  Video,
  Smartphone,
  Radio,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { formatCourseMonthDayBadge, formatCourseStartDisplay } from "@/lib/course-start-datetime"
import {
  connectionHubMyButtonHref,
  connectionHubTeachButtonHref,
  type ConnectionHubAuth,
} from "@/lib/connection-hub-hero-hrefs"

export interface EventsEventTypeCount {
  id: number
  name: string
  count: number
}

export interface EventsHubCourse {
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
  creator?: { name: string }
  event_type?: { id: number; name: string; category: string } | null
}

export interface EventsHubStats {
  events_hosted: number
  total_attendees: number
  upcoming_events: number
  lives_impacted: number
}

const WHY_EVENTS = [
  {
    title: "Bring People Together",
    body: "Gather your community around shared experiences.",
  },
  {
    title: "Share Knowledge",
    body: "Workshops, forums, and moments that teach and inspire.",
  },
  {
    title: "Make an Impact",
    body: "Turn gatherings into measurable community outcomes.",
  },
  {
    title: "Support Our Mission",
    body: "Every event advances nonprofits you believe in.",
  },
] as const

const CATEGORY_STYLE = [
  { gradient: "from-violet-600 to-purple-700" },
  { gradient: "from-emerald-600 to-teal-700" },
  { gradient: "from-blue-600 to-indigo-700" },
  { gradient: "from-orange-500 to-amber-600" },
  { gradient: "from-rose-700 to-red-900" },
  { gradient: "from-cyan-600 to-teal-600" },
] as const

const CATEGORY_ICONS = [CalendarDays, Heart, Users, Sparkles, Monitor, Video]

function formatStat(n: number): string {
  return n.toLocaleString()
}

export default function EventsConnectionHubLanding({
  eventsEventTypeCounts,
  eventsFeaturedCourses,
  eventsLiveCourses,
  eventsStats,
}: {
  eventsEventTypeCounts: EventsEventTypeCount[]
  eventsFeaturedCourses: EventsHubCourse[]
  eventsLiveCourses: EventsHubCourse[]
  eventsStats: EventsHubStats | null
}) {
  const auth = usePage().props.auth as ConnectionHubAuth | undefined

  const loginWithRedirect = (path: string) =>
    `${route("login")}?redirect=${encodeURIComponent(path)}`

  const createHref =
    connectionHubTeachButtonHref(auth) ??
    loginWithRedirect(route("profile.course.create"))
  const myEventsHref =
    connectionHubMyButtonHref(auth) ?? loginWithRedirect(route("enrollments.my"))

  const goToFullCatalog = () => {
    router.get(route("course.index"), {}, { preserveState: false, preserveScroll: false })
  }

  const filterEventType = (eventTypeId: number) => {
    const params = new URLSearchParams(window.location.search)
    params.delete("topic_id")
    params.set("type", "events")
    params.set("event_type_id", String(eventTypeId))
    params.set("page", "1")
    router.get(`/courses?${params.toString()}`, {}, { preserveState: false, preserveScroll: false })
  }

  const stats = eventsStats ?? {
    events_hosted: 0,
    total_attendees: 0,
    upcoming_events: 0,
    lives_impacted: 0,
  }

  const formatLabel =
    (course: EventsHubCourse) =>
      course.formatted_format ||
      ({ online: "Online Event", in_person: "In Person", hybrid: "Hybrid Event" }[course.format] ?? "Event")

  return (
    <div className="space-y-0">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 dark:border-slate-800/80 dark:bg-[#0B0C10]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08] dark:opacity-[0.14]"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(123,92,250,0.45), transparent), radial-gradient(ellipse 55% 40% at 100% 0%, rgba(59,130,246,0.12), transparent)`,
          }}
        />
        <div className="relative container mx-auto px-4 py-12 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px] lg:items-center lg:gap-10 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-xl"
          >
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
              <Calendar className="h-4 w-4" aria-hidden />
              Events Hub
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
              <span className="bg-gradient-to-r from-violet-800 via-fuchsia-700 to-violet-700 bg-clip-text text-transparent dark:from-violet-400 dark:via-fuchsia-300 dark:to-white">
                Events That Connect.
              </span>
              <br />
              <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-violet-800 bg-clip-text text-transparent dark:from-white dark:via-slate-100 dark:to-violet-200/90">
                Communities That Grow.
              </span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              Discover inspiring gatherings and create events that bring people together — online or in person.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={goToFullCatalog}
                className="h-12 rounded-xl bg-[#7B5CFA] px-6 text-base font-semibold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500"
              >
                <CalendarDays className="mr-2 h-5 w-5" aria-hidden />
                Browse Events
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-12 rounded-xl border-slate-300 bg-white/80 px-6 text-base font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
              >
                <Link href={createHref}>
                  <Plus className="mr-2 h-5 w-5" aria-hidden />
                  Create Event
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-12 rounded-xl border-slate-300 bg-white/80 px-6 text-base font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
              >
                <Link href={myEventsHref}>
                  <User className="mr-2 h-5 w-5" aria-hidden />
                  My Events
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="relative mx-auto mt-10 max-w-lg lg:mx-0 lg:mt-0"
          >
            <div className="relative aspect-[5/4] overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-white via-violet-50/90 to-slate-100 p-6 shadow-lg shadow-violet-200/40 dark:border-violet-500/20 dark:from-slate-900 dark:via-violet-950/50 dark:to-slate-900 dark:shadow-[0_0_50px_-12px_rgba(123,92,250,0.45)]">
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="relative w-full max-w-[280px] rounded-xl border border-violet-200/80 bg-white/95 p-3 shadow-inner dark:border-violet-500/25 dark:bg-slate-950/90">
                  <div className="flex gap-1 border-b border-slate-200 pb-2 dark:border-slate-700">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-8 flex-1 rounded-md bg-slate-200/90 dark:bg-slate-800/80" />
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="flex aspect-video items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-600/20">
                      <Video className="h-10 w-10 text-violet-600 dark:text-violet-300" aria-hidden />
                    </div>
                    <div className="flex aspect-video items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/80">
                      <Users className="h-8 w-8 text-slate-500 dark:text-slate-500" aria-hidden />
                    </div>
                  </div>
                </div>
                <div className="flex w-full max-w-xs items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-950/40">
                  <Smartphone className="h-10 w-10 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300/90">You&apos;re Invited!</p>
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">RSVP on Events Hub</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-md backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-xl lg:mt-0"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Why Events Matter?</h2>
            <ul className="mt-5 space-y-4">
              {WHY_EVENTS.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-[#7B5CFA]/25 dark:text-violet-200">
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

      {/* Main: categories + featured | live + impact */}
      <section className="border-b border-slate-200 bg-white py-12 dark:border-slate-800/80 dark:bg-[#0B0C10] sm:py-14">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14 lg:items-start">
            <div className="space-y-12">
              <div>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">Explore Events by Category</h2>
                  <button
                    type="button"
                    onClick={goToFullCatalog}
                    className="text-xs font-medium text-violet-700 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 sm:text-sm"
                  >
                    View all categories →
                  </button>
                </div>
                {eventsEventTypeCounts.length > 0 ? (
                  <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 pt-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                    {eventsEventTypeCounts.map((row, idx) => {
                      const style = CATEGORY_STYLE[idx % CATEGORY_STYLE.length]
                      const Icon = CATEGORY_ICONS[idx % CATEGORY_ICONS.length]
                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => filterEventType(row.id)}
                          className={cn(
                            "group flex min-h-[108px] w-[min(168px,calc(100vw-2.5rem))] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-gradient-to-br px-3 py-3.5 text-center text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg",
                            style.gradient,
                          )}
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="flex w-full min-w-0 flex-col items-center gap-1">
                            <span className="w-full break-words text-center text-sm font-semibold leading-snug">
                              {row.name}
                            </span>
                            <span className="text-xs text-white/85">
                              {formatStat(row.count)} {row.count === 1 ? "Event" : "Events"}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                    <p className="text-sm">Categories appear when event listings are published.</p>
                    <button
                      type="button"
                      onClick={goToFullCatalog}
                      className="mt-4 text-sm font-medium text-violet-700 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300"
                    >
                      Browse full catalog →
                    </button>
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-6 text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">Upcoming Featured Events</h2>
                {eventsFeaturedCourses.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {eventsFeaturedCourses.map((course) => (
                      <Link
                        key={course.id}
                        href={route("course.show", course.slug)}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:border-violet-400 dark:border-slate-700/80 dark:bg-slate-900/60 dark:shadow-lg dark:hover:border-violet-500/40"
                      >
                        <div className="relative aspect-[16/10]">
                          <img
                            src={course.image_url || "/placeholder.svg?height=200&width=320&query=event"}
                            alt=""
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                          <Badge className="absolute left-3 top-3 border-0 bg-[#7B5CFA] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
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
                            <span className="font-medium text-violet-700 dark:text-violet-300/90">{formatLabel(course)}</span>
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
                    No featured events yet. Open the full catalog to browse all listings.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-8 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/80 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live &amp; Happening Now</h2>
                    <Radio className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  </div>
                  <button
                    type="button"
                    onClick={goToFullCatalog}
                    className="text-xs font-medium text-violet-700 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 sm:text-sm"
                  >
                    View all →
                  </button>
                </div>
                <ul className="space-y-4">
                  {eventsLiveCourses.length > 0 ? (
                    eventsLiveCourses.map((course) => (
                      <li key={course.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-950/60">
                        <img
                          src={course.image_url || "/placeholder.svg?height=80&width=112&query=event"}
                          alt=""
                          className="h-16 w-24 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-snug text-slate-900 line-clamp-2 dark:text-slate-100">{course.name}</p>
                          <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 shadow-none dark:bg-emerald-400 dark:shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                            Live Now
                          </span>
                          <p className="mt-1 text-xs text-slate-500">{formatCourseStartDisplay(course)}</p>
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                            {course.enrolled > 0 ? `${formatStat(course.enrolled)} attending` : "Be the first to join"}
                          </p>
                        </div>
                        <Button
                          asChild
                          size="sm"
                          className="h-9 shrink-0 self-center rounded-lg bg-[#7B5CFA] px-3 text-xs font-semibold text-white hover:bg-violet-500"
                        >
                          <Link href={route("course.show", course.slug)}>Join Now</Link>
                        </Button>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-500">
                      Nothing live right now. Check featured events above or open the full catalog.
                    </li>
                  )}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/80 sm:p-5">
                <h2 className="mb-3 text-base font-bold text-slate-900 sm:text-lg dark:text-white">Event Impact</h2>
                <div className="flex flex-nowrap gap-1.5 sm:gap-2">
                  {(
                    [
                      { label: "Events Hosted", value: stats.events_hosted, icon: Calendar },
                      { label: "Total Attendees", value: stats.total_attendees, icon: Users },
                      { label: "Upcoming Events", value: stats.upcoming_events, icon: CalendarDays },
                      { label: "Lives Impacted", value: stats.lives_impacted, icon: Heart },
                    ] as const
                  ).map((row) => {
                    const SIcon = row.icon
                    return (
                      <div
                        key={row.label}
                        className="flex min-w-0 flex-1 flex-col items-center rounded-lg border border-slate-200 bg-white px-1 py-2.5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/60 sm:px-2 sm:py-3"
                      >
                        <span className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-50 sm:h-8 sm:w-8 dark:border-violet-500/25 dark:bg-violet-600/15">
                          <SIcon className="h-3.5 w-3.5 text-violet-700 sm:h-4 sm:w-4 dark:text-violet-300" aria-hidden />
                        </span>
                        <p className="text-sm font-bold tabular-nums leading-none text-slate-900 sm:text-base dark:text-white">{formatStat(row.value)}</p>
                        <p className="mt-1 line-clamp-2 max-w-full px-0.5 text-[9px] font-medium leading-tight text-slate-600 sm:text-[10px] dark:text-slate-400">
                          {row.label}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-y border-violet-200/80 bg-gradient-to-r from-violet-100 via-violet-50 to-indigo-100 py-10 dark:border-transparent dark:from-violet-900 dark:via-violet-800 dark:to-indigo-900">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 sm:flex-row">
          <div className="flex max-w-xl flex-col gap-3 text-center sm:flex-row sm:items-center sm:text-left">
            <span className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-200/80 sm:mx-0 dark:bg-white/10">
              <Calendar className="h-6 w-6 text-violet-800 dark:text-white" aria-hidden />
            </span>
            <div>
              <p className="text-lg font-semibold text-violet-950 dark:text-white">Have an event idea?</p>
              <p className="mt-1 text-sm text-violet-900/90 dark:text-white/85">
                Host workshops, fundraisers, and community moments — create your listing in minutes.
              </p>
            </div>
          </div>
          <Button
            asChild
            className="h-12 shrink-0 rounded-xl bg-violet-700 px-6 text-base font-semibold text-white hover:bg-violet-800 dark:bg-white dark:text-violet-900 dark:hover:bg-slate-100"
          >
            <Link href={createHref}>
              <Plus className="mr-2 h-5 w-5" aria-hidden />
              Create Your Event
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

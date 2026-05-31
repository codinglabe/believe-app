"use client"

import { useMemo, useState } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Link, usePage } from "@inertiajs/react"
import {
  Building2,
  CalendarClock,
  Clapperboard,
  Radio,
  Search,
  Send,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UnityLiveStreamCard } from "@/components/unity-live/UnityLiveStreamCard"
import {
  formatScheduledAt,
  hostTypeLabel,
  type UnityLiveHostType,
  type UnityLiveStreamItem,
} from "@/lib/unity-live-display"

interface UpcomingMeetingItem {
  id: string
  slug: string
  title: string
  hostName: string
  hostType?: UnityLiveHostType
  scheduledAt: string | null
  viewUrl: string
}

interface Props {
  seo?: { title?: string; description?: string }
  livestreams: UnityLiveStreamItem[]
  upcomingMeetings?: UpcomingMeetingItem[]
}

type HostFilter = "all" | UnityLiveHostType

function matchesSearch(stream: UnityLiveStreamItem, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) {
    return true
  }

  return (
    stream.title.toLowerCase().includes(q) ||
    stream.organizationName.toLowerCase().includes(q) ||
    stream.slug.toLowerCase().includes(q)
  )
}

export default function UnityLiveIndex({ seo, livestreams, upcomingMeetings = [] }: Props) {
  const { auth } = usePage().props as { auth?: { user?: { id?: number; role?: string } } }
  const isLoggedIn = !!auth?.user
  const isSupporter = auth?.user?.role === "user"
  const createMeetingHref = isSupporter ? "/livestreams/supporter/create" : "/livestreams/create"
  const joinMeetingHref = isSupporter ? "/livestreams/supporter/join" : "/livestreams"

  const [searchQuery, setSearchQuery] = useState("")
  const [hostFilter, setHostFilter] = useState<HostFilter>("all")

  const filteredLivestreams = useMemo(() => {
    return livestreams.filter((stream) => {
      if (hostFilter !== "all" && stream.hostType !== hostFilter) {
        return false
      }
      return matchesSearch(stream, searchQuery)
    })
  }, [livestreams, hostFilter, searchQuery])

  const featuredStream = filteredLivestreams[0] ?? null
  const moreStreams = filteredLivestreams.slice(1)
  const liveCount = livestreams.length

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Unity Live"} description={seo?.description} />

      <div className="min-h-screen overflow-x-hidden bg-neutral-50 dark:bg-neutral-950">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-neutral-200 dark:border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/15 via-blue-600/10 to-purple-600/5 dark:from-purple-950/60 dark:via-blue-950/40 dark:to-neutral-950" />
          <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/20" />
          <div className="absolute -bottom-16 left-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/20" />

          <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-white/60 px-3 py-1 text-xs font-medium text-purple-700 backdrop-blur-sm dark:border-purple-400/20 dark:bg-white/5 dark:text-purple-300">
                  <Radio className="h-3.5 w-3.5" />
                  {liveCount > 0
                    ? `${liveCount} stream${liveCount === 1 ? "" : "s"} live now`
                    : "Watch organizations and hosts go live"}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400">
                    Unity Live
                  </span>
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-base">
                  Discover live streams from nonprofits and community hosts on Believe In Unity.
                  Watch now or come back when something new goes live.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[280px]">
                {isLoggedIn ? (
                  <>
                    <Link href={createMeetingHref}>
                      <Button className="h-11 w-full border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 sm:w-auto sm:min-w-[220px]">
                        <Video className="mr-2 h-4 w-4" />
                        Start a meeting
                      </Button>
                    </Link>
                    <Link href={isSupporter ? "/livestreams/supporter" : joinMeetingHref}>
                      <Button
                        variant="outline"
                        className="h-11 w-full border-purple-500/30 text-purple-700 hover:bg-purple-500/5 dark:border-purple-400/30 dark:text-purple-300 dark:hover:bg-purple-500/10 sm:w-auto sm:min-w-[220px]"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {isSupporter ? "My meetings" : "Join meeting"}
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button className="h-11 w-full border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 sm:w-auto sm:min-w-[220px]">
                        <Video className="mr-2 h-4 w-4" />
                        Sign in to host
                      </Button>
                    </Link>
                    <Link href="/unity-videos">
                      <Button
                        variant="outline"
                        className="h-11 w-full border-neutral-300 dark:border-white/15 sm:w-auto sm:min-w-[220px]"
                      >
                        <Clapperboard className="mr-2 h-4 w-4" />
                        Browse Unity Videos
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  type="search"
                  placeholder="Search by title, host, or stream code…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 border-neutral-200 bg-white/80 pl-10 backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/70"
                />
              </div>
              <Select value={hostFilter} onValueChange={(v) => setHostFilter(v as HostFilter)}>
                <SelectTrigger className="h-11 w-full border-neutral-200 bg-white/80 dark:border-white/10 dark:bg-neutral-900/70 sm:w-[190px]">
                  <SelectValue placeholder="All hosts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All hosts</SelectItem>
                  <SelectItem value="organization">Organizations</SelectItem>
                  <SelectItem value="supporter">Community hosts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {/* Featured + grid */}
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white sm:text-xl">
                  {featuredStream ? "Featured live" : "Live now"}
                </h2>
              </div>
              {filteredLivestreams.length > 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Showing {filteredLivestreams.length} of {liveCount}
                </p>
              ) : null}
            </div>

            {filteredLivestreams.length === 0 ? (
              <div className="overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-white dark:border-white/15 dark:bg-neutral-900/40">
                <div className="flex flex-col items-center px-6 py-14 text-center sm:py-16">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/15 to-blue-500/15 text-purple-600 dark:text-purple-400">
                    <Radio className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {livestreams.length === 0
                      ? "No one is live right now"
                      : "No streams match your search"}
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
                    {livestreams.length === 0
                      ? "Check back soon — when a host goes live on Unity Live, the stream will appear here automatically."
                      : "Try a different search term or clear the host filter."}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {livestreams.length > 0 ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("")
                          setHostFilter("all")
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : (
                      <Link href="/unity-videos">
                        <Button variant="outline">
                          <Clapperboard className="mr-2 h-4 w-4" />
                          Explore Unity Videos
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {featuredStream ? (
                  <UnityLiveStreamCard stream={featuredStream} variant="featured" />
                ) : null}

                {moreStreams.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      More live streams
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {moreStreams.map((stream) => (
                        <UnityLiveStreamCard key={stream.id} stream={stream} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          {/* Starting soon */}
          {upcomingMeetings.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white sm:text-xl">
                  Starting soon
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {upcomingMeetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={meeting.viewUrl}
                    className="group rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-purple-400/40 hover:shadow-md dark:border-white/10 dark:bg-neutral-900/60 dark:hover:border-purple-400/30"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                      {formatScheduledAt(meeting.scheduledAt) ?? "Scheduled"}
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-neutral-900 group-hover:text-purple-700 dark:text-white dark:group-hover:text-purple-300">
                      {meeting.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {meeting.hostType === "organization" ? (
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <UserRound className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="truncate">{meeting.hostName}</span>
                      <span className="text-neutral-300 dark:text-neutral-600">·</span>
                      <span>{hostTypeLabel(meeting.hostType)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </FrontendLayout>
  )
}

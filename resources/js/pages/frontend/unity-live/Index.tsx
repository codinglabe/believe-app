"use client"

import { useState } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Link, usePage } from "@inertiajs/react"
import { Radio, Play, Search, Video, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LivestreamItem {
  id: number
  slug: string
  title: string
  organizationName: string
  viewUrl: string
  viewUrlMuted?: string
  viewUrlFallback?: string
  startedAt: string | null
}

interface UpcomingMeetingItem {
  id: number
  title: string
  scheduled_at: string
  meeting_id?: string
  status: string
}

interface Props {
  seo?: { title?: string; description?: string }
  livestreams: LivestreamItem[]
  upcomingMeetings?: UpcomingMeetingItem[]
}

export default function UnityLiveIndex({ seo, livestreams, upcomingMeetings = [] }: Props) {
  const { auth } = usePage().props as { auth?: { user?: { id?: number; role?: string } } }
  const isLoggedIn = !!auth?.user
  const isSupporter = auth?.user?.role === "user"
  const createMeetingHref = isSupporter ? "/livestreams/supporter/create" : "/livestreams/create"
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/meetings?search=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <FrontendLayout>
      <PageHead
        title={seo?.title ?? "Unity Live & Meet"}
        description={seo?.description}
      />
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 overflow-x-hidden">
        {/* Hero: title, subtitle, search + CTAs */}
        <div className="border-b border-neutral-200 dark:border-white/10 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10 dark:bg-gradient-to-r dark:from-purple-950/50 dark:via-blue-950/40 dark:to-purple-950/50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white break-words">
              Unity Live & Meet
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 px-1">
              Watch live and host meetings with your organization
            </p>
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full max-w-3xl mx-auto">
              <form onSubmit={handleSearch} className="w-full sm:flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 shrink-0" />
                  <Input
                    type="text"
                    placeholder="Search live streams and meeting codes"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 sm:py-2.5 bg-neutral-100 dark:bg-neutral-800/80 border-neutral-200 dark:border-white/10 w-full min-w-0 text-sm sm:text-base"
                  />
                </div>
              </form>
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center items-center w-full sm:w-auto">
                {isLoggedIn ? (
                  <>
                    <Link href={createMeetingHref} className="w-full sm:w-auto min-w-0">
                      <Button className="w-full sm:w-auto h-10 sm:h-10 px-4 text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0">
                        <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                        Start a Meeting
                      </Button>
                    </Link>
                    {isSupporter ? (
                      <Link href="/livestreams/supporter" className="w-full sm:w-auto min-w-0">
                        <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-10 px-4 text-xs sm:text-sm border-2 border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 dark:hover:from-blue-500/20 dark:hover:to-purple-500/20">
                          <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                          My meetings / Join Meeting
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/livestreams" className="w-full sm:w-auto min-w-0">
                        <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-10 px-4 text-xs sm:text-sm border-2 border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 dark:hover:from-blue-500/20 dark:hover:to-purple-500/20">
                          <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                          Join Meeting
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link href="/login" className="w-full sm:w-auto min-w-0">
                      <Button className="w-full sm:w-auto h-10 sm:h-10 px-4 text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0">
                        <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                        Start a Meeting
                      </Button>
                    </Link>
                    <Link href="/login" className="w-full sm:w-auto min-w-0">
                      <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-10 px-4 text-xs sm:text-sm border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50">
                        <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                        Join Meeting
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Now */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col gap-4 min-w-0 min-h-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300">Live Now</span>
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-neutral-800 border-neutral-200 dark:border-white/10 min-w-0">
                    <SelectValue placeholder="All Live Streams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Live Streams</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {livestreams.length === 0 ? (
                <div className="flex-1 min-h-[280px] flex flex-col min-w-0">
                  <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/50 overflow-hidden shadow-sm flex-1 flex flex-col h-full min-h-0">
                    <div className="flex flex-1 flex-col items-center justify-center text-center px-4 py-10 sm:py-12 min-h-0">
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 mb-3 shrink-0">
                      <Radio className="h-6 w-6 sm:h-7 sm:w-7 text-neutral-500" />
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                      No live streams right now
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                      Check back later to watch organizations go live.
                    </p>
                  </div>
                </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0">
                  {livestreams.map((stream) => (
                    <Link
                      key={stream.slug}
                      href={`/unity-live/${stream.slug}`}
                      className="group block min-w-0"
                    >
                      <div className="rounded-xl overflow-hidden bg-black shadow-lg ring-1 ring-neutral-200 dark:ring-white/10 hover:ring-neutral-300 dark:hover:ring-white/20 transition-all duration-300 h-full min-w-0">
                        <div className="relative aspect-video w-full overflow-hidden min-w-0">
                          <iframe
                            src={stream.viewUrlMuted ?? stream.viewUrl}
                            title={stream.title}
                            allow="autoplay"
                            className="absolute inset-0 w-full h-full border-0 pointer-events-none z-0 scale-[1.02]"
                          />
                          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-black/20 group-hover:bg-black/10 transition-colors">
                            <Play className="h-8 w-8 sm:h-10 sm:w-10 text-white/60 group-hover:text-white/80 drop-shadow-lg transition-colors" />
                          </div>
                          <div className="absolute top-2 left-2 z-10">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-black/60 backdrop-blur px-2 py-0.5 text-xs font-semibold text-white">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                              LIVE
                            </span>
                          </div>
                          <div className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-md">
                              Watch
                            </span>
                          </div>
                        </div>
                        <div className="p-2.5 sm:p-3 border-t border-neutral-200 bg-white dark:border-white/10 dark:bg-transparent min-w-0">
                          <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white line-clamp-2 leading-tight group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors break-words">
                            {stream.title}
                          </h3>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5 truncate">
                            {stream.organizationName}
                          </p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">1 Viewer</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}

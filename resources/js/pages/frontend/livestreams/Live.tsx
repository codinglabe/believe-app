"use client"

import { Head, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import UnityMeetLayout from "@/layouts/UnityMeetLayout"
import { PageHead } from "@/components/frontend/PageHead"
import { ArrowRight, Play, Radio } from "lucide-react"

const BRAND = {
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

interface PublicLivestreamItem {
  id: string
  slug: string
  title: string
  organizationName: string
  viewUrl: string
  viewUrlMuted?: string
  viewUrlFallback?: string
  startedAt: string | null
}

interface Props {
  meetingsUrl: string
  createMeetingUrl: string
  unityMeetHomeUrl: string
  publicLivestreams: PublicLivestreamItem[]
}

export default function UnityMeetLive({
  meetingsUrl,
  createMeetingUrl,
  unityMeetHomeUrl,
  publicLivestreams,
}: Props) {
  return (
    <UnityMeetLayout>
      <PageHead
        title="Live"
        description="Watch every public Unity Meet stream that is live right now."
      />
      <Head title="Live · Unity Meet" />

      <div className="min-h-screen bg-background">
        <div
          className="relative overflow-hidden border-b border-purple-200 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.2) 50%, ${BRAND.toMuted} 100%)`,
          }}
        >
          <div className="relative w-full px-4 py-8 md:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Radio className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Live</h1>
                </div>
                <p className="max-w-xl text-sm text-muted-foreground">
                  See all public Unity Meet streams that are live right now.
                </p>
              </div>
              <Button asChild variant="outline" className="shrink-0 gap-2">
                <Link href={meetingsUrl}>
                  Unity Meet home
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="w-full px-4 py-8 md:px-6 lg:px-8">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  LIVE
                </span>
                <h2 className="text-lg font-semibold text-foreground">Unity Meet — live now</h2>
                <span className="text-sm text-muted-foreground">
                  ({publicLivestreams.length} stream{publicLivestreams.length === 1 ? "" : "s"})
                </span>
              </div>
              <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1 text-muted-foreground">
                <Link href={unityMeetHomeUrl}>
                  Unity Meet home
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground max-w-3xl">
              These are the same public streams as on Unity Live: organizations and hosts who set their meeting to public and went live.
            </p>

            {publicLivestreams.length === 0 ? (
              <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Radio className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No public Unity Meet streams right now</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  When someone goes live with a public meeting, it will appear here and on Unity Live.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={unityMeetHomeUrl}>Unity Meet home</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={createMeetingUrl}>Start a meeting</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {publicLivestreams.map((stream) => (
                  <Link
                    key={stream.id}
                    href={`/unity-live/${stream.slug}`}
                    className="group block min-w-0"
                  >
                    <div className="h-full overflow-hidden rounded-xl bg-black shadow-lg ring-1 ring-border transition-all hover:ring-primary/30">
                      <div className="relative aspect-video w-full overflow-hidden">
                        <iframe
                          src={stream.viewUrlMuted ?? stream.viewUrl}
                          title={stream.title}
                          allow="autoplay"
                          className="pointer-events-none absolute inset-0 z-0 h-full w-full scale-[1.02] border-0"
                        />
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/10">
                          <Play className="h-10 w-10 text-white/70 drop-shadow-lg transition-colors group-hover:text-white/90" />
                        </div>
                        <div className="absolute left-2 top-2 z-10">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                            LIVE
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-border bg-card p-3">
                        <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
                          {stream.title}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{stream.organizationName}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </UnityMeetLayout>
  )
}

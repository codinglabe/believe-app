"use client"

import { useState, useEffect, useMemo } from "react"
import AccountContextLayout from "@/layouts/account-context-layout"
import { Link, router, usePage } from "@inertiajs/react"
import { route } from "ziggy-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { CreatorProgressStepper } from "@/pages/AiMediaStudio/creator-progress-stepper"
import { Copy, ExternalLink, Loader2, Sparkles } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/toast"

/** Statuses while the async pipeline may still be running (queue worker). */
const PIPELINE_ACTIVE = new Set([
  "pending_prompt",
  "building_prompt",
  "generating",
  "rendering_video",
  "video_generated",
  "uploading_to_dropbox",
])

function generationHeadline(status: string): string {
  switch (status) {
    case "pending_prompt":
      return "Queued for generation"
    case "building_prompt":
      return "BIU AI is building your prompt"
    case "generating":
      return "Generating your video"
    case "rendering_video":
      return "BIU is rendering your video"
    case "video_generated":
      return "Video rendered — wrapping up"
    case "uploading_to_dropbox":
      return "Saving to your library"
    case "failed":
      return "Generation stopped"
    default:
      return "Working on your video"
  }
}

function generationSubtext(status: string): string {
  switch (status) {
    case "pending_prompt":
      return "Waiting for the background worker to pick up this job. This usually starts within a minute."
    case "building_prompt":
      return "OpenAI is turning your story into a cinematic script and a fal.ai-ready prompt."
    case "generating":
      return "OpenAI is drafting the script and fal.ai is rendering your MP4. Short videos can still take several minutes — this page refreshes automatically."
    case "rendering_video":
      return "fal.ai is rendering your MP4 at the resolution and length you chose. This page refreshes automatically."
    case "video_generated":
      return "Your file is ready to stream. We’re finishing metadata and optional cloud steps."
    case "uploading_to_dropbox":
      return "Copying the finished video to Dropbox (if connected). You can preview below while this completes."
    case "failed":
      return "See the error message below. Credits may be refunded automatically after retries."
    default:
      return "Please keep this tab open or return later — status updates on its own."
  }
}

interface VideoDetail {
  id: number
  title: string
  status: string
  prompt: string | null
  fal_prompt: string | null
  ai_script: string | null
  caption: string | null
  hashtags: string[] | null
  template_key: string | null
  template_inputs: Record<string, unknown> | null
  fal_provider: string | null
  fal_model: string | null
  fal_job_id: string | null
  /** Direct MP4 on fal’s CDN — best for `<video>` and inline playback. */
  fal_cdn_url: string | null
  video_source_url: string | null
  duration_seconds: number | null
  resolution: string | null
  resolution_tier: string | null
  orientation: string | null
  dropbox_path: string | null
  dropbox_shared_link: string | null
  youtube_video_id: string | null
  instagram_post_id: string | null
  tiktok_post_id: string | null
  generation_cost: string | null
  approved_at: string | null
  published_at: string | null
  failure_message: string | null
  created_at: string
  updated_at: string
  organization: { id: number; name: string } | null
  creator_name: string | null
}

export default function AiMediaStudioShow({
  video,
  context,
}: {
  video: VideoDetail
  context: "organization" | "supporter"
}) {
  const success = usePage<{ success?: string }>().props.success
  const statusLabel = video.status.replace(/_/g, " ")
  const [previewFailed, setPreviewFailed] = useState(false)

  const isGenerating = PIPELINE_ACTIVE.has(video.status)
  const hasFalPrompt = Boolean(video.fal_prompt && String(video.fal_prompt).trim().length > 0)
  const hasFalCdn = Boolean(video.fal_cdn_url && String(video.fal_cdn_url).trim().length > 0)

  useEffect(() => {
    if (!PIPELINE_ACTIVE.has(video.status)) {
      return
    }
    const t = window.setInterval(() => {
      router.reload({ only: ["video"] })
    }, 4000)
    return () => window.clearInterval(t)
  }, [video.status, video.id])

  const playbackUrl = useMemo(() => {
    const fal = video.fal_cdn_url?.trim()
    if (fal) return fal
    const src = video.video_source_url?.trim()
    return src && src.length > 0 ? src : null
  }, [video.fal_cdn_url, video.video_source_url])

  const copyUrl = (url: string | null | undefined) => {
    const u = url?.trim()
    if (!u) return
    void navigator.clipboard.writeText(u).then(
      () => showSuccessToast("Link copied to clipboard"),
      () => showErrorToast("Could not copy — select the field and copy manually"),
    )
  }

  useEffect(() => {
    setPreviewFailed(false)
  }, [video.fal_cdn_url, video.video_source_url, video.updated_at])

  return (
    <AccountContextLayout
      context={context}
      title={isGenerating ? `Generating — ${video.title}` : video.title}
      description={
        isGenerating
          ? "Your video is being created — status updates automatically."
          : "AI video generation status, preview, and pipeline details."
      }
    >
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
        {success ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
            {success}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
              <Link href={route("ai-media-studio.index")}>← All videos</Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">{video.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize tracking-wide",
                  isGenerating && "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/40",
                  !isGenerating && video.status === "failed" && "bg-destructive/15 text-destructive",
                  !isGenerating &&
                    video.status !== "failed" &&
                    "bg-secondary text-secondary-foreground",
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                    {statusLabel}
                  </>
                ) : (
                  statusLabel
                )}
              </span>
              {video.organization ? (
                <span className="text-muted-foreground text-sm">· {video.organization.name}</span>
              ) : null}
              {video.creator_name ? (
                <span className="text-muted-foreground text-sm">· {video.creator_name}</span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {playbackUrl ? (
              <Button variant="default" size="sm" asChild>
                <a href={route("ai-media-studio.download", video.id)} target="_blank" rel="noreferrer">
                  Download MP4
                </a>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => router.reload({ only: ["video"] })}>
              Refresh status
            </Button>
          </div>
        </div>

        <CreatorProgressStepper
          variant="track"
          status={video.status}
          hasFalPrompt={hasFalPrompt}
          hasFalCdn={hasFalCdn}
          className="mb-2"
        />

        {isGenerating ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="relative overflow-hidden rounded-2xl border-2 border-violet-500/40 bg-gradient-to-br from-violet-600/20 via-background to-background p-6 shadow-lg shadow-violet-900/10 md:p-8"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
              <div className="flex shrink-0 justify-center md:pt-1">
                <span className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-500/20 ring-2 ring-violet-400/40">
                  <Loader2 className="h-10 w-10 animate-spin text-violet-200" aria-hidden />
                  <Sparkles className="absolute -right-1 -top-1 h-6 w-6 text-amber-300/90" aria-hidden />
                </span>
              </div>
              <div className="min-w-0 flex-1 space-y-2 text-center md:text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-200/90">In progress</p>
                <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{generationHeadline(video.status)}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{generationSubtext(video.status)}</p>
                <p className="text-muted-foreground text-xs">
                  This page checks for updates every few seconds. You can still use{" "}
                  <Link href={route("ai-media-studio.index")} className="text-primary underline-offset-4 hover:underline">
                    All videos
                  </Link>{" "}
                  in another tab.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {video.failure_message ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {video.failure_message}
          </div>
        ) : null}

        {isGenerating && !playbackUrl ? (
          <Card className="border-dashed border-violet-500/35 bg-muted/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-violet-400" aria-hidden />
                Video preview
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Your prompt is being turned into a script and video. The player will load here when the file is ready.
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border bg-black/30">
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-violet-950/40 via-muted/20 to-fuchsia-950/30" aria-hidden />
                <div className="relative z-[1] flex max-w-md flex-col items-center gap-3 px-6 text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-violet-300/90" aria-hidden />
                  <p className="text-sm font-medium text-foreground">Generating…</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Rendering can take a few minutes depending on length and queue load. No need to refresh — we poll for
                    you.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {video.fal_cdn_url || video.video_source_url || video.dropbox_shared_link ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Direct links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground text-xs">
                fal serves the generated MP4 with correct <code className="text-foreground">video/mp4</code> headers — best
                for preview and embedding. Dropbox is for your archive; shared links are often HTML pages, not raw MP4.
              </p>
              {video.fal_cdn_url ? (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-normal">Stream (fal CDN)</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input readOnly value={video.fal_cdn_url} className="font-mono text-xs" />
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => copyUrl(video.fal_cdn_url)}>
                        <Copy className="mr-1 size-3.5" aria-hidden />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={video.fal_cdn_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1 size-3.5" aria-hidden />
                          Open
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              {video.video_source_url && video.video_source_url !== video.fal_cdn_url ? (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-normal">Source URL (stored)</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input readOnly value={video.video_source_url} className="font-mono text-xs" />
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => copyUrl(video.video_source_url)}>
                        <Copy className="mr-1 size-3.5" aria-hidden />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={video.video_source_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1 size-3.5" aria-hidden />
                          Open
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              {video.dropbox_shared_link ? (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-normal">Dropbox (folder / preview page)</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input readOnly value={video.dropbox_shared_link} className="font-mono text-xs" />
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => copyUrl(video.dropbox_shared_link)}>
                        <Copy className="mr-1 size-3.5" aria-hidden />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={video.dropbox_shared_link} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1 size-3.5" aria-hidden />
                          Open
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {playbackUrl ? (
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <CardTitle className="text-lg">Preview</CardTitle>
                {isGenerating ? (
                  <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-2 text-xs font-medium leading-snug text-violet-100">
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                    Still finalizing — safe to watch while Dropbox and status catch up
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <video
                src={playbackUrl}
                controls
                playsInline
                className="max-h-[480px] w-full rounded-md bg-black"
                onError={() => setPreviewFailed(true)}
              />
              {previewFailed ? (
                <p className="text-muted-foreground mt-2 text-sm">
                  This browser could not play the file inline. Use the fal CDN link above (raw MP4),{" "}
                  <a href={playbackUrl} className="text-primary underline" target="_blank" rel="noreferrer">
                    open the stream URL
                  </a>
                  , or use Download MP4.
                </p>
              ) : null}
              <p className="text-muted-foreground mt-2 text-xs">
                {video.dropbox_path
                  ? "A copy is archived in your Dropbox; preview prefers the fal stream when available."
                  : "Streaming from fal. Connect Dropbox under Integrations to archive a copy in your cloud folder."}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">fal provider / model:</span> {video.fal_provider ?? "—"} /{" "}
              {video.fal_model ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">fal job:</span> {video.fal_job_id ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Format:</span> {video.resolution ?? "—"} ({video.orientation ?? "—"})
              {video.resolution_tier ? (
                <>
                  {" "}
                  · <span className="text-muted-foreground">Tier:</span> {video.resolution_tier}
                </>
              ) : null}
            </p>
            <p>
              <span className="text-muted-foreground">Dropbox path:</span> {video.dropbox_path ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Dropbox link:</span>{" "}
              {video.dropbox_shared_link ? (
                <a href={video.dropbox_shared_link} className="text-primary underline" target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : (
                "—"
              )}
            </p>
          </CardContent>
        </Card>

        {(video.prompt || video.fal_prompt || video.ai_script) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prompt & script</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {video.prompt ? (
                <div>
                  <p className="text-muted-foreground mb-1">Your brief</p>
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{video.prompt}</pre>
                </div>
              ) : null}
              {video.fal_prompt ? (
                <div>
                  <p className="text-muted-foreground mb-1">fal.ai video prompt</p>
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{video.fal_prompt}</pre>
                </div>
              ) : null}
              {video.ai_script ? (
                <div>
                  <p className="text-muted-foreground mb-1">AI production script</p>
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{video.ai_script}</pre>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {(video.caption || (video.hashtags && video.hashtags.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Social copy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {video.caption ? <p>{video.caption}</p> : null}
              {video.hashtags && video.hashtags.length > 0 ? (
                <p className="text-muted-foreground">{video.hashtags.map((h) => `#${h}`).join(" ")}</p>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </AccountContextLayout>
  )
}

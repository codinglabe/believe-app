"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router } from "@inertiajs/react"
import { route } from "ziggy-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  video_source_url: string | null
  duration_seconds: number | null
  resolution: string | null
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

export default function AiMediaStudioShow({ video }: { video: VideoDetail }) {
  const statusLabel = video.status.replace(/_/g, " ")

  return (
    <AppLayout>
      <Head title={video.title} />
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
              <Link href={route("ai-media-studio.index")}>← All videos</Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">{video.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm capitalize">
              {statusLabel}
              {video.organization ? ` · ${video.organization.name}` : ""}
              {video.creator_name ? ` · ${video.creator_name}` : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.reload({ only: ["video"] })}>
            Refresh status
          </Button>
        </div>

        {video.failure_message ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {video.failure_message}
          </div>
        ) : null}

        {video.video_source_url ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview source</CardTitle>
            </CardHeader>
            <CardContent>
              <video src={video.video_source_url} controls className="max-h-[480px] w-full rounded-md bg-black" />
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
    </AppLayout>
  )
}

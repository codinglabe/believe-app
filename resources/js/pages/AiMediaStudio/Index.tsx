"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, usePage } from "@inertiajs/react"
import { route } from "ziggy-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Video } from "lucide-react"

interface VideoRow {
  id: number
  title: string
  status: string
  orientation: string | null
  resolution: string | null
  template_key: string | null
  created_at: string
}

interface Paginated<T> {
  data: T[]
  links: { url: string | null; label: string; active: boolean }[]
  current_page: number
  last_page: number
  total: number
}

export default function AiMediaStudioIndex({
  videos,
  context,
  ai_media_studio_credits,
  media_studio_credit_cost,
}: {
  videos: Paginated<VideoRow>
  context: "organization" | "supporter"
  ai_media_studio_credits: number
  media_studio_credit_cost: number
}) {
  const success = usePage<{ success?: string }>().props.success

  return (
    <AppLayout>
      <Head title="AI Media Studio" />
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Video className="h-7 w-7" />
              AI Media Studio
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Short-form videos via OpenAI prompts and fal.ai generation — runs on a background worker (
              {context === "organization" ? "organization library" : "your videos"}).
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              AI Media Studio credits:{" "}
              <span className="font-medium text-foreground">{ai_media_studio_credits}</span> ·{" "}
              {media_studio_credit_cost} credit(s) per video
              {context === "supporter" ? (
                <>
                  {" "}
                  ·{" "}
                  <Link href={`${route("credits.purchase")}?wallet=ai_media_studio`} className="text-primary underline">
                    Buy credits
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <Button asChild>
            <Link href={route("ai-media-studio.create")}>
              <Plus className="mr-2 h-4 w-4" />
              New video
            </Link>
          </Button>
        </div>

        {success ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
            {success}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your generations</CardTitle>
          </CardHeader>
          <CardContent>
            {videos.data.length === 0 ? (
              <p className="text-muted-foreground text-sm">No videos yet. Create one to queue the pipeline.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {videos.data.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={route("ai-media-studio.show", v.id)}
                      className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{v.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {v.resolution ?? "—"} · {v.orientation ?? "—"}
                          {v.template_key ? ` · ${v.template_key}` : ""}
                        </p>
                      </div>
                      <span className="inline-flex w-fit rounded-full bg-secondary px-2 py-0.5 text-xs font-medium capitalize">
                        {v.status.replace(/_/g, " ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {videos.last_page > 1 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {videos.links.map((l, i) =>
                  l.url ? (
                    <Link
                      key={i}
                      href={l.url}
                      className={`rounded-md border px-3 py-1 text-sm ${l.active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      preserveScroll
                      dangerouslySetInnerHTML={{ __html: l.label }}
                    />
                  ) : (
                    <span
                      key={i}
                      className="rounded-md border px-3 py-1 text-sm opacity-50"
                      dangerouslySetInnerHTML={{ __html: l.label }}
                    />
                  ),
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

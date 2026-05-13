"use client"

import AccountContextLayout from "@/layouts/account-context-layout"
import { Link, router, useForm } from "@inertiajs/react"
import { route } from "ziggy-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Template {
  key: string
  label: string
}

export default function AiMediaStudioCreate({
  templates,
  favoriteOrganizations,
  context,
  ai_media_studio_credits,
  media_studio_credit_cost,
  media_studio_packs,
  video_duration_min,
  video_duration_max,
}: {
  templates: Template[]
  favoriteOrganizations: { id: number; name: string }[]
  context: "organization" | "supporter"
  ai_media_studio_credits: number
  media_studio_credit_cost: number
  media_studio_packs: Record<string, { usd: number; credits: number }>
  video_duration_min: number
  video_duration_max: number
}) {
  const defaultDuration = Math.round((video_duration_min + video_duration_max) / 2)

  const form = useForm({
    title: "",
    prompt: "",
    template_key: "",
    orientation: "9:16" as "9:16" | "16:9",
    duration_seconds: defaultDuration,
    organization_id: null as number | null,
    template_inputs: {
      title: "",
      cause: "",
      mood: "",
      audience: "",
      call_to_action: "",
    },
  })

  form.transform((payload) => ({
    ...payload,
    template_key: payload.template_key === "" ? null : payload.template_key,
    organization_id: context === "supporter" ? payload.organization_id : null,
  }))

  const { data, setData, post, processing, errors } = form

  const buyPack = (packageKey: string) => {
    router.post(
      route("credits.checkout"),
      {
        package: packageKey,
        return_route: "ai-media-studio.index",
      },
      { preserveScroll: true },
    )
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("ai-media-studio.store"))
  }

  const orgSelectValue = data.organization_id == null ? "__none__" : String(data.organization_id)

  return (
    <AccountContextLayout
      context={context}
      title="Create AI video"
      description={`Queue a ${video_duration_min}–${video_duration_max}s short video: OpenAI script → fal.ai render → Dropbox (when linked) → watch & download here.`}
    >
      <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href={route("ai-media-studio.index")}>← Back to list</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Create short video</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Submitting queues a background job: OpenAI builds the fal.ai prompt; fal renders {video_duration_min}–{video_duration_max}s MP4;
            if Dropbox is connected under Integrations, the file is saved there and playable in your library.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Credits: <span className="font-medium text-foreground">{ai_media_studio_credits}</span> available ·{" "}
            {media_studio_credit_cost} per video
          </p>
          {errors.title ? <p className="text-destructive mt-2 text-sm">{errors.title}</p> : null}
          {ai_media_studio_credits < media_studio_credit_cost ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-medium">Not enough AI Media Studio credits</p>
              <p className="mt-1">
                {context === "supporter"
                  ? "Purchase a pack to generate videos. Organization accounts receive credits with their subscription plan."
                  : "Your plan includes a pool of AI Media Studio credits; purchase add-ons if you need more."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(media_studio_packs).map(([key, pack]) => (
                  <Button key={key} type="button" variant="secondary" size="sm" onClick={() => buyPack(key)}>
                    {pack.credits} credits — ${Number(pack.usd).toFixed(2)}
                  </Button>
                ))}
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href={`${route("credits.purchase")}?wallet=ai_media_studio`}>All purchase options</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={submit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basics</CardTitle>
              <CardDescription>Title and optional raw prompt (template fields below refine the brief).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={data.title}
                  onChange={(e) => setData("title", e.target.value)}
                  required
                  maxLength={255}
                />
                {errors.title ? <p className="text-destructive text-sm">{errors.title}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt (optional)</Label>
                <Textarea
                  id="prompt"
                  value={data.prompt}
                  onChange={(e) => setData("prompt", e.target.value)}
                  rows={4}
                  placeholder="Describe the video, or rely on template + structured fields."
                />
                {errors.prompt ? <p className="text-destructive text-sm">{errors.prompt}</p> : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={data.orientation} onValueChange={(v) => setData("orientation", v as "9:16" | "16:9")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9:16">Shorts / Reels (9:16, 1080×1920)</SelectItem>
                      <SelectItem value="16:9">YouTube landscape (16:9, 1920×1080)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Length ({video_duration_min}–{video_duration_max} seconds)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={video_duration_min}
                    max={video_duration_max}
                    step={1}
                    value={data.duration_seconds}
                    onChange={(e) => {
                      let v = Number(e.target.value)
                      if (Number.isNaN(v)) v = defaultDuration
                      v = Math.min(video_duration_max, Math.max(video_duration_min, Math.round(v)))
                      setData("duration_seconds", v)
                    }}
                  />
                  <p className="text-muted-foreground text-xs">fal.ai is billed per generation; keep within this range for predictable cost.</p>
                  {errors.duration_seconds ? (
                    <p className="text-destructive text-sm">{errors.duration_seconds}</p>
                  ) : null}
                </div>
              </div>
              {context === "supporter" && favoriteOrganizations.length > 0 ? (
                <div className="space-y-2">
                  <Label>Save under followed organization (optional)</Label>
                  <Select
                    value={orgSelectValue}
                    onValueChange={(v) => setData("organization_id", v === "__none__" ? null : Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Personal only" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Personal only (your Dropbox path)</SelectItem>
                      {favoriteOrganizations.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    When set, the org&apos;s Dropbox tree can receive the finished asset (worker implementation).
                  </p>
                  {errors.organization_id ? (
                    <p className="text-destructive text-sm">{errors.organization_id}</p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>BIU template</CardTitle>
              <CardDescription>Optional — used by the OpenAI prompt builder step.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select
                  value={data.template_key === "" ? "__none__" : data.template_key}
                  onValueChange={(v) => setData("template_key", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (prompt only)</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ti_title">Story title</Label>
                  <Input
                    id="ti_title"
                    value={data.template_inputs.title}
                    onChange={(e) => setData("template_inputs", { ...data.template_inputs, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ti_mood">Mood</Label>
                  <Input
                    id="ti_mood"
                    value={data.template_inputs.mood}
                    onChange={(e) => setData("template_inputs", { ...data.template_inputs, mood: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="ti_cause">Cause / message</Label>
                  <Textarea
                    id="ti_cause"
                    value={data.template_inputs.cause}
                    onChange={(e) => setData("template_inputs", { ...data.template_inputs, cause: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="ti_audience">Audience</Label>
                  <Textarea
                    id="ti_audience"
                    value={data.template_inputs.audience}
                    onChange={(e) => setData("template_inputs", { ...data.template_inputs, audience: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="ti_cta">Call to action</Label>
                  <Input
                    id="ti_cta"
                    value={data.template_inputs.call_to_action}
                    onChange={(e) =>
                      setData("template_inputs", { ...data.template_inputs, call_to_action: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={processing || ai_media_studio_credits < media_studio_credit_cost}
            className="w-full sm:w-auto"
          >
            {processing ? "Queueing…" : "Queue generation"}
          </Button>
        </form>
      </div>
    </AccountContextLayout>
  )
}

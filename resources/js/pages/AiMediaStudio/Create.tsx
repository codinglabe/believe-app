"use client"

import { useMemo, useState, type ReactNode } from "react"
import AccountContextLayout from "@/layouts/account-context-layout"
import { Link, router, useForm } from "@inertiajs/react"
import { route } from "ziggy-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import {
  Clapperboard,
  Clock,
  CloudDownload,
  Cpu,
  FileText,
  Gift,
  Heart,
  Lock,
  Megaphone,
  MonitorPlay,
  Play,
  RectangleHorizontal,
  Share2,
  Smile,
  Sparkles,
  Users,
  ChevronDown,
  ChevronLeft,
} from "lucide-react"
import { CreatorProgressStepper } from "@/pages/AiMediaStudio/creator-progress-stepper"
import {
  formatMediaStudioCredits,
  retailCreditsFor,
  roundMediaCredits,
} from "@/lib/media-studio-credits"

const BRAND = "#6338D9"

const MOOD_PRESETS = [
  "Hopeful & Uplifting",
  "Urgent & Compassionate",
  "Grateful & Warm",
  "Inspiring & Bold",
  "Calm & Trustworthy",
  "Celebratory & Fun",
] as const

const MOOD_CUSTOM = "__custom__"

interface Template {
  key: string
  label: string
}

type Orientation = "9:16" | "16:9"

function resolutionTierLabel(tier: string): string {
  if (tier === "720p") return "720p (HD)"
  if (tier === "1080p") return "1080p (Full HD)"
  return tier
}

function FieldIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#6338D9]/15 bg-[#6338D9]/8 text-[#6338D9]",
        className,
      )}
    >
      {children}
    </div>
  )
}

function IconInputRow({
  icon,
  children,
}: {
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex gap-3">
      <FieldIcon>{icon}</FieldIcon>
      <div className="min-w-0 flex-1 space-y-2">{children}</div>
    </div>
  )
}

export default function AiMediaStudioCreate({
  templates,
  favoriteOrganizations,
  context,
  ai_media_studio_credits,
  media_studio_retail_prices,
  media_studio_packs,
  video_duration_min,
  video_duration_max,
  video_resolution_tiers,
  default_video_resolution_tier,
  video_resolution_pixel_matrix,
}: {
  templates: Template[]
  favoriteOrganizations: { id: number; name: string }[]
  context: "organization" | "supporter"
  ai_media_studio_credits: number
  media_studio_retail_prices: Record<string, Record<string, number>>
  media_studio_packs: Record<string, { usd: number; credits: number }>
  video_duration_min: number
  video_duration_max: number
  video_resolution_tiers: string[]
  default_video_resolution_tier: string
  video_resolution_pixel_matrix: Record<Orientation, Record<string, string>>
}) {
  const defaultDuration = 5
  const durationOptions = useMemo(() => {
    const raw = [5, 10].filter((s) => s >= video_duration_min && s <= video_duration_max)
    return raw.length > 0 ? raw : [5, 10]
  }, [video_duration_min, video_duration_max])
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const form = useForm({
    title: "",
    prompt: "",
    template_key: "",
    orientation: "9:16" as Orientation,
    resolution_tier: default_video_resolution_tier,
    duration_seconds: defaultDuration,
    organization_id: null as number | null,
    template_inputs: {
      title: "",
      cause: "",
      mood: MOOD_PRESETS[0],
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

  const moodSelectValue = (MOOD_PRESETS as readonly string[]).includes(data.template_inputs.mood)
    ? data.template_inputs.mood
    : MOOD_CUSTOM

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
  const selectedCreditCost = useMemo(
    () => retailCreditsFor(media_studio_retail_prices, data.resolution_tier, data.duration_seconds),
    [media_studio_retail_prices, data.resolution_tier, data.duration_seconds],
  )
  const canSubmit = roundMediaCredits(ai_media_studio_credits) >= roundMediaCredits(selectedCreditCost)
  const previewTitle = data.title.trim() || "Your story title"
  const previewCta = data.template_inputs.call_to_action.trim() || "Your call to action"

  return (
    <AccountContextLayout context={context} title="BIU Video Creator" description="Create powerful short videos in minutes.">
      <div className="min-h-screen bg-[#f7f5fc] pb-16 pt-4 text-slate-900 dark:bg-zinc-950 dark:text-zinc-50 md:pt-8">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          {/* Top bar */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3 h-8 gap-1 px-2 text-slate-600 hover:text-[#6338D9]">
                <Link href={route("ai-media-studio.index")}>
                  <ChevronLeft className="h-4 w-4" />
                  Back to library
                </Link>
              </Button>
              <div className="flex items-start gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md shadow-[#6338D9]/25"
                  style={{ backgroundColor: BRAND }}
                >
                  <Play className="h-6 w-6 fill-current" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl dark:text-white">BIU Video Creator</h1>
                  <p className="mt-0.5 text-sm text-slate-600 md:text-base dark:text-zinc-400">
                    Create powerful short videos in minutes.
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full shrink-0 rounded-2xl border border-[#6338D9]/20 bg-white p-4 shadow-sm sm:max-w-xs dark:border-[#6338D9]/30 dark:bg-zinc-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">Credits available</p>
              <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: BRAND }}>
                {formatMediaStudioCredits(ai_media_studio_credits)}{" "}
                <span className="text-base font-semibold text-slate-700 dark:text-zinc-300">credits</span>
              </p>
              <p className="mt-2 text-xs text-slate-600 dark:text-zinc-400">
                This video: {formatMediaStudioCredits(selectedCreditCost)} credits (1 credit = US$1.00). Price depends on
                resolution and length.
              </p>
            </div>
          </div>

          {errors.title ? (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {errors.title}
            </p>
          ) : null}

          {!canSubmit ? (
            <div className="mb-8 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-semibold">Not enough AI Media Studio credits</p>
              <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
                {context === "supporter"
                  ? "Purchase a pack to generate videos. Organization accounts receive credits with their subscription plan."
                  : "Your plan includes a pool of AI Media Studio credits; purchase add-ons if you need more."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
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

          <CreatorProgressStepper variant="compose" className="mb-10" />

          <div className="grid gap-8 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">
            {/* Main form */}
            <form onSubmit={submit} className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40">
                <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:py-7 dark:border-zinc-800">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tell us about your video</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">Our AI will handle the rest.</p>
                  </div>
                  <div className="hidden text-[#6338D9] opacity-90 sm:block" aria-hidden>
                    <Clapperboard className="h-12 w-12" strokeWidth={1.25} />
                  </div>
                </div>

                <div className="space-y-6 px-5 py-6 sm:space-y-7 sm:px-8 sm:py-8">
                  <IconInputRow icon={<span className="text-lg font-serif font-bold">T</span>}>
                    <Label htmlFor="title" className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                      Story title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-base focus-visible:ring-[#6338D9] dark:border-zinc-700 dark:bg-zinc-950/50"
                      value={data.title}
                      onChange={(e) => setData("title", e.target.value)}
                      required
                      maxLength={255}
                      placeholder="Example: Feed 500 Families"
                    />
                    {errors.title ? <p className="text-destructive text-sm">{errors.title}</p> : null}
                  </IconInputRow>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <IconInputRow icon={<Gift className="h-5 w-5" />}>
                      <Label className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Template (optional)</Label>
                      <Select
                        value={data.template_key === "" ? "__none__" : data.template_key}
                        onValueChange={(v) => setData("template_key", v === "__none__" ? "" : v)}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-[#6338D9] dark:border-zinc-700 dark:bg-zinc-950/50">
                          <SelectValue placeholder="Choose a template" />
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
                    </IconInputRow>

                    <IconInputRow icon={<Smile className="h-5 w-5" />}>
                      <Label htmlFor="mood-select" className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                        Mood <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={moodSelectValue}
                        onValueChange={(v) => {
                          if (v === MOOD_CUSTOM) {
                            setData("template_inputs", { ...data.template_inputs, mood: "" })
                          } else {
                            setData("template_inputs", { ...data.template_inputs, mood: v })
                          }
                        }}
                      >
                        <SelectTrigger id="mood-select" className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-[#6338D9] dark:border-zinc-700 dark:bg-zinc-950/50">
                          <SelectValue placeholder="Select mood" />
                        </SelectTrigger>
                        <SelectContent>
                          {MOOD_PRESETS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                          <SelectItem value={MOOD_CUSTOM}>Other (type below)</SelectItem>
                        </SelectContent>
                      </Select>
                      {moodSelectValue === MOOD_CUSTOM ? (
                        <Input
                          className="h-10 rounded-xl border-slate-200 bg-white text-sm focus-visible:ring-[#6338D9] dark:border-zinc-700 dark:bg-zinc-950"
                          value={data.template_inputs.mood}
                          onChange={(e) => setData("template_inputs", { ...data.template_inputs, mood: e.target.value })}
                          placeholder="Describe the mood…"
                          required
                        />
                      ) : null}
                    </IconInputRow>
                  </div>

                  <IconInputRow icon={<Heart className="h-5 w-5" />}>
                    <Label htmlFor="ti_cause" className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                      Cause / message <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="ti_cause"
                      required
                      rows={3}
                      className="min-h-[88px] rounded-xl border-slate-200 bg-slate-50/50 text-base focus-visible:ring-[#6338D9] dark:border-zinc-700 dark:bg-zinc-950/50"
                      value={data.template_inputs.cause}
                      onChange={(e) => setData("template_inputs", { ...data.template_inputs, cause: e.target.value })}
                      placeholder="Help us provide meals to families in need."
                    />
                  </IconInputRow>

                  <IconInputRow icon={<Users className="h-5 w-5" />}>
                    <Label htmlFor="ti_audience" className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                      Audience <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="ti_audience"
                      required
                      rows={3}
                      className="min-h-[88px] rounded-xl border-slate-200 bg-slate-50/50 text-base focus-visible:ring-[#6338D9] dark:border-zinc-700 dark:bg-zinc-950/50"
                      value={data.template_inputs.audience}
                      onChange={(e) => setData("template_inputs", { ...data.template_inputs, audience: e.target.value })}
                      placeholder="Local community, donors, volunteers."
                    />
                  </IconInputRow>

                  <IconInputRow icon={<Megaphone className="h-5 w-5" />}>
                    <Label htmlFor="ti_cta" className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                      Call to action <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="ti_cta"
                      required
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-base focus-visible:ring-[#6338D9] dark:border-zinc-700 dark:bg-zinc-950/50"
                      value={data.template_inputs.call_to_action}
                      onChange={(e) =>
                        setData("template_inputs", { ...data.template_inputs, call_to_action: e.target.value })
                      }
                      placeholder="Donate today and make a difference!"
                    />
                  </IconInputRow>

                  <div className="grid gap-6 sm:grid-cols-3">
                    <IconInputRow icon={<MonitorPlay className="h-5 w-5" />}>
                      <Label className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Video format</Label>
                      <Select value={data.orientation} onValueChange={(v) => setData("orientation", v as Orientation)}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-[#6338D9] dark:border-zinc-700 dark:bg-zinc-950/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9:16">Shorts / Reels (9:16)</SelectItem>
                          <SelectItem value="16:9">YouTube / landscape (16:9)</SelectItem>
                        </SelectContent>
                      </Select>
                    </IconInputRow>

                    <IconInputRow icon={<RectangleHorizontal className="h-5 w-5" />}>
                      <Label className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Resolution</Label>
                      <Select value={data.resolution_tier} onValueChange={(v) => setData("resolution_tier", v)}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-[#6338D9] dark:border-zinc-700 dark:bg-zinc-950/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {video_resolution_tiers.map((tier) => (
                            <SelectItem key={tier} value={tier}>
                              {resolutionTierLabel(tier)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] leading-snug text-slate-500 dark:text-zinc-500">
                        {video_resolution_pixel_matrix[data.orientation]?.[data.resolution_tier] ?? "—"} for this format
                      </p>
                      {errors.resolution_tier ? (
                        <p className="text-destructive text-sm">{errors.resolution_tier}</p>
                      ) : null}
                    </IconInputRow>

                    <IconInputRow icon={<Clock className="h-5 w-5" />}>
                      <Label htmlFor="duration-select" className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                        Length (seconds)
                      </Label>
                      <Select
                        value={String(data.duration_seconds)}
                        onValueChange={(v) => setData("duration_seconds", Number(v))}
                      >
                        <SelectTrigger
                          id="duration-select"
                          className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:ring-[#6338D9] dark:border-zinc-700 dark:bg-zinc-950/50"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {durationOptions.map((sec) => (
                            <SelectItem key={sec} value={String(sec)}>
                              {sec} seconds
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] leading-snug text-slate-500 dark:text-zinc-500">
                        Choose 5 or 10 seconds only — this matches your fal.ai model billing.
                      </p>
                      {errors.duration_seconds ? (
                        <p className="text-destructive text-sm">{errors.duration_seconds}</p>
                      ) : null}
                    </IconInputRow>
                  </div>

                  <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[#6338D9]" />
                          Advanced settings
                        </span>
                        <ChevronDown
                          className={cn("h-5 w-5 text-slate-500 transition-transform", advancedOpen && "rotate-180")}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-4">
                      <IconInputRow icon={<FileText className="h-5 w-5" />}>
                        <Label htmlFor="prompt" className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                          Extra prompt (optional)
                        </Label>
                        <Textarea
                          id="prompt"
                          rows={4}
                          className="rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-[#6338D9] dark:border-zinc-700 dark:bg-zinc-950/50"
                          value={data.prompt}
                          onChange={(e) => setData("prompt", e.target.value)}
                          placeholder="Add any extra direction for the AI (style, shots, locations)…"
                        />
                        {errors.prompt ? <p className="text-destructive text-sm">{errors.prompt}</p> : null}
                      </IconInputRow>

                      {context === "supporter" && favoriteOrganizations.length > 0 ? (
                        <div className="space-y-2 pl-14">
                          <Label className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                            Save under followed organization (optional)
                          </Label>
                          <Select
                            value={orgSelectValue}
                            onValueChange={(v) => setData("organization_id", v === "__none__" ? null : Number(v))}
                          >
                            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50 dark:border-zinc-700 dark:bg-zinc-950/50">
                              <SelectValue placeholder="Personal only" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Personal only</SelectItem>
                              {favoriteOrganizations.map((o) => (
                                <SelectItem key={o.id} value={String(o.id)}>
                                  {o.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.organization_id ? (
                            <p className="text-destructive text-sm">{errors.organization_id}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={processing || !canSubmit}
                      className="h-12 w-full rounded-xl text-base font-semibold text-white shadow-lg shadow-[#6338D9]/35 transition hover:opacity-95 disabled:opacity-50"
                      style={{ backgroundColor: BRAND }}
                    >
                      {processing ? (
                        "Creating…"
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          Create video ({formatMediaStudioCredits(selectedCreditCost)} credits)
                        </span>
                      )}
                    </Button>
                    <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-slate-500 dark:text-zinc-500">
                      <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      Safe, secure, and saved to your Dropbox when connected.
                    </p>
                  </div>
                </div>
              </div>
            </form>

            {/* Sidebar */}
            <aside className="space-y-6 lg:pt-2">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">How it works</h3>
                <ul className="mt-5 space-y-5">
                  <li className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6338D9]/10 text-[#6338D9]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">BIU AI</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                        Our AI understands your inputs and creates a cinematic prompt.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6338D9]/10 text-[#6338D9]">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">BIU AI engine</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                        Our AI engine brings your story to life with high-quality video.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6338D9]/10 text-[#6338D9]">
                      <CloudDownload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Your Dropbox</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                        Your video is saved securely to your Dropbox account when linked.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6338D9]/10 text-[#6338D9]">
                      <Share2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Share anywhere</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                        Download and share your video on any platform from your library.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30">
                <p className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900 dark:border-zinc-800 dark:text-white">
                  Sample preview
                </p>
                <div className="relative aspect-video bg-gradient-to-br from-[#6338D9]/20 via-violet-200/80 to-fuchsia-100/90 dark:from-[#6338D9]/30 dark:via-violet-950/50 dark:to-zinc-900">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-[#6338D9] shadow-lg backdrop-blur-sm dark:bg-zinc-900/90">
                      <Play className="ml-1 h-8 w-8 fill-current" />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-12">
                    <p className="text-center text-lg font-bold text-white drop-shadow-md">{previewTitle}</p>
                    <p className="mt-1 text-center text-sm text-white/90 drop-shadow">{previewCta}</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </AccountContextLayout>
  )
}

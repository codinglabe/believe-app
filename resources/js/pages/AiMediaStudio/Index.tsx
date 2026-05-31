"use client"

import AccountContextLayout from "@/layouts/account-context-layout"
import { Link, router, usePage } from "@inertiajs/react"
import { route } from "ziggy-js"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Info,
  MoreVertical,
  Plus,
  RefreshCw,
  Video,
  Wallet,
} from "lucide-react"

interface CostDisplay {
  amount: number
  sign: "positive" | "negative"
  kind: "charge" | "refunded"
}

interface VideoRow {
  id: number
  title: string
  status: string
  orientation: string | null
  resolution: string | null
  template_key: string | null
  duration_seconds: number | null
  preview_url: string | null
  cost_display: CostDisplay | null
  created_at: string
}

interface BalanceSummary {
  current_balance: number
  monthly_included: number
  used_this_month: number
  pending_renders: number
  refunded_this_month: number
  billing_cycle: {
    label: string
    start: string
    end: string
    days_until_reset: number
  }
}

interface Paginated<T> {
  data: T[]
  links: { url: string | null; label: string; active: boolean }[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

const PER_PAGE_OPTIONS = [10, 20, 50] as const

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "in_progress", label: "In progress" },
  { value: "ready", label: "Ready for review" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
] as const

function formatUsd(amount: number): string {
  const n = Math.round(amount * 100) / 100
  return `$${n.toFixed(2)}`
}

function formatCreatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "—"
  return `${seconds} sec`
}

function statusMeta(status: string, refunded: boolean) {
  if (refunded) {
    return { label: "Refunded", className: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30" }
  }
  switch (status) {
    case "ready_for_review":
    case "approved":
    case "published":
      return { label: "Ready for Review", className: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30" }
    case "failed":
      return { label: "Failed", className: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30" }
    case "rendering_video":
    case "building_prompt":
    case "pending_prompt":
    case "generating":
    case "video_generated":
    case "uploading_to_dropbox":
      return { label: "Rendering", className: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30" }
    default:
      return {
        label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        className: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
      }
  }
}

function visitIndex(params: Record<string, string | number>) {
  router.get(route("ai-media-studio.index"), params, { preserveState: true, preserveScroll: true })
}

export default function AiMediaStudioIndex({
  videos,
  balance,
  filters,
  context,
}: {
  videos: Paginated<VideoRow>
  balance: BalanceSummary
  filters: { status: string; per_page: number }
  context: "organization" | "supporter"
  ai_media_studio_credits: number
}) {
  const success = usePage<{ success?: string }>().props.success

  const listParams = (overrides: Record<string, string | number> = {}) => ({
    status: filters.status,
    per_page: filters.per_page,
    page: 1,
    ...overrides,
  })

  const handleStatusFilter = (status: string) => visitIndex(listParams({ status }))
  const handlePerPageChange = (perPage: number) => visitIndex(listParams({ per_page: perPage }))
  const handlePageChange = (page: number) => visitIndex({ ...listParams(), page })

  const showingFrom = videos.from ?? (videos.total === 0 ? 0 : 1)
  const showingTo = videos.to ?? videos.data.length

  return (
    <AccountContextLayout
      context={context}
      title="AI Video Studio"
      description="Short-form videos via OpenAI and fal.ai — queued in the background."
    >
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">AI Video Studio</h1>
          <p className="text-sm text-slate-400">
            Short-form videos via OpenAI and fal.ai — queued in the background.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-violet-500/20 bg-slate-950/80 p-4 ring-1 ring-violet-500/10">
          <div className="rounded-lg bg-violet-600/20 p-2 text-violet-300">
            <Video className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">AI Video Studio</p>
            <p className="text-sm text-slate-400">
              Short-form videos via OpenAI prompts and fal.ai generation — runs on a background worker (
              {context === "organization" ? "organization library" : "your videos"}).
            </p>
          </div>
        </div>

        {success ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-violet-950/40 shadow-xl ring-1 ring-slate-800">
          <div className="flex flex-col gap-6 p-5 md:p-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600/25 text-violet-300">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  AI video balance
                  <Info className="h-3.5 w-3.5" aria-hidden />
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-white">
                  Current balance {formatUsd(balance.current_balance)}
                </p>
                <p className="text-sm text-slate-400">Available to spend</p>
              </div>
            </div>

            <ul className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-[280px]">
              <li className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  Monthly included
                </span>
                <span className="font-medium tabular-nums text-white">{formatUsd(balance.monthly_included)}</span>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  Used this month
                </span>
                <span className="font-medium tabular-nums text-red-300">
                  {balance.used_this_month > 0 ? `-${formatUsd(balance.used_this_month)}` : formatUsd(0)}
                </span>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Pending renders
                  <Info className="h-3 w-3 opacity-60" aria-hidden />
                </span>
                <span className="font-medium tabular-nums text-amber-200">
                  {balance.pending_renders > 0 ? `-${formatUsd(balance.pending_renders)}` : formatUsd(0)}
                </span>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Refunded (failed jobs)
                </span>
                <span className="font-medium tabular-nums text-emerald-300">
                  {balance.refunded_this_month > 0
                    ? `+${formatUsd(balance.refunded_this_month)}`
                    : formatUsd(0)}
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-800 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Billing cycle: {balance.billing_cycle.label}
              {balance.billing_cycle.days_until_reset > 0
                ? ` (resets in ${balance.billing_cycle.days_until_reset} day${balance.billing_cycle.days_until_reset === 1 ? "" : "s"})`
                : " (resets today)"}
            </p>
            <Link
              href={route("ai-media-studio.create")}
              className="text-violet-400 hover:text-violet-300 hover:underline"
            >
              How pricing works
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            variant="secondary"
            className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
            asChild
          >
            <Link href={`${route("credits.purchase")}?wallet=ai_media_studio`}>
              <CircleDollarSign className="mr-2 h-4 w-4" />
              Top up balance
            </Link>
          </Button>
          <Button className="bg-white text-slate-900 hover:bg-slate-100" asChild>
            <Link href={route("ai-media-studio.create")}>
              <Plus className="mr-2 h-4 w-4" />
              New video
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 px-4 py-2.5 text-sm text-violet-100/90">
          Rendering costs vary by resolution and video length.{" "}
          <Link
            href={route("ai-media-studio.create")}
            className="inline-flex items-center gap-1 font-medium text-violet-300 hover:underline"
          >
            View pricing guide
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <h2 className="text-lg font-semibold text-white">Your generations</h2>
            <Select value={filters.status} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full border-slate-700 bg-slate-900 text-slate-200 sm:w-[200px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {videos.data.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-400">
              No videos yet. Create one to queue the pipeline.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Video</TableHead>
                    <TableHead className="text-slate-400">Resolution</TableHead>
                    <TableHead className="text-slate-400">Length</TableHead>
                    <TableHead className="text-slate-400">Cost</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.data.map((v) => {
                    const refunded = v.cost_display?.kind === "refunded"
                    const meta = statusMeta(v.status, refunded)
                    return (
                      <TableRow key={v.id} className="border-slate-800 hover:bg-slate-900/50">
                        <TableCell>
                          <Link
                            href={route("ai-media-studio.show", v.id)}
                            className="group flex items-center gap-3"
                          >
                            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-slate-800 ring-1 ring-slate-700">
                              {v.preview_url ? (
                                <video
                                  src={v.preview_url}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-500">
                                  <Video className="h-4 w-4" />
                                </div>
                              )}
                              {v.duration_seconds ? (
                                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/75 px-1 text-[10px] text-white">
                                  0:{String(v.duration_seconds).padStart(2, "0")}
                                </span>
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-white group-hover:text-violet-300">
                                {v.title}
                              </p>
                              {v.template_key ? (
                                <p className="truncate text-xs text-slate-500">{v.template_key}</p>
                              ) : null}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-300">{v.resolution ?? "—"}</TableCell>
                        <TableCell className="text-slate-300">{formatDuration(v.duration_seconds)}</TableCell>
                        <TableCell>
                          {v.cost_display ? (
                            <span
                              className={cn(
                                "font-medium tabular-nums",
                                v.cost_display.sign === "positive" ? "text-emerald-400" : "text-red-400",
                              )}
                            >
                              {v.cost_display.sign === "positive" ? "+" : "-"}
                              {formatUsd(v.cost_display.amount)}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                              meta.className,
                            )}
                          >
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-slate-400">
                          {formatCreatedAt(v.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={route("ai-media-studio.show", v.id)}>View details</Link>
                              </DropdownMenuItem>
                              {["ready_for_review", "approved", "published"].includes(v.status) ? (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={route("ai-media-studio.download", v.id)}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Download
                                  </a>
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 px-4 py-3 text-xs text-slate-500 md:px-6">
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            Failed jobs are automatically refunded to your balance.{" "}
            <Link href={route("ai-media-studio.create")} className="text-violet-400 hover:underline">
              Learn more
            </Link>
          </div>

          {videos.total > 0 ? (
            <div className="flex flex-col gap-4 border-t border-slate-800 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <p className="text-sm text-slate-400">
                Showing {showingFrom}–{showingTo} of {videos.total} generation{videos.total === 1 ? "" : "s"}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="whitespace-nowrap">Rows per page</span>
                  <select
                    value={filters.per_page}
                    onChange={(e) => handlePerPageChange(Number.parseInt(e.target.value, 10))}
                    className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-slate-200"
                  >
                    {PER_PAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={videos.current_page <= 1}
                    onClick={() => handlePageChange(videos.current_page - 1)}
                    className="border-slate-700 bg-slate-900 text-slate-200"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>

                  {(() => {
                    const maxVisible = 7
                    const pages: number[] = []
                    const last = videos.last_page
                    if (last <= maxVisible) {
                      for (let i = 1; i <= last; i++) pages.push(i)
                    } else {
                      const cur = videos.current_page
                      const half = Math.floor(maxVisible / 2)
                      let start = Math.max(1, cur - half)
                      const end = Math.min(last, start + maxVisible - 1)
                      if (end - start < maxVisible - 1) {
                        start = Math.max(1, end - maxVisible + 1)
                      }
                      for (let i = start; i <= end; i++) pages.push(i)
                    }
                    return pages.map((page) => (
                      <Button
                        key={page}
                        type="button"
                        variant={videos.current_page === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={cn(
                          "min-w-[2.25rem]",
                          videos.current_page === page
                            ? "bg-violet-600 text-white hover:bg-violet-500"
                            : "border-slate-700 bg-slate-900 text-slate-200",
                        )}
                      >
                        {page}
                      </Button>
                    ))
                  })()}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={videos.current_page >= videos.last_page}
                    onClick={() => handlePageChange(videos.current_page + 1)}
                    className="border-slate-700 bg-slate-900 text-slate-200"
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </AccountContextLayout>
  )
}
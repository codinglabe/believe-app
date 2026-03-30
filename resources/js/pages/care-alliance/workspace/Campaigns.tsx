"use client"

import { useId, useMemo, useState } from "react"
import CareAllianceWorkspaceShell from "@/layouts/care-alliance/care-alliance-workspace-shell"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/frontend/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Textarea } from "@/components/frontend/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/frontend/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/frontend/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import { Link, router, usePage } from "@inertiajs/react"
import toast from "react-hot-toast"
import {
  Building2,
  CircleDollarSign,
  ExternalLink,
  Landmark,
  Megaphone,
  Pencil,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CareAllianceCampaignRow, CareAllianceCampaignsTab, CareAllianceWorkspaceProps } from "../types"
import {
  dashboardCardClass,
  dashboardInputClass,
  dashboardInputInsetClass,
  dashboardSelectContentClass,
  dashboardSelectItemClass,
  dashboardSelectTriggerClass,
  dashboardSelectTriggerInsetClass,
  dashboardSplitControlWrap,
  dashboardSplitLabelCell,
  dashboardSurfaceClass,
  dashboardTextareaClass,
  activeMembersForOrgSplitRow,
} from "./shared"

const CAMPAIGNS_ROUTE = "care-alliance.workspace.campaigns"

const CAMPAIGNS_WORKSPACE_KEYS = [
  "campaignsTab",
  "campaignsCount",
  "alliance",
  "memberships",
  "invitations",
  "joinRequests",
  "campaigns",
  "primaryActionCategories",
] as const

function firstCampaignError(errors: Record<string, string | string[]> | undefined): string {
  if (!errors) return ""
  const v = errors.campaign
  if (Array.isArray(v)) return v[0] ?? ""
  if (typeof v === "string") return v
  return ""
}

function campaignStatusBadgeClass(status: string): string {
  const s = status.toLowerCase()
  if (s === "active") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
  }
  if (s === "draft") {
    return "border-border bg-muted/60 text-muted-foreground"
  }
  return "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-100"
}

function formatSplitPercentBps(bps: number): string {
  const pct = bps / 100
  if (Number.isInteger(pct)) return `${pct}%`
  const s = pct.toFixed(2).replace(/\.?0+$/, "")
  return `${s}%`
}

function CampaignSplitList({ splits }: { splits: NonNullable<CareAllianceCampaignRow["splits"]> }) {
  return (
    <ul className="space-y-2" role="list">
      {splits.map((row, idx) => {
        const pct = formatSplitPercentBps(row.percent_bps)
        if (row.is_alliance_fee) {
          return (
            <li key={`fee-${idx}`}>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-violet-500/15 bg-violet-500/[0.06] px-3 py-2.5 dark:bg-violet-500/[0.08]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-background/80 text-violet-700 dark:text-violet-300">
                    <Landmark className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Alliance allocation</p>
                    <p className="text-[11px] text-muted-foreground">Retained by the alliance from this campaign</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-md border border-border/60 bg-background/90 px-2.5 py-1 text-sm font-semibold tabular-nums text-foreground">
                  {pct}
                </span>
              </div>
            </li>
          )
        }
        const org = row.organization
        return (
          <li key={org?.id ?? `org-${idx}`}>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/70 px-3 py-2.5 shadow-sm dark:bg-background/40">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/50 text-muted-foreground">
                  <Building2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{org?.name ?? "Organization"}</p>
                  {org?.ein ? (
                    <p className="text-[11px] text-muted-foreground tabular-nums">EIN {org.ein}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Member organization</p>
                  )}
                </div>
              </div>
              <span className="shrink-0 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 text-sm font-semibold tabular-nums text-foreground">
                {pct}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function CampaignAccordionItem({
  c,
  onDelete,
}: {
  c: CareAllianceCampaignRow
  onDelete: (row: CareAllianceCampaignRow) => void
}) {
  const splits = c.splits ?? []
  const orgSplitCount = splits.filter((s) => !s.is_alliance_fee).length
  const statusLower = c.status.toLowerCase()
  const isActive = statusLower === "active"

  return (
    <AccordionItem
      value={`campaign-${c.id}`}
      className={cn(
        "overflow-hidden rounded-2xl border border-b-0 bg-card text-card-foreground shadow-sm transition-shadow duration-200",
        "data-[state=open]:shadow-md",
        isActive ? "border-emerald-500/25 ring-1 ring-emerald-500/10 data-[state=open]:ring-emerald-500/15" : "border-border/90",
      )}
    >
      <div className="relative">
        {isActive ? (
          <div
            className="pointer-events-none absolute inset-y-3 left-0 z-0 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600 opacity-90"
            aria-hidden
          />
        ) : null}
        <AccordionTrigger
          className={cn(
            "items-start gap-3 px-4 py-4 text-left hover:no-underline sm:px-5 sm:py-4",
            "[&>svg]:mt-1.5 [&>svg]:shrink-0",
            isActive ? "pl-5 sm:pl-6" : "",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                  isActive
                    ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/12 to-teal-600/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border/80 bg-muted/50 text-muted-foreground",
                )}
                aria-hidden
              >
                <Megaphone className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold leading-snug tracking-tight text-foreground sm:text-[1.05rem]">
                    {c.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      campaignStatusBadgeClass(c.status),
                    )}
                  >
                    {c.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.donations_count} donation{c.donations_count === 1 ? "" : "s"}
                  {splits.length > 0 ? (
                    <>
                      {" · "}
                      {orgSplitCount} org{orgSplitCount === 1 ? "" : "s"}
                      {splits.some((s) => s.is_alliance_fee) ? " + alliance" : ""}
                    </>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/35 px-3 py-1 text-xs font-medium text-muted-foreground">
                <CircleDollarSign className="h-3.5 w-3.5 opacity-80" aria-hidden />
                <span className="tabular-nums">{c.donations_count}</span>
              </div>
              {isActive ? (
                <a
                  href={c.public_donate_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  Donate page
                  <ExternalLink className="h-3 w-3 opacity-80" />
                </a>
              ) : null}
            </div>
          </div>
        </AccordionTrigger>
      </div>

      <AccordionContent className="border-t border-border/60 px-4 pb-4 pt-0 sm:px-5">
        <div className="space-y-4 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
            {c.description ? (
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">{c.description}</p>
            ) : (
              <p className="mt-1.5 text-sm italic text-muted-foreground">No description provided.</p>
            )}
          </div>

          {splits.length > 0 ? (
            <div className="rounded-xl border border-border/70 bg-gradient-to-b from-muted/30 to-muted/[0.12] p-3.5 sm:p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Users className="h-3.5 w-3.5 opacity-80" aria-hidden />
                Split & connected organizations
              </div>
              <CampaignSplitList splits={splits} />
            </div>
          ) : null}

          {c.primary_action_categories && c.primary_action_categories.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {c.primary_action_categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex max-w-full truncate rounded-md border border-border/80 bg-muted/25 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              "flex flex-col gap-3 border-t border-border/50 pt-4",
              "items-end sm:flex-row sm:items-center sm:gap-4",
              c.status === "active" ? "sm:justify-end" : "sm:justify-between",
            )}
          >
            {c.status !== "active" ? (
              <p className="w-full self-start text-left text-xs leading-relaxed text-muted-foreground sm:min-w-0 sm:flex-1 sm:pr-4">
                Set status to <span className="font-medium text-foreground">active</span> to enable the public donation link.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                <Link
                  href={route("care-alliance.workspace.campaigns.edit", c.slug)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Edit
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={c.donations_count > 0}
                title={
                  c.donations_count > 0
                    ? "Campaigns with donations cannot be deleted. Close the campaign instead."
                    : "Delete this campaign"
                }
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(c)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete
              </Button>
              {c.status === "active" ? (
                <Button size="sm" className="h-9 gap-2 font-medium shadow-sm" asChild>
                  <a href={c.public_donate_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    Open donate page
                    <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

type SplitRow =
  | { kind: "org"; organization_id: number | ""; percent: string }
  | { kind: "fee"; percent: string }

export default function CareAllianceWorkspaceCampaigns() {
  const formId = useId()
  const page = usePage<CareAllianceWorkspaceProps>()
  const { alliance, memberships, campaigns } = page.props
  const primaryActionCategories = page.props.primaryActionCategories ?? []
  const campaignsTab: CareAllianceCampaignsTab = page.props.campaignsTab ?? "create"
  const campaignsCount = page.props.campaignsCount ?? campaigns.length

  const activeMembers = memberships.filter((m) => m.status === "active" && m.organization)

  const [deleteCampaign, setDeleteCampaign] = useState<CareAllianceCampaignRow | null>(null)

  const [campName, setCampName] = useState("")
  const [campDesc, setCampDesc] = useState("")
  const [campStatus, setCampStatus] = useState<"draft" | "active" | "closed">("draft")
  const [campCategoryIds, setCampCategoryIds] = useState<number[]>([])

  const selectedPrimaryCategories = useMemo(
    () => primaryActionCategories.filter((c) => campCategoryIds.includes(c.id)),
    [primaryActionCategories, campCategoryIds],
  )
  const remainingPrimaryCategories = useMemo(
    () => primaryActionCategories.filter((c) => !campCategoryIds.includes(c.id)),
    [primaryActionCategories, campCategoryIds],
  )

  const addPrimaryCategoryTag = (id: number) => {
    if (campCategoryIds.includes(id)) return
    if (campCategoryIds.length >= 8) return
    setCampCategoryIds((prev) => [...prev, id])
  }

  const removePrimaryCategoryTag = (id: number) => {
    setCampCategoryIds((prev) => prev.filter((x) => x !== id))
  }
  const [feeOverride, setFeeOverride] = useState("")
  const [splitRows, setSplitRows] = useState<SplitRow[]>([
    { kind: "org", organization_id: "", percent: "" },
    { kind: "fee", percent: "" },
  ])

  const addOrgRow = () => {
    setSplitRows((rows) => {
      const feeRows = rows.filter((x) => x.kind === "fee")
      const orgRows = rows.filter((x) => x.kind === "org")
      return [...orgRows, { kind: "org", organization_id: "", percent: "" }, ...feeRows]
    })
  }

  const updateSplitRow = (idx: number, patch: Partial<SplitRow>) => {
    setSplitRows((rows) => rows.map((row, i) => (i === idx ? ({ ...row, ...patch } as SplitRow) : row)))
  }

  const removeRow = (idx: number) => {
    if (splitRows[idx]?.kind === "fee") {
      toast.error("The alliance fee row cannot be removed.")
      return
    }
    setSplitRows((rows) => rows.filter((_, i) => i !== idx))
  }

  const visitCampaignsTab = (tab: CareAllianceCampaignsTab) => {
    router.get(route(CAMPAIGNS_ROUTE), { tab }, {
      preserveState: true,
      preserveScroll: true,
      only: [...CAMPAIGNS_WORKSPACE_KEYS],
    })
  }

  const confirmDeleteCampaign = () => {
    if (!deleteCampaign) return
    const slug = deleteCampaign.slug
    router.delete(route("care-alliance.campaigns.destroy", slug), {
      preserveScroll: true,
      only: [...CAMPAIGNS_WORKSPACE_KEYS],
      onSuccess: () => {
        toast.success("Campaign deleted")
        setDeleteCampaign(null)
      },
      onError: (errors) => {
        toast.error(firstCampaignError(errors) || "Could not delete campaign.")
      },
    })
  }

  const submitCampaign = () => {
    const name = campName.trim()
    if (name === "") {
      toast.error("Campaign name is required.")
      return
    }

    let allianceFeeBpsOverride: number | null = null
    if (feeOverride.trim() !== "") {
      const raw = feeOverride.replace(",", ".").trim()
      const pct = Number.parseFloat(raw)
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        toast.error("Alliance fee override must be a number between 0 and 100%.")
        return
      }
      allianceFeeBpsOverride = Math.round(pct * 100)
    }

    const splits: { organization_id?: number | null; is_alliance_fee: boolean; percent_bps: number }[] = []
    for (const row of splitRows) {
      const rawPct = String(row.percent).replace(",", ".").trim()
      const p = Number.parseFloat(rawPct)
      if (Number.isNaN(p) || p < 0 || p > 100) {
        toast.error("Each percent must be a number between 0 and 100.")
        return
      }
      const bps = Math.round(p * 100)
      if (row.kind === "fee") {
        splits.push({ organization_id: null, is_alliance_fee: true, percent_bps: bps })
      } else {
        if (!row.organization_id) {
          toast.error("Select an organization for each member row.")
          return
        }
        splits.push({ organization_id: Number(row.organization_id), is_alliance_fee: false, percent_bps: bps })
      }
    }
    const sum = splits.reduce((a, s) => a + s.percent_bps, 0)
    if (sum !== 10000) {
      toast.error(`Splits must total exactly 100% (currently ${(sum / 100).toFixed(2)}%).`)
      return
    }

    router.post(
      route("care-alliance.campaigns.store"),
      {
        name,
        description: campDesc.trim() === "" ? null : campDesc.trim(),
        status: campStatus,
        alliance_fee_bps_override: allianceFeeBpsOverride,
        primary_action_category_ids: campCategoryIds,
        splits,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success("Campaign created")
          setCampName("")
          setCampDesc("")
          setCampCategoryIds([])
          setFeeOverride("")
          setSplitRows([
            { kind: "org", organization_id: "", percent: "" },
            { kind: "fee", percent: "" },
          ])
        },
        onError: (errors) => {
          toast.error(firstCampaignError(errors) || "Could not create campaign.")
        },
      },
    )
  }

  return (
    <CareAllianceWorkspaceShell allianceName={alliance.name} section="campaigns">
      <Tabs value={campaignsTab} onValueChange={(v) => visitCampaignsTab(v as CareAllianceCampaignsTab)} className="w-full space-y-6">
        <TabsList className="grid h-11 w-full max-w-lg grid-cols-2 p-1">
          <TabsTrigger value="create" className="gap-2 text-sm">
            Create campaign
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2 text-sm">
            Your campaigns
            {campaignsCount > 0 ? (
              <Badge
                variant="secondary"
                className="min-w-[1.25rem] border border-border bg-background px-1.5 py-0 text-[10px] font-semibold tabular-nums"
              >
                {campaignsCount}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-0 space-y-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
        <Card className={dashboardCardClass}>
          <CardHeader>
            <CardTitle>Create campaign</CardTitle>
            <CardDescription>
              Add one row per member organization and one row for the alliance fee. Percents must total exactly 100%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeMembers.length === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                Add at least one active member organization before you can assign split rows. Use the Members tab to invite
                orgs.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${formId}-name`}>Name</Label>
                <Input
                  id={`${formId}-name`}
                  className={dashboardInputClass}
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  placeholder="Campaign name"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor={`${formId}-status`}>Status</Label>
                <Select value={campStatus} onValueChange={(v) => setCampStatus(v as "draft" | "active" | "closed")}>
                  <SelectTrigger id={`${formId}-status`} className={dashboardSelectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={dashboardSelectContentClass}>
                    <SelectItem className={dashboardSelectItemClass} value="draft">
                      Draft
                    </SelectItem>
                    <SelectItem className={dashboardSelectItemClass} value="active">
                      Active (accepts donations)
                    </SelectItem>
                    <SelectItem className={dashboardSelectItemClass} value="closed">
                      Closed
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor={`${formId}-desc`}>Description</Label>
              <Textarea
                id={`${formId}-desc`}
                className={dashboardTextareaClass}
                value={campDesc}
                onChange={(e) => setCampDesc(e.target.value)}
                rows={3}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Primary action categories</Label>
              <p className="text-xs text-muted-foreground">
                Same categories as your alliance profile (multi-select, up to 8). Optional for each campaign.
              </p>
              {primaryActionCategories.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                  No categories on your alliance yet. Add them under{" "}
                  <Link href={route("profile.edit")} className="font-medium underline underline-offset-2">
                    Profile settings
                  </Link>{" "}
                  (Primary action categories), then return here to tag campaigns.
                </p>
              ) : (
                <>
                  <div
                    role="group"
                    aria-label="Primary action categories"
                    className="flex min-h-[2.375rem] w-full flex-wrap items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-sm shadow-sm focus-within:ring-2 focus-within:ring-ring/25"
                  >
                    {selectedPrimaryCategories.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex max-w-full items-center gap-0.5 rounded-md border border-white/25 bg-gradient-to-r from-purple-600 to-blue-600 px-1.5 py-0.5 text-[13px] leading-tight text-white shadow-sm"
                      >
                        <span className="truncate">{c.name}</span>
                        <button
                          type="button"
                          onClick={() => removePrimaryCategoryTag(c.id)}
                          className="ml-0.5 inline-flex size-[14px] shrink-0 cursor-pointer items-center justify-center rounded-sm text-white/85 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                          aria-label={`Remove ${c.name}`}
                        >
                          <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                    {remainingPrimaryCategories.length > 0 ? (
                      <>
                        <label className="sr-only" htmlFor={`${formId}-primary-action-add`}>
                          Add category
                        </label>
                        <Select
                          key={campCategoryIds.join(",")}
                          onValueChange={(v) => {
                            if (v) addPrimaryCategoryTag(Number(v))
                          }}
                        >
                          <SelectTrigger
                            id={`${formId}-primary-action-add`}
                            className="h-7 min-w-[7rem] flex-1 justify-start border-0 bg-transparent px-1 py-0.5 text-sm text-muted-foreground shadow-none ring-0 [&_svg]:hidden"
                          >
                            <SelectValue placeholder="Add category…" />
                          </SelectTrigger>
                          <SelectContent className={dashboardSelectContentClass}>
                            {remainingPrimaryCategories.map((c) => (
                              <SelectItem
                                key={c.id}
                                className={dashboardSelectItemClass}
                                value={String(c.id)}
                              >
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    ) : selectedPrimaryCategories.length > 0 ? (
                      <span className="px-1 text-xs text-muted-foreground">All categories selected</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{campCategoryIds.length} of 8 categories selected</p>
                </>
              )}
            </div>

            <div>
              <Label htmlFor={`${formId}-fee-override`}>Alliance fee override % (optional, informational)</Label>
              <Input
                id={`${formId}-fee-override`}
                className={dashboardInputClass}
                value={feeOverride}
                onChange={(e) => setFeeOverride(e.target.value)}
                placeholder="Leave blank to use alliance default"
                inputMode="decimal"
                autoComplete="off"
              />
            </div>

            <div className="space-y-3">
              {splitRows.map((row, idx) => (
                <div
                  key={idx}
                  className={`flex flex-row flex-wrap items-end justify-between gap-2 gap-y-3 p-3 ${dashboardSurfaceClass}`}
                >
                  {row.kind === "org" ? (
                    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2 sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={`${formId}-org-${idx}`}>Organization</Label>
                        <div className={dashboardSplitControlWrap}>
                          <Select
                            value={row.organization_id === "" ? "" : String(row.organization_id)}
                            onValueChange={(v) => updateSplitRow(idx, { organization_id: v ? Number(v) : "" })}
                            disabled={activeMembers.length === 0}
                          >
                            <SelectTrigger
                              id={`${formId}-org-${idx}`}
                              className={cn(dashboardSelectTriggerInsetClass, "px-3")}
                            >
                              <SelectValue placeholder={activeMembers.length === 0 ? "No members yet" : "Select member org"} />
                            </SelectTrigger>
                            <SelectContent className={dashboardSelectContentClass}>
                              {activeMembersForOrgSplitRow(activeMembers, splitRows, idx).map((m) =>
                                m.organization ? (
                                  <SelectItem
                                    key={m.organization.id}
                                    className={dashboardSelectItemClass}
                                    value={String(m.organization.id)}
                                  >
                                    {m.organization.name}
                                  </SelectItem>
                                ) : null,
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="w-full shrink-0 sm:w-28">
                        <Label htmlFor={`${formId}-pct-${idx}`}>%</Label>
                        <div className={dashboardSplitControlWrap}>
                          <Input
                            id={`${formId}-pct-${idx}`}
                            className={cn(dashboardInputClass, dashboardInputInsetClass, "px-3")}
                            value={row.percent}
                            onChange={(e) => updateSplitRow(idx, { percent: e.target.value })}
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2 sm:gap-3">
                      <div className={dashboardSplitLabelCell}>Alliance fee</div>
                      <div className="w-full shrink-0 sm:w-28">
                        <Label htmlFor={`${formId}-fee-pct-${idx}`}>%</Label>
                        <div className={dashboardSplitControlWrap}>
                          <Input
                            id={`${formId}-fee-pct-${idx}`}
                            className={cn(dashboardInputClass, dashboardInputInsetClass, "px-3")}
                            value={row.percent}
                            onChange={(e) => updateSplitRow(idx, { percent: e.target.value })}
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeRow(idx)}
                    disabled={row.kind === "fee"}
                    title={row.kind === "fee" ? "Alliance fee row cannot be removed" : "Remove row"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={addOrgRow}>
                Add organization row
              </Button>
              <Button type="button" onClick={() => void submitCampaign()}>
                Save campaign
              </Button>
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-0 space-y-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
        <Card className={cn(dashboardCardClass, "overflow-hidden")}>
          <CardHeader className="space-y-0 border-b border-border/70 bg-muted/20 pb-4 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Your campaigns</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                  {campaigns.length === 0
                    ? "Published campaigns can share a public donate page with supporters."
                    : `You have ${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}. Active campaigns include a shareable donation link.`}
                </CardDescription>
              </div>
              {campaigns.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-fit shrink-0 border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground"
                >
                  {campaigns.length} total
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-6 pt-5 sm:px-6">
            {campaigns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/15 px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
                  <Megaphone className="h-6 w-6 opacity-70" strokeWidth={1.75} />
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">No campaigns yet</p>
                <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Use the <span className="font-medium text-foreground">Create campaign</span> tab to add one. When you set
                  status to active, a public donate URL will be available to share.
                </p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-3">
                {campaigns.map((c) => (
                  <CampaignAccordionItem key={c.id} c={c} onDelete={(row) => setDeleteCampaign(row)} />
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteCampaign !== null} onOpenChange={(open) => !open && setDeleteCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCampaign ? (
                <>
                  <span className="font-medium text-foreground">{deleteCampaign.name}</span> will be removed permanently.
                  This cannot be undone. Campaigns with donations cannot be deleted from the server.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={() => void confirmDeleteCampaign()}>
              Delete campaign
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CareAllianceWorkspaceShell>
  )
}

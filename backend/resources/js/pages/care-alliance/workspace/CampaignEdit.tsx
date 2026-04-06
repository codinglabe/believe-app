"use client"

import { useEffect, useId, useMemo, useState } from "react"
import CareAllianceWorkspaceShell from "@/layouts/care-alliance/care-alliance-workspace-shell"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
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
import { Link, router, usePage } from "@inertiajs/react"
import toast from "react-hot-toast"
import { ArrowLeft, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  CareAllianceAlliance,
  CareAllianceCampaignRow,
  CareAllianceMembershipRow,
  PrimaryActionCategoryOption,
} from "../types"
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

type PageProps = {
  alliance: CareAllianceAlliance
  memberships: CareAllianceMembershipRow[]
  primaryActionCategories: PrimaryActionCategoryOption[]
  campaign: CareAllianceCampaignRow
}

type SplitRow =
  | { kind: "org"; organization_id: number | ""; percent: string }
  | { kind: "fee"; percent: string }

function firstCampaignError(errors: Record<string, string | string[]> | undefined): string {
  if (!errors) return ""
  const v = errors.campaign
  if (Array.isArray(v)) return v[0] ?? ""
  if (typeof v === "string") return v
  return ""
}

function percentStringFromBps(bps: number): string {
  const pct = bps / 100
  if (Number.isInteger(pct)) return String(pct)
  return pct.toFixed(2).replace(/\.?0+$/, "")
}

function campaignToSplitRows(c: CareAllianceCampaignRow): SplitRow[] {
  const splits = c.splits ?? []
  const rows: SplitRow[] = []
  for (const s of splits) {
    const pct = percentStringFromBps(s.percent_bps)
    if (s.is_alliance_fee) {
      rows.push({ kind: "fee", percent: pct })
    } else {
      rows.push({
        kind: "org",
        organization_id: s.organization?.id ?? "",
        percent: pct,
      })
    }
  }
  if (rows.length === 0) {
    return [
      { kind: "org", organization_id: "", percent: "" },
      { kind: "fee", percent: "" },
    ]
  }
  return rows
}

export default function CareAllianceWorkspaceCampaignEdit() {
  const formId = useId()
  const page = usePage<PageProps>()
  const { alliance, memberships, primaryActionCategories, campaign } = page.props

  const activeMembers = memberships.filter((m) => m.status === "active" && m.organization)

  const [name, setName] = useState(campaign.name)
  const [description, setDescription] = useState(campaign.description ?? "")
  const [status, setStatus] = useState<"draft" | "active" | "closed">(() => {
    const st = String(campaign.status).toLowerCase()
    return st === "active" || st === "closed" ? st : "draft"
  })
  const [categoryIds, setCategoryIds] = useState<number[]>(() =>
    (campaign.primary_action_categories ?? []).map((x) => x.id),
  )
  const [feeOverride, setFeeOverride] = useState(() =>
    campaign.alliance_fee_bps_override != null ? percentStringFromBps(campaign.alliance_fee_bps_override) : "",
  )
  const [splitRows, setSplitRows] = useState<SplitRow[]>(() => campaignToSplitRows(campaign))

  useEffect(() => {
    setName(campaign.name)
    setDescription(campaign.description ?? "")
    const st = String(campaign.status).toLowerCase()
    setStatus(st === "active" || st === "closed" ? st : "draft")
    setCategoryIds((campaign.primary_action_categories ?? []).map((x) => x.id))
    setFeeOverride(
      campaign.alliance_fee_bps_override != null ? percentStringFromBps(campaign.alliance_fee_bps_override) : "",
    )
    setSplitRows(campaignToSplitRows(campaign))
  }, [campaign.id, campaign.slug])

  const selectedPrimaryCategories = useMemo(
    () => primaryActionCategories.filter((c) => categoryIds.includes(c.id)),
    [primaryActionCategories, categoryIds],
  )
  const remainingPrimaryCategories = useMemo(
    () => primaryActionCategories.filter((c) => !categoryIds.includes(c.id)),
    [primaryActionCategories, categoryIds],
  )

  const addPrimaryCategoryTag = (id: number) => {
    if (categoryIds.includes(id)) return
    if (categoryIds.length >= 8) return
    setCategoryIds((prev) => [...prev, id])
  }

  const removePrimaryCategoryTag = (id: number) => {
    setCategoryIds((prev) => prev.filter((x) => x !== id))
  }

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

  const save = () => {
    const trimmedName = name.trim()
    if (trimmedName === "") {
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

    router.patch(
      route("care-alliance.campaigns.update", campaign.slug),
      {
        name: trimmedName,
        description: description.trim() === "" ? null : description.trim(),
        status,
        alliance_fee_bps_override: allianceFeeBpsOverride,
        primary_action_category_ids: categoryIds,
        splits,
      },
      {
        preserveScroll: true,
        onSuccess: () => toast.success("Campaign updated"),
        onError: (errors) => {
          toast.error(firstCampaignError(errors) || "Could not update campaign.")
        },
      },
    )
  }

  const listHref = route("care-alliance.workspace.campaigns", { tab: "list" })

  return (
    <CareAllianceWorkspaceShell allianceName={alliance.name} section="campaigns">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" className="-ml-2 w-fit gap-1.5 px-2 text-muted-foreground" asChild>
              <Link href={listHref}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to campaigns
              </Link>
            </Button>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Edit campaign</h2>
            <p className="text-sm text-muted-foreground">
              Update details, splits, and categories. Percents must total exactly 100%.
            </p>
          </div>
        </div>

        <Card className={dashboardCardClass}>
          <CardHeader>
            <CardTitle>{campaign.name}</CardTitle>
            <CardDescription>
              {campaign.donations_count > 0
                ? `This campaign has ${campaign.donations_count} recorded donation${campaign.donations_count === 1 ? "" : "s"}.`
                : "No donations recorded yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeMembers.length === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                Add at least one active member organization before you can assign split rows.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${formId}-name`}>Name</Label>
                <Input
                  id={`${formId}-name`}
                  className={dashboardInputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Campaign name"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor={`${formId}-status`}>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "active" | "closed")}>
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Primary action categories</Label>
              <p className="text-xs text-muted-foreground">Up to 8. Optional.</p>
              {primaryActionCategories.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                  No categories on your alliance yet. Add them under{" "}
                  <Link href={route("profile.edit")} className="font-medium underline underline-offset-2">
                    Profile settings
                  </Link>
                  .
                </p>
              ) : (
                <>
                  <div
                    role="group"
                    aria-label="Primary action categories"
                    className="flex min-h-[2.375rem] w-full flex-wrap items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-sm shadow-sm focus-within:ring-2 focus-within:ring-ring/25"
                  >
                    {selectedPrimaryCategories.map((cat) => (
                      <span
                        key={cat.id}
                        className="inline-flex max-w-full items-center gap-0.5 rounded-md border border-white/25 bg-gradient-to-r from-purple-600 to-blue-600 px-1.5 py-0.5 text-[13px] leading-tight text-white shadow-sm"
                      >
                        <span className="truncate">{cat.name}</span>
                        <button
                          type="button"
                          onClick={() => removePrimaryCategoryTag(cat.id)}
                          className="ml-0.5 inline-flex size-[14px] shrink-0 cursor-pointer items-center justify-center rounded-sm text-white/85 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                          aria-label={`Remove ${cat.name}`}
                        >
                          <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                    {remainingPrimaryCategories.length > 0 ? (
                      <>
                        <label className="sr-only" htmlFor={`${formId}-cat-add`}>
                          Add category
                        </label>
                        <Select
                          key={categoryIds.join(",")}
                          onValueChange={(v) => {
                            if (v) addPrimaryCategoryTag(Number(v))
                          }}
                        >
                          <SelectTrigger
                            id={`${formId}-cat-add`}
                            className="h-7 min-w-[7rem] flex-1 justify-start border-0 bg-transparent px-1 py-0.5 text-sm text-muted-foreground shadow-none ring-0 [&_svg]:hidden"
                          >
                            <SelectValue placeholder="Add category…" />
                          </SelectTrigger>
                          <SelectContent className={dashboardSelectContentClass}>
                            {remainingPrimaryCategories.map((cat) => (
                              <SelectItem
                                key={cat.id}
                                className={dashboardSelectItemClass}
                                value={String(cat.id)}
                              >
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    ) : selectedPrimaryCategories.length > 0 ? (
                      <span className="px-1 text-xs text-muted-foreground">All categories selected</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{categoryIds.length} of 8 categories selected</p>
                </>
              )}
            </div>

            <div>
              <Label htmlFor={`${formId}-fee-override`}>Alliance fee override % (optional)</Label>
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
                              <SelectValue
                                placeholder={activeMembers.length === 0 ? "No members yet" : "Select member org"}
                              />
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
            <Button type="button" variant="outline" onClick={addOrgRow}>
              Add organization row
            </Button>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href={listHref}>Cancel</Link>
              </Button>
              <Button type="button" onClick={() => void save()}>
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </CareAllianceWorkspaceShell>
  )
}

"use client"

import { useId, useState } from "react"
import CareAllianceWorkspaceShell from "@/layouts/care-alliance/care-alliance-workspace-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
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
import { router, usePage } from "@inertiajs/react"
import toast from "react-hot-toast"
import { ExternalLink, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CareAllianceWorkspaceProps } from "../types"
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
} from "./shared"

function firstCampaignError(errors: Record<string, string | string[]> | undefined): string {
  if (!errors) return ""
  const v = errors.campaign
  if (Array.isArray(v)) return v[0] ?? ""
  if (typeof v === "string") return v
  return ""
}

type SplitRow =
  | { kind: "org"; organization_id: number | ""; percent: string }
  | { kind: "fee"; percent: string }

export default function CareAllianceWorkspaceCampaigns() {
  const formId = useId()
  const page = usePage<CareAllianceWorkspaceProps>()
  const { alliance, memberships, campaigns } = page.props

  const activeMembers = memberships.filter((m) => m.status === "active" && m.organization)

  const [campName, setCampName] = useState("")
  const [campDesc, setCampDesc] = useState("")
  const [campStatus, setCampStatus] = useState<"draft" | "active">("draft")
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
        splits,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success("Campaign created")
          setCampName("")
          setCampDesc("")
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
      <div className="space-y-6">
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
                <Select value={campStatus} onValueChange={(v) => setCampStatus(v as "draft" | "active")}>
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
                              {activeMembers.map((m) =>
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

        <Card className={dashboardCardClass}>
          <CardHeader>
            <CardTitle>Your campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.length === 0 && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
            {campaigns.map((c) => (
              <div
                key={c.id}
                className={`flex flex-row flex-wrap items-center justify-between gap-2 p-3 ${dashboardSurfaceClass}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.status} · {c.donations_count} donations
                  </div>
                </div>
                {c.status === "active" && (
                  <div className="flex shrink-0 justify-end">
                    <Button variant="outline" size="sm" asChild>
                      <a href={c.public_donate_url} target="_blank" rel="noreferrer">
                        Donate page <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </CareAllianceWorkspaceShell>
  )
}

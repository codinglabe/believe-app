"use client"

import { Head, router, useForm, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { BreadcrumbItem } from "@/types"
import { AlertTriangle, Landmark, RefreshCw, Wallet } from "lucide-react"
import { useState } from "react"

interface PhazeLiveBalance {
  available: number | null
  currency: string
  fetched_at: string | null
  error: string | null
  variance: number | null
}

interface Summary {
  available_balance: number
  total_funded: number
  total_consumed: number
  remaining_balance: number
  currency: string
  phaze_live: PhazeLiveBalance
}

interface LedgerEntry {
  id: number
  type: string
  amount: number
  balance_before: number
  balance_after: number
  reference_type: string | null
  reference_id: number | null
  reference_label: string | null
  notes: string | null
  created_by: { id: number; name: string; email: string } | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

interface PaginatedLedger {
  data: LedgerEntry[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  links: Array<{ url: string | null; label: string; active: boolean }>
}

interface Props {
  summary: Summary
  ledger: PaginatedLedger
  filters: { type: string | null }
  canTopUp: boolean
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "System", href: "#" },
  { title: "Phaze balance", href: "/admin/phaze-balance" },
]

function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—"
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function typeLabel(type: string): string {
  switch (type) {
    case "top_up":
      return "Top up"
    case "purchase_deduction":
      return "Purchase"
    case "manual_adjustment":
      return "Adjustment"
    default:
      return type
  }
}

export default function AdminPhazeBalanceIndex({ summary, ledger, filters, canTopUp }: Props) {
  const page = usePage<{ flash?: { success?: string } }>()
  const [typeFilter, setTypeFilter] = useState(filters.type ?? "")

  const topUpForm = useForm({
    amount: "",
    notes: "",
  })

  const applyTypeFilter = (e: React.FormEvent) => {
    e.preventDefault()
    router.get(
      route("admin.phaze-balance.index"),
      { type: typeFilter || undefined },
      { preserveState: true },
    )
  }

  const submitTopUp = (e: React.FormEvent) => {
    e.preventDefault()
    topUpForm.post(route("admin.phaze-balance.top-up"), {
      preserveScroll: true,
      onSuccess: () => topUpForm.reset(),
    })
  }

  const internalMetrics = [
    { label: "Internal available balance", value: summary.available_balance, highlight: true },
    { label: "Total funds added", value: summary.total_funded },
    { label: "Total funds consumed", value: summary.total_consumed },
    { label: "Remaining balance", value: summary.remaining_balance },
  ]

  const live = summary.phaze_live
  const variance = live.variance
  const hasVarianceMismatch = variance !== null && Math.abs(variance) >= 0.01

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Phaze balance — Admin" />
      <div className="w-full space-y-6 p-4 sm:p-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <Landmark className="h-3.5 w-3.5" />
            Admin · Phaze prefunding
          </div>
          <h1 className="text-3xl font-bold text-foreground">Phaze balance management</h1>
          <p className="max-w-3xl text-muted-foreground">
            Internal balance is the source of truth for purchase validation. Live Phaze balance is fetched read-only
            for reconciliation when the API is available.
          </p>
        </div>

        {page.props.flash?.success ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
            {page.props.flash.success}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {internalMetrics.map((metric) => (
            <Card key={metric.label} className={metric.highlight ? "border-l-4 border-l-emerald-500" : undefined}>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">{metric.label}</CardDescription>
                <CardTitle className="text-2xl">{formatUsd(metric.value)}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4" />
              Live Phaze balance (read-only)
            </CardTitle>
            <CardDescription>
              Pulled from Phaze account status API for auditing. Purchases validate against the internal balance only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Phaze reported balance</p>
                <p className="text-2xl font-semibold">
                  {live.available !== null ? formatUsd(live.available) : "Unavailable"}
                </p>
              </div>
              {live.fetched_at ? (
                <Badge variant="outline" className="text-xs">
                  Fetched {new Date(live.fetched_at).toLocaleString()}
                </Badge>
              ) : null}
              {variance !== null ? (
                <Badge variant={hasVarianceMismatch ? "destructive" : "secondary"}>
                  Variance {variance >= 0 ? "+" : ""}
                  {formatUsd(variance)}
                </Badge>
              ) : null}
            </div>
            {live.error ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{live.error}</span>
              </div>
            ) : null}
            {hasVarianceMismatch ? (
              <p className="text-sm text-muted-foreground">
                Internal and Phaze balances differ. Record a top-up or manual adjustment after verifying deposits in
                Phaze.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {canTopUp ? (
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4" />
                Record fund top-up
              </CardTitle>
              <CardDescription>
                Add funds when you deposit more money into your Phaze prefunded account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitTopUp} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={topUpForm.data.amount}
                    onChange={(e) => topUpForm.setData("amount", e.target.value)}
                    required
                  />
                  {topUpForm.errors.amount ? (
                    <p className="text-sm text-destructive">{topUpForm.errors.amount}</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="notes">Notes / reason</Label>
                  <Textarea
                    id="notes"
                    value={topUpForm.data.notes}
                    onChange={(e) => topUpForm.setData("notes", e.target.value)}
                    placeholder="e.g. Wire transfer confirmation #12345 — $5,000 Phaze deposit"
                    required
                  />
                  {topUpForm.errors.notes ? (
                    <p className="text-sm text-destructive">{topUpForm.errors.notes}</p>
                  ) : null}
                </div>
                <Button type="submit" disabled={topUpForm.processing}>
                  Record top-up
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <form onSubmit={applyTypeFilter} className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="type">Ledger type</Label>
            <select
              id="type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All types</option>
              <option value="top_up">Top up</option>
              <option value="purchase_deduction">Purchase deduction</option>
              <option value="manual_adjustment">Manual adjustment</option>
            </select>
          </div>
          <Button type="submit">Apply</Button>
        </form>

        <Card>
          <CardHeader>
            <CardTitle>Balance ledger</CardTitle>
            <CardDescription>Complete audit trail of internal Phaze prefunded balance movements.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium text-right">Amount</th>
                  <th className="pb-2 pr-4 font-medium text-right">Before</th>
                  <th className="pb-2 pr-4 font-medium text-right">After</th>
                  <th className="pb-2 pr-4 font-medium">Reference</th>
                  <th className="pb-2 pr-4 font-medium">Added by</th>
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {ledger.data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No ledger entries yet.
                    </td>
                  </tr>
                ) : (
                  ledger.data.map((row) => (
                    <tr key={row.id} className="border-b border-muted/50">
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">{typeLabel(row.type)}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">{formatUsd(row.amount)}</td>
                      <td className="py-3 pr-4 text-right">{formatUsd(row.balance_before)}</td>
                      <td className="py-3 pr-4 text-right">{formatUsd(row.balance_after)}</td>
                      <td className="py-3 pr-4">
                        {row.reference_id
                          ? `#${row.reference_id}${row.reference_label ? ` · ${row.reference_label}` : ""}`
                          : row.reference_label ?? "—"}
                      </td>
                      <td className="py-3 pr-4">{row.created_by?.name ?? "System"}</td>
                      <td className="py-3 max-w-xs truncate" title={row.notes ?? undefined}>
                        {row.notes ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

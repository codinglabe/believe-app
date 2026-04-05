"use client"

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  Building2,
  Coins,
  CreditCard,
  Landmark,
  Receipt,
  Sparkles,
  User,
  Wallet,
} from "lucide-react"

export interface UnifiedLedgerRow {
  txn_id: number
  datetime_iso: string
  module: string
  transaction_type: string
  direction: string
  from_type: string
  from_name: string | null
  from_email: string | null
  from_id: number | null
  to_type: string
  to_name: string | null
  to_email: string | null
  to_id: number | null
  related_record: string
  subtotal_amount: number | null
  sales_tax_amount: number | null
  shipping_amount: number | null
  gross_amount: number
  processor_fee_amount: number
  stripe_fee_amount: number
  bridge_fee_amount: number
  biu_fee_amount: number
  split_amount: number
  refund_amount: number
  net_amount: number | null
  currency: string
  status: string
  provider: string
  reference: string
  organization_id: number | null
  organization_name: string | null
}

/** Believe Points: same numeric amount as points, show coin icon + pts (not USD). */
function ledgerAmountNode(
  usePoints: boolean,
  n: number | null | undefined,
  currency: string,
  zeroAsDash = false,
  emphasis = false,
): ReactNode {
  if (n === null || n === undefined) return "—"
  if (zeroAsDash && n === 0) return "—"
  if (usePoints) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 tabular-nums text-foreground", emphasis && "text-lg font-bold")}>
        <Coins className={cn("shrink-0 text-amber-600 dark:text-amber-400", emphasis ? "h-5 w-5" : "h-4 w-4")} aria-hidden />
        {Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} pts
      </span>
    )
  }
  return formatMoney(n, currency, zeroAsDash)
}

function formatMoney(n: number | null | undefined, currency: string, zeroAsDash = false): string {
  if (n === null || n === undefined) return "—"
  if (zeroAsDash && n === 0) return "—"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${currency} ${n.toFixed(2)}`
  }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return iso
  }
}

function moduleLabel(m: string) {
  const map: Record<string, string> = {
    donation: "Donation",
    fundme: "FundMe",
    campaign: "Campaign",
    marketplace: "Marketplace",
    servicehub: "Service Hub",
    course: "Course",
    merchant_hub: "Merchant Hub",
    organization_subscription: "Org subscription",
    merchant_subscription: "Merchant subscription",
    payout: "Payout",
    refund: "Refund",
    adjustment: "Adjustment",
  }
  return map[m] ?? m.replace(/_/g, " ")
}

function providerBadgeClass(p: string) {
  switch (p) {
    case "stripe":
      return "border-violet-500/40 bg-violet-500/10 text-violet-900 dark:text-violet-100"
    case "bridge":
      return "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100"
    case "points":
      return "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
    default:
      return "border-border/60 bg-muted/50 text-foreground"
  }
}

function ProviderRailLabel({ provider }: { provider: string }) {
  if (provider === "points") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Coins className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        Believe Points
      </span>
    )
  }
  return <span className="capitalize">{provider}</span>
}

type Variant = "full" | "compact"

export function UnifiedLedgerCard({ data, variant = "full", className }: { data: UnifiedLedgerRow; variant?: Variant; className?: string }) {
  const cur = data.currency || "USD"
  const usePoints = data.provider === "points"

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-lg border border-primary/20 bg-gradient-to-r from-primary/[0.06] to-transparent px-3 py-2 text-xs sm:text-sm",
          className,
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wide">
            {moduleLabel(data.module)}
          </Badge>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium text-foreground">{data.transaction_type.replace(/_/g, " ")}</span>
          {data.module === "believe_points" ? (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="max-w-[220px] truncate text-foreground" title={data.from_name ?? ""}>
                Purchaser: {data.from_name ?? "—"}
              </span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="max-w-[140px] truncate text-foreground" title={data.from_name ?? ""}>
                {data.from_name ?? data.from_type}
              </span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="max-w-[160px] truncate font-medium text-foreground" title={data.to_name ?? ""}>
                {data.to_name ?? data.to_type}
              </span>
            </>
          )}
          <span className="ml-auto flex flex-wrap items-center justify-end gap-1.5 tabular-nums">
            <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-muted-foreground">
              Gross {ledgerAmountNode(usePoints, data.gross_amount, cur)}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-flex flex-wrap items-center gap-x-1.5 font-semibold text-foreground">
              Net {ledgerAmountNode(usePoints, data.net_amount, cur)}
            </span>
            <Badge variant="outline" className={cn("text-[10px] capitalize", providerBadgeClass(data.provider))}>
              <ProviderRailLabel provider={data.provider} />
            </Badge>
            {data.provider !== "points" && (
              <>
                <Badge variant="outline" className={cn("text-[10px] font-semibold", providerBadgeClass("stripe"))}>
                  Stripe {formatMoney(data.stripe_fee_amount, cur)}
                </Badge>
                <Badge variant="outline" className={cn("text-[10px] font-semibold", providerBadgeClass("bridge"))}>
                  Bridge {formatMoney(data.bridge_fee_amount, cur)}
                </Badge>
              </>
            )}
          </span>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("overflow-hidden border-primary/25 bg-card/60 shadow-lg ring-1 ring-primary/10", className)}>
      <CardHeader className="border-b border-border/60 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden />
              <CardTitle className="text-lg sm:text-xl">Unified finance row</CardTitle>
              <Badge variant="secondary" className="text-[10px] font-normal uppercase tracking-wider">
                BIU ledger spec
              </Badge>
            </div>
            <CardDescription className="text-sm">
              One-line view for finance: module, parties, fees, and settlement — aligned with your workbook and client export.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              {data.direction}
            </Badge>
            <Badge variant="outline" className={cn("gap-1.5 capitalize", providerBadgeClass(data.provider))}>
              <ProviderRailLabel provider={data.provider} />
            </Badge>
            <Badge variant="outline" className="capitalize">
              {data.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 pt-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1 rounded-xl border border-border/50 bg-muted/20 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Txn ID</p>
            <p className="font-mono text-xl font-bold text-foreground">{data.txn_id}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(data.datetime_iso)}</p>
          </div>
          <div className="space-y-1 rounded-xl border border-border/50 bg-muted/20 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Module</p>
            <p className="text-lg font-semibold capitalize text-foreground">{moduleLabel(data.module)}</p>
            <p className="font-mono text-sm text-primary">{data.transaction_type}</p>
          </div>
          <div className="space-y-1 rounded-xl border border-border/50 bg-muted/20 p-4 sm:col-span-2 lg:col-span-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Related record</p>
            <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Receipt className="h-4 w-4 shrink-0 text-primary/80" />
              {data.related_record}
            </p>
          </div>
        </div>

        <div className={cn("grid gap-4", data.module === "believe_points" ? "" : "lg:grid-cols-2")}>
          <div className="rounded-xl border border-border/50 bg-background/80 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              {data.module === "believe_points" ? "Purchaser" : `From (${data.from_type})`}
            </div>
            <p className="text-base font-semibold text-foreground">{data.from_name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{data.from_email ?? "—"}</p>
            {data.from_id != null && <p className="mt-1 font-mono text-[11px] text-muted-foreground">User ID {data.from_id}</p>}
          </div>
          {data.module !== "believe_points" && (
            <div className="rounded-xl border border-border/50 bg-background/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                To ({data.to_type})
              </div>
              <p className="text-base font-semibold text-foreground">{data.to_name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{data.to_email ?? "—"}</p>
              {data.to_id != null && <p className="mt-1 font-mono text-[11px] text-muted-foreground">ID {data.to_id}</p>}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />
            Amounts
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <Amount label="Subtotal" value={ledgerAmountNode(usePoints, data.subtotal_amount, cur, true)} />
            <Amount label="Sales tax" value={ledgerAmountNode(usePoints, data.sales_tax_amount, cur, true)} />
            <Amount label="Shipping" value={ledgerAmountNode(usePoints, data.shipping_amount, cur, true)} />
            <Amount label="Gross" value={ledgerAmountNode(usePoints, data.gross_amount, cur, false, true)} emphasis />
            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Proc fee (Stripe + Bridge)</p>
              {data.provider === "points" ? (
                <>
                  <p className="tabular-nums text-sm font-semibold text-muted-foreground">—</p>
                  <Badge variant="outline" className={cn("gap-1 text-[10px] font-medium leading-tight", providerBadgeClass("points"))}>
                    <Coins className="h-3 w-3 shrink-0" aria-hidden />
                    No Fee
                  </Badge>
                </>
              ) : (
                <>
                  <p className="tabular-nums text-sm font-semibold text-foreground">{formatMoney(data.processor_fee_amount, cur)}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={cn("tabular-nums text-xs font-semibold", providerBadgeClass("stripe"))}>
                      Stripe {formatMoney(data.stripe_fee_amount, cur)}
                    </Badge>
                    <Badge variant="outline" className={cn("tabular-nums text-xs font-semibold", providerBadgeClass("bridge"))}>
                      Bridge {formatMoney(data.bridge_fee_amount, cur)}
                    </Badge>
                  </div>
                </>
              )}
            </div>
            <Amount label="BIU fee" value={ledgerAmountNode(usePoints, data.biu_fee_amount, cur)} />
            <Amount label="Split" value={ledgerAmountNode(usePoints, data.split_amount, cur, true)} />
            <Amount label="Refund" value={ledgerAmountNode(usePoints, data.refund_amount, cur, true)} />
            <Amount label="Net" value={ledgerAmountNode(usePoints, data.net_amount, cur, false, true)} emphasis className="md:col-span-2 lg:col-span-1" />
          </div>
          {data.module === "marketplace" && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Gross</span> is the buyer&apos;s checkout total (subtotal + tax + shipping).
              <span className="mx-1">·</span>
              <span className="font-medium text-foreground">Net</span> is the combined settlement owed to{" "}
              <span className="font-medium text-foreground">merchant + nonprofit</span> from{" "}
              <span className="font-medium text-foreground">OrderSplit</span> when present; if no split was stored (common for
              Printify-only storefront orders), Net uses{" "}
              <span className="font-medium text-foreground">order subtotal − platform fee</span>. BIU fee includes the platform
              share on product subtotal plus any order platform fee. Stripe is the card processing fee when paid by card.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/90 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 text-primary/80" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reference</p>
              <p className="break-all font-mono text-sm text-foreground">{data.reference}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 sm:text-right">
            {data.provider === "points" ? (
              <Coins className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400 sm:order-2" aria-hidden />
            ) : (
              <Landmark className="mt-0.5 h-5 w-5 text-primary/80 sm:order-2" />
            )}
            <div className="sm:order-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Provider rail</p>
              <p className="text-sm font-medium text-foreground">
                <ProviderRailLabel provider={data.provider} />
              </p>
              {(data.bridge_fee_amount > 0 || data.provider === "bridge") && data.provider !== "points" && (
                <p className="mt-1 text-xs text-muted-foreground">Bridge fees or virtual-account flows appear in Proc fee / provider.</p>
              )}
              {data.provider === "points" && (
                <p className="mt-1 text-xs text-muted-foreground">Paid from the donor&apos;s Believe Points balance (not card or bank).</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Amount({
  label,
  value,
  emphasis,
  hint,
  className,
}: {
  label: string
  value: ReactNode
  emphasis?: boolean
  hint?: string
  className?: string
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className={cn("tabular-nums text-foreground", emphasis ? "text-lg font-bold" : "text-sm font-semibold")}>{value}</div>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

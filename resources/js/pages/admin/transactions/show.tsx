"use client"

import { useState } from "react"
import type { ComponentType } from "react"
import { Head, Link, router } from "@inertiajs/react"
import { motion } from "framer-motion"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConfirmationModal } from "@/components/admin/confirmation-modal"
import {
  ArrowLeft,
  ArrowRightLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  Hash,
  Info,
  Link2,
  ScrollText,
  Trash2,
  User,
  Wallet,
  XCircle,
  Ban,
  AlertCircle,
  ExternalLink,
  Heart,
  Building2,
  Network,
  Receipt,
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import { cn } from "@/lib/utils"

interface StripeSnapshot {
  customer_id: string | null
  customer_dashboard_url: string | null
  payment_intent: {
    id: string
    amount_cents: number
    amount_display: string
    currency: string
    status: string
    created: string | null
    description: string | null
    livemode: boolean | null
  } | null
  checkout_session: {
    id: string
    amount_total_cents: number
    amount_total_display: string
    currency: string
    payment_status: string
    status: string | null
    created: string | null
    payment_intent_id: string | null
    customer: string | null
  } | null
  charge: {
    id: string
    amount_cents: number
    amount_display: string
    currency: string
    status: string
    paid: boolean | null
    created: string | null
  } | null
  subscription: {
    id: string
    status: string
    currency: string
    customer: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean | null
    price_id: string | null
    unit_amount_cents: number | null
    unit_amount_display: string | null
  } | null
  payment_intent_dashboard_url: string | null
  identifiers_found: {
    payment_intent_ids: string[]
    session_ids: string[]
    charge_ids: string[]
    subscription_ids: string[]
  }
  fetch_error: string | null
}

interface DonationLedgerInfo {
  /** Present on new API payloads; omit = treat as main Believe donation row */
  kind?: "donation" | "care_alliance_campaign"
  missing?: boolean
  donation_id?: number
  id?: number
  status?: string
  frequency?: string
  amount_display?: string
  amount_raw?: number | string
  payment_method?: string
  stripe_reference?: string | null
  payment_reference?: string | null
  currency?: string
  organization_name?: string | null
  care_alliance_name?: string | null
  campaign_name?: string | null
  message?: string | null
  donation_date?: string | null
  donor_user_id?: number | null
  recipient_user_id?: number | null
}

/** Full financial breakdown (same shape as ledger index report payload). */
interface LedgerReportRow {
  date: string
  reference: string
  source_type: string
  gross_amount: number
  stripe_fee: number
  bridge_fee: number
  biu_fee: number
  split_deduction: number
  refund_amount: number
  net_to_organization: number | null
  payout_status: string | null
  organization_id: number | null
  organization_name: string | null
}

/** Who this row is primarily about: personal user, nonprofit wallet, or Care Alliance. */
interface LedgerActorContext {
  kind: "user" | "organization" | "care_alliance"
  label: string
  detail: string | null
  organization_id: number | null
  care_alliance_id: number | null
  care_alliance_name: string | null
}

interface TransactionDetail {
  id: number
  transaction_id: string
  type: string
  status: string
  amount: number
  fee: number
  currency: string
  payment_method: string | null
  related_type: string | null
  related_id: number | string | null
  related_kind: string
  related_purpose: string
  related_display_name: string
  related_label: string
  /** polymorphic row in DB | inferred from meta JSON | nothing found */
  related_source: "polymorphic" | "meta" | "none"
  processed_at: string | null
  created_at: string
  updated_at: string
  user: { id: number; name: string; email: string } | null
  meta: Record<string, unknown> | null
  donation: DonationLedgerInfo | null
  donation_badge_label?: string
  donation_ledger_perspective?: string | null
  ledger_actor_context?: LedgerActorContext | null
  ledger_report?: LedgerReportRow | null
  stripe: StripeSnapshot
}

interface Props {
  transaction: TransactionDetail
}

const TYPE_COPY: Record<string, { title: string; body: string }> = {
  deposit: {
    title: "Deposit",
    body: "Money or value credited into the user’s wallet balance (for example after a successful card payment or transfer in).",
  },
  withdrawal: {
    title: "Withdrawal",
    body: "Funds leaving the platform toward an external destination (for example a bank or PayPal payout).",
  },
  purchase: {
    title: "Purchase",
    body: "A charge for goods, services, or digital items inside Believe (orders, gigs, courses, etc.).",
  },
  refund: {
    title: "Refund",
    body: "Money returned to the payer or credited back—often tied to a cancelled order or dispute resolution.",
  },
  commission: {
    title: "Commission",
    body: "A fee or revenue share taken by the platform or a partner on a qualifying transaction.",
  },
  transfer_out: {
    title: "Transfer out",
    body: "Internal movement of balance from this user toward another wallet or settlement bucket.",
  },
  transfer_in: {
    title: "Transfer in",
    body: "Internal movement of balance received from another wallet or settlement bucket.",
  },
}

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  pending: {
    title: "Pending",
    body: "The operation is recorded but not finalized—waiting for payment, settlement, or manual review.",
  },
  completed: {
    title: "Completed",
    body: "The transaction finished successfully and balances (if any) should reflect this entry.",
  },
  failed: {
    title: "Failed",
    body: "The attempt did not succeed (card declined, gateway error, or validation failure).",
  },
  cancelled: {
    title: "Cancelled",
    body: "The transaction was voided before completion and should not settle.",
  },
  withdrawal: {
    title: "Withdrawal (status)",
    body: "Used in some flows to mark payout or withdrawal-specific processing—check related records for detail.",
  },
  refund: {
    title: "Refund (status)",
    body: "Indicates this row represents or tracks a refund lifecycle.",
  },
  deposit: {
    title: "Deposit (status)",
    body: "Sometimes used when the row is categorized as an inbound funds event.",
  },
  rejected: {
    title: "Rejected",
    body: "Blocked by policy, risk checks, or admin decision—no funds should move.",
  },
}

function formatMoney(n: number, currency: string) {
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

function typeBadgeClass(type: string): string {
  switch (type) {
    case "deposit":
    case "transfer_in":
      return "border-emerald-500/40 bg-emerald-500/[0.1] text-emerald-900 dark:text-emerald-100"
    case "withdrawal":
    case "transfer_out":
      return "border-sky-500/40 bg-sky-500/[0.1] text-sky-900 dark:text-sky-100"
    case "purchase":
      return "border-violet-500/40 bg-violet-500/[0.1] text-violet-900 dark:text-violet-100"
    case "refund":
      return "border-amber-500/40 bg-amber-500/[0.1] text-amber-950 dark:text-amber-100"
    case "commission":
      return "border-orange-500/40 bg-orange-500/[0.1] text-orange-950 dark:text-orange-100"
    default:
      return "border-border/60 bg-muted/40 text-foreground"
  }
}

/** Donor gifts are stored as purchase-type rows; surface “Donation” in the UI when metadata says so. */
function adminTransactionTypeDisplay(t: TransactionDetail): {
  badgeLabel: string
  badgeClass: string
  typeExplainBody: string
} {
  const meta = t.meta && typeof t.meta === "object" ? (t.meta as Record<string, unknown>) : {}
  if (meta.ledger_role === "donor_payment" || t.donation_ledger_perspective === "donor") {
    return {
      badgeLabel: "Donation",
      badgeClass: "border-rose-500/40 bg-rose-500/[0.1] text-rose-900 dark:text-rose-100",
      typeExplainBody:
        "This is a donor-side gift. The database stores it as a purchase-type row for audit (see metadata such as ledger_role: donor_payment); wallet impact follows your rules (e.g. exclude_from_wallet_stats).",
    }
  }
  if (t.donation_ledger_perspective === "campaign" && t.type === "purchase") {
    return {
      badgeLabel: "Campaign gift",
      badgeClass: "border-amber-500/40 bg-amber-500/[0.1] text-amber-950 dark:text-amber-100",
      typeExplainBody:
        "Care Alliance campaign checkout. The row may be purchase-typed for processor alignment; see the donation section below for campaign context.",
    }
  }
  const copy = TYPE_COPY[t.type] ?? {
    title: t.type.replace(/_/g, " "),
    body: "Classification of how this row affects balances and reporting.",
  }
  return {
    badgeLabel: t.type.replace(/_/g, " "),
    badgeClass: typeBadgeClass(t.type),
    typeExplainBody: copy.body,
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "completed":
    case "deposit":
      return "border-emerald-500/40 bg-emerald-500/[0.1] text-emerald-900 dark:text-emerald-100"
    case "pending":
      return "border-amber-500/40 bg-amber-500/[0.1] text-amber-950 dark:text-amber-100"
    case "failed":
    case "rejected":
      return "border-red-500/40 bg-red-500/[0.1] text-red-900 dark:text-red-100"
    case "cancelled":
      return "border-muted-foreground/40 bg-muted/50 text-muted-foreground"
    case "withdrawal":
    case "refund":
      return "border-sky-500/40 bg-sky-500/[0.1] text-sky-900 dark:text-sky-100"
    default:
      return "border-border/60 bg-muted/40 text-foreground"
  }
}

function ledgerActorContextIcon(kind: LedgerActorContext["kind"]): ComponentType<{ className?: string }> {
  switch (kind) {
    case "organization":
      return Building2
    case "care_alliance":
      return Network
    default:
      return User
  }
}

function ledgerActorBadgeClass(kind: LedgerActorContext["kind"]): string {
  switch (kind) {
    case "organization":
      return "border-sky-500/45 bg-sky-500/[0.1] text-sky-900 dark:text-sky-100"
    case "care_alliance":
      return "border-violet-500/45 bg-violet-500/[0.1] text-violet-900 dark:text-violet-100"
    default:
      return "border-amber-500/45 bg-amber-500/[0.1] text-amber-950 dark:text-amber-100"
  }
}

function donationPerspectiveBadgeClass(perspective: string | null | undefined): string {
  switch (perspective) {
    case "recipient_direct":
      return "border-emerald-500/45 bg-emerald-500/[0.1] text-emerald-900 dark:text-emerald-100"
    case "recipient_split":
      return "border-teal-500/45 bg-teal-500/[0.1] text-teal-900 dark:text-teal-100"
    case "alliance_fee":
      return "border-violet-500/45 bg-violet-500/[0.1] text-violet-900 dark:text-violet-100"
    case "campaign":
      return "border-amber-500/45 bg-amber-500/[0.1] text-amber-950 dark:text-amber-100"
    case "donor":
    default:
      return "border-rose-500/45 bg-rose-500/[0.1] text-rose-900 dark:text-rose-100"
  }
}

function relatedSourceBadge(source: TransactionDetail["related_source"]): { label: string; className: string } {
  switch (source) {
    case "polymorphic":
      return {
        label: "Database link",
        className: "border-primary/35 bg-primary/[0.08] text-primary",
      }
    case "meta":
      return {
        label: "From metadata",
        className: "border-violet-500/40 bg-violet-500/[0.1] text-violet-900 dark:text-violet-100",
      }
    case "none":
    default:
      return {
        label: "No polymorphic link",
        className: "border-border/50 bg-muted/35 text-muted-foreground",
      }
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "completed":
    case "deposit":
      return <CheckCircle2 className="h-4 w-4 shrink-0" />
    case "pending":
      return <Clock className="h-4 w-4 shrink-0" />
    case "failed":
    case "rejected":
      return <XCircle className="h-4 w-4 shrink-0" />
    case "cancelled":
      return <Ban className="h-4 w-4 shrink-0" />
    default:
      return <AlertCircle className="h-4 w-4 shrink-0" />
  }
}

function ExplainBlock({
  label,
  value,
  explanation,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  explanation: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-muted/[0.35] to-card/60 p-5 shadow-sm ring-1 ring-border/25 dark:from-muted/15 dark:to-card/50">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary ring-1 ring-primary/20">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="text-base font-medium leading-snug text-foreground">{value}</div>
          <p className="text-sm leading-relaxed text-muted-foreground">{explanation}</p>
        </div>
      </div>
    </div>
  )
}

export default function TransactionShow({ transaction: t }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Transaction ledger", href: "/admin/transactions/ledger" },
    { title: t.transaction_id, href: "#" },
  ]

  const txType = adminTransactionTypeDisplay(t)
  const statusInfo = STATUS_COPY[t.status] ?? {
    title: t.status,
    body: "Current lifecycle state for this ledger row.",
  }

  const metaJson =
    t.meta && Object.keys(t.meta).length > 0 ? JSON.stringify(t.meta, null, 2) : null

  const relatedSource = relatedSourceBadge(t.related_source)

  const actorCtx = t.ledger_actor_context
  const ActorHeaderIcon = actorCtx ? ledgerActorContextIcon(actorCtx.kind) : User

  const handleDelete = () => {
    setDeleting(true)
    router.delete(route("admin.transactions.destroy", t.id), {
      preserveScroll: false,
      onFinish: () => {
        setDeleting(false)
        setDeleteOpen(false)
      },
    })
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Transaction ${t.transaction_id}`} />

      <div className="relative mx-4 my-6 space-y-8 overflow-hidden sm:mx-8 lg:mx-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.09] via-transparent to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="space-y-3">
            <Link
              href="/admin/transactions/ledger"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary/90 transition-colors hover:text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to ledger
            </Link>
            <Badge
              variant="outline"
              className="gap-1.5 rounded-full border-primary/25 bg-primary/[0.07] px-3 py-1 text-xs font-medium text-primary"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Full record
            </Badge>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t.transaction_id}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("capitalize", txType.badgeClass)}>
                {txType.badgeLabel}
              </Badge>
              <Badge variant="outline" className={cn("capitalize", statusBadgeClass(t.status))}>
                <span className="inline-flex items-center gap-1.5">
                  {statusIcon(t.status)}
                  {t.status}
                </span>
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                #{t.id}
              </Badge>
              {actorCtx && (
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1.5 font-sans font-semibold normal-case tracking-normal",
                    ledgerActorBadgeClass(actorCtx.kind),
                  )}
                >
                  <ActorHeaderIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {actorCtx.label}
                </Badge>
              )}
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              This page explains every field so you can audit money movement with confidence.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button variant="outline" className="rounded-full border-border/55 bg-background/60 hover:bg-muted/40" asChild>
              <Link href="/admin/transactions/ledger">Close</Link>
            </Button>
            <Button
              variant="destructive"
              className="rounded-full gap-2"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete record
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid gap-6 lg:grid-cols-3"
        >
          <Card className="border-border/50 bg-gradient-to-br from-primary/[0.08] via-card to-card shadow-lg ring-1 ring-primary/12 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex w-full flex-wrap items-center justify-between gap-2 text-lg">
                <span className="inline-flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary/90" />
                  Amounts
                </span>
                <Badge variant="outline" className="font-mono text-xs font-semibold tracking-wide">
                  {t.currency}
                </Badge>
              </CardTitle>
              <CardDescription>What was charged, credited, or reserved.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Principal amount</p>
                <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground">{formatMoney(t.amount, t.currency)}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The main monetary value of this event in <span className="font-medium text-foreground">{t.currency}</span>.
                  This is the figure used for totals and most reports.
                </p>
              </div>
              <Separator className="bg-border/45" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Platform / network fee</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground/75">{formatMoney(t.fee, t.currency)}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fees captured by Stripe, PayPal, or Believe—used for reconciliation. Net to the user may differ from the principal
                  amount when fees apply.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/40 shadow-md ring-1 ring-border/30 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ArrowRightLeft className="h-5 w-5 text-primary/90" />
                Type &amp; status
              </CardTitle>
              <CardDescription>How this row is categorized and where it sits in the payment lifecycle.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <ExplainBlock
                label="Transaction type"
                value={
                  <Badge variant="outline" className={cn("capitalize", txType.badgeClass)}>
                    {txType.badgeLabel}
                  </Badge>
                }
                explanation={txType.typeExplainBody}
                icon={ArrowRightLeft}
              />
              <ExplainBlock
                label="Status"
                value={
                  <Badge variant="outline" className={cn("capitalize", statusBadgeClass(t.status))}>
                    <span className="inline-flex items-center gap-1.5">
                      {statusIcon(t.status)}
                      {t.status}
                    </span>
                  </Badge>
                }
                explanation={statusInfo.body}
                icon={Clock}
              />
            </CardContent>
          </Card>
        </motion.div>

        {t.ledger_report && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
          >
            <Card className="border-border/50 bg-card/40 shadow-md ring-1 ring-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="h-5 w-5 text-primary/90" />
                  Financial report
                </CardTitle>
                <CardDescription>
                  Reconciliation-style breakdown. Individual fee lines appear when your flows store them in transaction metadata
                  (e.g. <span className="font-mono text-[11px]">stripe_fee</span>,{" "}
                  <span className="font-mono text-[11px]">bridge_fee</span>); otherwise values derive from this row’s amount and
                  fee.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Report date</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {new Date(t.ledger_report.date).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-4 sm:col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reference #</p>
                    <p className="mt-1 break-all font-mono text-sm text-foreground">{t.ledger_report.reference}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Source type</p>
                    <p className="mt-1 font-mono text-sm text-foreground">{t.ledger_report.source_type}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Gross amount", value: formatMoney(t.ledger_report.gross_amount, t.currency) },
                    { label: "Stripe fee", value: formatMoney(t.ledger_report.stripe_fee, t.currency) },
                    { label: "Bridge fee", value: formatMoney(t.ledger_report.bridge_fee, t.currency) },
                    { label: "BIU fee", value: formatMoney(t.ledger_report.biu_fee, t.currency) },
                    { label: "Split deduction", value: formatMoney(t.ledger_report.split_deduction, t.currency) },
                    { label: "Refund amount", value: formatMoney(t.ledger_report.refund_amount, t.currency) },
                    {
                      label: "Net to organization",
                      value:
                        t.ledger_report.net_to_organization != null
                          ? formatMoney(t.ledger_report.net_to_organization, t.currency)
                          : "—",
                      emphasize: true,
                    },
                    {
                      label: "Payout status",
                      value: t.ledger_report.payout_status ?? "—",
                    },
                  ].map((cell) => (
                    <div
                      key={cell.label}
                      className={cn(
                        "rounded-xl border p-4",
                        cell.emphasize
                          ? "border-primary/30 bg-primary/[0.06] ring-1 ring-primary/15"
                          : "border-border/50 bg-background/60",
                      )}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{cell.label}</p>
                      <p
                        className={cn(
                          "mt-1 text-sm font-medium tabular-nums text-foreground",
                          cell.emphasize && "text-base font-semibold",
                        )}
                      >
                        {cell.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Organization</p>
                  <p className="mt-1 text-sm text-foreground">
                    {t.ledger_report.organization_id != null && (
                      <span className="mr-2 font-mono text-xs text-muted-foreground">ID {t.ledger_report.organization_id}</span>
                    )}
                    {t.ledger_report.organization_name ?? "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="border-border/50 bg-card/40 shadow-md ring-1 ring-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary/90" />
                User account
              </CardTitle>
              <CardDescription>Who this ledger entry belongs to in Believe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {actorCtx && (
                <ExplainBlock
                  label="Ledger context"
                  value={
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 font-sans font-semibold normal-case tracking-normal",
                          ledgerActorBadgeClass(actorCtx.kind),
                        )}
                      >
                        <ActorHeaderIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {actorCtx.label}
                      </Badge>
                      {actorCtx.detail && (
                        <span className="text-[15px] font-normal text-muted-foreground">{actorCtx.detail}</span>
                      )}
                      {actorCtx.organization_id != null && (
                        <Badge variant="secondary" className="font-mono text-[10px] font-normal">
                          org #{actorCtx.organization_id}
                        </Badge>
                      )}
                      {actorCtx.care_alliance_id != null && (
                        <Badge variant="secondary" className="font-mono text-[10px] font-normal">
                          alliance #{actorCtx.care_alliance_id}
                        </Badge>
                      )}
                    </span>
                  }
                  explanation={
                    actorCtx.kind === "organization"
                      ? "This row is tied to a nonprofit’s wallet (organization owner account). Deposits here are usually gifts to that org."
                      : actorCtx.kind === "care_alliance"
                        ? "This row is part of Care Alliance pooling, splits, fees, or campaign flows—not only a single personal wallet."
                        : "This row reflects a personal Believe user (donor, shopper, or general wallet activity)."
                  }
                  icon={ActorHeaderIcon}
                />
              )}
              {t.user ? (
                <ExplainBlock
                  label="Linked user"
                  value={
                    <span>
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{t.user.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wide">
                          ID {t.user.id}
                        </Badge>
                      </span>
                      <span className="mt-1 block text-sm font-normal text-muted-foreground">{t.user.email}</span>
                    </span>
                  }
                  explanation="The Believe user whose wallet or activity this transaction is attributed to. Use this when contacting someone about a payment."
                  icon={User}
                />
              ) : (
                <ExplainBlock
                  label="Linked user"
                  value={
                    <Badge variant="outline" className="border-border/50 bg-muted/40 text-muted-foreground">
                      Unassigned
                    </Badge>
                  }
                  explanation="Some system or batch rows may not map to a single end-user (for example migrations or internal adjustments)."
                  icon={User}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50 bg-card/40 shadow-md ring-1 ring-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="h-5 w-5 text-primary/90" />
                Links &amp; references
              </CardTitle>
              <CardDescription>
                Polymorphic link when present; otherwise we infer context from{" "}
                <span className="font-medium text-primary/90">metadata JSON</span> (course name, plan, transfers, Care Alliance,
                etc.).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <ExplainBlock
                label="Public reference (transaction_id)"
                value={<span className="break-all font-mono text-sm">{t.transaction_id}</span>}
                explanation="Human-readable identifier generated when the row is created. Shown in emails, exports, and support tickets. Not the same as a Stripe charge id unless copied into meta."
                icon={Hash}
              />
              <ExplainBlock
                label="Payment method"
                value={
                  t.payment_method ? (
                    <Badge variant="outline" className="border-border/55 bg-muted/30 capitalize text-foreground">
                      {t.payment_method.replace(/_/g, " ")}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )
                }
                explanation="Channel used for money movement: card (Stripe), wallet, PayPal, points, etc. Helps filter and reconcile by provider."
                icon={CreditCard}
              />
              <ExplainBlock
                label="Purpose of the link"
                value={
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground">{t.related_kind}</span>
                    <Badge variant="outline" className={cn("text-[10px] font-normal uppercase tracking-wide", relatedSource.className)}>
                      {relatedSource.label}
                    </Badge>
                  </span>
                }
                explanation={
                  t.related_purpose +
                  (t.related_source === "meta"
                    ? " Source: inferred from JSON metadata (no usable polymorphic link, or the linked row was missing)."
                    : t.related_source === "polymorphic"
                      ? " Source: polymorphic related_type / related_id in the database."
                      : "")
                }
                icon={BookOpen}
              />
              <ExplainBlock
                label="Linked record (actual name)"
                value={
                  <span className="text-foreground">
                    {t.related_display_name !== "—" ? t.related_display_name : "—"}
                  </span>
                }
                explanation="Title, reference, plan name, course, counterparty name, or other human-readable label loaded from the related database row, or parsed from metadata when no link exists. If the row was deleted, you will see “missing” unless metadata still names the intent."
                icon={Database}
              />
              <ExplainBlock
                label="Technical reference (polymorphic)"
                value={
                  <span className="break-all font-mono text-sm">
                    {t.related_type ? (
                      <>
                        {t.related_type}
                        {t.related_id != null && t.related_id !== "" ? ` · id ${t.related_id}` : ""}
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                }
                explanation="Stored related_type and related_id for developers and SQL joins. Lists may show the same content as “Linked record” when a name was resolved."
                icon={Link2}
              />
            </CardContent>
          </Card>
        </motion.div>

        {t.donation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.105 }}>
            <Card className="border-border/50 bg-card/40 shadow-md ring-1 ring-border/30">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  <Heart className="h-5 w-5 text-primary/90" />
                  {t.donation.kind === "care_alliance_campaign" ? "Campaign donation" : "Donation (Believe)"}
                  {t.donation_badge_label && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "border font-sans font-semibold normal-case tracking-normal",
                        donationPerspectiveBadgeClass(t.donation_ledger_perspective),
                      )}
                    >
                      {t.donation_badge_label}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="font-mono text-[10px] font-normal uppercase tracking-wide">
                    {t.donation.kind === "care_alliance_campaign"
                      ? "care_alliance_donations"
                      : "donations"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {t.donation.kind === "care_alliance_campaign" ? (
                    <>
                      Resolved from <span className="font-medium text-primary/90">care_alliance_donation_id</span> in metadata, or
                      Stripe payment reference on that row.
                    </>
                  ) : (
                    <>
                      Linked from <span className="font-medium text-primary/90">donation_id</span> / polymorphic Donation, matching{" "}
                      <span className="font-mono text-xs">pi_</span> on the ledger to{" "}
                      <span className="font-medium text-primary/90">donations.transaction_id</span>, or inferred from Care Alliance
                      wallet splits when metadata has no id.
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {t.donation.missing ? (
                  <p className="text-sm text-muted-foreground">
                    Donation id <span className="font-mono text-foreground">#{t.donation.donation_id}</span> was referenced but the
                    row no longer exists.
                  </p>
                ) : t.donation.kind === "care_alliance_campaign" ? (
                  <div className="space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xl font-bold tabular-nums text-foreground">
                        {t.donation.currency ?? "USD"} {t.donation.amount_display}
                      </span>
                      <Badge variant="outline" className="capitalize">
                        {t.donation.status ?? "—"}
                      </Badge>
                    </div>
                    {t.donation.campaign_name && (
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">Campaign: </span>
                        {t.donation.campaign_name}
                      </p>
                    )}
                    {t.donation.care_alliance_name && (
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">Care Alliance: </span>
                        {t.donation.care_alliance_name}
                      </p>
                    )}
                    {t.donation.payment_reference && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Payment reference (Stripe)
                        </p>
                        <p className="mt-1 break-all font-mono text-sm text-foreground">{t.donation.payment_reference}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xl font-bold tabular-nums text-foreground">${t.donation.amount_display}</span>
                      <Badge variant="outline" className="capitalize">
                        {t.donation.status ?? "—"}
                      </Badge>
                      {t.donation.frequency && (
                        <Badge variant="outline" className="capitalize">
                          {t.donation.frequency.replace(/-/g, " ")}
                        </Badge>
                      )}
                    </div>
                    {t.donation.organization_name && (
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">Recipient: </span>
                        {t.donation.organization_name}
                      </p>
                    )}
                    {t.donation.care_alliance_name && (
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">Care Alliance: </span>
                        {t.donation.care_alliance_name}
                      </p>
                    )}
                    {(t.donation.stripe_reference || t.donation.payment_reference) && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Stripe reference on donation
                        </p>
                        <p className="mt-1 break-all font-mono text-sm text-foreground">
                          {t.donation.stripe_reference ?? t.donation.payment_reference}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Used below to load PaymentIntent / subscription from Stripe (same keys as checkout).
                        </p>
                      </div>
                    )}
                    {t.donation.message && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Donor message: </span>
                        {t.donation.message}
                      </p>
                    )}
                    {t.donation.donation_date && (
                      <p className="text-xs text-muted-foreground">
                        Donation date:{" "}
                        {new Date(t.donation.donation_date).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
          <Card className="border-border/50 bg-card/40 shadow-md ring-1 ring-border/30">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                <ExternalLink className="h-5 w-5 text-primary/90" />
                Stripe &amp; Cashier
                <Badge variant="secondary" className="font-mono text-[10px] font-normal uppercase tracking-wide">
                  Stripe
                </Badge>
              </CardTitle>
              <CardDescription>
                Live Stripe objects loaded with Laravel Cashier’s client: PaymentIntent, Checkout session, Charge, or recurring{" "}
                <span className="font-medium text-primary/90">Subscription</span> (donations often store{" "}
                <span className="font-mono text-xs">pi_</span> or <span className="font-mono text-xs">sub_</span> on the Donation
                row—we merge those ids automatically).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {t.stripe.fetch_error && (
                <Alert variant="destructive" className="border-destructive/40">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Stripe API</AlertTitle>
                  <AlertDescription className="text-sm">{t.stripe.fetch_error}</AlertDescription>
                </Alert>
              )}

              {t.stripe.customer_id && (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cashier customer</p>
                  <p className="mt-1 font-mono text-sm text-foreground">{t.stripe.customer_id}</p>
                  {t.stripe.customer_dashboard_url && (
                    <a
                      href={t.stripe.customer_dashboard_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      Open in Stripe Dashboard
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}

              {t.stripe.payment_intent && (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PaymentIntent</p>
                      <p className="mt-1 font-mono text-sm text-foreground">{t.stripe.payment_intent.id}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {t.stripe.payment_intent.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">
                    {t.stripe.payment_intent.currency}{" "}
                    {t.stripe.payment_intent.amount_display}
                  </p>
                  {t.stripe.payment_intent.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{t.stripe.payment_intent.description}</p>
                  )}
                  {t.stripe.payment_intent.created && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(t.stripe.payment_intent.created).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {t.stripe.payment_intent.livemode != null && (
                        <span className="ml-2">
                          · {t.stripe.payment_intent.livemode ? "Live" : "Test"}
                        </span>
                      )}
                    </p>
                  )}
                  {t.stripe.payment_intent_dashboard_url && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      <a
                        href={t.stripe.payment_intent_dashboard_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary/80 hover:text-primary hover:underline"
                      >
                        Open in Stripe Dashboard
                        <ExternalLink className="h-3 w-3" />
                      </a>{" "}
                      (optional)
                    </p>
                  )}
                </div>
              )}

              {t.stripe.subscription && (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stripe subscription</p>
                      <p className="mt-1 font-mono text-sm text-foreground">{t.stripe.subscription.id}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {t.stripe.subscription.status}
                    </Badge>
                  </div>
                  {t.stripe.subscription.unit_amount_display != null && (
                    <p className="mt-3 text-xl font-bold tabular-nums text-foreground">
                      {t.stripe.subscription.currency} {t.stripe.subscription.unit_amount_display}
                      <span className="text-sm font-normal text-muted-foreground"> / period</span>
                    </p>
                  )}
                  {t.stripe.subscription.current_period_end && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Current period ends{" "}
                      {new Date(t.stripe.subscription.current_period_end).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  )}
                  {t.stripe.subscription.price_id && (
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">Price {t.stripe.subscription.price_id}</p>
                  )}
                </div>
              )}

              {t.stripe.checkout_session && !t.stripe.payment_intent && (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checkout session</p>
                  <p className="mt-1 font-mono text-sm text-foreground">{t.stripe.checkout_session.id}</p>
                  <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                    {t.stripe.checkout_session.currency} {t.stripe.checkout_session.amount_total_display}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Payment {t.stripe.checkout_session.payment_status}
                    {t.stripe.checkout_session.status ? ` · ${t.stripe.checkout_session.status}` : ""}
                  </p>
                </div>
              )}

              {t.stripe.charge && (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Charge</p>
                  <p className="mt-1 font-mono text-sm text-foreground">{t.stripe.charge.id}</p>
                  <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                    {t.stripe.charge.currency} {t.stripe.charge.amount_display}
                  </p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {t.stripe.charge.status}
                    {t.stripe.charge.paid != null ? ` · paid: ${t.stripe.charge.paid ? "yes" : "no"}` : ""}
                  </p>
                </div>
              )}

              {(t.stripe.identifiers_found.payment_intent_ids.length > 0 ||
                t.stripe.identifiers_found.session_ids.length > 0 ||
                t.stripe.identifiers_found.charge_ids.length > 0 ||
                t.stripe.identifiers_found.subscription_ids.length > 0) &&
                !t.stripe.payment_intent &&
                !t.stripe.subscription &&
                !t.stripe.fetch_error && (
                  <p className="text-sm text-muted-foreground">
                    Stripe ids were detected on this row but could not be loaded. Check API keys and that ids belong to this Stripe
                    account.
                  </p>
                )}

              {!t.stripe.customer_id &&
                !t.stripe.payment_intent &&
                !t.stripe.checkout_session &&
                !t.stripe.charge &&
                !t.stripe.subscription &&
                !t.stripe.fetch_error &&
                t.stripe.identifiers_found.payment_intent_ids.length === 0 &&
                t.stripe.identifiers_found.session_ids.length === 0 &&
                t.stripe.identifiers_found.charge_ids.length === 0 &&
                t.stripe.identifiers_found.subscription_ids.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No Stripe PaymentIntent, Checkout session, charge, or subscription id on this ledger row. If the Donation section
                    above appears, Stripe ids may be merged from the linked donation row. Otherwise check{" "}
                    <span className="font-medium text-foreground">metadata JSON</span> for{" "}
                    <span className="font-mono text-xs">pi_</span> / session ids or Care Alliance split context.
                  </p>
                )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card className="border-border/50 bg-card/40 shadow-md ring-1 ring-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-5 w-5 text-primary/90" />
                Timestamps
              </CardTitle>
              <CardDescription>When things happened in the app and when money was considered settled.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <ExplainBlock
                label="Created at"
                value={new Date(t.created_at).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
                explanation="When this row was first written—usually when the user completed checkout or the system created the entry."
                icon={CalendarClock}
              />
              <ExplainBlock
                label="Processed at"
                value={
                  t.processed_at
                    ? new Date(t.processed_at).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })
                    : "—"
                }
                explanation="Optional time when the gateway or admin marked the funds as captured or settled. May be empty for pending events."
                icon={Clock}
              />
              <ExplainBlock
                label="Updated at"
                value={new Date(t.updated_at).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
                explanation="Last time any column on this row changed (status updates, fee corrections, etc.)."
                icon={Info}
              />
            </CardContent>
          </Card>
        </motion.div>

        {metaJson && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Card className="border-border/50 bg-card/40 shadow-md ring-1 ring-border/30">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  Raw metadata (JSON)
                  <Badge variant="secondary" className="font-mono text-[10px] font-normal uppercase tracking-wide">
                    JSON
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Extra structured data from the payment flow (Stripe ids, line items, risk flags). The{" "}
                  <span className="font-medium text-primary/90">Related</span> section above may be derived from these keys when
                  polymorphic fields are empty—compare side by side.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-96 overflow-auto rounded-xl border border-border/50 bg-muted/25 p-4 font-mono text-xs leading-relaxed text-foreground/95 dark:bg-muted/20">
                  {metaJson}
                </pre>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Alert className="border-amber-500/30 bg-amber-500/[0.09] dark:border-amber-400/25 dark:bg-amber-500/[0.08]">
          <Info className="h-4 w-4 text-amber-700/90 dark:text-amber-300/95" />
          <AlertTitle className="text-amber-950/95 dark:text-amber-50/95">Before you delete</AlertTitle>
          <AlertDescription className="text-amber-950/85 dark:text-amber-50/85">
            Deleting removes this ledger row only. It does not automatically reverse money in Stripe or PayPal. Use refunds or
            payout tools in those systems if you need to move funds back.
          </AlertDescription>
        </Alert>
      </div>

      <ConfirmationModal
        isOpen={deleteOpen}
        onChange={setDeleteOpen}
        title="Delete this transaction?"
        description={`This will permanently remove ${t.transaction_id} from the ledger. This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </AppLayout>
  )
}

"use client"

import { useState } from "react"
import type { ComponentType } from "react"
import { Head, Link, router } from "@inertiajs/react"
import { motion } from "framer-motion"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ConfirmationModal } from "@/components/admin/confirmation-modal"
import { UnifiedLedgerCard, type UnifiedLedgerRow } from "@/components/admin/unified-ledger-card"
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Info,
  Link2,
  ScrollText,
  Trash2,
  User,
  XCircle,
  Ban,
  AlertCircle,
  ExternalLink,
  Heart,
  Building2,
  Network,
  ChevronDown,
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
  /** BIU unified ledger row (workbook + client export shape) — admin only */
  unified_ledger?: UnifiedLedgerRow | null
  stripe: StripeSnapshot
}

interface Props {
  transaction: TransactionDetail
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
function adminTransactionTypeDisplay(t: TransactionDetail): { badgeLabel: string; badgeClass: string } {
  const meta = t.meta && typeof t.meta === "object" ? (t.meta as Record<string, unknown>) : {}
  if (meta.ledger_role === "donor_payment" || t.donation_ledger_perspective === "donor") {
    return {
      badgeLabel: "Donation",
      badgeClass: "border-rose-500/40 bg-rose-500/[0.1] text-rose-900 dark:text-rose-100",
    }
  }
  if (t.donation_ledger_perspective === "campaign" && t.type === "purchase") {
    return {
      badgeLabel: "Campaign gift",
      badgeClass: "border-amber-500/40 bg-amber-500/[0.1] text-amber-950 dark:text-amber-100",
    }
  }
  return {
    badgeLabel: t.type.replace(/_/g, " "),
    badgeClass: typeBadgeClass(t.type),
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

function stripePanelOpen(s: TransactionDetail["stripe"]): boolean {
  return !!(
    s.customer_id ||
    s.payment_intent ||
    s.subscription ||
    s.checkout_session ||
    s.charge ||
    s.identifiers_found.payment_intent_ids.length > 0 ||
    s.identifiers_found.session_ids.length > 0 ||
    s.identifiers_found.charge_ids.length > 0 ||
    s.identifiers_found.subscription_ids.length > 0
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
              Transaction
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
              Unified finance summary first; expand sections below only when you need Stripe, donation detail, or raw metadata.
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

        {t.unified_ledger && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04, duration: 0.35 }}
          >
            <UnifiedLedgerCard data={t.unified_ledger} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="border-border/50 bg-card/40 shadow-md ring-1 ring-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="h-5 w-5 text-primary/90" />
                Record details
              </CardTitle>
              <CardDescription>Type, amounts, links, and user—fees are in the unified block above.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type &amp; status</p>
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
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Row amount / fee</p>
                <p className="text-sm tabular-nums text-foreground">
                  <span className="font-semibold">{formatMoney(t.amount, t.currency)}</span>
                  <span className="text-muted-foreground"> · fee </span>
                  {formatMoney(t.fee, t.currency)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment method</p>
                {t.payment_method ? (
                  <Badge variant="outline" className="w-fit capitalize">
                    {t.payment_method.replace(/_/g, " ")}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>

              {actorCtx && (
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ledger context</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
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
                    {actorCtx.detail && <span className="text-muted-foreground">{actorCtx.detail}</span>}
                    {actorCtx.organization_id != null && (
                      <span className="font-mono text-xs text-muted-foreground">org #{actorCtx.organization_id}</span>
                    )}
                    {actorCtx.care_alliance_id != null && (
                      <span className="font-mono text-xs text-muted-foreground">alliance #{actorCtx.care_alliance_id}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Linked user</p>
                {t.user ? (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">{t.user.name}</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="text-muted-foreground">{t.user.email}</span>
                    <Badge variant="secondary" className="ml-2 font-mono text-xs">
                      #{t.user.id}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </div>

              <div className="space-y-2 lg:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Related</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-foreground">{t.related_kind}</span>
                  <Badge variant="outline" className={cn("text-xs uppercase", relatedSource.className)}>
                    {relatedSource.label}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-foreground">
                  {t.related_display_name !== "—" ? t.related_display_name : "—"}
                </p>
                <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{t.related_purpose}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Polymorphic</p>
                <p className="break-all font-mono text-xs text-foreground">
                  {t.related_type
                    ? `${t.related_type}${t.related_id != null && t.related_id !== "" ? ` #${t.related_id}` : ""}`
                    : "—"}
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference (transaction_id)</p>
                <p className="break-all font-mono text-sm text-foreground">{t.transaction_id}</p>
              </div>
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
                  {t.donation.kind === "care_alliance_campaign"
                    ? "Care Alliance campaign donation record."
                    : "Believe donation record linked to this ledger row."}
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
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                <ExternalLink className="h-5 w-5 text-primary/90" />
                Stripe
                <Badge variant="secondary" className="font-mono text-xs font-normal uppercase tracking-wide">
                  API
                </Badge>
              </CardTitle>
              <CardDescription>Live objects from Cashier when ids exist on this row or the linked donation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {t.stripe.fetch_error && (
                <Alert variant="destructive" className="border-destructive/40">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Stripe API</AlertTitle>
                  <AlertDescription className="text-sm">{t.stripe.fetch_error}</AlertDescription>
                </Alert>
              )}

              {stripePanelOpen(t.stripe) ? (
                <Collapsible defaultOpen className="rounded-xl border border-border/50 bg-muted/10">
                  <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/30 [&[data-state=open]_svg]:rotate-180">
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
                    PaymentIntent, customer, subscription, checkout…
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 border-t border-border/40 p-4">

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
                    Stripe ids were found but not loaded—check API keys and account.
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
                    No Stripe objects loaded. Check donation above or raw metadata for ids.
                  </p>
                )}
                  </CollapsibleContent>
                </Collapsible>
              ) : !t.stripe.fetch_error ? (
                <p className="text-sm text-muted-foreground">
                  No Stripe ids on this row. Use donation or metadata if you need gateway details.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card className="border-border/50 bg-card/40 shadow-md ring-1 ring-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-5 w-5 text-primary/90" />
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Created</p>
                <p className="mt-1 text-sm text-foreground">
                  {new Date(t.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Processed</p>
                <p className="mt-1 text-sm text-foreground">
                  {t.processed_at
                    ? new Date(t.processed_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Updated</p>
                <p className="mt-1 text-sm text-foreground">
                  {new Date(t.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {metaJson && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Card className="border-border/50 bg-card/40 shadow-md ring-1 ring-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  Metadata
                  <Badge variant="secondary" className="font-mono text-xs font-normal uppercase tracking-wide">
                    JSON
                  </Badge>
                </CardTitle>
                <CardDescription>Structured extras from checkout or webhooks—expand only when debugging.</CardDescription>
              </CardHeader>
              <CardContent>
                <Collapsible className="rounded-xl border border-border/50 bg-muted/10">
                  <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/30 [&[data-state=open]_svg]:rotate-180">
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
                    Show raw JSON
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="max-h-96 overflow-auto border-t border-border/40 bg-muted/25 p-4 font-mono text-xs leading-relaxed text-foreground/95 dark:bg-muted/20">
                      {metaJson}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
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

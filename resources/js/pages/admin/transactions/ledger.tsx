"use client"

import { useEffect, useRef, useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import { ConfirmationModal } from "@/components/admin/confirmation-modal"
import { motion } from "framer-motion"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ArrowRightLeft,
  Ban,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Info,
  Layers,
  Link2,
  ScrollText,
  Search,
  TrendingUp,
  User,
  Wallet,
  XCircle,
  Eye,
  Trash2,
  Heart,
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import { cn } from "@/lib/utils"

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Transaction ledger", href: "#" },
]

interface LedgerRow {
  id: number
  transaction_id: string
  type: string
  status: string
  amount: number
  fee: number
  currency: string
  payment_method: string | null
  related_kind: string
  related_purpose: string
  related_display_name: string
  related_label: string
  related_source: "polymorphic" | "meta" | "none"
  /** True when this row is linked to a Believe or campaign donation (same rules as the detail page). */
  donation_badge?: boolean
  donation_badge_label?: string
  /** donor | recipient_direct | recipient_split | alliance_fee | campaign — drives label + badge styling */
  donation_ledger_perspective?: string | null
  processed_at: string | null
  created_at: string
  user: { id: number; name: string; email: string } | null
  meta: Record<string, unknown> | null
  /** Server-computed report columns (fees from metadata when stored). */
  ledger_report?: LedgerReport
}

interface LedgerReport {
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

interface LaravelPagination<T> {
  data: T[]
  current_page: number
  first_page_url: string
  from: number | null
  last_page: number
  last_page_url: string
  links: Array<{
    url: string | null
    label: string
    active: boolean
  }>
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}

interface Props {
  transactions: LaravelPagination<LedgerRow>
  stats: {
    total_records: number
    completed_sum: number
    pending_count: number
    failed_count: number
  }
  filters: {
    search: string
    type: string
    status: string
    per_page?: number
  }
  typeOptions: string[]
  statusOptions: string[]
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 380, damping: 28 } },
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

function formatLedgerDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return iso
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "completed":
    case "deposit":
      return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
    case "pending":
      return <Clock className="h-3.5 w-3.5 shrink-0" />
    case "failed":
    case "rejected":
      return <XCircle className="h-3.5 w-3.5 shrink-0" />
    case "cancelled":
      return <Ban className="h-3.5 w-3.5 shrink-0" />
    default:
      return <AlertCircle className="h-3.5 w-3.5 shrink-0" />
  }
}

function statusClass(status: string) {
  switch (status) {
    case "completed":
    case "deposit":
      return "border-emerald-500/40 bg-emerald-500/[0.12] text-emerald-800 shadow-sm shadow-emerald-500/10 dark:text-emerald-200"
    case "pending":
      return "border-amber-500/40 bg-amber-500/[0.12] text-amber-900 shadow-sm shadow-amber-500/10 dark:text-amber-100"
    case "failed":
    case "rejected":
      return "border-red-500/40 bg-red-500/[0.12] text-red-800 shadow-sm shadow-red-500/10 dark:text-red-200"
    case "cancelled":
      return "border-muted-foreground/25 bg-muted/60 text-muted-foreground"
    default:
      return "border-primary/35 bg-primary/10 text-primary shadow-sm shadow-primary/10"
  }
}

function typeClass(type: string) {
  if (type === "refund") return "border-sky-500/40 bg-sky-500/[0.12] text-sky-900 dark:text-sky-100"
  if (type === "withdrawal" || type === "transfer_out")
    return "border-orange-500/40 bg-orange-500/[0.12] text-orange-900 dark:text-orange-100"
  if (type === "deposit" || type === "transfer_in")
    return "border-teal-500/40 bg-teal-500/[0.12] text-teal-900 dark:text-teal-100"
  return "border-primary/35 bg-primary/12 text-primary"
}

function typeAccentBar(type: string) {
  if (type === "refund") return "bg-sky-500"
  if (type === "withdrawal" || type === "transfer_out") return "bg-orange-500"
  if (type === "deposit" || type === "transfer_in") return "bg-teal-500"
  if (type === "commission") return "bg-violet-500"
  return "bg-primary"
}

/** Donor audit rows are stored as `purchase`; show Donation instead of Purchase when it is a gift. */
function ledgerRowTypeDisplay(row: LedgerRow): { label: string; className: string } {
  const meta = row.meta && typeof row.meta === "object" ? (row.meta as Record<string, unknown>) : {}
  if (meta.ledger_role === "donor_payment" || row.donation_ledger_perspective === "donor") {
    return {
      label: "Donation",
      className: "border-rose-500/40 bg-rose-500/[0.12] text-rose-900 shadow-sm shadow-rose-500/10 dark:text-rose-100",
    }
  }
  if (row.donation_ledger_perspective === "campaign" && row.type === "purchase") {
    return {
      label: "Campaign gift",
      className: "border-amber-500/40 bg-amber-500/[0.12] text-amber-950 shadow-sm shadow-amber-500/10 dark:text-amber-100",
    }
  }
  return { label: row.type.replace(/_/g, " "), className: typeClass(row.type) }
}

function ledgerRowAccentBar(row: LedgerRow): string {
  const meta = row.meta && typeof row.meta === "object" ? (row.meta as Record<string, unknown>) : {}
  if (meta.ledger_role === "donor_payment" || row.donation_ledger_perspective === "donor") {
    return "bg-rose-500"
  }
  if (row.donation_ledger_perspective === "campaign" && row.type === "purchase") {
    return "bg-amber-500"
  }
  return typeAccentBar(row.type)
}

function donationLedgerBadgeClass(perspective: string | null | undefined): string {
  switch (perspective) {
    case "recipient_direct":
      return "border-emerald-500/45 bg-emerald-500/[0.12] text-emerald-900 shadow-sm shadow-emerald-500/10 dark:text-emerald-100"
    case "recipient_split":
      return "border-teal-500/45 bg-teal-500/[0.12] text-teal-900 shadow-sm shadow-teal-500/10 dark:text-teal-100"
    case "alliance_fee":
      return "border-violet-500/45 bg-violet-500/[0.12] text-violet-900 shadow-sm shadow-violet-500/10 dark:text-violet-100"
    case "campaign":
      return "border-amber-500/45 bg-amber-500/[0.12] text-amber-950 shadow-sm shadow-amber-500/10 dark:text-amber-100"
    case "donor":
    default:
      return "border-rose-500/45 bg-rose-500/[0.12] text-rose-900 shadow-sm shadow-rose-500/10 dark:text-rose-100"
  }
}

export default function TransactionLedger({
  transactions,
  stats,
  filters,
  typeOptions,
  statusOptions,
}: Props) {
  const [search, setSearch] = useState(filters.search || "")
  const [type, setType] = useState(filters.type || "all")
  const [status, setStatus] = useState(filters.status || "all")
  const [perPage, setPerPage] = useState(String(filters.per_page ?? 10))
  const skipSearchDebounceOnce = useRef(true)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: number | null; ref: string }>({
    open: false,
    id: null,
    ref: "",
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const ledgerQueryParams = (): Record<string, string> => {
    const params: Record<string, string> = {}
    if (search.trim()) params.search = search.trim()
    if (type && type !== "all") params.type = type
    if (status && status !== "all") params.status = status
    if (perPage && perPage !== "10") params.per_page = perPage
    return params
  }

  useEffect(() => {
    if (skipSearchDebounceOnce.current) {
      skipSearchDebounceOnce.current = false
      return
    }
    const id = setTimeout(() => {
      router.get(route("admin.transactions.ledger"), ledgerQueryParams(), {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      })
    }, 420)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid double fetch when filters change via selects
  }, [search])

  const applySelectFilters = (nextType: string, nextStatus: string) => {
    const params: Record<string, string> = {}
    if (search.trim()) params.search = search.trim()
    if (nextType && nextType !== "all") params.type = nextType
    if (nextStatus && nextStatus !== "all") params.status = nextStatus
    if (perPage && perPage !== "10") params.per_page = perPage

    router.get(route("admin.transactions.ledger"), params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }

  const applyPerPage = (next: string) => {
    setPerPage(next)
    const params: Record<string, string> = {}
    if (search.trim()) params.search = search.trim()
    if (type && type !== "all") params.type = type
    if (status && status !== "all") params.status = status
    if (next && next !== "10") params.per_page = next
    router.get(route("admin.transactions.ledger"), params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }

  const getNumericLinks = (links: LaravelPagination<LedgerRow>["links"]) => {
    return links.filter((link) => {
      const label = link.label.replace(/&laquo;|&raquo;/g, "").trim()
      return !isNaN(Number(label)) && label !== "Previous" && label !== "Next"
    })
  }

  const confirmDelete = () => {
    if (deleteModal.id == null) return
    setIsDeleting(true)
    router.delete(route("admin.transactions.destroy", deleteModal.id), {
      preserveScroll: true,
      onSuccess: () => {
        setDeleteModal({ open: false, id: null, ref: "" })
      },
      onFinish: () => setIsDeleting(false),
    })
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Transaction ledger" />

      <div className="mx-4 my-5 space-y-8 sm:mx-8 lg:mx-10">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ScrollText className="h-3.5 w-3.5" />
              Admin · Money movement
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Transaction ledger</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Every wallet transaction in one place — filtered on the server and loaded with Inertia.
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {[
            {
              label: "Total records",
              value: stats.total_records.toLocaleString(),
              icon: Layers,
              accent: "from-primary/25 to-primary/5",
            },
            {
              label: "Completed volume",
              value: formatMoney(stats.completed_sum, "USD"),
              icon: TrendingUp,
              accent: "from-emerald-500/25 to-emerald-500/5",
            },
            {
              label: "Pending",
              value: stats.pending_count.toLocaleString(),
              icon: Clock,
              accent: "from-amber-500/25 to-amber-500/5",
            },
            {
              label: "Failed",
              value: stats.failed_count.toLocaleString(),
              icon: XCircle,
              accent: "from-red-500/20 to-red-500/5",
            },
          ].map((card, i) => (
            <motion.div key={card.label} variants={item} custom={i}>
              <Card
                className={cn(
                  "overflow-hidden border-border/80 bg-card/80 shadow-sm backdrop-blur-sm transition-all hover:border-primary/35 hover:shadow-md",
                )}
              >
                <div className={cn("h-1 bg-gradient-to-r", card.accent)} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                  <card.icon className="h-4 w-4 text-primary/80" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tracking-tight text-foreground">{card.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="space-y-4"
        >
          <div className="flex flex-col gap-1 border-b border-border/60 pb-4">
            <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground sm:text-lg">
              <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />
              Activity feed
              <span className="font-normal text-muted-foreground">· {transactions.total} entries</span>
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Each card is a quick snapshot. Open <span className="font-medium text-foreground">View</span> for the full financial
              report—gross, Stripe / Bridge / BIU fees, splits, refunds, net to organization, and payout details.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search ref, user, email, payment method…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 border-border/60 bg-background pl-9 pr-3 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end sm:gap-3 lg:max-w-4xl">
              <div className="space-y-1">
                <Label htmlFor="ledger-type" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Type
                </Label>
                <select
                  id="ledger-type"
                  aria-label="Filter by transaction type"
                  title="Transaction type"
                  value={type}
                  onChange={(e) => {
                    const v = e.target.value
                    setType(v)
                    applySelectFilters(v, status)
                  }}
                  className="flex h-9 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:h-10 sm:text-sm"
                >
                  <option value="all">All types</option>
                  {typeOptions.map((ot) => (
                    <option key={ot} value={ot}>
                      {ot.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ledger-status" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Status
                </Label>
                <select
                  id="ledger-status"
                  aria-label="Filter by transaction status"
                  title="Transaction status"
                  value={status}
                  onChange={(e) => {
                    const v = e.target.value
                    setStatus(v)
                    applySelectFilters(type, v)
                  }}
                  className="flex h-9 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:h-10 sm:text-sm"
                >
                  <option value="all">All statuses</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ledger-per-page" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Per page
                </Label>
                <select
                  id="ledger-per-page"
                  aria-label="Rows per page"
                  title="Rows per page"
                  value={perPage}
                  onChange={(e) => applyPerPage(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:h-10 sm:text-sm"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          </div>

          <div>
              {transactions.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <ScrollText className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">No transactions found</p>
                  <p className="max-w-sm text-xs text-muted-foreground">Try adjusting search or filters.</p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {transactions.data.map((row, idx) => {
                    const rep = row.ledger_report
                    const cur = row.currency || "USD"
                    const typeDisplay = ledgerRowTypeDisplay(row)
                    return (
                      <li key={row.id} className="group relative list-none">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.04, 0.2), duration: 0.28 }}
                          className="relative overflow-hidden rounded-lg border border-border/60 bg-card/50 shadow-sm ring-1 ring-border/30 transition-all hover:border-primary/25 hover:shadow-md"
                        >
                          <div
                            className={cn(
                              "absolute left-0 top-0 bottom-0 w-1 rounded-l-none rounded-r-sm transition-all group-hover:w-1.5",
                              ledgerRowAccentBar(row),
                            )}
                          />
                          <div
                            className={cn(
                              "flex flex-col space-y-2 px-3 py-3 pl-4 sm:px-4 sm:py-3 sm:pl-5",
                              idx % 2 === 1 ? "bg-muted/[0.35]" : "bg-transparent",
                            )}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                                      typeDisplay.className,
                                    )}
                                  >
                                    <ArrowRightLeft className="h-3 w-3 opacity-80" />
                                    {typeDisplay.label}
                                  </span>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
                                      statusClass(row.status),
                                    )}
                                  >
                                    {statusIcon(row.status)}
                                    {row.status}
                                  </span>
                                  {row.donation_badge && (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                                        donationLedgerBadgeClass(row.donation_ledger_perspective),
                                      )}
                                    >
                                      <Heart className="h-3 w-3 opacity-90" aria-hidden />
                                      {row.donation_badge_label ?? "Donation"}
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3 sm:gap-y-1">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                      <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
                                        {row.transaction_id}
                                      </span>
                                      <span className="text-xs text-muted-foreground">· internal #{row.id}</span>
                                    </div>
                                    <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground sm:border-l sm:border-border/50 sm:pl-3">
                                      <CalendarClock className="inline h-3.5 w-3.5 shrink-0" aria-hidden />
                                      {rep ? formatLedgerDate(rep.date) : new Date(row.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                  {rep && (
                                    <p className="text-xs leading-snug">
                                      <span className="font-medium text-muted-foreground">Source </span>
                                      <span className="rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                                        {rep.source_type}
                                      </span>
                                      {rep.organization_name && (
                                        <>
                                          <span className="mx-1.5 text-muted-foreground">·</span>
                                          <span className="text-foreground">{rep.organization_name}</span>
                                          {rep.organization_id != null && (
                                            <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                                              #{rep.organization_id}
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </p>
                                  )}
                                  {row.user ? (
                                    <div className="flex items-start gap-2 text-sm">
                                      <User className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                                      <div>
                                        <p className="font-medium leading-tight text-foreground">{row.user.name}</p>
                                        <p className="text-xs text-muted-foreground">{row.user.email}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No linked user</p>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 rounded-md border border-border/50 bg-background/80 px-3 py-2 text-right shadow-inner sm:min-w-[132px]">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Amount</p>
                                <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                                  {formatMoney(row.amount, cur)}
                                </p>
                                <p className="text-[11px] text-muted-foreground">Fee {formatMoney(row.fee, cur)}</p>
                                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                                  Full breakdown on detail page →
                                </p>
                              </div>
                            </div>

                            <Separator className="bg-border/50" />

                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              <div className="flex items-start gap-2 text-xs sm:text-sm">
                                <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Payment
                                  </p>
                                  <p className="capitalize text-foreground">
                                    {row.payment_method ? row.payment_method.replace(/_/g, " ") : "—"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 text-xs sm:text-sm">
                                <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Related
                                  </p>
                                  <div className="flex items-start gap-2">
                                    <div className="min-w-0 space-y-0.5">
                                      <p className="truncate text-[11px] font-medium text-primary/90">
                                        {row.related_kind && row.related_kind !== "—" ? row.related_kind : "—"}
                                      </p>
                                      <p className="truncate text-xs text-foreground">
                                        {row.related_display_name && row.related_display_name !== "—"
                                          ? row.related_display_name
                                          : "—"}
                                      </p>
                                    </div>
                                    {(row.related_source !== "none" ||
                                      (row.meta && Object.keys(row.meta).length > 0)) && (
                                      <Tooltip delayDuration={200}>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                                            aria-label="Related details"
                                          >
                                            <Info className="h-3.5 w-3.5" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-md px-3 py-2 text-xs leading-relaxed">
                                          <p className="text-[10px] font-semibold uppercase text-primary-foreground/80">
                                            {row.related_source === "meta"
                                              ? "From metadata"
                                              : row.related_source === "polymorphic"
                                                ? "Database link"
                                                : "—"}
                                          </p>
                                          <p className="mt-1 text-primary-foreground/95">{row.related_purpose}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-border/40 pt-2">
                              <Link href={route("admin.transactions.show", row.id)}>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 gap-1.5 rounded-full px-3 shadow-sm"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View full details
                                </Button>
                              </Link>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-full border-destructive/35 px-3 text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                  setDeleteModal({ open: true, id: row.id, ref: row.transaction_id })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {transactions.total > 0 && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-border/60 px-0 py-4 sm:flex-row">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{transactions.from ?? 0}</span> to{" "}
                    <span className="font-semibold text-foreground">{transactions.to ?? 0}</span> of{" "}
                    <span className="font-semibold text-foreground">{transactions.total}</span>
                  </p>
                  {transactions.last_page > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {transactions.prev_page_url && (
                        <Link href={transactions.prev_page_url} preserveScroll preserveState>
                          <Button variant="outline" size="sm" className="gap-1 rounded-full border-border/60">
                            <ChevronLeft className="h-4 w-4" />
                            Prev
                          </Button>
                        </Link>
                      )}
                      <div className="flex items-center gap-1 rounded-full border border-border/50 bg-background/80 p-1 px-1">
                        {getNumericLinks(transactions.links).map((link, i) => (
                          <Link key={i} href={link.url || "#"} preserveScroll preserveState>
                            <Button
                              variant={link.active ? "default" : "ghost"}
                              size="sm"
                              className={cn(
                                "min-h-9 min-w-9 rounded-full px-3",
                                link.active && "bg-primary text-primary-foreground shadow-sm",
                              )}
                              disabled={!link.url}
                            >
                              {link.label.replace(/&laquo;|&raquo;/g, "").trim()}
                            </Button>
                          </Link>
                        ))}
                      </div>
                      {transactions.next_page_url && (
                        <Link href={transactions.next_page_url} preserveScroll preserveState>
                          <Button variant="outline" size="sm" className="gap-1 rounded-full border-border/60">
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
          </div>
        </motion.div>
      </div>

      <ConfirmationModal
        isOpen={deleteModal.open}
        onChange={(open) => !open && setDeleteModal({ open: false, id: null, ref: "" })}
        title="Delete this transaction?"
        description={`This will permanently remove ${deleteModal.ref || "this record"} from the ledger. This does not reverse charges in Stripe or PayPal.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </AppLayout>
  )
}

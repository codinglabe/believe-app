"use client"

import { Head, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { BreadcrumbItem } from "@/types"
import { Clock, Gift, RefreshCw } from "lucide-react"

interface RedemptionUser {
  id: number
  name: string
  email: string
}

interface RedemptionOrganization {
  id: number
  name: string
}

interface RedemptionRow {
  id: number
  status: string
  status_label: string
  amount: number
  currency: string
  brand_name: string | null
  payment_method: string
  requested_at: string | null
  scheduled_fulfillment_at: string | null
  fulfilled_at: string | null
  fulfillment_attempt_count: number
  failure_reason: string | null
  external_id: string | null
  can_retry: boolean
  user: RedemptionUser | null
  organization: RedemptionOrganization | null
}

interface PaginatedRedemptions {
  data: RedemptionRow[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  links: Array<{ url: string | null; label: string; active: boolean }>
}

interface StatusOption {
  value: string
  label: string
}

interface Props {
  redemptions: PaginatedRedemptions
  filters: { status: string }
  counts: Record<string, number>
  statusOptions: StatusOption[]
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "System", href: "#" },
  { title: "Gift card redemptions", href: "/admin/gift-card-redemptions" },
]

function formatUsd(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value)
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "pending_fulfillment":
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
    case "processing":
      return "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100"
    case "completed":
    case "active":
      return "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100"
    case "capacity_reached":
      return "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100"
    case "failed":
      return "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export default function GiftCardRedemptionsIndex({ redemptions, filters, counts, statusOptions }: Props) {
  const page = usePage<{ flash?: { success?: string } }>()

  const setStatus = (status: string) => {
    router.get(route("admin.gift-card-redemptions.index"), { status }, { preserveState: true, replace: true })
  }

  const retry = (id: number) => {
    router.post(route("admin.gift-card-redemptions.retry", id), {}, { preserveScroll: true })
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Gift card redemptions" />

      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gift card redemptions</h1>
          <p className="text-muted-foreground mt-1">
            Believe Points redemptions with delayed Phaze fulfillment (72-hour queue).
          </p>
        </div>

        {page.props.flash?.success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
            {page.props.flash.success}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statusOptions.map((option) => (
            <Card
              key={option.value}
              className={filters.status === option.value ? "ring-2 ring-primary" : "cursor-pointer"}
              onClick={() => setStatus(option.value)}
            >
              <CardHeader className="pb-2">
                <CardDescription>{option.label}</CardDescription>
                <CardTitle className="text-3xl">{counts[option.value] ?? 0}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              {statusOptions.find((o) => o.value === filters.status)?.label ?? "Queue"}
            </CardTitle>
            <CardDescription>{redemptions.total} record(s)</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-3 pr-4">ID</th>
                  <th className="py-3 pr-4">Supporter</th>
                  <th className="py-3 pr-4">Organization</th>
                  <th className="py-3 pr-4">Brand</th>
                  <th className="py-3 pr-4">Amount</th>
                  <th className="py-3 pr-4">Requested</th>
                  <th className="py-3 pr-4">Scheduled</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Attempts</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.data.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-muted-foreground">
                      No redemptions in this queue.
                    </td>
                  </tr>
                ) : (
                  redemptions.data.map((row) => (
                    <tr key={row.id} className="border-b align-top">
                      <td className="py-3 pr-4 font-mono">#{row.id}</td>
                      <td className="py-3 pr-4">
                        <div className="font-medium">{row.user?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{row.user?.email ?? ""}</div>
                      </td>
                      <td className="py-3 pr-4">{row.organization?.name ?? "—"}</td>
                      <td className="py-3 pr-4">{row.brand_name ?? "—"}</td>
                      <td className="py-3 pr-4 font-medium">{formatUsd(row.amount, row.currency)}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">{formatDate(row.requested_at)}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDate(row.scheduled_fulfillment_at)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={statusBadgeClass(row.status)}>{row.status_label}</Badge>
                        {row.failure_reason && (
                          <p className="mt-1 max-w-xs text-xs text-muted-foreground line-clamp-2">{row.failure_reason}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4">{row.fulfillment_attempt_count}</td>
                      <td className="py-3">
                        {row.can_retry ? (
                          <Button size="sm" variant="outline" onClick={() => retry(row.id)}>
                            <RefreshCw className="mr-1 h-3.5 w-3.5" />
                            Retry
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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

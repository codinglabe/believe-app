"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ClipboardList, Search, ChevronLeft, ChevronRight, Pencil, Trash2, Eye, Inbox } from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface RequestRow {
  id: number
  requester_name: string | null
  requester_email: string | null
  display_name: string
  category_slug: string
  subcategory: string | null
  state: string | null
  city: string | null
  url: string | null
  status: "approved" | "pending" | "rejected" | string
  ai_decision: string | null
  ai_reason: string | null
  ai_suggested_url: string | null
  approved_service_id: number | null
  created_at: string | null
}

interface PaginatedRequests {
  data: RequestRow[]
  current_page: number
  last_page: number
  total: number
  per_page?: number
}

interface PageProps {
  requests: PaginatedRequests
  filters?: { search?: string; status?: string }
  flash?: { success?: string }
}

const PER_PAGE = 15

export default function KioskRequestsIndex({ requests, filters = {} }: PageProps) {
  const { flash } = usePage<PageProps>().props
  const [search, setSearch] = useState(filters.search ?? "")
  const [status, setStatus] = useState(filters.status ?? "")
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const perPage = requests.per_page ?? PER_PAGE
  const rangeFrom = requests.total === 0 ? 0 : (requests.current_page - 1) * perPage + 1
  const rangeTo = requests.total === 0 ? 0 : rangeFrom + requests.data.length - 1

  useEffect(() => {
    if (flash?.success) {
      showSuccessToast(flash.success)
    }
  }, [flash?.success])

  useEffect(() => {
    setSearch(filters.search ?? "")
    setStatus(filters.status ?? "")
  }, [filters.search, filters.status])

  const skipAutoFetchRef = useRef(true)
  const prevStatusRef = useRef(status)

  useEffect(() => {
    if (skipAutoFetchRef.current) {
      skipAutoFetchRef.current = false
      prevStatusRef.current = status
      return
    }
    const statusChanged = prevStatusRef.current !== status
    prevStatusRef.current = status
    const timeout = window.setTimeout(() => {
      const params: Record<string, string> = {}
      if (search.trim()) params.search = search.trim()
      if (status) params.status = status
      router.get(route("admin.kiosk.requests.index"), params, { preserveState: true, replace: true })
    }, statusChanged ? 0 : 350)
    return () => window.clearTimeout(timeout)
  }, [search, status])

  const handleDelete = (id: number) => {
    router.delete(route("admin.kiosk.requests.destroy", id), {
      preserveScroll: true,
      onSuccess: () => setDeleteId(null),
      onError: () => {
        showErrorToast("Failed to delete.")
        setDeleteId(null)
      },
    })
  }

  const statusBadge = (s: string) => {
    const v = s.toLowerCase()
    if (v === "approved") {
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 border-0 capitalize shrink-0">{s}</Badge>
    }
    if (v === "rejected") {
      return <Badge className="bg-red-600 text-white hover:bg-red-600 border-0 capitalize shrink-0">{s}</Badge>
    }
    return <Badge className="bg-amber-500 text-white hover:bg-amber-500 border-0 capitalize shrink-0">{s}</Badge>
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > requests.last_page) return
    const params: Record<string, string | number> = {}
    if (search.trim()) params.search = search.trim()
    if (status) params.status = status
    params.page = page
    router.get(route("admin.kiosk.requests.index"), params, { preserveState: true })
  }

  const visiblePageNumbers = (): (number | "...")[] => {
    const last = requests.last_page
    const cur = requests.current_page
    if (last <= 7) {
      return Array.from({ length: last }, (_, i) => i + 1)
    }
    const delta = 1
    const set = new Set<number>()
    set.add(1)
    set.add(last)
    for (let i = cur - delta; i <= cur + delta; i++) {
      if (i >= 1 && i <= last) set.add(i)
    }
    const sorted = [...set].sort((a, b) => a - b)
    const out: (number | "...")[] = []
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("...")
      out.push(sorted[i])
    }
    return out
  }

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Kiosk Management", href: route("admin.kiosk.index") },
    { title: "Kiosk Requests", href: route("admin.kiosk.requests.index") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Kiosk Requests" />
      <div className="w-full max-w-none min-h-screen space-y-6 p-4 sm:p-6">
        {/* Title row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="h-7 w-7 text-primary shrink-0" />
              Kiosk Requests
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              User-submitted services with AI review. Open a row to change status or edit details.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm tabular-nums">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold text-foreground">{requests.total}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Filters</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_minmax(200px,280px)] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="kiosk-req-search" className="text-xs text-muted-foreground">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="kiosk-req-search"
                  placeholder="Service name, requester, category, URL, reason…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 pl-9"
                  aria-label="Search requests"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kiosk-req-status" className="text-xs text-muted-foreground">
                Status
              </Label>
              <select
                id="kiosk-req-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex flex-col gap-1 border-b border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span className="text-sm font-semibold text-foreground">All requests</span>
            {requests.total > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                Showing <span className="font-medium text-foreground">{rangeFrom}</span>–
                <span className="font-medium text-foreground">{rangeTo}</span> of{" "}
                <span className="font-medium text-foreground">{requests.total}</span>
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 w-[min(22%,280px)]">
                    Service
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 min-w-[140px]">
                    Requester
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 whitespace-nowrap">
                    Location
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 min-w-[120px]">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 min-w-[200px] max-w-[320px]">
                    AI reason
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 min-w-[180px]">
                    Links
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 whitespace-nowrap">
                    Created
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 w-[108px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 sm:px-5">
                      <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                        <div className="rounded-full bg-muted p-4 mb-4">
                          <Inbox className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-foreground">No requests match</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Try clearing search or status filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  requests.data.map((row) => (
                    <tr key={row.id} className="bg-card hover:bg-muted/25 transition-colors align-top">
                      <td className="px-4 py-3.5 sm:px-5">
                        <Link
                          href={route("admin.kiosk.requests.show", row.id)}
                          className="font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {row.display_name}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          <span className="text-muted-foreground/80">{row.category_slug}</span>
                          {row.subcategory ? <span> · {row.subcategory}</span> : null}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-muted-foreground">
                        <p className="font-medium text-foreground">{row.requester_name ?? "—"}</p>
                        <p className="text-xs mt-0.5 break-all">{row.requester_email ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-muted-foreground">
                        {[row.city, row.state].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="flex flex-col gap-1 items-start">
                          {statusBadge(row.status)}
                          <span className="text-[11px] text-muted-foreground capitalize">
                            AI: {row.ai_decision ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-muted-foreground">
                        <p
                          className="line-clamp-2 leading-relaxed text-xs sm:text-sm"
                          title={row.ai_reason ?? undefined}
                        >
                          {row.ai_reason ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Submitted
                            </span>
                            <p className="font-mono text-[11px] text-foreground truncate max-w-[220px] mt-0.5" title={row.url ?? undefined}>
                              {row.url ?? "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Suggested
                            </span>
                            <p
                              className="font-mono text-[11px] text-foreground truncate max-w-[220px] mt-0.5"
                              title={row.ai_suggested_url ?? undefined}
                            >
                              {row.ai_suggested_url ?? "—"}
                            </p>
                          </div>
                          <p className="text-muted-foreground">
                            Item ID:{" "}
                            <span className="font-medium text-foreground tabular-nums">
                              {row.approved_service_id ?? "—"}
                            </span>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-muted-foreground tabular-nums text-xs whitespace-nowrap">
                        {row.created_at ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-right">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={route("admin.kiosk.requests.show", row.id)} aria-label="View">
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={route("admin.kiosk.requests.edit", row.id)} aria-label="Edit">
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(row.id)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {requests.total > 0 && requests.last_page > 1 && (
            <div className="flex flex-col gap-4 border-t border-border bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-muted-foreground order-2 sm:order-1 tabular-nums text-center sm:text-left">
                Page <span className="font-medium text-foreground">{requests.current_page}</span> of{" "}
                <span className="font-medium text-foreground">{requests.last_page}</span>
              </p>
              <nav className="flex flex-wrap items-center justify-center gap-1 order-1 sm:order-2" aria-label="Pagination">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1 px-3"
                  disabled={requests.current_page <= 1}
                  onClick={() => goToPage(requests.current_page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex flex-wrap items-center justify-center gap-0.5 mx-1">
                  {visiblePageNumbers().map((p, idx) =>
                    p === "..." ? (
                      <span key={`e-${idx}`} className="flex h-9 min-w-9 items-center justify-center px-1 text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <Button
                        key={p}
                        type="button"
                        variant={requests.current_page === p ? "default" : "outline"}
                        size="sm"
                        className={`h-9 min-w-9 px-0 ${requests.current_page === p ? "pointer-events-none" : ""}`}
                        onClick={() => goToPage(p)}
                        aria-current={requests.current_page === p ? "page" : undefined}
                      >
                        {p}
                      </Button>
                    )
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1 px-3"
                  disabled={requests.current_page >= requests.last_page}
                  onClick={() => goToPage(requests.current_page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </nav>
            </div>
          )}
        </div>

        <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this request?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the request record from the admin list. The linked kiosk item (if any) is not deleted
                automatically.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId !== null && handleDelete(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  )
}

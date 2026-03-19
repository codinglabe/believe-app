"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, router } from "@inertiajs/react"
import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ClipboardList, Search, ChevronLeft, ChevronRight } from "lucide-react"

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
}

interface PageProps {
  requests: PaginatedRequests
  filters?: { search?: string; status?: string }
}

export default function KioskRequestsIndex({ requests, filters = {} }: PageProps) {
  const [search, setSearch] = useState(filters.search ?? "")
  const [status, setStatus] = useState(filters.status ?? "")

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

  const goToPage = (page: number) => {
    if (page < 1 || page > requests.last_page) return
    const params: Record<string, string | number> = {}
    if (search.trim()) params.search = search.trim()
    if (status) params.status = status
    params.page = page
    router.get(route("admin.kiosk.requests.index"), params, { preserveState: true })
  }

  const badgeClassFor = (value: string) => {
    if (value === "approved") return "bg-emerald-600 hover:bg-emerald-600"
    if (value === "pending") return "bg-amber-500 hover:bg-amber-500"
    if (value === "rejected") return "bg-red-600 hover:bg-red-600"
    return ""
  }

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Kiosk Management", href: route("admin.kiosk.index") },
    { title: "Kiosk Requests", href: route("admin.kiosk.requests.index") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Kiosk Requests" />
      <div className="space-y-6 p-4 sm:p-6 w-full min-h-screen">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-primary" />
            Kiosk Requests
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review user-submitted service requests and see AI reasons for approved, pending, and rejected decisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by service, requester, category, URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search requests"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm h-9 min-w-[180px]"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <span className="text-xs text-muted-foreground hidden sm:inline">Updates as you type</span>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium p-3">Service</th>
                  <th className="text-left font-medium p-3">Requester</th>
                  <th className="text-left font-medium p-3">Location</th>
                  <th className="text-left font-medium p-3">Status</th>
                  <th className="text-left font-medium p-3">AI decision</th>
                  <th className="text-left font-medium p-3 min-w-[280px]">Why</th>
                  <th className="text-left font-medium p-3 min-w-[220px]">Links</th>
                  <th className="text-left font-medium p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {requests.data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No requests found.
                    </td>
                  </tr>
                ) : (
                  requests.data.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30 align-top">
                      <td className="p-3">
                        <p className="font-medium">{row.display_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {row.category_slug}{row.subcategory ? ` · ${row.subcategory}` : ""}
                        </p>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        <p>{row.requester_name ?? "—"}</p>
                        <p className="text-xs">{row.requester_email ?? "—"}</p>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {[row.city, row.state].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="p-3">
                        <Badge className={badgeClassFor(row.status)}>{row.status}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground capitalize">{row.ai_decision ?? "—"}</td>
                      <td className="p-3 text-muted-foreground whitespace-pre-wrap break-words">
                        {row.ai_reason ?? "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        <div className="space-y-1">
                          <p className="max-w-[220px] truncate" title={row.url ?? undefined}>
                            Submitted: {row.url ?? "—"}
                          </p>
                          <p className="max-w-[220px] truncate" title={row.ai_suggested_url ?? undefined}>
                            Suggested: {row.ai_suggested_url ?? "—"}
                          </p>
                          <p>Service ID: {row.approved_service_id ?? "—"}</p>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{row.created_at ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {requests.total > 0 && requests.last_page > 1 && (
            <div className="border-t bg-muted/20 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Page <span className="font-medium text-foreground">{requests.current_page}</span> of{" "}
                  <span className="font-medium text-foreground">{requests.last_page}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 px-3 border-border shadow-sm"
                    disabled={requests.current_page <= 1}
                    onClick={() => goToPage(requests.current_page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 px-3 border-border shadow-sm"
                    disabled={requests.current_page >= requests.last_page}
                    onClick={() => goToPage(requests.current_page + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}


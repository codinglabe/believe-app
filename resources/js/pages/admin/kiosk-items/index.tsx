"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Badge } from "@/components/ui/badge"
import { List, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Inbox } from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { useState, useEffect, useRef } from "react"

interface ItemRow {
  id: number
  display_name: string
  subcategory: string | null
  category_slug: string
  category_title: string
  url: string | null
  is_active: boolean
}

interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

interface PaginatedItems {
  data: ItemRow[]
  current_page: number
  last_page: number
  total: number
  links: PaginationLink[]
  prev_page_url: string | null
  next_page_url: string | null
}

interface PageProps {
  items: PaginatedItems
  categories: { value: string; label: string }[]
  filters?: { search?: string; category?: string }
}

export default function KioskItemsIndex({ items, categories, filters = {} }: PageProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [search, setSearch] = useState(filters.search ?? "")
  const [categoryFilter, setCategoryFilter] = useState(filters.category ?? "")

  useEffect(() => {
    setSearch(filters.search ?? "")
    setCategoryFilter(filters.category ?? "")
  }, [filters.search, filters.category])

  const prevCategoryRef = useRef(categoryFilter)
  const skipAutoFetchRef = useRef(true)

  useEffect(() => {
    if (skipAutoFetchRef.current) {
      skipAutoFetchRef.current = false
      prevCategoryRef.current = categoryFilter
      return
    }
    const categoryChanged = prevCategoryRef.current !== categoryFilter
    prevCategoryRef.current = categoryFilter
    const delayMs = categoryChanged ? 0 : 400
    const id = window.setTimeout(() => {
      const params: Record<string, string> = {}
      if (search.trim()) params.search = search.trim()
      if (categoryFilter) params.category = categoryFilter
      router.get(route("admin.kiosk.items.index"), params, {
        preserveState: true,
        replace: true,
      })
    }, delayMs)
    return () => window.clearTimeout(id)
  }, [search, categoryFilter])

  const buildListParams = (page: number) => {
    const params: Record<string, string | number> = { page }
    if (search.trim()) params.search = search.trim()
    if (categoryFilter) params.category = categoryFilter
    return params
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > items.last_page) return
    router.get(route("admin.kiosk.items.index"), buildListParams(page), { preserveState: true })
  }

  const perPage = 10
  const from = items.total === 0 ? 0 : (items.current_page - 1) * perPage + 1
  const to = items.total === 0 ? 0 : from + items.data.length - 1

  const visiblePageNumbers = (): (number | "...")[] => {
    const last = items.last_page
    const cur = items.current_page
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

  const handleDelete = (id: number) => {
    router.delete(route("admin.kiosk.items.destroy", id), {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Item deleted.")
        setDeleteId(null)
      },
      onError: () => {
        showErrorToast("Failed to delete.")
        setDeleteId(null)
      },
    })
  }

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Kiosk Management", href: route("admin.kiosk.index") },
    { title: "Kiosk Items", href: route("admin.kiosk.items.index") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Kiosk Items" />
      <div className="w-full max-w-none min-h-screen space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <List className="h-7 w-7 text-primary shrink-0" />
              Kiosk Items
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Services shown on the public Kiosk page. 10 items per page.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm tabular-nums">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold text-foreground">{items.total}</span>
            </div>
            <Button asChild>
              <Link href={route("admin.kiosk.items.create")} className="gap-2">
                <Plus className="h-4 w-4" />
                Add item
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Filters</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_minmax(200px,280px)] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="kiosk-item-search" className="text-xs text-muted-foreground">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="kiosk-item-search"
                  placeholder="Name or subcategory…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 pl-9"
                  aria-label="Search kiosk items"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kiosk-item-category" className="text-xs text-muted-foreground">
                Category
              </Label>
              <select
                id="kiosk-item-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex flex-col gap-1 border-b border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span className="text-sm font-semibold text-foreground">All items</span>
            {items.total > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                Showing <span className="font-medium text-foreground">{from}</span>–
                <span className="font-medium text-foreground">{to}</span> of{" "}
                <span className="font-medium text-foreground">{items.total}</span>
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5">
                    Display name
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 min-w-[120px]">
                    Category
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5">
                    Subcategory
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 min-w-[160px]">
                    URL
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 whitespace-nowrap">
                    Status
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 w-[88px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 sm:px-5">
                      <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                        <div className="rounded-full bg-muted p-4 mb-4">
                          <Inbox className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-foreground">No items yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <Link href={route("admin.kiosk.items.create")} className="text-primary font-medium hover:underline">
                            Create your first item
                          </Link>
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.data.map((row) => (
                    <tr key={row.id} className="bg-card hover:bg-muted/25 transition-colors">
                      <td className="px-4 py-3.5 sm:px-5 font-semibold text-foreground">{row.display_name}</td>
                      <td className="px-4 py-3.5 sm:px-5 text-foreground">{row.category_title}</td>
                      <td className="px-4 py-3.5 sm:px-5 text-muted-foreground">{row.subcategory ?? "—"}</td>
                      <td className="px-4 py-3.5 sm:px-5 text-muted-foreground">
                        <span className="font-mono text-[11px] truncate block max-w-[240px]" title={row.url ?? undefined}>
                          {row.url ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Badge variant={row.is_active ? "default" : "secondary"} className="shrink-0">
                          {row.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-right">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={route("admin.kiosk.items.edit", row.id)} aria-label="Edit">
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

          {items.total > 0 && (
            <div className="flex flex-col gap-4 border-t border-border bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-muted-foreground order-2 sm:order-1 tabular-nums text-center sm:text-left">
                {items.last_page > 1 ? (
                  <>
                    Page <span className="font-medium text-foreground">{items.current_page}</span> of{" "}
                    <span className="font-medium text-foreground">{items.last_page}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">End of list</span>
                )}
              </p>
              {items.last_page > 1 && (
                <nav
                  className="flex flex-wrap items-center justify-center gap-1 order-1 sm:order-2"
                  aria-label="Pagination"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 px-3"
                    disabled={items.current_page <= 1}
                    onClick={() => goToPage(items.current_page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex flex-wrap items-center justify-center gap-0.5 mx-1">
                    {visiblePageNumbers().map((p, idx) =>
                      p === "..." ? (
                        <span
                          key={`e-${idx}`}
                          className="flex h-9 min-w-9 items-center justify-center px-1 text-muted-foreground"
                        >
                          …
                        </span>
                      ) : (
                        <Button
                          key={p}
                          type="button"
                          variant={items.current_page === p ? "default" : "outline"}
                          size="sm"
                          className={`h-9 min-w-9 px-0 ${items.current_page === p ? "pointer-events-none" : ""}`}
                          onClick={() => goToPage(p)}
                          aria-current={items.current_page === p ? "page" : undefined}
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
                    disabled={items.current_page >= items.last_page}
                    onClick={() => goToPage(items.current_page + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </nav>
              )}
            </div>
          )}
        </div>

        <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this item?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the item from the Kiosk services list. This action cannot be undone.
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

"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { List, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react"
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
      <div className="space-y-6 p-4 sm:p-6 w-full min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <List className="h-7 w-7 text-primary" />
              Kiosk Items
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Create, edit, and delete service items shown on the public Kiosk services page (10 per page).
            </p>
          </div>
          <Button asChild>
            <Link href={route("admin.kiosk.items.create")} className="gap-2">
              <Plus className="h-4 w-4" />
              Add item
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or subcategory…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search kiosk items"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm h-9 min-w-[180px]"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground hidden sm:inline">Updates as you type</span>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium p-3">Display name</th>
                  <th className="text-left font-medium p-3">Category</th>
                  <th className="text-left font-medium p-3">Subcategory</th>
                  <th className="text-left font-medium p-3">URL</th>
                  <th className="text-left font-medium p-3">Status</th>
                  <th className="text-right font-medium p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No items yet. <Link href={route("admin.kiosk.items.create")} className="text-primary hover:underline">Create one</Link>.
                    </td>
                  </tr>
                ) : (
                  items.data.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{row.display_name}</td>
                      <td className="p-3">{row.category_title}</td>
                      <td className="p-3 text-muted-foreground">{row.subcategory ?? "—"}</td>
                      <td className="p-3 text-muted-foreground max-w-[200px] truncate" title={row.url ?? undefined}>
                        {row.url ?? "—"}
                      </td>
                      <td className="p-3">
                        <Badge variant={row.is_active ? "default" : "secondary"}>
                          {row.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={route("admin.kiosk.items.edit", row.id)} aria-label="Edit">
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
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
            <div className="border-t bg-muted/20 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground order-2 sm:order-1 tabular-nums">
                  Showing <span className="font-medium text-foreground">{from}</span>
                  {" – "}
                  <span className="font-medium text-foreground">{to}</span>
                  {" of "}
                  <span className="font-medium text-foreground">{items.total}</span>
                </p>
                {items.last_page > 1 && (
                  <nav
                    className="flex flex-wrap items-center justify-center gap-1.5 order-1 sm:order-2"
                    aria-label="Pagination"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1 px-3 border-border shadow-sm hover:bg-primary/5"
                      disabled={items.current_page <= 1}
                      onClick={() => goToPage(items.current_page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden xs:inline sm:inline">Previous</span>
                    </Button>
                    <div className="flex flex-wrap items-center justify-center gap-1">
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
                            className={`h-9 min-w-9 px-3 shadow-sm ${
                              items.current_page === p
                                ? "pointer-events-none font-semibold"
                                : "border-border hover:bg-primary/5"
                            }`}
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
                      className="h-9 gap-1 px-3 border-border shadow-sm hover:bg-primary/5"
                      disabled={items.current_page >= items.last_page}
                      onClick={() => goToPage(items.current_page + 1)}
                    >
                      <span className="hidden xs:inline sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </nav>
                )}
              </div>
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

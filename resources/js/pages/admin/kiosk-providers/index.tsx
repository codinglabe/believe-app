"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
import { Store, Search, ChevronLeft, ChevronRight, Pencil, Trash2, Plus, Inbox } from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface ProviderRow {
  id: number
  state_abbr: string
  normalized_city: string
  zip_normalized: string
  category_slug: string
  subcategory_slug: string
  provider_slug: string
  name: string
  website: string | null
  payment_url: string | null
  login_url: string | null
  account_link_supported: boolean
  updated_at: string | null
}

interface PaginatedProviders {
  data: ProviderRow[]
  current_page: number
  last_page: number
  total: number
  per_page?: number
}

interface CategoryOption {
  slug: string
  title: string
}

interface PageProps {
  providers: PaginatedProviders
  categories: CategoryOption[]
  filters?: { search?: string; category_slug?: string; state_abbr?: string }
  flash?: { success?: string }
}

const PER_PAGE = 10

export default function KioskProvidersIndex({ providers, categories, filters = {} }: PageProps) {
  const { flash } = usePage<PageProps>().props
  const [search, setSearch] = useState(filters.search ?? "")
  const [categorySlug, setCategorySlug] = useState(filters.category_slug ?? "")
  const [stateAbbr, setStateAbbr] = useState(filters.state_abbr ?? "")
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const perPage = providers.per_page ?? PER_PAGE
  const rangeFrom = providers.total === 0 ? 0 : (providers.current_page - 1) * perPage + 1
  const rangeTo = providers.total === 0 ? 0 : rangeFrom + providers.data.length - 1

  useEffect(() => {
    if (flash?.success) {
      showSuccessToast(flash.success)
    }
  }, [flash?.success])

  useEffect(() => {
    setSearch(filters.search ?? "")
    setCategorySlug(filters.category_slug ?? "")
    setStateAbbr(filters.state_abbr ?? "")
  }, [filters.search, filters.category_slug, filters.state_abbr])

  const skipAutoFetchRef = useRef(true)
  useEffect(() => {
    if (skipAutoFetchRef.current) {
      skipAutoFetchRef.current = false
      return
    }
    const timeout = window.setTimeout(() => {
      const params: Record<string, string> = {}
      if (search.trim()) params.search = search.trim()
      if (categorySlug) params.category_slug = categorySlug
      if (stateAbbr.trim()) params.state_abbr = stateAbbr.trim().toUpperCase().slice(0, 2)
      router.get(route("admin.kiosk.providers.index"), params, { preserveState: true, replace: true })
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [search, categorySlug, stateAbbr])

  const goToPage = (page: number) => {
    if (page < 1 || page > providers.last_page) return
    const params: Record<string, string | number> = {}
    if (search.trim()) params.search = search.trim()
    if (categorySlug) params.category_slug = categorySlug
    if (stateAbbr.trim()) params.state_abbr = stateAbbr.trim().toUpperCase().slice(0, 2)
    params.page = page
    router.get(route("admin.kiosk.providers.index"), params, { preserveState: true })
  }

  const visiblePageNumbers = (): (number | "...")[] => {
    const last = providers.last_page
    const cur = providers.current_page
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
    router.delete(route("admin.kiosk.providers.destroy", id), {
      preserveScroll: true,
      onSuccess: () => setDeleteId(null),
      onError: () => {
        showErrorToast("Failed to delete provider.")
        setDeleteId(null)
      },
    })
  }

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Kiosk Management", href: route("admin.kiosk.index") },
    { title: "Providers", href: route("admin.kiosk.providers.index") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Kiosk Providers" />
      <div className="w-full max-w-none min-h-screen space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Store className="h-7 w-7 text-primary shrink-0" />
              Kiosk providers
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Directory entries shown in the public kiosk (AI ingest + approved requests). Create, edit, or remove
              providers here.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm tabular-nums">
              <span className="text-muted-foreground">Total </span>
              <span className="font-semibold text-foreground">{providers.total}</span>
            </div>
            <Button asChild>
              <Link href={route("admin.kiosk.providers.create")} className="gap-2">
                <Plus className="h-4 w-4" />
                Add provider
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Filters</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="kiosk-prov-search" className="text-xs text-muted-foreground">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="kiosk-prov-search"
                  placeholder="Name, slug, city, category, URL…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 pl-9"
                  aria-label="Search providers"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kiosk-prov-cat" className="text-xs text-muted-foreground">
                Category
              </Label>
              <select
                id="kiosk-prov-cat"
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kiosk-prov-state" className="text-xs text-muted-foreground">
                State (2-letter)
              </Label>
              <Input
                id="kiosk-prov-state"
                maxLength={2}
                placeholder="e.g. TX"
                value={stateAbbr}
                onChange={(e) => setStateAbbr(e.target.value.toUpperCase())}
                className="h-10 uppercase"
                aria-label="Filter by state"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex flex-col gap-1 border-b border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span className="text-sm font-semibold text-foreground">All providers</span>
            {providers.total > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                Showing <span className="font-medium text-foreground">{rangeFrom}</span>–
                <span className="font-medium text-foreground">{rangeTo}</span> of{" "}
                <span className="font-medium text-foreground">{providers.total}</span>
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 min-w-[200px]">
                    Name
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 whitespace-nowrap">
                    Location
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 min-w-[140px]">
                    Category
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 min-w-[140px]">
                    Slugs
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 min-w-[120px]">
                    Website
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3 sm:px-5 w-[108px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {providers.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 sm:px-5">
                      <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                        <div className="rounded-full bg-muted p-4 mb-4">
                          <Inbox className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-foreground">No providers match</p>
                        <p className="text-sm text-muted-foreground mt-1">Try clearing filters or add a provider.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  providers.data.map((row) => (
                    <tr key={row.id} className="bg-card hover:bg-muted/25 transition-colors align-top">
                      <td className="px-4 py-3.5 sm:px-5">
                        <p className="font-semibold text-foreground">{row.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">ID {row.id}</p>
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-muted-foreground whitespace-nowrap">
                        {row.normalized_city}, {row.state_abbr}
                        {row.zip_normalized ? ` · ${row.zip_normalized}` : ""}
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-muted-foreground">
                        <p className="font-medium text-foreground">{row.category_slug}</p>
                        <p className="text-xs mt-0.5">{row.subcategory_slug}</p>
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-muted-foreground font-mono text-xs break-all max-w-[200px]">
                        {row.provider_slug}
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        {row.website ? (
                          <a
                            href={row.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-xs break-all hover:underline line-clamp-2"
                          >
                            {row.website}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 sm:px-5 text-right">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={route("admin.kiosk.providers.edit", row.id)} aria-label="Edit">
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

          {providers.total > 0 && providers.last_page > 1 && (
            <div className="flex flex-col gap-4 border-t border-border bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-muted-foreground order-2 sm:order-1 tabular-nums text-center sm:text-left">
                Page <span className="font-medium text-foreground">{providers.current_page}</span> of{" "}
                <span className="font-medium text-foreground">{providers.last_page}</span>
              </p>
              <nav className="flex flex-wrap items-center justify-center gap-1 order-1 sm:order-2" aria-label="Pagination">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1 px-3"
                  disabled={providers.current_page <= 1}
                  onClick={() => goToPage(providers.current_page - 1)}
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
                        variant={providers.current_page === p ? "default" : "outline"}
                        size="sm"
                        className={`h-9 min-w-9 px-0 ${providers.current_page === p ? "pointer-events-none" : ""}`}
                        onClick={() => goToPage(p)}
                        aria-current={providers.current_page === p ? "page" : undefined}
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
                  disabled={providers.current_page >= providers.last_page}
                  onClick={() => goToPage(providers.current_page + 1)}
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
              <AlertDialogTitle>Delete this provider?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the entry from the kiosk directory. Any approved service request pointing at this provider
                will have its link cleared.
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

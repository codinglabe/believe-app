"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router } from "@inertiajs/react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Monitor,
  Plus,
  Eye,
  Pencil,
  Trash2,
  MapPin,
  Globe,
  CreditCard,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import type { PageProps as InertiaPageProps } from "@inertiajs/core"
import { showSuccessToast } from "@/lib/toast"

interface ProviderRow {
  id: number
  organization_id: number | null
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
  is_platform: boolean
}

interface PaginatedProviders {
  data: ProviderRow[]
  current_page: number
  last_page: number
  total: number
  per_page?: number
}

interface FilterState {
  city?: string | null
  zip?: string | null
  state?: string | null
}

/** Distinct values from `kiosk_providers` for location filters. */
interface FilterOptions {
  states: string[]
  /** Distinct cities across all rows (when no state is selected). */
  all_cities: string[]
  cities_by_state: Record<string, string[]>
  zips_by_state_city: Record<string, string[]>
}

const FILTER_ANY = "__all__"

interface KioskProvidersIndexProps extends InertiaPageProps {
  current_organization_id: number
  providers: PaginatedProviders
  filters: FilterState
  filter_options: FilterOptions
  success?: string | null
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Community kiosk", href: "/organization/kiosk-providers" },
]

const FILTER_DEBOUNCE_MS = 350

export default function OrganizationKioskProvidersIndex({
  current_organization_id,
  providers,
  filters,
  filter_options,
  success,
}: KioskProvidersIndexProps) {
  const [cityInput, setCityInput] = useState(filters?.city ?? "")
  const [zipInput, setZipInput] = useState(filters?.zip ?? "")
  const [stateInput, setStateInput] = useState(filters?.state ?? "")
  const skipAutoFetchRef = useRef(true)

  useEffect(() => {
    setCityInput(filters?.city ?? "")
    setZipInput(filters?.zip ?? "")
    setStateInput(filters?.state ?? "")
  }, [filters?.city, filters?.zip, filters?.state])

  useEffect(() => {
    if (success) {
      showSuccessToast(success)
    }
  }, [success])

  useEffect(() => {
    if (skipAutoFetchRef.current) {
      skipAutoFetchRef.current = false
      return
    }
    const timeout = window.setTimeout(() => {
      const p: Record<string, string | number> = {}
      const c = cityInput.trim()
      const z = zipInput.trim()
      const s = stateInput.trim()
      if (s) p.state = s
      if (c) p.city = c
      if (z) p.zip = z
      router.get(route("organization.kiosk-providers.index"), p, { preserveState: true, replace: true })
    }, FILTER_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [stateInput, cityInput, zipInput])

  /** Query params currently reflected in the URL (used for pagination). */
  const paramsFromAppliedFilters = (page?: number): Record<string, string | number> => {
    const p: Record<string, string | number> = {}
    const c = String(filters?.city ?? "").trim()
    const z = String(filters?.zip ?? "").trim()
    const s = String(filters?.state ?? "").trim()
    if (s) p.state = s
    if (c) p.city = c
    if (z) p.zip = z
    if (page !== undefined && page > 1) p.page = page
    return p
  }

  const clearFilters = () => {
    setStateInput("")
    setCityInput("")
    setZipInput("")
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > providers.last_page) return
    router.get(route("organization.kiosk-providers.index"), paramsFromAppliedFilters(page), { preserveState: true })
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

  const hasAppliedFilters = Boolean(
    (filters?.city && String(filters.city).trim()) ||
      (filters?.zip && String(filters.zip).trim()) ||
      (filters?.state && String(filters.state).trim()),
  )

  const appliedState = String(filters?.state ?? "").trim()
  const appliedCity = String(filters?.city ?? "").trim()
  const appliedZip = String(filters?.zip ?? "").trim()
  const hasDirtyInputs =
    stateInput.trim() !== appliedState ||
    cityInput.trim() !== appliedCity ||
    zipInput.trim() !== appliedZip

  const stateOptions = useMemo(() => {
    const base = filter_options.states ?? []
    const s = appliedState
    if (s && !base.includes(s)) {
      return [...base, s].sort((a, b) => a.localeCompare(b))
    }
    return base
  }, [filter_options.states, appliedState])

  const cityOptions = useMemo(() => {
    if (stateInput.trim()) {
      const base = filter_options.cities_by_state[stateInput] ?? []
      const c = appliedCity
      if (c && stateInput === appliedState && !base.includes(c)) {
        return [...base, c].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      }
      return base
    }
    const base = filter_options.all_cities ?? []
    const c = appliedCity
    if (c && !base.includes(c)) {
      return [...base, c].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    }
    return base
  }, [filter_options.cities_by_state, filter_options.all_cities, stateInput, appliedState, appliedCity])

  const zipOptions = useMemo(() => {
    if (!stateInput.trim() || !cityInput.trim()) return [] as string[]
    const key = `${stateInput}|${cityInput}`
    const base = filter_options.zips_by_state_city[key] ?? []
    const z = appliedZip
    if (z && stateInput === appliedState && cityInput === appliedCity && !base.includes(z)) {
      return [...base, z].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    }
    return base
  }, [
    filter_options.zips_by_state_city,
    stateInput,
    cityInput,
    appliedState,
    appliedCity,
    appliedZip,
  ])

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Community kiosk listings" />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Monitor className="h-8 w-8 text-primary" />
              Community kiosk
            </h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
              Browse and view every kiosk directory entry (platform and organizations). Filter by state, city, and ZIP using
              values from the directory. Use <span className="font-medium text-foreground">Add listing</span> to publish a new
              row for your organization. You can edit or remove listings your organization created; other entries are
              view-only. Public view:{" "}
              <Link href="/kiosk/services" className="text-primary underline underline-offset-2">
                Kiosk services
              </Link>
              .
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-medium text-foreground">{providers.total}</span> listing
              {providers.total === 1 ? "" : "s"} match
              {hasAppliedFilters ? " these filters" : ""}
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href={route("organization.kiosk-providers.create")}>
              <Plus className="h-4 w-4 mr-2" />
              Add listing
            </Link>
          </Button>
        </div>

        <section className="space-y-4" aria-labelledby="kiosk-filter-heading">
          <div>
            <h2 id="kiosk-filter-heading" className="text-base font-semibold text-foreground">
              Filter by location
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Options are distinct values from the kiosk directory. Filters apply automatically shortly after you change them.
              ZIP choices appear after you choose both state and city.
            </p>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="grid flex-1 gap-4 sm:grid-cols-3 min-w-0">
              <div className="space-y-2">
                <Label htmlFor="kiosk-filter-state">State</Label>
                <Select
                  value={stateInput ? stateInput : FILTER_ANY}
                  onValueChange={(v) => {
                    if (v === FILTER_ANY) {
                      setStateInput("")
                      setCityInput("")
                      setZipInput("")
                      return
                    }
                    setStateInput(v)
                    setCityInput((prev) => {
                      const allowed = filter_options.cities_by_state[v] ?? []
                      return prev && allowed.includes(prev) ? prev : ""
                    })
                    setZipInput("")
                  }}
                >
                  <SelectTrigger id="kiosk-filter-state" className="w-full">
                    <SelectValue placeholder="Any state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ANY}>Any state</SelectItem>
                    {stateOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kiosk-filter-city">City</Label>
                <Select
                  value={cityInput ? cityInput : FILTER_ANY}
                  onValueChange={(v) => {
                    if (v === FILTER_ANY) {
                      setCityInput("")
                      setZipInput("")
                      return
                    }
                    setCityInput(v)
                    setZipInput("")
                  }}
                >
                  <SelectTrigger id="kiosk-filter-city" className="w-full">
                    <SelectValue placeholder="Any city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ANY}>Any city</SelectItem>
                    {cityOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kiosk-filter-zip">ZIP</Label>
                <Select
                  value={zipInput ? zipInput : FILTER_ANY}
                  onValueChange={(v) => {
                    if (v === FILTER_ANY) {
                      setZipInput("")
                      return
                    }
                    setZipInput(v)
                  }}
                  disabled={!stateInput.trim() || !cityInput.trim()}
                >
                  <SelectTrigger id="kiosk-filter-zip" className="w-full">
                    <SelectValue
                      placeholder={
                        !stateInput.trim() || !cityInput.trim() ? "Select state & city first" : "Any ZIP"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ANY}>Any ZIP</SelectItem>
                    {zipOptions.map((z) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 lg:ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                disabled={!hasDirtyInputs && !hasAppliedFilters}
              >
                Clear
              </Button>
            </div>
          </div>
        </section>

        {providers.data.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No listings match</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                {hasAppliedFilters ? "Try different city, ZIP, or state filters." : "There are no kiosk directory entries yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {providers.data.map((p) => (
                <Card key={p.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base leading-snug">{p.name}</CardTitle>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {p.organization_id != null && p.organization_id === current_organization_id ? (
                            <Badge className="text-xs font-normal">Yours</Badge>
                          ) : p.is_platform ? (
                            <Badge variant="secondary" className="text-xs font-normal">
                              Platform
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs font-normal">
                              Organization
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs font-normal">
                            {p.category_slug}
                          </Badge>
                          {p.subcategory_slug !== "general" && (
                            <Badge variant="outline" className="text-xs font-normal">
                              {p.subcategory_slug}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 pt-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {p.normalized_city}, {p.state_abbr}
                          {p.zip_normalized ? ` ${p.zip_normalized}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {p.organization_id != null && p.organization_id === current_organization_id && (
                          <>
                            <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                              <Link href={route("organization.kiosk-providers.edit", p.id)} aria-label="Edit listing">
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  aria-label="Remove listing"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove this listing?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    &quot;{p.name}&quot; will be removed from the kiosk directory. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() =>
                                      router.delete(route("organization.kiosk-providers.destroy", p.id), {
                                        preserveScroll: true,
                                      })
                                    }
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                        <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                          <Link href={route("organization.kiosk-providers.show", p.id)} aria-label="View listing details">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {(p.website || p.payment_url || p.login_url) && (
                      <div className="flex flex-wrap items-center gap-2">
                        {p.website && (
                          <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 px-2.5" asChild>
                            <a href={p.website} target="_blank" rel="noreferrer" className="inline-flex items-center">
                              <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              Website
                            </a>
                          </Button>
                        )}
                        {p.payment_url && (
                          <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 px-2.5" asChild>
                            <a href={p.payment_url} target="_blank" rel="noreferrer" className="inline-flex items-center">
                              <CreditCard className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              Payment
                            </a>
                          </Button>
                        )}
                        {p.login_url && (
                          <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 px-2.5" asChild>
                            <a href={p.login_url} target="_blank" rel="noreferrer" className="inline-flex items-center">
                              <LogIn className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              Login
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                    {p.account_link_supported && (
                      <p className="text-xs text-muted-foreground pt-0.5">Account link supported</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {providers.last_page > 1 && (
              <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground tabular-nums text-center sm:text-left">
                  Page <span className="font-medium text-foreground">{providers.current_page}</span> of{" "}
                  <span className="font-medium text-foreground">{providers.last_page}</span>
                </p>
                <nav className="flex flex-wrap items-center justify-center gap-1" aria-label="Pagination">
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
                    {visiblePageNumbers().map((pn, idx) =>
                      pn === "..." ? (
                        <span
                          key={`e-${idx}`}
                          className="flex h-9 min-w-9 items-center justify-center px-1 text-muted-foreground"
                        >
                          …
                        </span>
                      ) : (
                        <Button
                          key={pn}
                          type="button"
                          variant={providers.current_page === pn ? "default" : "outline"}
                          size="sm"
                          className={`h-9 min-w-9 px-0 ${providers.current_page === pn ? "pointer-events-none" : ""}`}
                          onClick={() => goToPage(pn)}
                          aria-current={providers.current_page === pn ? "page" : undefined}
                        >
                          {pn}
                        </Button>
                      ),
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
          </>
        )}
      </div>
    </AppLayout>
  )
}

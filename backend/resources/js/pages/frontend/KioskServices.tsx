"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Link, router, usePage } from "@inertiajs/react"
import { useCallback, useState, useEffect, useRef } from "react"
import {
  Monitor,
  ExternalLink,
  ArrowLeft,
  Banknote,
  HeartPulse,
  Landmark,
  Briefcase,
  Wallet,
  Handshake,
  Home,
  GraduationCap,
  Medal,
  UtensilsCrossed,
  Bus,
  Scale,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  MapPin,
  CreditCard,
  LogIn,
  type LucideIcon,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"

const categoryIconMap: Record<string, { icon: LucideIcon; iconColor: string; iconBg: string }> = {
  "pay-bills": { icon: Banknote, iconColor: "text-amber-700 dark:text-amber-400", iconBg: "bg-amber-100 dark:bg-amber-900/40" },
  healthcare: { icon: HeartPulse, iconColor: "text-rose-600 dark:text-rose-400", iconBg: "bg-rose-100 dark:bg-rose-900/40" },
  government: { icon: Landmark, iconColor: "text-violet-600 dark:text-violet-400", iconBg: "bg-violet-100 dark:bg-violet-900/40" },
  "find-a-job": { icon: Briefcase, iconColor: "text-teal-600 dark:text-teal-400", iconBg: "bg-teal-100 dark:bg-teal-900/40" },
  financial: { icon: Wallet, iconColor: "text-blue-600 dark:text-blue-400", iconBg: "bg-blue-100 dark:bg-blue-900/40" },
  "community-help": { icon: Handshake, iconColor: "text-violet-600 dark:text-violet-400", iconBg: "bg-violet-100 dark:bg-violet-900/40" },
  "housing-assistance": { icon: Home, iconColor: "text-amber-600 dark:text-amber-400", iconBg: "bg-amber-100 dark:bg-amber-900/40" },
  education: { icon: GraduationCap, iconColor: "text-blue-600 dark:text-blue-400", iconBg: "bg-blue-100 dark:bg-blue-900/40" },
  "veteran-services": { icon: Medal, iconColor: "text-red-600 dark:text-red-400", iconBg: "bg-red-100 dark:bg-red-900/40" },
  "food-and-family": { icon: UtensilsCrossed, iconColor: "text-red-600 dark:text-red-400", iconBg: "bg-red-100 dark:bg-red-900/40" },
  transportation: { icon: Bus, iconColor: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-100 dark:bg-emerald-900/40" },
  "disaster-and-legal": { icon: Scale, iconColor: "text-orange-600 dark:text-orange-400", iconBg: "bg-orange-100 dark:bg-orange-900/40" },
}

interface FilterOption {
  value: string
  label: string
}

interface RequestSubcategoryOption {
  id: number
  category_slug: string
  value: string
  label: string
}

interface KioskProviderItem {
  id: number
  name: string
  category_slug: string
  subcategory_slug: string
  website: string | null
  payment_url: string | null
  login_url: string | null
  account_link_supported: boolean
}

interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

interface PaginatedProviders {
  data: KioskProviderItem[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
  links: PaginationLink[]
  prev_page_url: string | null
  next_page_url: string | null
  path: string
}

interface SupporterLocationPayload {
  city: string
  state: string
  zipcode: string | null
  label: string
}

interface KioskServiceRequestFlash {
  ok: boolean
  status: string
  reason: string | null
  suggested_url: string | null
  request_id: number
  edit_token: string
}

function formatValidationErrors(errors: Record<string, string | string[] | undefined>): string {
  const parts: string[] = []
  for (const v of Object.values(errors)) {
    if (v == null) continue
    parts.push(...(Array.isArray(v) ? v : [v]))
  }
  return parts.join(" ") || "Please check the form."
}

interface KioskServicesProps {
  seo?: { title?: string; description?: string }
  hero?: { title: string; subtitle: string }
  /** Paginated `kiosk_providers` only (AI ingest + approved requests). */
  providers: PaginatedProviders
  supporterLocation?: SupporterLocationPayload | null
  supporterNeedsLocation?: boolean
  filters: {
    state: string | null
    city: string | null
    category: string | null
    subcategory: string | null
    search: string | null
    all_locations: boolean
  }
  filterOptions: {
    states: FilterOption[]
    cities: FilterOption[]
    categories: FilterOption[]
    subcategories: FilterOption[]
  }
  /** Subcategory rows from `kiosk_subcategories` for the “request a service” form dropdowns. */
  requestSubcategoryOptions?: RequestSubcategoryOption[]
}

export default function KioskServices({
  seo,
  hero,
  providers,
  supporterLocation = null,
  supporterNeedsLocation = false,
  filters,
  filterOptions,
  requestSubcategoryOptions = [],
}: KioskServicesProps) {
  /** Category / subcategory / search / page only — city & state live in session (see POST /kiosk/services/geo). */
  const buildUrl = useCallback(
    (f: {
      category?: string | null
      subcategory?: string | null
      search?: string | null
      page?: number | null
    }) => {
      const q = new URLSearchParams()
      const category = f.category !== undefined ? f.category : filters.category
      const subcategory = f.subcategory !== undefined ? f.subcategory : filters.subcategory
      const search = f.search !== undefined ? f.search : filters.search
      const page = f.page !== undefined ? f.page : null
      if (category) q.set("category", category)
      if (subcategory) q.set("subcategory", subcategory)
      if (search) q.set("search", search)
      if (page != null && page > 1) q.set("page", String(page))
      const query = q.toString()
      return route("kiosk.services") + (query ? `?${query}` : "")
    },
    [filters.category, filters.subcategory, filters.search]
  )

  const postGeo = useCallback(
    (body: { state?: string; city?: string; all_locations?: boolean; use_profile?: boolean }) => {
      router.post("/kiosk/services/geo", {
        state: body.state ?? "",
        city: body.city ?? "",
        all_locations: body.all_locations ?? false,
        use_profile: body.use_profile ?? false,
        category: filters.category ?? "",
        subcategory: filters.subcategory ?? "",
        search: filters.search ?? "",
      })
    },
    [filters.category, filters.subcategory, filters.search]
  )

  const hrefWithAllLocations = useCallback(
    (extra?: { category?: string | null; subcategory?: string | null; search?: string | null }) => {
      const base = buildUrl({
        category: extra?.category !== undefined ? extra.category : filters.category,
        subcategory: extra?.subcategory !== undefined ? extra.subcategory : filters.subcategory,
        search: extra?.search !== undefined ? extra.search : filters.search,
        page: 1,
      })
      return base.includes("?") ? `${base}&all_locations=1` : `${base}?all_locations=1`
    },
    [buildUrl, filters.category, filters.subcategory, filters.search]
  )

  const [searchInput, setSearchInput] = useState(filters.search ?? "")
  const [requestForm, setRequestForm] = useState({
    display_name: "",
    category_slug: filters.category ?? "",
    subcategory: filters.subcategory ?? "",
    state: filters.state ?? "",
    city: filters.city ?? "",
    url: "",
    details: "",
  })
  const [requestState, setRequestState] = useState<{
    loading: boolean
    status: "approved" | "pending" | "rejected" | null
    reason: string | null
    requestId: number | null
    editToken: string | null
    suggestedUrl: string | null
    message: string | null
  }>({
    loading: false,
    status: null,
    reason: null,
    requestId: null,
    editToken: null,
    suggestedUrl: null,
    message: null,
  })
  const [correctedUrl, setCorrectedUrl] = useState("")
  const [showRequestForm, setShowRequestForm] = useState(false)
  const requestSectionRef = useRef<HTMLDivElement | null>(null)
  const page = usePage<{
    auth?: { user?: { id: number } | null }
    error?: string | null
    kiosk_service_request?: KioskServiceRequestFlash | null
  }>()
  const isLoggedIn = Boolean(page.props?.auth?.user)

  useEffect(() => {
    const err = page.props.error
    if (err) {
      setRequestState((s) => ({ ...s, message: err, loading: false }))
    }
  }, [page.props.error])

  useEffect(() => {
    setSearchInput(filters.search ?? "")
  }, [filters.search])

  useEffect(() => {
    setRequestForm((prev) => ({
      ...prev,
      category_slug: filters.category ?? prev.category_slug,
      subcategory: filters.subcategory ?? prev.subcategory,
      state: filters.state ?? prev.state,
      city: filters.city ?? prev.city,
    }))
  }, [filters.category, filters.subcategory, filters.state, filters.city])

  const [loadingRequestSubcategories, setLoadingRequestSubcategories] = useState(false)

  /** Inertia partial visit: server returns `requestSubcategoryOptions` for `kiosk_request_category`. */
  const loadRequestFormSubcategories = useCallback((categorySlug: string) => {
    setRequestForm((p) => ({ ...p, category_slug: categorySlug, subcategory: "" }))
    setLoadingRequestSubcategories(true)
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
    if (categorySlug) {
      params.set("kiosk_request_category", categorySlug)
    } else {
      params.set("kiosk_request_category", "")
    }
    const qs = params.toString()
    const base = route("kiosk.services")
    const url = qs ? `${base}?${qs}` : base
    router.get(url, {}, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      only: ["requestSubcategoryOptions"],
      onFinish: () => setLoadingRequestSubcategories(false),
    })
  }, [])

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = setTimeout(() => {
        router.get(buildUrl({ search: value.trim() || null, page: 1 }), {}, { preserveState: false })
      }, 350)
    },
    [buildUrl]
  )

  const handleFilterChange = useCallback(
    (key: "state" | "city" | "category" | "subcategory", value: string) => {
      if (key === "state") {
        if (!value) {
          postGeo({ all_locations: true })
          return
        }
        postGeo({ state: value, city: "" })
        return
      }
      if (key === "city") {
        postGeo({ state: filters.state ?? "", city: value })
        return
      }
      if (key === "category") {
        router.get(
          buildUrl({ category: value || null, subcategory: null, page: 1 }),
          {},
          { preserveState: false }
        )
        return
      }
      router.get(buildUrl({ subcategory: value || null, page: 1 }), {}, { preserveState: false })
    },
    [filters.state, buildUrl, postGeo]
  )

  const applyKioskRequestFlash = (data: KioskServiceRequestFlash) => {
    const status = (data.status ?? "").toLowerCase() as "approved" | "pending" | "rejected" | string
    setRequestState({
      loading: false,
      status: status === "approved" || status === "pending" || status === "rejected" ? status : null,
      reason: data.reason ?? null,
      requestId: data.request_id ?? null,
      editToken: data.edit_token ?? null,
      suggestedUrl: data.suggested_url ?? null,
      message:
        status === "approved"
          ? "Approved and added to kiosk providers."
          : status === "pending"
            ? "Pending: please provide a better matching link."
            : "Rejected by validation.",
    })
    setCorrectedUrl(data.suggested_url ?? "")
  }

  const submitServiceRequest = () => {
    setRequestState((s) => ({ ...s, loading: true, message: null }))
    router.post(route("kiosk.service-requests.store"), requestForm, {
      preserveScroll: true,
      onSuccess: (p) => {
        const data = (p.props as typeof p.props & { kiosk_service_request?: KioskServiceRequestFlash | null })
          .kiosk_service_request
        if (data?.ok) {
          applyKioskRequestFlash(data)
        } else {
          setRequestState((s) => ({ ...s, loading: false, message: "Unexpected response from server." }))
        }
      },
      onError: (errors) => {
        setRequestState((s) => ({
          ...s,
          loading: false,
          message: formatValidationErrors(errors as Record<string, string | string[] | undefined>),
        }))
      },
    })
  }

  const submitCorrectedLink = () => {
    if (!requestState.requestId || !requestState.editToken) return
    setRequestState((s) => ({ ...s, loading: true, message: null }))
    router.patch(
      route("kiosk.service-requests.update-link", requestState.requestId),
      {
        edit_token: requestState.editToken,
        url: correctedUrl,
      },
      {
        preserveScroll: true,
        onSuccess: (p) => {
          const data = (p.props as typeof p.props & { kiosk_service_request?: KioskServiceRequestFlash | null })
            .kiosk_service_request
          if (data?.ok) {
            const status = (data.status ?? "").toLowerCase()
            setRequestState((s) => ({
              ...s,
              loading: false,
              status: status === "approved" || status === "pending" || status === "rejected" ? (status as "approved" | "pending" | "rejected") : s.status,
              reason: data.reason ?? s.reason,
              suggestedUrl: data.suggested_url ?? s.suggestedUrl,
              message:
                status === "approved"
                  ? "Approved and added to kiosk providers."
                  : status === "pending"
                    ? "Still pending. Please refine the URL."
                    : "Rejected by validation.",
            }))
            setCorrectedUrl(data.suggested_url ?? "")
          } else {
            setRequestState((s) => ({ ...s, loading: false, message: "Unexpected response from server." }))
          }
        },
        onError: (errors) => {
          setRequestState((s) => ({
            ...s,
            loading: false,
            message: formatValidationErrors(errors as Record<string, string | string[] | undefined>),
          }))
        },
      }
    )
  }

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Kiosk Services"} description={seo?.description} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Hero — compact but readable */}
        <section className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-blue-600 py-8 sm:py-10">
          <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href={route("kiosk.index")}
              className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              All services
            </Link>
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center justify-center mb-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                  <Monitor className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1.5">
                {hero?.title ?? "Browse services"}
              </h1>
              <p className="text-sm sm:text-base text-white/90 max-w-2xl">
                {hero?.subtitle ?? "Filter by state, city, category, and subcategory."}
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {supporterNeedsLocation && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-amber-950 dark:text-amber-100">
                  <span className="font-semibold">Add city and state in your supporter profile</span> so this page can open
                  with resources for your area. Open your profile and complete the location fields.
                </p>
                <Link
                  href="/profile"
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/60"
                >
                  Open profile
                </Link>
              </div>
            </div>
          )}

          {!supporterNeedsLocation && !filters.all_locations && (filters.state || filters.city) ? (
            <div className="mb-6 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-4 dark:border-purple-800/60 dark:from-purple-950/40 dark:to-blue-950/40">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Location filter</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                      Showing providers for{" "}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {[filters.city, filters.state].filter(Boolean).join(", ")}
                      </span>
                      {supporterLocation &&
                      supporterLocation.state === filters.state &&
                      supporterLocation.city === filters.city ? (
                        <span className="text-muted-foreground"> (matches your supporter profile)</span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link
                    href={hrefWithAllLocations()}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    Show all locations
                  </Link>
                  {supporterLocation ? (
                    <Link
                      href="/profile"
                      className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
                    >
                      Open profile
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {filters.all_locations && supporterLocation ? (
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/80">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  You are viewing <span className="font-medium text-foreground">all locations</span>. Your profile location is{" "}
                  <span className="font-medium text-foreground">{supporterLocation.label}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => postGeo({ use_profile: true })}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
                >
                  Use my profile location
                </button>
              </div>
            </div>
          ) : null}

          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  router.visit(route("login"))
                  return
                }
                setShowRequestForm(true)
                setTimeout(() => {
                  requestSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }, 50)
              }}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm font-medium"
            >
              <Send className="h-4 w-4" />
              {isLoggedIn ? "Request service" : "Login to request"}
            </button>
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 mb-6 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-4">Filters</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="filter-state" className="text-muted-foreground text-xs">
                  State
                </Label>
                <select
                  id="filter-state"
                  className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={filters.state ?? ""}
                  onChange={(e) => handleFilterChange("state", e.target.value)}
                >
                  <option value="">All states</option>
                  {filterOptions.states.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="filter-city" className="text-muted-foreground text-xs">
                  City
                </Label>
                <select
                  id="filter-city"
                  className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={filters.city ?? ""}
                  onChange={(e) => handleFilterChange("city", e.target.value)}
                >
                  <option value="">All cities</option>
                  {filterOptions.cities.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="filter-category" className="text-muted-foreground text-xs">
                  Category
                </Label>
                <select
                  id="filter-category"
                  className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={filters.category ?? ""}
                  onChange={(e) => handleFilterChange("category", e.target.value)}
                >
                  <option value="">All categories</option>
                  {filterOptions.categories.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="filter-subcategory" className="text-muted-foreground text-xs">
                  Subcategory
                </Label>
                <select
                  id="filter-subcategory"
                  className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={filters.subcategory ?? ""}
                  onChange={(e) => handleFilterChange("subcategory", e.target.value)}
                >
                  <option value="">All subcategories</option>
                  {filterOptions.subcategories.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Kiosk providers only (`kiosk_providers`: AI ingest + approved requests) */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-foreground">
                {providers.total}{" "}
                {filters.category
                  ? (filterOptions.categories.find((c) => c.value === filters.category)?.label ?? "providers")
                  : providers.total === 1
                    ? "provider"
                    : "providers"}
                {providers.data.length > 0 && providers.from != null && providers.to != null && providers.last_page > 1 && (
                  <span className="text-muted-foreground font-normal ml-1">
                    (showing {providers.from}–{providers.to})
                  </span>
                )}
              </h2>
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search providers..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            {providers.data.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-muted-foreground">
                <p>No providers match your filters.</p>
                <p className="text-sm mt-2">
                  Data comes from AI ingest for your profile location or approved requests. Update your profile or choose
                  &quot;all locations&quot; to browse globally.
                </p>
                <Link
                  href={`${route("kiosk.services")}?all_locations=1`}
                  className="mt-2 inline-block text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Show all locations
                </Link>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {providers.data.map((p, index) => {
                  const style = categoryIconMap[p.category_slug] ?? {
                    icon: ExternalLink,
                    iconColor: "text-gray-600 dark:text-gray-400",
                    iconBg: "bg-gray-100 dark:bg-gray-700/50",
                  }
                  const Icon = style.icon
                  const catLabel =
                    filterOptions.categories.find((c) => c.value === p.category_slug)?.label ?? p.category_slug
                  const meta = [p.subcategory_slug, catLabel].filter(Boolean).join(" · ")
                  const cardVariants = {
                    hidden: { opacity: 0, y: 16 },
                    visible: (i: number) => ({
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.4, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] as const },
                    }),
                  }
                  return (
                    <motion.div
                      key={p.id}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      custom={index}
                      className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-white dark:bg-gray-800 p-4 shadow-sm flex flex-col gap-3"
                    >
                      <div className="flex gap-3 min-w-0">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${style.iconBg}`}>
                          <Icon className={`h-5 w-5 ${style.iconColor}`} aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-sm line-clamp-2">{p.name}</p>
                          {meta ? <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{meta}</p> : null}
                          {p.account_link_supported ? (
                            <span className="mt-1 inline-block rounded-md bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                              Account link supported
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {p.payment_url ? (
                          <a
                            href={p.payment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100 px-2 py-1 text-xs font-medium hover:opacity-90"
                          >
                            <CreditCard className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Pay
                          </a>
                        ) : null}
                        {p.login_url ? (
                          <a
                            href={p.login_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-slate-200 text-slate-900 dark:bg-slate-600 dark:text-slate-100 px-2 py-1 text-xs font-medium hover:opacity-90"
                          >
                            <LogIn className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Sign in
                          </a>
                        ) : null}
                        {p.website ? (
                          <a
                            href={p.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Website
                          </a>
                        ) : null}
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {providers.last_page > 1 && (
                <nav className="mt-6 flex flex-wrap items-center justify-between gap-4" aria-label="Pagination">
                  <p className="text-sm text-muted-foreground">
                    Page {providers.current_page} of {providers.last_page}
                  </p>
                  <div className="flex items-center gap-1">
                    {providers.prev_page_url ? (
                      <Link
                        href={providers.prev_page_url}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed">
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 mx-1">
                      {providers.links.slice(1, -1).map((link) =>
                        link.url ? (
                          <Link
                            key={link.label}
                            href={link.url}
                            className={`min-w-[2.25rem] rounded-lg px-2.5 py-2 text-center text-sm font-medium transition-colors ${
                              link.active
                                ? "bg-purple-600 text-white"
                                : "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-foreground hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                          >
                            {link.label}
                          </Link>
                        ) : (
                          <span key={link.label} className="min-w-[2.25rem] px-2.5 py-2 text-sm text-muted-foreground">
                            {link.label}
                          </span>
                        )
                      )}
                    </div>
                    {providers.next_page_url ? (
                      <Link
                        href={providers.next_page_url}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed">
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </nav>
              )}
              </>
            )}
          </div>

          {showRequestForm && (
          <div ref={requestSectionRef} className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Can&apos;t find your service?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Submit a service request. We use AI to validate the details and link before publishing.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kiosk-request-display-name" className="text-xs text-muted-foreground">
                  Service name *
                </Label>
                <input
                  id="kiosk-request-display-name"
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  placeholder="e.g. City water utility"
                  value={requestForm.display_name}
                  onChange={(e) => setRequestForm((p) => ({ ...p, display_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kiosk-request-category" className="text-xs text-muted-foreground">
                  Category *
                </Label>
                <select
                  id="kiosk-request-category"
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  value={requestForm.category_slug}
                  onChange={(e) => loadRequestFormSubcategories(e.target.value)}
                  disabled={loadingRequestSubcategories}
                  aria-label="Category"
                >
                  <option value="">Select category</option>
                  {filterOptions.categories.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kiosk-request-subcategory" className="text-xs text-muted-foreground">
                  Subcategory
                  {loadingRequestSubcategories ? (
                    <span className="ml-2 font-normal text-muted-foreground">(loading…)</span>
                  ) : null}
                </Label>
                <select
                  id="kiosk-request-subcategory"
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm disabled:opacity-60"
                  value={requestForm.subcategory}
                  onChange={(e) => setRequestForm((p) => ({ ...p, subcategory: e.target.value }))}
                  disabled={!requestForm.category_slug || loadingRequestSubcategories}
                  aria-label="Subcategory"
                  aria-busy={loadingRequestSubcategories}
                >
                  <option value="">
                    {loadingRequestSubcategories ? "Loading subcategories…" : "General (optional)"}
                  </option>
                  {!loadingRequestSubcategories &&
                    requestSubcategoryOptions.map((o) => (
                      <option key={o.id} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                </select>
              </div>
              <input
                className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                placeholder="URL"
                value={requestForm.url}
                onChange={(e) => setRequestForm((p) => ({ ...p, url: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                placeholder="State"
                value={requestForm.state}
                onChange={(e) => setRequestForm((p) => ({ ...p, state: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                placeholder="City"
                value={requestForm.city}
                onChange={(e) => setRequestForm((p) => ({ ...p, city: e.target.value }))}
              />
              <input
                className="sm:col-span-2 lg:col-span-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                placeholder="Extra details (why this service is needed)"
                value={requestForm.details}
                onChange={(e) => setRequestForm((p) => ({ ...p, details: e.target.value }))}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={submitServiceRequest}
                disabled={requestState.loading || !requestForm.display_name || !requestForm.category_slug}
                className="inline-flex items-center gap-2 rounded-md bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium"
              >
                <Send className="h-4 w-4" />
                {requestState.loading ? "Submitting..." : "Submit request"}
              </button>
              {requestState.message && (
                <span className="text-sm text-muted-foreground">{requestState.message}</span>
              )}
            </div>

            {(requestState.reason || requestState.status) && (
              <div className="mt-3 text-sm">
                <span className="font-medium text-foreground">Status: </span>
                <span className="capitalize">{requestState.status}</span>
                {requestState.reason ? <span className="text-muted-foreground"> — {requestState.reason}</span> : null}
              </div>
            )}

            {requestState.status === "pending" && requestState.requestId && requestState.editToken && (
              <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm font-medium text-foreground mb-2">Add corrected link</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    placeholder="https://..."
                    value={correctedUrl}
                    onChange={(e) => setCorrectedUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={submitCorrectedLink}
                    disabled={requestState.loading || !correctedUrl.trim()}
                    className="rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium"
                  >
                    {requestState.loading ? "Validating..." : "Validate link"}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}

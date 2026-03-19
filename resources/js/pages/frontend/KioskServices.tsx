"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Link, router } from "@inertiajs/react"
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

interface ServiceItem {
  id: number
  display_name: string
  subcategory: string | null
  category_slug: string
  category_title: string
  url: string | null
  launch_type: string | null
}

interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

interface PaginatedServices {
  data: ServiceItem[]
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

interface KioskServicesProps {
  seo?: { title?: string; description?: string }
  hero?: { title: string; subtitle: string }
  services: PaginatedServices
  filters: { state: string | null; city: string | null; category: string | null; subcategory: string | null; search: string | null }
  filterOptions: {
    states: FilterOption[]
    cities: FilterOption[]
    categories: FilterOption[]
    subcategories: FilterOption[]
  }
}

export default function KioskServices({
  seo,
  hero,
  services,
  filters,
  filterOptions,
}: KioskServicesProps) {
  const buildUrl = useCallback(
    (f: { state?: string | null; city?: string | null; category?: string | null; subcategory?: string | null; search?: string | null; page?: number | null }) => {
      const q = new URLSearchParams()
      const state = f.state !== undefined ? f.state : filters.state
      const city = f.city !== undefined ? f.city : filters.city
      const category = f.category !== undefined ? f.category : filters.category
      const subcategory = f.subcategory !== undefined ? f.subcategory : filters.subcategory
      const search = f.search !== undefined ? f.search : filters.search
      const page = f.page !== undefined ? f.page : null
      if (state) q.set("state", state)
      if (city) q.set("city", city)
      if (category) q.set("category", category)
      if (subcategory) q.set("subcategory", subcategory)
      if (search) q.set("search", search)
      if (page != null && page > 1) q.set("page", String(page))
      const query = q.toString()
      return route("kiosk.services") + (query ? `?${query}` : "")
    },
    [filters]
  )

  const [searchInput, setSearchInput] = useState(filters.search ?? "")
  const [requestForm, setRequestForm] = useState({
    requester_name: "",
    requester_email: "",
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

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = setTimeout(() => {
        router.get(buildUrl({ search: value.trim() || null, page: 1 }))
      }, 350)
    },
    [buildUrl]
  )

  const handleFilterChange = useCallback(
    (key: "state" | "city" | "category" | "subcategory", value: string) => {
      const next = { ...filters, [key]: value || null }
      if (key === "state") next.city = null
      if (key === "category") next.subcategory = null
      router.get(buildUrl({ ...next, page: 1 }))
    },
    [filters, buildUrl]
  )

  const submitServiceRequest = async () => {
    setRequestState((s) => ({ ...s, loading: true, message: null }))
    try {
      const res = await fetch(route("kiosk.service-requests.store"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRF-TOKEN": (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? "",
        },
        body: JSON.stringify(requestForm),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message ?? "Request failed")
      }
      setRequestState({
        loading: false,
        status: data.status ?? null,
        reason: data.reason ?? null,
        requestId: data.request_id ?? null,
        editToken: data.edit_token ?? null,
        suggestedUrl: data.suggested_url ?? null,
        message:
          data.status === "approved"
            ? "Approved and added to kiosk services."
            : data.status === "pending"
              ? "Pending: please provide a better matching link."
              : "Rejected by validation.",
      })
      setCorrectedUrl(data.suggested_url ?? "")
      if (data.status === "approved") {
        router.reload({ only: ["services", "filterOptions"] })
      }
    } catch (e) {
      setRequestState((s) => ({
        ...s,
        loading: false,
        message: e instanceof Error ? e.message : "Unable to submit request",
      }))
    }
  }

  const submitCorrectedLink = async () => {
    if (!requestState.requestId || !requestState.editToken) return
    setRequestState((s) => ({ ...s, loading: true, message: null }))
    try {
      const res = await fetch(route("kiosk.service-requests.update-link", requestState.requestId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRF-TOKEN": (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content ?? "",
        },
        body: JSON.stringify({
          edit_token: requestState.editToken,
          url: correctedUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message ?? "Update failed")
      }
      setRequestState((s) => ({
        ...s,
        loading: false,
        status: data.status ?? s.status,
        reason: data.reason ?? s.reason,
        suggestedUrl: data.suggested_url ?? s.suggestedUrl,
        message:
          data.status === "approved"
            ? "Approved and added to kiosk services."
            : data.status === "pending"
              ? "Still pending. Please refine the URL."
              : "Rejected by validation.",
      }))
      if (data.status === "approved") {
        router.reload({ only: ["services", "filterOptions"] })
      }
    } catch (e) {
      setRequestState((s) => ({
        ...s,
        loading: false,
        message: e instanceof Error ? e.message : "Unable to update link",
      }))
    }
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
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setShowRequestForm(true)
                setTimeout(() => {
                  requestSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }, 50)
              }}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm font-medium"
            >
              <Send className="h-4 w-4" />
              Request service
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

          {/* Results — services count + search on same row, then cards */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-foreground">
                {services.total} {filters.category ? (filterOptions.categories.find((c) => c.value === filters.category)?.label ?? "services") : (services.total === 1 ? "service" : "services")}
                {services.data.length > 0 && services.from != null && services.to != null && services.last_page > 1 && (
                  <span className="text-muted-foreground font-normal ml-1">
                    (showing {services.from}–{services.to})
                  </span>
                )}
              </h2>
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search services..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            {services.data.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-muted-foreground">
                <p>No services match your filters.</p>
                <Link
                  href={route("kiosk.services")}
                  className="mt-2 inline-block text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Clear filters
                </Link>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {services.data.map((s, index) => {
                  const meta = [s.subcategory, s.category_title].filter(Boolean).join(" · ")
                  const style = categoryIconMap[s.category_slug] ?? {
                    icon: ExternalLink,
                    iconColor: "text-gray-600 dark:text-gray-400",
                    iconBg: "bg-gray-100 dark:bg-gray-700/50",
                  }
                  const Icon = style.icon
                  const cardVariants = {
                    hidden: { opacity: 0, y: 16 },
                    visible: (i: number) => ({
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.4, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] },
                    }),
                  }
                  if (s.url) {
                    return (
                      <motion.a
                        key={s.id}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        custom={index}
                        whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
                        whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                        className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-300 dark:hover:border-purple-600 flex gap-3 cursor-pointer overflow-hidden transition-shadow duration-200"
                      >
                        <motion.div
                          className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${style.iconBg}`}
                          whileHover={{ scale: 1.08 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <Icon className={`h-5 w-5 ${style.iconColor}`} aria-hidden />
                        </motion.div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-sm line-clamp-2 transition-colors duration-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                            {s.display_name}
                          </p>
                          {meta && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{meta}</p>
                          )}
                          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Open
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        </div>
                      </motion.a>
                    )
                  }
                  return (
                    <motion.div
                      key={s.id}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      custom={index}
                      whileHover={{ y: -2, transition: { duration: 0.2 } }}
                      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md flex gap-3 transition-shadow duration-200"
                    >
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${style.iconBg}`}>
                        <Icon className={`h-5 w-5 ${style.iconColor}`} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm line-clamp-2">{s.display_name}</p>
                        {meta && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{meta}</p>
                        )}
                        <span className="mt-2 inline-block text-xs text-muted-foreground">
                          {s.launch_type ?? "Internal"}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Pagination */}
              {services.last_page > 1 && (
                <nav className="mt-6 flex flex-wrap items-center justify-between gap-4" aria-label="Pagination">
                  <p className="text-sm text-muted-foreground">
                    Page {services.current_page} of {services.last_page}
                  </p>
                  <div className="flex items-center gap-1">
                    {services.prev_page_url ? (
                      <Link
                        href={services.prev_page_url}
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
                      {services.links.slice(1, -1).map((link) =>
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
                    {services.next_page_url ? (
                      <Link
                        href={services.next_page_url}
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
              <input
                className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                placeholder="Your name (optional)"
                value={requestForm.requester_name}
                onChange={(e) => setRequestForm((p) => ({ ...p, requester_name: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                placeholder="Your email (optional)"
                value={requestForm.requester_email}
                onChange={(e) => setRequestForm((p) => ({ ...p, requester_email: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                placeholder="Service name *"
                value={requestForm.display_name}
                onChange={(e) => setRequestForm((p) => ({ ...p, display_name: e.target.value }))}
              />
              <select
                className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={requestForm.category_slug}
                onChange={(e) => setRequestForm((p) => ({ ...p, category_slug: e.target.value }))}
              >
                <option value="">Select category *</option>
                {filterOptions.categories.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <input
                className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                placeholder="Subcategory"
                value={requestForm.subcategory}
                onChange={(e) => setRequestForm((p) => ({ ...p, subcategory: e.target.value }))}
              />
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

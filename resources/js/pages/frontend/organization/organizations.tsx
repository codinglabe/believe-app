"use client"

import { useEffect, useState } from "react"
import { Search, ChevronLeft, ChevronRight, Heart, MapPin, BadgeCheck } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { motion } from "framer-motion"
import { router, usePage, Link } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import SearchSection from "@/components/frontend/SearchSection"
import { CauseBadge } from "@/components/frontend/cause-badge"
import SignInPopup from "@/components/frontend/SignInPopup"
import { PageHead } from "@/components/frontend/PageHead"
import toast from "react-hot-toast"

type PrimaryActionCategory = {
  id: number
  name: string
  slug: string
}

interface Organization {
  id: number
  ein: string
  name: string
  city: string
  state: string
  zip: string
  ntee_code?: string
  ntee_code_raw?: string
  ntee_category?: string
  ntee_category_description?: string
  classification?: string
  created_at: string
  is_registered?: boolean
  is_favorited?: boolean
  verified?: boolean
  logo_url?: string | null
  primary_action_categories?: PrimaryActionCategory[]
}

interface PageProps {
  organizations: {
    data: Organization[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number
    to: number
  }
  filters: {
    search?: string
    category?: string
    category_description?: string
    state?: string
    city?: string
    zip?: string
    cause_id?: string | null
    sort?: string
    per_page?: string
  }
  filterOptions: {
    categories: string[]
    states: string[]
    cities: string[]
    categoryDescriptions: string[]
  }
  myCauses?: PrimaryActionCategory[]
  hasActiveFilters: boolean
  auth?: { user?: { id: number; name: string; email: string; organization?: { ein: string } } | null }
}

const sortOptions = [
  { value: "relevance", label: "Most Relevant" },
  { value: "name", label: "Name (A-Z)" },
  { value: "state", label: "State" },
  { value: "city", label: "City" },
]

const perPageOptions = [6, 12, 24, 48]

declare global {
  function route(name: string, params?: number | string): string
}

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase()
}

/** Public-disk profile/org images — mirrors backend `publicStorageHref` and user-show.tsx conventions */
function avatarPublicImgSrc(raw: string | null | undefined): string | undefined {
  if (raw === null || raw === undefined) return undefined
  const s = String(raw).trim()
  if (s === "") return undefined
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("//")) return s
  if (s.startsWith("/storage/")) return s
  let path = s.replace(/^\/+/, "")
  if (path.startsWith("storage/")) path = path.slice("storage/".length)
  return `/storage/${path}`
}

/** Only Primary Action Categories (org profile causes) — no NTEE/classification fallbacks. */
function getDisplayCauses(org: Organization): PrimaryActionCategory[] {
  const fromPac = org.primary_action_categories ?? []
  const seen = new Set<number>()
  return fromPac.filter((c) => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })
}

/** Same strings the old Causes badges used (deduped description / category / classification). */
function getLegacyListingBadges(org: Organization): string[] {
  const raw = [org.ntee_category_description, org.ntee_category, org.classification]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim())

  const seen = new Set<string>()
  const out: string[] = []
  for (const s of raw) {
    const k = s.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(s)
  }
  return out
}

/** Category column helper (same fallbacks as before Causes refactor). */
function getLegacyCategoryLine(org: Organization): string | null {
  const t = org.ntee_category_description?.trim() || org.ntee_code?.trim()
  return t || null
}

/** Code column helper (same as before: raw NTEE, else classification). */
function getLegacyCodeLine(org: Organization): string | null {
  const t = org.ntee_code_raw?.trim() || org.classification?.trim()
  return t || null
}

function OrgNameMeta({ org }: { org: Organization }) {
  const causeBits = getLegacyListingBadges(org)
  const causesJoined = causeBits.length > 0 ? causeBits.join(" · ") : null
  /** When there is no spreadsheet “cause” triple, reuse the legacy Category fallback. */
  const categoryFallback = !causesJoined ? getLegacyCategoryLine(org) : null
  const codeLine = getLegacyCodeLine(org)
  const showCodeLine =
    Boolean(codeLine) &&
    !causeBits.some((b) => b.toLowerCase() === codeLine!.toLowerCase())

  const hasMeta = Boolean(causesJoined || categoryFallback || (showCodeLine && codeLine))

  return (
    <div className="min-w-0">
      <p className="break-words font-semibold leading-snug text-slate-900 dark:text-white">{org.name || "—"}</p>
      {org.is_registered && (
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-sky-700 dark:text-sky-300">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
          Verified Organization
        </p>
      )}
      {hasMeta ? (
        <div className={`space-y-1 ${org.is_registered ? "mt-1.5" : "mt-1"}`}>
          {causesJoined ? (
            <p className="text-[11px] leading-snug text-slate-600 line-clamp-3 dark:text-slate-400">{causesJoined}</p>
          ) : categoryFallback ? (
            <p className="text-[11px] leading-snug text-slate-600 line-clamp-2 dark:text-slate-400">{categoryFallback}</p>
          ) : null}
          {showCodeLine && codeLine ? (
            <p className="text-[11px] font-mono leading-snug text-slate-500 dark:text-slate-500">{codeLine}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default function OrganizationsPage() {
  const { organizations, filters, filterOptions, hasActiveFilters, auth, myCauses = [] } = usePage<PageProps>().props

  const initialSort =
    filters.sort && sortOptions.some((o) => o.value === filters.sort) ? filters.sort : "relevance"
  const [sortBy, setSortBy] = useState(initialSort)
  const [resultsPerPage, setResultsPerPage] = useState(Number(filters.per_page) || 6)

  useEffect(() => {
    const nextSort =
      filters.sort && sortOptions.some((o) => o.value === filters.sort) ? filters.sort : "relevance"
    setSortBy(nextSort)
    setResultsPerPage(Number(filters.per_page) || 6)
  }, [filters.sort, filters.per_page])
  const [isLoading, setIsLoading] = useState(false)
  const [showSignInPopup, setShowSignInPopup] = useState(false)
  const [favoritingId, setFavoritingId] = useState<number | null>(null)

  const isAuthenticated = !!auth?.user

  const handleSearch = (params: Record<string, string>) => {
    const hasSearchQuery = params.search?.trim()
    const hasFilters =
      (params.category && params.category !== "All Categories") ||
      (params.category_description && params.category_description !== "All Descriptions") ||
      (params.state && params.state !== "All States") ||
      (params.city && params.city !== "All Cities") ||
      Boolean(params.zip?.trim()) ||
      Boolean(params.cause_id && params.cause_id !== "0")

    if (!isAuthenticated && (hasSearchQuery || hasFilters)) {
      setShowSignInPopup(true)
      return
    }

    setIsLoading(true)
    const searchParams = new URLSearchParams()
    const allParams = { ...params, sort: sortBy, per_page: resultsPerPage.toString() }
    Object.entries(allParams).forEach(([key, value]) => {
      if (value && value !== "All Categories" && value !== "All States" && value !== "All Cities" && value !== "All Descriptions")
        searchParams.set(key, value)
    })
    const url = searchParams.toString() ? `/organizations?${searchParams.toString()}` : "/organizations"
    router.visit(url, { preserveState: true, preserveScroll: true, onFinish: () => setIsLoading(false) })
  }

  const clearFilters = () => {
    setSortBy("relevance")
    setResultsPerPage(6)
    router.visit("/organizations", { preserveState: true, preserveScroll: true })
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set("page", page.toString())
    router.visit(`/organizations?${params.toString()}`, { preserveState: true, preserveScroll: false })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleResultsPerPageChange = (value: string) => {
    const num = Math.min(50, Math.max(1, Number(value) || 6))
    setResultsPerPage(num)
    const params = new URLSearchParams(window.location.search)
    params.set("per_page", num.toString())
    params.delete("page")
    router.visit(`/organizations?${params.toString()}`, { preserveState: true, preserveScroll: true })
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
    const params = new URLSearchParams(window.location.search)
    params.set("sort", value)
    params.delete("page")
    router.visit(`/organizations?${params.toString()}`, { preserveState: true, preserveScroll: true })
  }

  const handleToggleFavorite = (org: Organization, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (favoritingId !== null) return
    if (!isAuthenticated) {
      setShowSignInPopup(true)
      return
    }
    setFavoritingId(org.id)
    router.post(route("organizations.toggle-favorite", org.id), { toggle_favorite_context: "excel" }, {
      preserveScroll: true,
      preserveState: false,
      onSuccess: page => {
        const flash = (page.props as { flash?: { error?: string } }).flash
        if (flash?.error) {
          toast.error(flash.error)
        }
        setFavoritingId(null)
      },
      onError: () => {
        toast.error("Following is for supporter accounts only.")
        setFavoritingId(null)
      },
      onFinish: () => setFavoritingId(null),
    })
  }

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = []
    const cur = organizations.current_page
    const last = organizations.last_page
    const show = 5
    let start = Math.max(1, cur - Math.floor(show / 2))
    let end = Math.min(last, start + show - 1)
    if (end - start + 1 < show) start = Math.max(1, end - show + 1)
    if (start > 1) {
      pages.push(1)
      if (start > 2) pages.push("ellipsis")
    }
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < last) {
      if (end < last - 1) pages.push("ellipsis")
      pages.push(last)
    }
    return pages
  }

  return (
    <FrontendLayout>
      <PageHead
        title="Organizations"
        description="Search verified non-profit organizations. Filter by cause, location, and more."
      />
      <SignInPopup isOpen={showSignInPopup} onClose={() => setShowSignInPopup(false)} onSignIn={() => setShowSignInPopup(false)} />

      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:border-white/5 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.08),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(147,51,234,0.06),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(147,51,234,0.16),_transparent_55%)]" />
          <div className="relative container mx-auto px-4 py-10">
            <motion.header
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8 max-w-3xl"
            >
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                Find Causes. Support What Matters.
              </h1>
              <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
                Search verified non-profits from our directory—by mission, location, and the causes you care about most.
              </p>
            </motion.header>

            <SearchSection
              variant="directory"
              showCategoryFilter={false}
              showQuickFilters={false}
              filters={filters}
              filterOptions={filterOptions}
              hasActiveFilters={hasActiveFilters}
              onSearch={handleSearch}
              onClearFilters={clearFilters}
              isLoading={isLoading}
              popularCauses={myCauses}
            />
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Results bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4"
          >
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Showing{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {organizations.from ?? 0}-{organizations.to ?? 0}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{organizations.total.toLocaleString()}</span> organizations
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">Results per page</label>
                <Select
                  value={String(resultsPerPage)}
                  onValueChange={handleResultsPerPageChange}
                >
                  <SelectTrigger className="h-9 w-[72px] border-slate-200 bg-white text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/80 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white">
                    {perPageOptions.map((n) => (
                      <SelectItem key={n} value={String(n)} className="focus:bg-slate-100 dark:focus:bg-slate-800">
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">Sort by</label>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="h-9 w-[200px] border-slate-200 bg-white text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/80 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white">
                    {sortOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="focus:bg-slate-100 dark:focus:bg-slate-800">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Table (desktop) / Card list (mobile) */}
          {organizations.data.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/50 backdrop-blur-sm lg:block dark:border-white/10 dark:bg-slate-900/40 dark:shadow-black/40">
                <table className="w-full max-w-full table-auto border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80">
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        Organization
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        Location
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        Cause(s)
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        Status
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        View
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        Follow
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.data.map((org) => {
                      const causes = getDisplayCauses(org)
                      const avatarSrc = avatarPublicImgSrc(org.logo_url ?? null)
                      return (
                        <tr
                          key={org.id}
                          className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-white/5 dark:hover:bg-white/[0.03]"
                        >
                          <td className="min-w-0 px-4 py-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <Avatar className="h-12 w-12 border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-800">
                                {avatarSrc ? (
                                  <AvatarImage
                                    src={avatarSrc}
                                    alt={org.name || ""}
                                    className="object-cover"
                                  />
                                ) : null}
                                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-sm font-semibold text-white">
                                  {initialsFromName(org.name || "?")}
                                </AvatarFallback>
                              </Avatar>
                              <OrgNameMeta org={org} />
                            </div>
                          </td>
                          <td className="min-w-0 px-4 py-4 text-slate-700 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                              {[org.city, org.state].filter(Boolean).join(", ") || "—"}
                            </span>
                          </td>
                          <td className="min-w-0 align-top px-4 py-4">
                            <div className="flex min-w-0 flex-wrap content-start gap-2 gap-y-2">
                              {causes.length > 0 ? (
                                causes.map((c) => <CauseBadge key={`${org.id}-${c.id}-${c.slug}`} c={c} />)
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Listed
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Link
                              href={`/organizations/${org.id}`}
                              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                            >
                              View
                            </Link>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={`h-8 border-blue-600/50 text-blue-700 hover:bg-blue-50 dark:border-blue-500/70 dark:text-blue-200 dark:hover:bg-blue-950/40 ${org.is_favorited ? "bg-blue-50 dark:bg-blue-950/50" : "bg-transparent"}`}
                              onClick={(e) => handleToggleFavorite(org, e)}
                              disabled={favoritingId === org.id}
                              aria-pressed={org.is_favorited}
                            >
                              <Heart
                                className={`h-4 w-4 mr-1 ${org.is_favorited ? "fill-current" : ""}`}
                              />
                              {org.is_favorited ? "Following" : "Follow"}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="lg:hidden space-y-3">
                {organizations.data.map((org) => {
                  const causes = getDisplayCauses(org)
                  const avatarSrc = avatarPublicImgSrc(org.logo_url ?? null)
                  return (
                    <motion.div
                      key={org.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/60 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/45 dark:shadow-black/30"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 shrink-0 border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-800">
                          {avatarSrc ? (
                            <AvatarImage
                              src={avatarSrc}
                              alt={org.name || ""}
                              className="object-cover"
                            />
                          ) : null}
                          <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-xs font-semibold text-white">
                            {initialsFromName(org.name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <OrgNameMeta org={org} />
                          <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                            <MapPin className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                            {[org.city, org.state].filter(Boolean).join(", ") || "—"}
                          </p>
                          <div className="mt-3 flex min-w-0 flex-wrap content-start gap-2 gap-y-2">
                            {causes.length > 0 ? (
                              causes.map((c) => <CauseBadge key={`m-${org.id}-${c.id}-${c.slug}`} c={c} />)
                            ) : (
                              <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                            )}
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Listed
                            </span>
                            <div className="flex gap-2">
                              <Link
                                href={`/organizations/${org.id}`}
                                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                              >
                                View
                              </Link>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={`border-blue-600/50 text-blue-700 dark:border-blue-500/70 dark:text-blue-200 ${org.is_favorited ? "bg-blue-50 dark:bg-blue-950/50" : "bg-transparent"}`}
                                onClick={(e) => handleToggleFavorite(org, e)}
                                disabled={favoritingId === org.id}
                                aria-pressed={org.is_favorited}
                              >
                                <Heart className={`h-4 w-4 mr-1 ${org.is_favorited ? "fill-current" : ""}`} />
                                {org.is_favorited ? "Following" : "Follow"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Pagination */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
              >
                <div className="flex flex-wrap items-center gap-3 order-2 sm:order-1">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Results per page</span>
                  <Select value={String(resultsPerPage)} onValueChange={handleResultsPerPageChange}>
                    <SelectTrigger className="h-9 w-[72px] border-slate-200 bg-white text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/80 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 dark:text-white">
                      {perPageOptions.map((n) => (
                        <SelectItem key={n} value={String(n)} className="focus:bg-slate-100 dark:focus:bg-slate-800">
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={() => handlePageChange(organizations.current_page - 1)}
                    disabled={organizations.current_page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-0.5" />
                    Previous
                  </Button>
                  {getPageNumbers().map((page, i) =>
                    page === "ellipsis" ? (
                      <span key={`e-${i}`} className="px-2 text-slate-400 dark:text-slate-500">
                        …
                      </span>
                    ) : (
                      <Button
                        key={page}
                        variant={organizations.current_page === page ? "default" : "outline"}
                        size="sm"
                        className={`h-9 min-w-9 ${
                          organizations.current_page === page
                            ? "border-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    )
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={() => handlePageChange(organizations.current_page + 1)}
                    disabled={organizations.current_page === organizations.last_page}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-0.5" />
                  </Button>
                </div>
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/40"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Search className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">No organizations found</h3>
              <p className="mx-auto mb-6 max-w-sm text-slate-600 dark:text-slate-400">
                Try adjusting your search or filters to discover organizations.
              </p>
              <Button
                onClick={clearFilters}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
              >
                Clear filters
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}

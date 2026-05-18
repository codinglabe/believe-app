"use client"

import React, { useState, useCallback, useMemo } from "react"
import toast from "react-hot-toast"
import { Link, router } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { usePage } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Search, MapPin, ChevronDown, Loader2, Gift, UserPlus, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { CauseBadge } from "@/components/frontend/cause-badge"

const SORT_OPTIONS = [
  { value: "best_match", label: "Best Match" },
  { value: "most_active", label: "Most Active" },
  { value: "new_supporters", label: "New Supporters" },
] as const

interface SupporterCause {
  id: number
  name: string
  slug?: string
}

interface Supporter {
  id: number
  name: string
  email?: string
  slug?: string
  image?: string | null
  is_following: boolean
  location?: string | null
  interests?: SupporterCause[]
  shared_organizations_count?: number
  reactions_count?: number
  comments_count?: number
  shares_count?: number
}

interface PaginatedSupporters {
  data: Supporter[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  next_page_url: string | null
  prev_page_url: string | null
}

interface PopularCause {
  id: number
  name: string
  slug?: string
}

interface Filters {
  same_causes: boolean
  causes: number[]
  location: string
  radius: string
  sort: string
}

interface PageProps {
  seo?: { title: string; description?: string }
  supporters: PaginatedSupporters
  searchQuery: string
  filters: Filters
  /** Top causes by supporter profile picks (`primary_action_category_user`), same order as DB */
  popularCauses: PopularCause[]
  auth?: { user?: { id: number; name?: string } }
}

function buildParams(
  q: string,
  filters: Filters
): Record<string, string | number | boolean | number[] | undefined> {
  const params: Record<string, string | number | boolean | number[] | undefined> = {}
  if (q.trim()) params.q = q.trim()
  if (filters.same_causes) params.same_causes = true
  if (filters.causes.length) params.causes = filters.causes
  if (filters.location?.trim()) params.location = filters.location.trim()
  if (filters.radius?.trim()) params.radius = filters.radius
  if (filters.sort && filters.sort !== "best_match") params.sort = filters.sort
  return params
}

export default function FindSupportersPage() {
  const {
    seo,
    supporters: initialSupporters,
    searchQuery: initialQuery,
    filters: initialFilters,
    popularCauses = [],
    auth,
  } = usePage<PageProps>().props

  const currentUser = auth?.user
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? "")
  const [supporters, setSupporters] = useState(initialSupporters)
  const [filters, setFilters] = useState<Filters>({
    same_causes: initialFilters?.same_causes ?? false,
    causes: Array.isArray(initialFilters?.causes) ? initialFilters.causes : [],
    location: initialFilters?.location ?? "",
    radius: initialFilters?.radius ?? "",
    sort: initialFilters?.sort ?? "best_match",
  })
  const [followingStates, setFollowingStates] = useState<Record<number, boolean>>(() => {
    const map: Record<number, boolean> = {}
    initialSupporters?.data?.forEach((s: Supporter) => {
      map[s.id] = s.is_following ?? false
    })
    return map
  })
  const [loadingFollow, setLoadingFollow] = useState<Record<number, boolean>>({})
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  const searchQueryRef = React.useRef(searchQuery)
  searchQueryRef.current = searchQuery
  const isInitialMountRef = React.useRef(true)
  React.useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return
    }
    const current = searchQueryRef.current.trim()
    if (current === (initialQuery || "")) return
    const timer = setTimeout(() => {
      router.get(route("find-supporters.index"), buildParams(searchQueryRef.current, filters), {
        preserveState: false,
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, filters, initialQuery])

  React.useEffect(() => {
    setSupporters(initialSupporters)
    setSearchQuery(initialQuery ?? "")
    setFilters({
      same_causes: initialFilters?.same_causes ?? false,
      causes: Array.isArray(initialFilters?.causes) ? initialFilters.causes : [],
      location: initialFilters?.location ?? "",
      radius: initialFilters?.radius ?? "",
      sort: initialFilters?.sort ?? "best_match",
    })
    const map: Record<number, boolean> = {}
    initialSupporters?.data?.forEach((s: Supporter) => {
      map[s.id] = s.is_following ?? false
    })
    setFollowingStates(map)
  }, [initialSupporters, initialQuery, initialFilters])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.get(route("find-supporters.index"), buildParams(searchQuery, filters), {
      preserveState: false,
    })
  }

  const setSort = useCallback(
    (sort: string) => {
      setSortDropdownOpen(false)
      const next = { ...filters, sort }
      setFilters(next)
      router.get(route("find-supporters.index"), buildParams(searchQuery, next), {
        preserveState: false,
      })
    },
    [filters, searchQuery]
  )

  const toggleCause = useCallback(
    (causeId: number) => {
      const next = filters.causes.includes(causeId)
        ? filters.causes.filter((id) => id !== causeId)
        : [...filters.causes, causeId]
      const nextFilters = { ...filters, causes: next }
      setFilters(nextFilters)
      router.get(route("find-supporters.index"), buildParams(searchQuery, nextFilters), {
        preserveState: false,
      })
    },
    [filters, searchQuery]
  )

  const handleFollow = (supporter: Supporter) => {
    if (!currentUser || supporter.id === currentUser.id) return
    setLoadingFollow((prev) => ({ ...prev, [supporter.id]: true }))
    const newState = !followingStates[supporter.id]
    setFollowingStates((prev) => ({ ...prev, [supporter.id]: newState }))
    setSupporters((prev) => ({
      ...prev,
      data: prev.data.map((s) => (s.id === supporter.id ? { ...s, is_following: newState } : s)),
    }))
    router.post(route("users.toggle-follow", supporter.id), {}, {
      preserveScroll: true,
      preserveState: false,
      onFinish: () => setLoadingFollow((prev) => ({ ...prev, [supporter.id]: false })),
      onError: () => {
        toast.error(
          "Following is for supporter accounts only. Please log in with your personal (supporter) account to follow people.",
        )
        setFollowingStates((prev) => ({ ...prev, [supporter.id]: !newState }))
        setSupporters((prev) => ({
          ...prev,
          data: prev.data.map((s) => (s.id === supporter.id ? { ...s, is_following: !newState } : s)),
        }))
      },
    })
  }

  const sortLabel = useMemo(
    () => SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? "Best Match",
    [filters.sort]
  )

  /** Cause(s) column — same CauseBadge (icon + pill) as org directory; +N when truncated */
  function CauseBadgesCell({ interests }: { interests: SupporterCause[] }) {
    const max = 3
    const visible = interests.slice(0, max)
    const rest = interests.length - max
    return (
      <div className="flex flex-wrap items-start gap-1.5">
        {visible.map((c) => (
          <CauseBadge key={c.id} c={c} />
        ))}
        {rest > 0 ? (
          <span className="mt-0.5 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-500/50 dark:bg-slate-800/80 dark:text-slate-300">
            +{rest}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Supporters"} description={seo?.description} />
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:border-white/5 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.06),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(147,51,234,0.05),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(147,51,234,0.08),_transparent_55%)]" />
          <div className="relative container mx-auto px-4 py-10">
            <header className="mb-8 max-w-3xl">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                Supporters
              </h1>
              <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
                Discover and connect with supporters who care about making a difference.
              </p>
            </header>

            <form onSubmit={handleSearch} className="relative mb-6">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                type="text"
                placeholder="Search supporters by name, email, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-500 focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-500/25 dark:border-white/10 dark:bg-slate-900/80 dark:text-white dark:placeholder:text-slate-500 dark:focus-visible:border-violet-500/50 dark:focus-visible:ring-violet-500/30"
              />
            </form>

            {/* Popular causes = most chosen by supporters (global), not “my profile” interests */}
            {popularCauses.length > 0 ? (
              <div className="mb-6 flex min-w-0 flex-wrap items-center gap-2">
                <span className="shrink-0 text-sm font-medium text-slate-600 dark:text-slate-400">
                  Popular among supporters:
                </span>
                {popularCauses.map((c) => (
                  <CauseBadge
                    key={c.id}
                    c={c}
                    onClick={() => toggleCause(c.id)}
                    selected={filters.causes.includes(c.id)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {supporters.total.toLocaleString()} supporter{supporters.total === 1 ? "" : "s"}
            </p>
            <div className="relative flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-500">Sort</span>
              <button
                type="button"
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:shadow-none dark:hover:bg-slate-800"
              >
                {sortLabel}
                <ChevronDown className={cn("h-4 w-4 transition-transform", sortDropdownOpen && "rotate-180")} />
              </button>
              {sortDropdownOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Close menu"
                    onClick={() => setSortDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-2 min-w-[200px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-slate-900 dark:shadow-xl">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSort(opt.value)}
                        className={cn(
                          "flex w-full px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                          filters.sort === opt.value &&
                            "bg-violet-100 font-medium text-violet-900 dark:bg-violet-600/20 dark:text-violet-200",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {supporters?.data?.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/40 dark:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-400">
                    <th className="px-4 py-4 pl-6">Supporter</th>
                    <th className="px-4 py-4">Location</th>
                    <th className="px-4 py-4">Cause(s)</th>
                    <th className="px-4 py-4 text-center">Gift</th>
                    <th className="px-4 py-4 pr-6 text-right">Follow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {supporters?.data?.map((supporter) => {
                    const interests = supporter.interests ?? []
                    const causeCount = interests.length
                    return (
                      <tr
                        key={supporter.id}
                        className="hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-4 pl-6 align-top">
                          <div className="flex items-start gap-3">
                            <Link
                              href={supporter.slug ? `/users/${supporter.slug}` : `/users/${supporter.id}`}
                              className="shrink-0"
                            >
                              <Avatar className="h-12 w-12 border border-slate-200 dark:border-white/10">
                                <AvatarImage src={supporter.image ?? undefined} />
                                <AvatarFallback className="bg-violet-600 text-sm text-white">
                                  {supporter.name?.charAt(0)?.toUpperCase() ?? "?"}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="min-w-0">
                              <Link
                                href={supporter.slug ? `/users/${supporter.slug}` : `/users/${supporter.id}`}
                                className="font-semibold text-slate-900 hover:text-violet-700 dark:text-white dark:hover:text-violet-300"
                              >
                                {supporter.name}
                              </Link>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-500">
                                Supporting {causeCount} cause{causeCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-700 dark:text-slate-300">
                          <span className="inline-flex items-start gap-1.5">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                            <span>{supporter.location || "—"}</span>
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top">
                          {interests.length > 0 ? (
                            <CauseBadgesCell interests={interests} />
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 align-middle text-center">
                          {currentUser && supporter.id !== currentUser.id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg border-amber-400/80 font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-400/60 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-500/10 dark:hover:text-amber-100"
                              onClick={() => router.visit(`/supporters/gift/${supporter.id}`)}
                            >
                              <Gift className="mr-1.5 h-4 w-4" />
                              Gift
                            </Button>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 pr-6 align-middle text-right">
                          {currentUser && supporter.id !== currentUser.id ? (
                            followingStates[supporter.id] ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg border-sky-500/70 font-semibold text-sky-700 hover:bg-sky-50 dark:border-sky-500/60 dark:bg-transparent dark:text-sky-300 dark:hover:bg-sky-500/10"
                                onClick={() => handleFollow(supporter)}
                                disabled={loadingFollow[supporter.id]}
                              >
                                {loadingFollow[supporter.id] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserCheck className="mr-1.5 h-4 w-4" />
                                    Following
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="rounded-lg bg-violet-600 font-semibold text-white hover:bg-violet-700"
                                onClick={() => handleFollow(supporter)}
                                disabled={loadingFollow[supporter.id]}
                              >
                                {loadingFollow[supporter.id] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserPlus className="mr-1.5 h-4 w-4" />
                                    Follow
                                  </>
                                )}
                              </Button>
                            )
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          ) : null}

          {supporters?.data?.length && supporters?.next_page_url ? (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={() => router.get(supporters.next_page_url!)}
                className="rounded-xl border-slate-300 bg-white px-8 text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Load more supporters
              </Button>
            </div>
          ) : null}

          {!supporters?.data?.length && (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center dark:border-white/15 dark:bg-slate-900/40">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
                <Search className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">No supporters found</h3>
              <p className="text-slate-600 dark:text-slate-400">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}

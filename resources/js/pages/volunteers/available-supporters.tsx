import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import { formatDistanceToNow } from "date-fns"
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  LineChart,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  UserPlus,
  Users,
  UserRound,
} from "lucide-react"

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Volunteer Interests", href: "/volunteers/volunteer-interests" },
]

function avatarSrc(image: string | null | undefined): string | undefined {
  if (!image) return undefined
  if (image.startsWith("http") || image.startsWith("/")) {
    if (image.startsWith("/")) return image
    return image
  }
  return `/storage/${String(image).replace(/^\//, "")}`
}

type PositionRef = { id: number; title: string }
type CauseRef = { id: number; name: string }

type SupporterRow = {
  id: number
  name: string
  email: string
  slug: string | null
  city: string | null
  state: string | null
  image: string | null
  volunteer_interest_statement: string | null
  created_at: string | null
  updated_at: string | null
  is_new: boolean
  causes: CauseRef[]
  interested_positions: PositionRef[]
}

type Stats = {
  total: number
  new_this_week: number
  interested_position_kinds: number
  response_rate: number | null
}

type Props = {
  supporters: {
    data: SupporterRow[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from?: number
    to?: number
    prev_page_url: string | null
    next_page_url: string | null
  }
  stats: Stats
  positionOptions: PositionRef[]
  filters: {
    per_page: number
    page: number
    search: string
    city: string
    state: string
    skills: string
    position_id: number | null
    sort: string
  }
  allowedPerPage: number[]
}

type FilterShape = {
  per_page: number
  page: number
  search: string
  city: string
  state: string
  skills: string
  position_id: number | null
  sort: string
}

function buildQueryFrom(f: FilterShape): Record<string, string | number> {
  const out: Record<string, string | number> = {
    per_page: f.per_page,
    page: f.page,
    sort: f.sort,
  }
  const s = f.search.trim()
  if (s) out.search = s
  const city = f.city.trim()
  if (city) out.city = city
  const state = f.state.trim()
  if (state) out.state = state
  const skills = f.skills.trim()
  if (skills) out.skills = skills
  if (f.position_id != null && f.position_id > 0) out.position_id = f.position_id
  return out
}

const FILTER_DEBOUNCE_MS = 400

function filterFieldsEqual(
  a: Pick<FilterShape, "search" | "city" | "state" | "skills" | "position_id" | "sort">,
  b: Pick<FilterShape, "search" | "city" | "state" | "skills" | "position_id" | "sort">,
) {
  return (
    a.search.trim() === b.search.trim() &&
    a.city.trim() === b.city.trim() &&
    a.state.trim() === b.state.trim() &&
    a.skills.trim() === b.skills.trim() &&
    a.position_id === b.position_id &&
    a.sort === b.sort
  )
}

export default function AvailableSupportersIndex({
  supporters,
  stats,
  positionOptions,
  filters: initialFilters,
  allowedPerPage,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState({
    search: initialFilters.search,
    city: initialFilters.city,
    state: initialFilters.state,
    skills: initialFilters.skills,
    position_id: initialFilters.position_id,
    sort: initialFilters.sort,
  })
  const lastApplied = useRef({
    search: initialFilters.search,
    city: initialFilters.city,
    state: initialFilters.state,
    skills: initialFilters.skills,
    position_id: initialFilters.position_id,
    sort: initialFilters.sort,
  })

  useEffect(() => {
    const next = {
      search: initialFilters.search,
      city: initialFilters.city,
      state: initialFilters.state,
      skills: initialFilters.skills,
      position_id: initialFilters.position_id,
      sort: initialFilters.sort,
    }
    setDraft(next)
    lastApplied.current = next
  }, [
    initialFilters.search,
    initialFilters.city,
    initialFilters.state,
    initialFilters.skills,
    initialFilters.position_id,
    initialFilters.sort,
  ])

  const toShape = (base: FilterShape): FilterShape => ({ ...base })

  const go = useCallback((f: FilterShape) => {
    setLoading(true)
    router.get(route("volunteers.volunteer-interests"), buildQueryFrom(f), {
      preserveState: true,
      onFinish: () => setLoading(false),
    })
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (filterFieldsEqual(draft, lastApplied.current)) {
        return
      }
      go(
        toShape({
          per_page: initialFilters.per_page,
          page: 1,
          search: draft.search,
          city: draft.city,
          state: draft.state,
          skills: draft.skills,
          position_id: draft.position_id,
          sort: draft.sort,
        }),
      )
    }, FILTER_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [
    go,
    draft,
    initialFilters.per_page,
  ])

  const filtersAtDefaults = useMemo(
    () =>
      !String(initialFilters.search ?? "").trim() &&
      !String(initialFilters.city ?? "").trim() &&
      !String(initialFilters.state ?? "").trim() &&
      !String(initialFilters.skills ?? "").trim() &&
      (initialFilters.position_id == null || initialFilters.position_id === 0) &&
      (initialFilters.sort ?? "recently_joined") === "recently_joined",
    [
      initialFilters.search,
      initialFilters.city,
      initialFilters.state,
      initialFilters.skills,
      initialFilters.position_id,
      initialFilters.sort,
    ],
  )

  const clearAll = () => {
    const next = {
      search: "",
      city: "",
      state: "",
      skills: "",
      position_id: null as number | null,
      sort: "recently_joined",
    }
    setDraft(next)
    lastApplied.current = next
    go(
      toShape({
        per_page: initialFilters.per_page,
        page: 1,
        search: next.search,
        city: next.city,
        state: next.state,
        skills: next.skills,
        position_id: next.position_id,
        sort: next.sort,
      }),
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Available Supporters" />
      <div className="flex min-w-0 max-w-full flex-1 flex-col gap-4 rounded-xl py-3 px-3 sm:gap-6 sm:py-4 sm:px-4 md:py-6 md:px-6 lg:px-10">
        <Card className="max-w-full overflow-hidden gap-0 rounded-xl border border-border/50 bg-card px-0 py-0 shadow-sm ring-1 ring-border/5 dark:border-border/60 dark:ring-border/20">
          <CardHeader className="border-b border-border/50 bg-muted/20 px-3 py-2 sm:px-4 sm:py-2.5 dark:border-border/40 dark:bg-muted/15">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold text-foreground">Filters</CardTitle>
                  {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden /> : null}
                </div>
                <CardDescription className="text-pretty">
                  Results update automatically as you change filters.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0 sm:gap-2.5">
                <button
                  type="button"
                  onClick={clearAll}
                  className="shrink-0 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-2.5 xl:grid-cols-4">
              <div className="min-w-0 sm:col-span-2 xl:col-span-2">
                <Label>Search</Label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={draft.search}
                    onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
                    placeholder="Name, email, or keywords"
                    className="min-w-0 pl-9"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <Label>Position</Label>
                <Select
                  value={draft.position_id != null ? String(draft.position_id) : "all"}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, position_id: v === "all" ? null : parseInt(v, 10) }))
                  }
                >
                  <SelectTrigger className="mt-1.5 w-full min-w-0">
                    <SelectValue placeholder="All positions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All positions</SelectItem>
                    {positionOptions.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Label>Sort by</Label>
                <Select value={draft.sort} onValueChange={(v) => setDraft((d) => ({ ...d, sort: v }))}>
                  <SelectTrigger className="mt-1.5 w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recently_joined">Recently joined</SelectItem>
                    <SelectItem value="recently_active">Recently updated</SelectItem>
                    <SelectItem value="name_asc">Name (A–Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Label>City</Label>
                <Input
                  value={draft.city}
                  onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                  className="mt-1.5 min-w-0"
                  placeholder="e.g. San Diego"
                />
              </div>
              <div className="min-w-0">
                <Label>State / province</Label>
                <Input
                  value={draft.state}
                  onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                  className="mt-1.5 min-w-0"
                  placeholder="e.g. CA"
                />
              </div>
              <div className="min-w-0 sm:col-span-2">
                <Label>Keyword (statement, position, or cause)</Label>
                <Input
                  value={draft.skills}
                  onChange={(e) => setDraft((d) => ({ ...d, skills: e.target.value }))}
                  className="mt-1.5 min-w-0"
                  placeholder="Statement text, job role, or cause name"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Snapshot</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            {(
              [
                {
                  title: "Available supporters",
                  value: stats.total,
                  sub: "In current results",
                  icon: Users,
                  tone: "violet" as const,
                },
                {
                  title: "New this week",
                  value: stats.new_this_week,
                  sub: "Joined in the last 7 days",
                  icon: UserPlus,
                  tone: "violet" as const,
                },
                {
                  title: "Position types",
                  value: stats.interested_position_kinds,
                  sub: "Unique role types in directory",
                  icon: Briefcase,
                  tone: "violet" as const,
                },
                {
                  title: "Response rate",
                  value: stats.response_rate != null ? `${stats.response_rate}%` : "—",
                  sub: "Coming soon",
                  icon: LineChart,
                  tone: "muted" as const,
                },
              ] as const
            ).map((c) => {
              const Icon = c.icon
              return (
                <div
                  key={c.title}
                  className="flex min-h-0 min-w-0 gap-3 rounded-xl border border-border/50 bg-gradient-to-b from-card to-muted/20 p-3.5 shadow-sm ring-1 ring-border/5 transition-shadow duration-200 hover:shadow-md dark:border-border/60 dark:from-card dark:to-muted/5 dark:ring-border/20 sm:p-4"
                >
                  <div
                    className={[
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                      c.tone === "violet" &&
                        "border-violet-200/80 bg-gradient-to-br from-violet-500/15 to-indigo-500/10 text-violet-600 dark:border-violet-800/50 dark:from-violet-500/20 dark:to-indigo-950/50 dark:text-violet-300",
                      c.tone === "muted" &&
                        "border-border/60 bg-muted/30 text-muted-foreground dark:border-border/80 dark:bg-muted/20",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-bold tabular-nums leading-tight text-foreground sm:text-2xl">{c.value}</p>
                    <p className="mt-1.5 break-words text-sm font-semibold leading-snug text-foreground">{c.title}</p>
                    <p className="mt-0.5 line-clamp-2 break-words text-sm text-muted-foreground">{c.sub}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="min-w-0 break-words text-base font-semibold text-foreground sm:text-lg">
              List{" "}
              <span className="font-bold text-violet-600 tabular-nums dark:text-violet-400">({supporters.total})</span>
            </h2>
            <div className="flex shrink-0 items-center gap-2 self-stretch text-xs text-muted-foreground sm:self-auto">
              <span className="whitespace-nowrap">Per page</span>
              <Select
                value={String(initialFilters.per_page)}
                onValueChange={(v) => {
                  const n = parseInt(v, 10)
                  go(
                    toShape({
                      per_page: n,
                      page: 1,
                      search: initialFilters.search,
                      city: initialFilters.city,
                      state: initialFilters.state,
                      skills: initialFilters.skills,
                      position_id: initialFilters.position_id,
                      sort: initialFilters.sort,
                    }),
                  )
                }}
              >
                <SelectTrigger className="h-8 w-[88px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedPerPage.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {supporters.data.length === 0 ? (
            <Card className="rounded-xl border border-dashed border-border/60 bg-muted/10 shadow-sm dark:border-border/50 dark:bg-muted/5">
              <CardContent className="flex flex-col items-center justify-center px-4 py-16 text-center sm:px-8">
                <HeartHandshake className="mb-3 h-10 w-10 text-muted-foreground" />
                {filtersAtDefaults ? (
                  <>
                    <p className="font-medium text-foreground">No supporters to show yet</p>
                    <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                      Supporters appear when they have at least one of:{" "}
                      <span className="font-medium text-foreground/90">cause interests</span> (profile / Supporters
                      interest), <span className="font-medium text-foreground/90">preferred job positions</span> (Volunteer
                      Opportunities, saved to their profile), or a{" "}
                      <span className="font-medium text-foreground/90">volunteer interest statement</span>.
                    </p>
                    <p className="mt-3 max-w-lg text-sm text-muted-foreground">
                      If someone should appear, ask them to pick causes and/or positions, save, then refresh.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-foreground">No supporters match these filters</p>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      Try clearing one or more filters or broadening search. The list only includes supporters who have
                      cause interests, saved job positions, and/or a volunteer interest statement.
                    </p>
                    <Button variant="outline" className="mt-6" onClick={clearAll}>
                      Clear filters
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {supporters.data.map((s) => {
                const loc = [s.city, s.state].filter(Boolean).join(", ")
                const joinedAgo = s.created_at
                  ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true })
                  : "—"
                const profileUrl = s.slug ? `/users/${s.slug}` : null
                const statement = (s.volunteer_interest_statement ?? "").trim()
                const skillsPreview =
                  statement.length > 140 ? `${statement.slice(0, 140)}…` : statement

                return (
                  <Card
                    key={s.id}
                    className="group max-w-full overflow-hidden rounded-xl border border-border/50 border-l-4 border-l-violet-500 bg-card pl-0 shadow-sm ring-1 ring-border/5 transition-all duration-200 hover:border-l-violet-600 hover:shadow-md dark:border-border/60 dark:border-l-violet-500 dark:bg-card/95 dark:ring-border/20 dark:hover:border-l-violet-400"
                  >
                    <CardContent className="p-3 pl-2.5 sm:p-4 sm:pl-3 md:px-5 md:py-5">
                      <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-stretch lg:gap-0">
                        <div className="flex min-w-0 flex-1 basis-0 gap-3 sm:gap-3.5 lg:min-w-0 lg:pr-6">
                          <Avatar className="h-12 w-12 shrink-0 border border-border/80 ring-2 ring-background shadow-sm sm:h-14 sm:w-14">
                            <AvatarImage src={avatarSrc(s.image)} alt="" />
                            <AvatarFallback className="bg-violet-100 text-sm font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                              {s.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="break-words text-base font-semibold tracking-tight text-foreground">
                                {s.name}
                              </span>
                              {s.is_new ? (
                                <span className="inline-flex items-center rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-violet-600">
                                  New
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 break-all text-xs text-muted-foreground sm:break-words">
                              {s.email}
                            </p>
                            {loc ? (
                              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                                <span className="line-clamp-1">{loc}</span>
                              </p>
                            ) : null}
                            {s.created_at ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">Joined {joinedAgo}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 space-y-2.5 overflow-hidden rounded-lg border border-border/40 bg-muted/25 p-3 sm:p-3.5 dark:border-border/50 dark:bg-muted/10 lg:px-4">
                          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground/90">
                            Preferred job positions
                          </p>
                          <div className="flex min-h-[1.5rem] max-w-full flex-wrap gap-1.5">
                            {s.interested_positions.length > 0 ? (
                              s.interested_positions.map((p) => (
                                <span
                                  key={p.id}
                                  className="inline-flex max-w-full items-center break-words rounded-lg border border-violet-200/90 bg-violet-100/90 px-2.5 py-0.5 text-xs font-medium text-violet-900 shadow-sm dark:border-violet-800/80 dark:bg-violet-950/50 dark:text-violet-200"
                                >
                                  {p.title}
                                </span>
                              ))
                            ) : null}
                          </div>
                          <p className="pt-1 text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground/90">
                            Interests & skills
                          </p>
                          {skillsPreview ? (
                            <p className="line-clamp-2 text-sm leading-relaxed text-foreground/90">{skillsPreview}</p>
                          ) : null}
                          {s.causes.length > 0 ? (
                            <div className="mt-0.5 flex max-w-full flex-wrap gap-1.5">
                              {s.causes.map((c) => (
                                <Badge
                                  key={c.id}
                                  className="max-w-full break-words rounded-md border border-violet-200/80 bg-violet-50/90 text-left text-xs font-medium leading-snug text-violet-900 shadow-sm dark:border-violet-800/60 dark:bg-violet-950/50 dark:text-violet-200"
                                >
                                  {c.name}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex w-full min-w-0 flex-col border-t border-border/40 pt-3 dark:border-border/30 lg:mt-0 lg:w-48 lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                          <p className="mb-2.5 text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground/90 lg:pt-0.5">
                            Actions
                          </p>
                          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                            {profileUrl ? (
                              <Button
                                asChild
                                className="w-full min-w-0 border-0 bg-violet-600 text-white shadow-sm hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500"
                              >
                                <a href={profileUrl} target="_blank" rel="noreferrer">
                                  <UserRound className="mr-2 h-4 w-4 shrink-0" />
                                  <span className="truncate">View profile</span>
                                </a>
                              </Button>
                            ) : null}
                            <Button
                              asChild
                              variant="outline"
                              className="w-full min-w-0 border-border/60 bg-background shadow-sm"
                            >
                              <Link href="/chat" className="min-w-0">
                                <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate">Messages</span>
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {supporters.last_page > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 px-1 sm:mt-8">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={supporters.current_page <= 1 || loading}
                onClick={() =>
                  go(
                    toShape({
                      per_page: initialFilters.per_page,
                      page: supporters.current_page - 1,
                      search: initialFilters.search,
                      city: initialFilters.city,
                      state: initialFilters.state,
                      skills: initialFilters.skills,
                      position_id: initialFilters.position_id,
                      sort: initialFilters.sort,
                    }),
                  )
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-0 px-1 text-center text-xs text-muted-foreground sm:px-2 sm:text-sm">
                Page {supporters.current_page} of {supporters.last_page}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={supporters.current_page >= supporters.last_page || loading}
                onClick={() =>
                  go(
                    toShape({
                      per_page: initialFilters.per_page,
                      page: supporters.current_page + 1,
                      search: initialFilters.search,
                      city: initialFilters.city,
                      state: initialFilters.state,
                      skills: initialFilters.skills,
                      position_id: initialFilters.position_id,
                      sort: initialFilters.sort,
                    }),
                  )
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

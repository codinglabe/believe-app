"use client"

import type React from "react"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useCallback, useRef } from "react"
import { debounce } from "lodash"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Building,
  Users,
  Search,
  Filter,
  CalendarDays,
  DollarSign,
  ArrowUpDown,
} from "lucide-react"
import { Link, router } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"

interface EventType {
  id: number
  name: string
  category: string
  description?: string
}

interface Event {
    id: number;
    name: string;
    description: string;
    start_date: string;
    end_date?: string;
    location: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    poster_image?: string;
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
    max_participants?: number;
    registration_fee?: number;
    requirements?: string;
    contact_info?: string;
    event_type?: EventType;
    organization?: {
        id: number;
        name: string;
        logo?: string;
    };
    user?: {
        id: number;
        name: string;
        organization?: {
            id: number;
            name: string;
        };
    };
}

interface Organization {
  id: number
  name: string
}

const DEFAULT_SORT = "most_recent"

/** Matches `SiteTitle` logo gradient (purple → blue) */
const BRAND_GRADIENT_HERO =
  "bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600 dark:from-purple-950 dark:via-purple-900 dark:to-blue-950"

type PaginationLink = { url: string | null; label: string; active: boolean }
type Paginated<T> = {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
  links: PaginationLink[]
}

const SORT_OPTIONS = [
  { value: "most_recent", label: "Most recent" },
  { value: "start_soonest", label: "Start date (soonest first)" },
  { value: "start_latest", label: "Start date (latest first)" },
  { value: "name_az", label: "Name (A–Z)" },
] as const

function EventsSortSelect({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (v: string) => void
  id?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        className="w-full h-11 rounded-xl border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-900 dark:text-white"
      >
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-slate-200 dark:border-gray-700">
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface EventsPageProps {
    seo?: { title: string; description?: string }
    events: Paginated<Event>;
    eventTypes: EventType[];
    organizations: Organization[];
    cities: string[];
    states: string[];
    zips: string[];
    search?: string;
    status?: string;
    eventTypeId?: string;
    organizationId?: string;
    cityFilter?: string;
    stateFilter?: string;
    zipFilter?: string;
    dateFilter?: string;
    sort?: string;
}

export default function EventsPage({
    seo,
    events,
    eventTypes,
    organizations,
    cities,
    states,
    zips,
    search,
    status,
    eventTypeId,
    organizationId,
    cityFilter,
    stateFilter,
    zipFilter,
    dateFilter,
    sort: sortProp,
}: EventsPageProps) {
  const totalEvents = events?.total || 0
  const totalPages = events?.last_page || 1
  const currentPage = events?.current_page || 1
  const startIndex = (events?.from ?? 0) || 0
  const endIndex = (events?.to ?? 0) || 0
  const currentEvents = events?.data || []

    const [filters, setFilters] = useState<{
        search: string
        status: string
        event_type_id: string
        organization_id: string
        city_filter: string
        state_filter: string
        zip_filter: string
        date_filter: string
        sort: string
    }>({
        search: search || '',
        status: status || 'all',
        event_type_id: eventTypeId || 'all',
        organization_id: organizationId || 'all',
        city_filter: cityFilter || 'all',
        state_filter: stateFilter || 'all',
        zip_filter: zipFilter || 'all',
        date_filter: dateFilter || '',
        sort: sortProp && SORT_OPTIONS.some((o) => o.value === sortProp) ? sortProp : DEFAULT_SORT,
    })

    const statusOptions = [
        { value: 'all', label: 'All Statuses' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'ongoing', label: 'Ongoing' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
    ]

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      search: e.target.value,
    }))
  }

  const handleEventTypeChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      event_type_id: value,
    }))
  }

    const clearAllFilters = () => {
        setFilters({
            search: '',
            status: 'all',
            event_type_id: 'all',
            organization_id: 'all',
            city_filter: 'all',
            state_filter: 'all',
            zip_filter: 'all',
            date_filter: '',
            sort: DEFAULT_SORT,
        })
        router.get(route("alleventsPage"), {}, { preserveState: true, preserveScroll: true, replace: true })
    }

  const handleOrganizationChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      organization_id: value,
    }))
  }

    const handleCityFilterChange = (value: string) => {
        setFilters((prev) => ({
            ...prev,
            city_filter: value
        }))
    }

    const handleStateFilterChange = (value: string) => {
        setFilters((prev) => ({
            ...prev,
            state_filter: value
        }))
    }

    const handleZipFilterChange = (value: string) => {
        setFilters((prev) => ({
            ...prev,
            zip_filter: value
        }))
    }

    const handleDateFilterChange = (value: string) => {
        setFilters((prev) => ({
            ...prev,
            date_filter: value
        }))
    }

  const cleanFilterQuery = (query: Record<string, string>) => {
    const out = Object.fromEntries(
      Object.entries(query).filter(
        ([_, value]) => value != null && value !== "all" && value !== ""
      )
    )
    if (out.sort === DEFAULT_SORT) {
      delete out.sort
    }
    return out
  }

  const goToPage = (page: number) => {
    router.get(
      route("alleventsPage"),
      cleanFilterQuery({ ...filters, page: String(page) }),
      { preserveState: true, preserveScroll: true, replace: true },
    )
  }

  const debouncedFilter = useCallback(
    debounce((query: Record<string, string>) => {
      // Reset to page 1 when filters change
      const { page, ...rest } = query
      router.get(route("alleventsPage"), cleanFilterQuery(rest), {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      })
    }, 300),
    [],
  )

  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    debouncedFilter({ ...filters })
  }, [filters, debouncedFilter])

  const handlePageChange = (page: number) => {
    goToPage(page)
  }

  const hasActiveFilters =
    filters.search ||
    filters.status !== "all" ||
    filters.event_type_id !== "all" ||
    filters.organization_id !== "all" ||
    filters.city_filter !== "all" ||
    filters.state_filter !== "all" ||
    filters.zip_filter !== "all" ||
    filters.date_filter ||
    filters.sort !== DEFAULT_SORT

    return (
        <FrontendLayout>
            <PageHead title={seo?.title ?? "All Events"} description={seo?.description} />
            <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
                {/* Hero */}
                <section className={`relative overflow-hidden py-14 md:py-20 ${BRAND_GRADIENT_HERO}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.25),transparent)] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.08),transparent)]" />
                    <div className="absolute inset-0 opacity-30 dark:opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.4' fill-rule='evenodd'%3E%3Cpath d='m0 40 40-40H0v40zM40 0 0 40V0h40z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
                    <div className="container mx-auto px-4 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="text-center max-w-3xl mx-auto"
                        >
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/20 shadow-xl mb-6"
                            >
                                <CalendarDays className="w-7 h-7 md:w-8 md:h-8 text-white" />
                            </motion.div>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight mb-3">
                                Event Calendar
                            </h1>
                            <p className="text-base sm:text-lg text-white/90 dark:text-white/80 max-w-xl mx-auto">
                                Discover and join events happening in your community
                            </p>
                        </motion.div>
                    </div>
                </section>

                <div className="container mx-auto px-4 py-8 md:py-12">
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 lg:items-start">
                        {/* Filters — left on large screens */}
                        <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-24 lg:z-10 lg:self-start">
                            <div className="rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/80 shadow-sm dark:shadow-none overflow-hidden">
                                    <div className="px-4 py-4 border-b border-slate-100 dark:border-gray-800">
                                        <div className="flex items-center gap-2">
                                            <Filter className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
                                            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Search & filters</h2>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="space-y-1.5">
                                            <label htmlFor="events-search" className="text-sm font-medium text-slate-700 dark:text-gray-300">
                                                Search
                                            </label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
                                                <Input
                                                    id="events-search"
                                                    type="search"
                                                    autoComplete="off"
                                                    placeholder="Search by name, location, or description..."
                                                    value={filters.search}
                                                    onChange={handleSearchChange}
                                                    className="pl-9 h-11 rounded-xl border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-gray-500 focus-visible:ring-violet-500 dark:focus-visible:ring-violet-400 focus-visible:border-violet-500 dark:focus-visible:border-violet-400 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    {/* Event Type */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Event topic</label>
                                        <Select value={filters.event_type_id} onValueChange={handleEventTypeChange}>
                                            <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-900 dark:text-white">
                                                <SelectValue placeholder="All types" />
                                            </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 dark:border-gray-700">
                                        <SelectItem value="all">All types</SelectItem>
                                        {Object.entries(eventTypes.reduce((acc, eventType) => {
                                            const category = eventType.category;
                                            if (!acc[category]) acc[category] = [];
                                            acc[category].push(eventType);
                                            return acc;
                                        }, {} as Record<string, EventType[]>)).map(([category, types]) => (
                                            <div key={category}>
                                                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-800/80">
                                                    {category}
                                                </div>
                                                {types.map((type) => (
                                                    <SelectItem key={type.id} value={type.id.toString()}>
                                                        {type.name}
                                                    </SelectItem>
                                                ))}
                                            </div>
                                        ))}
                                    </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Organization */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Organization</label>
                                        <Select value={filters.organization_id} onValueChange={handleOrganizationChange}>
                                            <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-900 dark:text-white">
                                                <SelectValue placeholder="All" />
                                            </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Organizations</SelectItem>
                                        {organizations.map((organization) => (
                                            <SelectItem key={organization.id} value={organization.id.toString()}>
                                                {organization.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                                    {/* City */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-gray-300">City</label>
                                        <Select value={filters.city_filter} onValueChange={handleCityFilterChange}>
                                            <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-900 dark:text-white">
                                                <SelectValue placeholder="All cities" />
                                            </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Cities</SelectItem>
                                        {cities.map((city) => (
                                            <SelectItem key={city} value={city}>
                                                {city}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                                    {/* State */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-gray-300">State</label>
                                        <Select value={filters.state_filter} onValueChange={handleStateFilterChange}>
                                            <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-900 dark:text-white">
                                                <SelectValue placeholder="All states" />
                                            </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All States</SelectItem>
                                        {states.map((state) => (
                                            <SelectItem key={state} value={state}>
                                                {state}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                                    {/* Zip */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Zip</label>
                                        <Select value={filters.zip_filter} onValueChange={handleZipFilterChange}>
                                            <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-900 dark:text-white">
                                                <SelectValue placeholder="All" />
                                            </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Zip Codes</SelectItem>
                                        {zips.map((zip) => (
                                            <SelectItem key={zip} value={zip}>
                                                {zip}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                                    {/* Status */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Status</label>
                                        <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                                            <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-900 dark:text-white">
                                                <SelectValue placeholder="All statuses" />
                                            </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                                    {/* Date range (single day — matches listing filter) */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="events-date-range" className="text-sm font-medium text-slate-700 dark:text-gray-300">
                                            Date range
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500 pointer-events-none z-[1]" />
                                            <Input
                                                id="events-date-range"
                                                type="date"
                                                value={filters.date_filter}
                                                onChange={(e) => handleDateFilterChange(e.target.value)}
                                                className="h-11 pl-10 rounded-xl border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label htmlFor="events-sort-sidebar" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300">
                                            <ArrowUpDown className="w-4 h-4 text-slate-500 dark:text-gray-400 shrink-0" />
                                            Sort by
                                        </label>
                                        <EventsSortSelect
                                            id="events-sort-sidebar"
                                            value={filters.sort}
                                            onChange={(sort) => setFilters((prev) => ({ ...prev, sort }))}
                                        />
                                    </div>
                                    </div>
                            </div>
                        </aside>

                        {/* Results */}
                        <div className="flex-1 min-w-0 space-y-6 md:space-y-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-1">
                                <h2 className="text-xl md:text-2xl font-bold text-violet-600 dark:text-violet-400">
                                    {totalEvents > 0 ? (
                                        <span>{totalEvents} event{totalEvents !== 1 ? 's' : ''} found</span>
                                    ) : (
                                        <span>Events</span>
                                    )}
                                </h2>
                                <p className="text-sm text-slate-600 dark:text-gray-400 max-w-2xl">
                                    Discover upcoming events and opportunities to get involved.
                                </p>
                            </div>
                            <div className="w-full space-y-1.5 sm:w-56 shrink-0">
                                <label htmlFor="events-sort-toolbar" className="text-sm font-medium text-slate-700 dark:text-gray-300">
                                    Sort by
                                </label>
                                <EventsSortSelect
                                    id="events-sort-toolbar"
                                    value={filters.sort}
                                    onChange={(sort) => setFilters((prev) => ({ ...prev, sort }))}
                                />
                            </div>
                        </div>

                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                            {totalEvents > 0 ? (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                                        {currentEvents.map((event, index) => (
                                            <motion.div
                                                key={event.id}
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.35, delay: index * 0.05 }}
                                                className="group h-full"
                                            >
                                                <Link href={route("viewEvent", event.id)} className="block h-full rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/80 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg hover:shadow-violet-500/10 dark:hover:shadow-violet-500/5 hover:border-violet-300 dark:hover:border-violet-700/50 hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full">
                                                    <div className="relative h-52 sm:h-56 overflow-hidden bg-slate-100 dark:bg-gray-800">
                                                        <img
                                                            src={event.poster_image ? '/storage/' + event.poster_image : "/placeholder.svg"}
                                                            alt={event.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                                        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                                                            {event.event_type && (
                                                                <span className="px-2.5 py-1 rounded-lg bg-white/95 dark:bg-gray-900/95 text-slate-800 dark:text-white text-xs font-medium backdrop-blur-sm">
                                                                    {event.event_type.name}
                                                                </span>
                                                            )}
                                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide ${
                                                                event.status === 'upcoming' ? 'bg-violet-500 text-white' :
                                                                event.status === 'ongoing' ? 'bg-emerald-500 text-white' :
                                                                event.status === 'completed' ? 'bg-slate-500 text-white' :
                                                                'bg-rose-500 text-white'
                                                            }`}>
                                                                {event.status}
                                                            </span>
                                                        </div>
                                                        <div className="absolute bottom-3 left-3 right-3">
                                                            <div className="flex items-center gap-2 text-white/95 text-sm font-medium">
                                                                <Calendar className="w-4 h-4 shrink-0" />
                                                                {new Date(event.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 sm:p-5 flex-1 flex flex-col">
                                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 line-clamp-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                                            {event.name}
                                                        </h3>
                                                        {(event.user?.organization || event.organization || event.user?.name) && (
                                                            <div className="flex items-center gap-2 mb-2 text-sm text-slate-600 dark:text-gray-400">
                                                                <Building className="h-3.5 w-3.5 shrink-0" />
                                                                <span className="truncate">{event.user?.organization?.name || event.organization?.name || event.user?.name || 'Creator'}</span>
                                                            </div>
                                                        )}
                                                        <p className="text-slate-600 dark:text-gray-400 text-sm line-clamp-2 leading-relaxed mb-4 flex-1">
                                                            {event.description}
                                                        </p>
                                                        <div className="space-y-2 mb-4">
                                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-300">
                                                                <MapPin className="h-4 w-4 text-violet-500 dark:text-violet-400 shrink-0" />
                                                                <span className="truncate">{event.location || 'Location TBD'}{event.city && `, ${event.city}`}{event.state && ` ${event.state}`}</span>
                                                            </div>
                                                            {event.registration_fee != null && event.registration_fee > 0 && (
                                                                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-300">
                                                                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                                    <span>${event.registration_fee}</span>
                                                                </div>
                                                            )}
                                                            {event.max_participants != null && (
                                                                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-300">
                                                                    <Users className="h-4 w-4 text-slate-500 dark:text-gray-400 shrink-0" />
                                                                    <span>Up to {event.max_participants} participants</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold shadow-sm transition-opacity hover:opacity-95 active:opacity-90 dark:from-purple-600 dark:to-blue-600">
                                                            View event
                                                            <ChevronRight className="w-4 h-4" />
                                                        </span>
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="mt-10 pt-8 border-t border-slate-200 dark:border-gray-800">
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <p className="text-sm text-slate-600 dark:text-gray-400">
                                                    Showing <span className="font-medium text-slate-900 dark:text-white">{startIndex}</span>–<span className="font-medium text-slate-900 dark:text-white">{endIndex}</span> of <span className="font-medium text-slate-900 dark:text-white">{totalEvents}</span>
                                                </p>
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handlePageChange(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        className="h-9 px-3 rounded-lg border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 disabled:opacity-50"
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </Button>
                                                    <div className="flex gap-0.5">
                                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                            <Button
                                                                key={page}
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handlePageChange(page)}
                                                                className={`h-9 min-w-[36px] rounded-lg ${
                                                                    currentPage === page
                                                                        ? "bg-gradient-to-r from-purple-600 to-blue-600 border-transparent text-white shadow-sm transition-opacity hover:opacity-95 active:opacity-90 dark:from-purple-600 dark:to-blue-600"
                                                                        : "border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800"
                                                                }`}
                                                            >
                                                                {page}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handlePageChange(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                        className="h-9 px-3 rounded-lg border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 disabled:opacity-50"
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/50 py-16 px-6 text-center">
                                    <div className="max-w-sm mx-auto">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-gray-800 mb-5">
                                            <CalendarDays className="w-8 h-8 text-slate-400 dark:text-gray-500" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No events found</h3>
                                        <p className="text-slate-600 dark:text-gray-400 text-sm mb-6">
                                            {hasActiveFilters
                                                ? "Try changing your search or filters to see more events."
                                                : "No events are available right now. Check back later."}
                                        </p>
                                        <Button
                                            onClick={clearAllFilters}
                                            className="rounded-xl bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white font-medium px-5 py-2.5"
                                        >
                                            Clear filters
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    )
}

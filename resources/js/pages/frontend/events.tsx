"use client"

import type React from "react"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useCallback, useRef } from "react"
import { debounce } from "lodash"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Building,
  Users,
  X,
  Search,
  Filter,
  CalendarDays,
  Clock,
  Star,
  Eye,
  DollarSign,
} from "lucide-react"
import { Link, router } from "@inertiajs/react"
import { route } from "ziggy-js"
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

interface EventsPageProps {
    seo?: { title: string; description?: string }
    events: Event[];
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
    monthFilter?: string;
    dayFilter?: string;
    dateFilter?: string;
}

export default function EventsPage({ seo, events, eventTypes, organizations, cities, states, zips, search, status, eventTypeId, organizationId, cityFilter, stateFilter, zipFilter, monthFilter, dayFilter, dateFilter }: EventsPageProps) {
    const [currentPage, setCurrentPage] = useState(1)
    const eventsPerPage = 6

  // Calculate pagination for events
  const totalEvents = events?.length || 0
  const totalPages = Math.ceil(totalEvents / eventsPerPage)
  const startIndex = (currentPage - 1) * eventsPerPage
  const endIndex = Math.min(startIndex + eventsPerPage, totalEvents)
  const currentEvents = events?.slice(startIndex, endIndex) || []

    const [filters, setFilters] = useState<{
        search: string
        status: string
        event_type_id: string
        organization_id: string
        city_filter: string
        state_filter: string
        zip_filter: string
        month_filter: string
        day_filter: string
        date_filter: string
    }>({
        search: search || '',
        status: status || 'all',
        event_type_id: eventTypeId || 'all',
        organization_id: organizationId || 'all',
        city_filter: cityFilter || 'all',
        state_filter: stateFilter || 'all',
        zip_filter: zipFilter || 'all',
        month_filter: monthFilter || 'all',
        day_filter: dayFilter || 'all',
        date_filter: dateFilter || ''
    })

    const statusOptions = [
        { value: 'all', label: 'All Statuses' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'ongoing', label: 'Ongoing' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
    ]

    const monthOptions = [
        { value: 'all', label: 'All Months' },
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' }
    ]

    const dayOptions = [
        { value: 'all', label: 'All Days' },
        ...Array.from({ length: 31 }, (_, i) => ({
            value: (i + 1).toString(),
            label: (i + 1).toString()
        }))
    ]

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      search: e.target.value,
    }))
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({
      ...prev,
      status: e.target.value,
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
            month_filter: 'all',
            day_filter: 'all',
            date_filter: ''
        })
        setCurrentPage(1)
        const url = typeof route !== "undefined" ? route("alleventsPage") : "/all-events"
        router.get(url, {}, { preserveState: true, preserveScroll: true, replace: true })
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

    const handleMonthFilterChange = (value: string) => {
        setFilters((prev) => ({
            ...prev,
            month_filter: value
        }))
    }

    const handleDayFilterChange = (value: string) => {
        setFilters((prev) => ({
            ...prev,
            day_filter: value
        }))
    }

    const handleDateFilterChange = (value: string) => {
        setFilters((prev) => ({
            ...prev,
            date_filter: value
        }))
    }

  const cleanFilterQuery = (query: Record<string, string>) => {
    return Object.fromEntries(
      Object.entries(query).filter(
        ([_, value]) => value != null && value !== "all" && value !== ""
      )
    )
  }

  const debouncedFilter = useCallback(
    debounce((query: Record<string, string>) => {
      const url = typeof route !== "undefined" ? route("alleventsPage") : "/all-events"
      router.get(url, cleanFilterQuery(query), {
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
    setCurrentPage(1)
    debouncedFilter({ ...filters })
  }, [filters, debouncedFilter])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    setCurrentPage(1)
    const url = typeof route !== "undefined" ? route("alleventsPage") : "/all-events"
    router.get(url, cleanFilterQuery({ ...filters }), { preserveState: true, preserveScroll: true, replace: true })
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
    filters.month_filter !== "all" ||
    filters.year_filter !== "all"

    return (
        <FrontendLayout>
            <PageHead title={seo?.title ?? "All Events"} description={seo?.description} />
            <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
                {/* Hero */}
                <section className="relative overflow-hidden bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 dark:from-violet-900/90 dark:via-fuchsia-900/80 dark:to-rose-900/90 py-14 md:py-20">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.25),transparent)] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.08),transparent)]" />
                    <div className="absolute inset-0 opacity-30 dark:opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.4' fill-rule='evenodd'%3E%3Cpath d='m0 40 40-40H0v40zM40 0 0 40V0h40z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
                    <div className="container mx-auto px-4 sm:px-6 relative z-10">
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

                <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-7xl">
                    {/* Search & Filters */}
                    <form onSubmit={submitSearch} className="mb-8 md:mb-10">
                        <div className="rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/80 shadow-sm dark:shadow-none overflow-hidden">
                            <div className="px-5 py-4 md:px-6 md:py-5 border-b border-slate-100 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Search & filters</h2>
                                </div>
                            </div>
                            <div className="p-5 md:p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                                    {/* Search + primary actions */}
                                    <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 flex flex-col sm:flex-row gap-3">
                                        <div className="flex-1 relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-gray-500 pointer-events-none" />
                                            <Input
                                                type="text"
                                                placeholder="Search by name, location, or description..."
                                                value={filters.search}
                                                onChange={handleSearchChange}
                                                className="pl-10 h-11 rounded-xl border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus-visible:ring-violet-500 dark:focus-visible:ring-violet-400 focus-visible:border-violet-500 dark:focus-visible:border-violet-400 transition-colors"
                                            />
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <Button
                                                type="submit"
                                                className="h-11 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white font-medium shadow-sm transition-colors flex items-center gap-2"
                                            >
                                                <Search className="w-4 h-4" />
                                                Search
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={clearAllFilters}
                                                variant="outline"
                                                disabled={!filters.search && filters.status === 'all' && filters.event_type_id === 'all' && filters.organization_id === 'all' && filters.city_filter === 'all' && filters.state_filter === 'all' && filters.zip_filter === 'all' && filters.month_filter === 'all' && filters.day_filter === 'all' && !filters.date_filter}
                                                className="h-11 px-4 rounded-xl border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 hover:border-slate-300 dark:hover:border-gray-600 transition-colors flex items-center gap-2"
                                            >
                                                <X className="w-4 h-4" />
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                    {/* Event Type */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Event type</label>
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

                                    {/* Month */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Month</label>
                                        <Select value={filters.month_filter} onValueChange={handleMonthFilterChange}>
                                            <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-900 dark:text-white">
                                                <SelectValue placeholder="All months" />
                                            </SelectTrigger>
                                    <SelectContent>
                                        {monthOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                                    {/* Day */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Day</label>
                                        <Select value={filters.day_filter} onValueChange={handleDayFilterChange}>
                                            <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-900 dark:text-white">
                                                <SelectValue placeholder="All days" />
                                            </SelectTrigger>
                                    <SelectContent>
                                        {dayOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                                    {/* Exact date */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Date</label>
                                        <Input
                                            type="date"
                                            value={filters.date_filter}
                                            onChange={(e) => handleDateFilterChange(e.target.value)}
                                            className="h-11 rounded-xl border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Results */}
                    <div className="space-y-6 md:space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                                {totalEvents > 0 ? (
                                    <span>{totalEvents} event{totalEvents !== 1 ? 's' : ''} found</span>
                                ) : (
                                    <span>Events</span>
                                )}
                            </h2>
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
                                                <Link href={route('viewEvent', event.id)} className="block h-full rounded-2xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/80 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg hover:shadow-violet-500/10 dark:hover:shadow-violet-500/5 hover:border-violet-300 dark:hover:border-violet-700/50 hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full">
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
                                                        <span className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
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
                                                    Showing <span className="font-medium text-slate-900 dark:text-white">{startIndex + 1}</span>–<span className="font-medium text-slate-900 dark:text-white">{endIndex}</span> of <span className="font-medium text-slate-900 dark:text-white">{totalEvents}</span>
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
                                                                        ? "bg-violet-600 border-violet-600 text-white hover:bg-violet-700 hover:border-violet-700 dark:bg-violet-600 dark:border-violet-600 dark:hover:bg-violet-500"
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
        </FrontendLayout>
    )
}

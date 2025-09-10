"use client"

import type React from "react"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useCallback } from "react"
import { debounce, pickBy } from "lodash"
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
} from "lucide-react"
import { Link, router } from "@inertiajs/react"

interface EventType {
  id: number
  name: string
  category: string
  description?: string
}

interface Event {
  id: number
  name: string
  description: string
  start_date: string
  end_date?: string
  location: string
  address?: string
  city?: string
  state?: string
  zip?: string
  poster_image?: string
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
  max_participants?: number
  registration_fee?: number
  requirements?: string
  contact_info?: string
  event_type?: EventType
  organization?: {
    id: number
    name: string
    logo?: string
  }
}

interface Organization {
  id: number
  name: string
}

interface EventsPageProps {
  events: Event[]
  eventTypes: EventType[]
  organizations: Organization[]
  locations: string[]
  search?: string
  status?: string
  eventTypeId?: string
  organizationId?: string
  locationFilter?: string
  dateFilter?: string
  monthFilter?: string
  yearFilter?: string
}

export default function EventsPage({
  events,
  eventTypes,
  organizations,
  locations,
  search,
  status,
  eventTypeId,
  organizationId,
  locationFilter,
  dateFilter,
  monthFilter,
  yearFilter,
}: EventsPageProps) {
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
    location_filter: string
    date_filter: string
    month_filter: string
    year_filter: string
  }>({
    search: search || "",
    status: status || "all",
    event_type_id: eventTypeId || "all",
    organization_id: organizationId || "all",
    location_filter: locationFilter || "all",
    date_filter: dateFilter || "",
    month_filter: monthFilter || "all",
    year_filter: yearFilter || "all",
  })

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "upcoming", label: "Upcoming" },
    { value: "ongoing", label: "Ongoing" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ]

  const monthOptions = [
    { value: "all", label: "All Months" },
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ]

  const currentYear = new Date().getFullYear()
  const yearOptions = [
    { value: "all", label: "All Years" },
    ...Array.from({ length: 10 }, (_, i) => ({
      value: (currentYear + i).toString(),
      label: (currentYear + i).toString(),
    })),
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
      search: "",
      status: "all",
      event_type_id: "all",
      organization_id: "all",
      location_filter: "all",
      date_filter: "",
      month_filter: "all",
      year_filter: "all",
    })
  }

  const handleOrganizationChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      organization_id: value,
    }))
  }

  const handleLocationFilterChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      location_filter: value,
    }))
  }

  const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      date_filter: e.target.value,
    }))
  }

  const handleMonthFilterChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      month_filter: value,
    }))
  }

  const handleYearFilterChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      year_filter: value,
    }))
  }

  const debouncedFilter = useCallback(
    debounce((query: any) => {
      // Remove empty values and 'all' values to clean up URL
      const cleanQuery = pickBy(query, (value) => value && value !== "all" && value !== "")

      // In a real Laravel/Inertia app, this would make a server request
      // For demo purposes, we'll just log the query
        console.log("[v0] Filter query:", cleanQuery)

        router.get(route('alleventsPage'), cleanQuery, {
                preserveState: true,
                replace: true
            })
    }, 300),
    [],
  )

  useEffect(() => {
    const query = {
      ...filters,
    }
    debouncedFilter(query)
  }, [filters, debouncedFilter])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const hasActiveFilters =
    filters.search ||
    filters.status !== "all" ||
    filters.event_type_id !== "all" ||
    filters.organization_id !== "all" ||
    filters.location_filter !== "all" ||
    filters.date_filter ||
    filters.month_filter !== "all" ||
    filters.year_filter !== "all"

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-indigo-950/10">
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-transparent"></div>
          <div className="relative container mx-auto px-4 py-24 lg:py-32">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-5xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20">
                <CalendarDays className="h-4 w-4 text-white" />
                <span className="text-white text-sm font-medium">Discover Amazing Events</span>
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight">
                Event{" "}
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  Calendar
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                Discover, explore, and join incredible events happening in your community and beyond
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-white/80">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                  <span>Premium Events</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-400" />
                  <span>Community Driven</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <span>Real-time Updates</span>
                </div>
              </div>
            </motion.div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 dark:from-gray-950 to-transparent"></div>
        </section>

        <div className="container mx-auto px-4 py-12 -mt-10 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-800/50 p-8 mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Filter Events</h2>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search events by name, location, city, or state..."
                  value={filters.search}
                  onChange={handleSearchChange}
                  className="pl-12 pr-4 py-4 text-lg border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200"
                />
              </div>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
              {/* Event Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Event Type</label>
                <Select value={filters.event_type_id} onValueChange={handleEventTypeChange}>
                  <SelectTrigger className="h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Event Types</SelectItem>
                    {Object.entries(
                      eventTypes.reduce(
                        (acc, eventType) => {
                          const category = eventType.category
                          if (!acc[category]) {
                            acc[category] = []
                          }
                          acc[category].push(eventType)
                          return acc
                        },
                        {} as Record<string, EventType[]>,
                      ),
                    ).map(([category, types]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800">
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

              {/* Organization Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Organization</label>
                <Select value={filters.organization_id} onValueChange={handleOrganizationChange}>
                  <SelectTrigger className="h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder="All Orgs" />
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

              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Location</label>
                <Select value={filters.location_filter} onValueChange={handleLocationFilterChange}>
                  <SelectTrigger className="h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder="All Status" />
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

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Exact Date</label>
                <Input
                  type="date"
                  value={filters.date_filter}
                  onChange={handleDateFilterChange}
                  className="h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Month</label>
                <Select value={filters.month_filter} onValueChange={handleMonthFilterChange}>
                  <SelectTrigger className="h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder="All Months" />
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

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Year</label>
                <Select value={filters.year_filter} onValueChange={handleYearFilterChange}>
                  <SelectTrigger className="h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="flex justify-center">
              <Button
                onClick={clearAllFilters}
                variant="outline"
                className="px-8 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50"
                disabled={!hasActiveFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            </div>
          </motion.div>

          {/* Events Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {totalEvents > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {currentEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <Card className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 h-full flex flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl overflow-hidden">
                        <div className="relative overflow-hidden">
                          <img
                            src={
                              event.poster_image
                                ? "/storage/" + event.poster_image
                                : "/placeholder.svg?height=300&width=400&query=event poster"
                            }
                            alt={event.name}
                            width={400}
                            height={300}
                            className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          <Badge
                            variant="secondary"
                            className={`absolute top-4 right-4 px-3 py-1 rounded-full font-semibold backdrop-blur-sm ${
                              event.status === "upcoming"
                                ? "bg-blue-500/90 text-white border-blue-400"
                                : event.status === "ongoing"
                                  ? "bg-green-500/90 text-white border-green-400"
                                  : event.status === "completed"
                                    ? "bg-gray-500/90 text-white border-gray-400"
                                    : "bg-red-500/90 text-white border-red-400"
                            }`}
                          >
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </Badge>
                          {event.registration_fee && event.registration_fee > 0 && (
                            <div className="absolute top-4 left-4 bg-yellow-500/90 text-white px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm">
                              ${event.registration_fee}
                            </div>
                          )}
                        </div>

                        <CardHeader className="pb-4">
                          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                            {event.name}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                              <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="font-medium">
                                {new Date(event.start_date).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="flex-grow pb-4">
                          <p className="line-clamp-3 text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                            {event.description}
                          </p>
                          <div className="space-y-3">
                            <div className="flex items-center text-sm">
                              <div className="p-1 bg-red-100 dark:bg-red-900 rounded-lg mr-3">
                                <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </div>
                              <span className="text-gray-700 dark:text-gray-300 font-medium">
                                {event.location || "Location TBD"}
                              </span>
                            </div>

                            {event.max_participants && (
                              <div className="flex items-center text-sm">
                                <div className="p-1 bg-green-100 dark:bg-green-900 rounded-lg mr-3">
                                  <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <span className="text-gray-700 dark:text-gray-300">
                                  Max: {event.max_participants} participants
                                </span>
                              </div>
                            )}

                            {event.organization && (
                              <div className="flex items-center text-sm">
                                <div className="p-1 bg-purple-100 dark:bg-purple-900 rounded-lg mr-3">
                                  <Building className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                  {event.organization.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>

                        <CardFooter className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-2">
                            {event.event_type && (
                              <span className="text-xs bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-full font-medium">
                                {event.event_type.name}
                              </span>
                            )}
                          </div>
                          <Link
  href={route('viewEvent', event.id)}
  className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-semibold transition-colors group"
>
  <Eye className="h-4 w-4" />
  View Details
  <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
</Link>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-12">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-6 py-3 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all duration-200"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </Button>

                      <div className="flex gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            onClick={() => handlePageChange(page)}
                            className={
                              currentPage === page
                                ? "px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg"
                                : "px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                            }
                          >
                            {page}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-6 py-3 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all duration-200"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <span className="sm:hidden">Next</span>
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 px-4 py-2 rounded-xl backdrop-blur-sm">
                      Showing {startIndex + 1}-{endIndex} of {totalEvents} events
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-800/50 p-12 max-w-md mx-auto">
                  <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl w-fit mx-auto mb-6">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Events Found</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {hasActiveFilters
                      ? "No events match your current filters. Try adjusting your search criteria."
                      : "No events are currently available. Check back soon for new events!"}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      onClick={clearAllFilters}
                      className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl transition-all duration-200"
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </FrontendLayout>
  )
}

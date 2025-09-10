"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Link, router } from "@inertiajs/react"
import { useState, useEffect, useCallback } from "react"
import { debounce, pickBy } from "lodash"
import { Badge } from "@/components/frontend/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import {
    MapPin,
    Calendar,
    DollarSign,
    ChevronLeft,
    ChevronRight,
    Building,
    Users,
    X,
} from "lucide-react"

interface EventType {
    id: number;
    name: string;
    category: string;
    description?: string;
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
    id: number;
    name: string;
}

interface EventsPageProps {
    events: Event[];
    eventTypes: EventType[];
    organizations: Organization[];
    locations: string[];
    search?: string;
    status?: string;
    eventTypeId?: string;
    organizationId?: string;
    locationFilter?: string;
    monthFilter?: string;
    dayFilter?: string;
    dateFilter?: string;
}

export default function EventsPage({ events, eventTypes, organizations, locations, search, status, eventTypeId, organizationId, locationFilter, monthFilter, dayFilter, dateFilter }: EventsPageProps) {
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
        month_filter: string
        day_filter: string
        date_filter: string
    }>({
        search: search || '',
        status: status || 'all',
        event_type_id: eventTypeId || 'all',
        organization_id: organizationId || 'all',
        location_filter: locationFilter || 'all',
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
            search: e.target.value
        }))
    }

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters((prev) => ({
            ...prev,
            status: e.target.value
        }))
    }

    const handleEventTypeChange = (value: string) => {
        setFilters((prev) => ({
            ...prev,
            event_type_id: value
        }))
    }

    const clearAllFilters = () => {
        setFilters({
            search: '',
            status: 'all',
            event_type_id: 'all',
            organization_id: 'all',
            location_filter: 'all',
            month_filter: 'all',
            day_filter: 'all',
            date_filter: ''
        })
    }

    const handleOrganizationChange = (value: string) => {
        setFilters((prev) => ({
            ...prev,
            organization_id: value
        }))
    }

    const handleLocationFilterChange = (value: string) => {
        setFilters((prev) => ({
            ...prev,
            location_filter: value
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

    const debouncedFilter = useCallback(
        debounce((query: any) => {
            router.get(route('alleventsPage'), pickBy(query), {
                preserveState: true,
                replace: true
            })
        }, 300),
        []
    )

    useEffect(() => {
        const query = {
            ...filters,
        }
        debouncedFilter(query)
    }, [filters])

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }



    return (
        <FrontendLayout>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Hero Section */}
                <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 py-16">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-20">
                        <div className="w-full h-full" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                            backgroundRepeat: 'repeat'
                        }}></div>
                    </div>
                    
                    {/* Floating Elements */}
                    <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
                    <div className="absolute top-32 right-20 w-32 h-32 bg-blue-300/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
                    <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-purple-300/20 rounded-full blur-xl animate-pulse delay-2000"></div>
                    <div className="absolute bottom-32 right-1/3 w-24 h-24 bg-indigo-300/20 rounded-full blur-2xl animate-pulse delay-3000"></div>
                    
                    <div className="container mx-auto px-4 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="text-center max-w-5xl mx-auto"
                        >
                            {/* Icon */}
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                                className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 mx-auto"
                            >
                                <Calendar className="w-8 h-8 text-white" />
                            </motion.div>
                            
                            {/* Main Title */}
                            <motion.h1 
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight"
                            >
                                Event
                                <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                                    Calendar
                                </span>
                            </motion.h1>
                            
                            {/* Subtitle */}
                            <motion.p 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.6 }}
                                className="text-lg md:text-xl text-blue-100 dark:text-blue-200 mb-6 max-w-3xl mx-auto leading-relaxed"
                            >
                                Discover amazing events happening in your community
                            </motion.p>
                            
                            {/* Stats */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.8 }}
                                className="flex flex-wrap justify-center gap-6 md:gap-8 mb-6"
                            >
                                <div className="text-center">
                                    <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                                        {totalEvents}+
                                    </div>
                                    <div className="text-blue-200 text-xs md:text-sm">Events Available</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                                        {eventTypes.length}+
                                    </div>
                                    <div className="text-blue-200 text-xs md:text-sm">Event Types</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                                        {organizations.length}+
                                    </div>
                                    <div className="text-blue-200 text-xs md:text-sm">Organizations</div>
                                </div>
                            </motion.div>
                            
                        </motion.div>
                    </div>
                    
                </section>

                <div className="container-fluid mx-auto px-4 py-12">
                    {/* Search and Filter Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Search & Filter Events</h2>
                        
                        {/* Search and Filter Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
                            {/* Search Bar */}
                            <div className="space-y-2 sm:col-span-2 md:col-span-3 lg:col-span-2 xl:col-span-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search Events</label>
                                <Input
                                    type="text"
                                    placeholder="Search by name, location, or description..."
                                    value={filters.search}
                                    onChange={handleSearchChange}
                                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                                />
                            </div>
                            {/* Event Type Filter */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Event Type</label>
                                <Select value={filters.event_type_id} onValueChange={handleEventTypeChange}>
                                    <SelectTrigger className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-lg">
                                        <SelectValue placeholder="All Event Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Event Types</SelectItem>
                                        {Object.entries(eventTypes.reduce((acc, eventType) => {
                                            const category = eventType.category;
                                            if (!acc[category]) {
                                                acc[category] = [];
                                            }
                                            acc[category].push(eventType);
                                            return acc;
                                        }, {} as Record<string, EventType[]>)).map(([category, types]) => (
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
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Organization</label>
                                <Select value={filters.organization_id} onValueChange={handleOrganizationChange}>
                                    <SelectTrigger className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-lg">
                                        <SelectValue placeholder="All Organizations" />
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
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                                <Select value={filters.location_filter} onValueChange={handleLocationFilterChange}>
                                    <SelectTrigger className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-lg">
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
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                                    <SelectTrigger className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-lg">
                                        <SelectValue placeholder="All Statuses" />
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

                            {/* Month Filter */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Month</label>
                                <Select value={filters.month_filter} onValueChange={handleMonthFilterChange}>
                                    <SelectTrigger className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-lg">
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

                            {/* Day Filter */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Day</label>
                                <Select value={filters.day_filter} onValueChange={handleDayFilterChange}>
                                    <SelectTrigger className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-lg">
                                        <SelectValue placeholder="All Days" />
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

                            {/* Date Filter */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Exact Date</label>
                                <Input
                                    type="date"
                                    value={filters.date_filter}
                                    onChange={(e) => handleDateFilterChange(e.target.value)}
                                    className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-lg"
                                />
                            </div>
                            {/* Clear Filters Button */}
                            <div className="space-y-2 flex flex-col justify-end">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 opacity-0">Clear</label>
                                <Button
                                    onClick={clearAllFilters}
                                    variant="outline"
                                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    disabled={!filters.search && filters.status === 'all' && filters.event_type_id === 'all' && filters.organization_id === 'all' && filters.location_filter === 'all' && filters.month_filter === 'all' && filters.day_filter === 'all' && !filters.date_filter}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Clear All
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Events Grid */}
                    <div className="space-y-6">
                        {/* Results Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Event Calendar
                                    {totalEvents > 0 && (
                                        <span className="text-lg font-normal text-gray-600 dark:text-gray-400 ml-2">
                                            ({totalEvents} found)
                                        </span>
                                    )}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    Discover amazing events happening in your community
                                </p>
                            </div>
                        </div>

                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                            {totalEvents > 0 ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {currentEvents.map((event, index) => (
                                            <motion.div
                                                key={event.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                                className="group"
                                            >
                                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 hover:-translate-y-1 h-full flex flex-col">
                                                    {/* Event Poster */}
                                                    <div className="relative h-64 overflow-hidden">
                                                        <img
                                                            src={event.poster_image ? '/storage/' + event.poster_image : "/placeholder.svg"}
                                                            alt={event.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                                        
                                                        {/* Event Status */}
                                                        <div className="absolute top-4 right-4">
                                                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                                                                event.status === 'upcoming' ? 'bg-blue-500 text-white shadow-lg' :
                                                                event.status === 'ongoing' ? 'bg-green-500 text-white shadow-lg' :
                                                                event.status === 'completed' ? 'bg-gray-500 text-white shadow-lg' :
                                                                'bg-red-500 text-white shadow-lg'
                                                            }`}>
                                                                {event.status}
                                                            </span>
                                                        </div>

                                                        {/* Event Type */}
                                                        {event.event_type && (
                                                            <div className="absolute top-4 left-4">
                                                                <span className="px-3 py-1.5 bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white rounded-full text-xs font-semibold backdrop-blur-sm">
                                                                    {event.event_type.name}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Event Date Overlay */}
                                                        <div className="absolute bottom-4 left-4 right-4">
                                                            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                                    <div>
                                                                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                                                                            {new Date(event.start_date).toLocaleDateString('en-US', {
                                                                                weekday: 'long',
                                                                                month: 'long',
                                                                                day: 'numeric'
                                                                            })}
                                                                        </div>
                                                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                                                            {new Date(event.start_date).toLocaleDateString('en-US', {
                                                                                year: 'numeric'
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Event Details */}
                                                    <div className="p-6 flex-1 flex flex-col">
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                            {event.name}
                                                        </h3>

                                                        {/* Organization Name */}
                                                        {(event.user?.organization || event.organization || event.user?.name) && (
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <Building className="h-4 w-4 text-gray-500" />
                                                                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                                    {event.user?.organization?.name || event.organization?.name || event.user?.name || 'Creator'}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3 leading-relaxed">
                                                            {event.description}
                                                        </p>

                                                        {/* Event Info */}
                                                        <div className="space-y-3 mb-6 flex-1">
                                                            <div className="flex items-center gap-3 text-sm">
                                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                                </div>
                                                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                                    {event.location || 'Location TBD'}
                                                                </span>
                                                            </div>
                                                            
                                                            {event.registration_fee && event.registration_fee > 0 && (
                                                                <div className="flex items-center gap-3 text-sm">
                                                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                                                        <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                    </div>
                                                                    <span className="text-gray-700 dark:text-gray-300 font-semibold">
                                                                        ${event.registration_fee}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {event.max_participants && (
                                                                <div className="flex items-center gap-3 text-sm">
                                                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                                                        <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                                    </div>
                                                                    <span className="text-gray-700 dark:text-gray-300">
                                                                        {event.max_participants} participants max
                                                                    </span>
                                                                </div>
                                                            )}

                                                        </div>

                                                        {/* Action Button */}
                                                        <div className="mt-auto">
                                                            <Link 
                                                                href={route('viewEvent', event.id)} 
                                                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-blue-500/25"
                                                            >
                                                                <Calendar className="h-4 w-4" />
                                                                Join Event
                                                                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="mt-12">
                                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                                        Showing <span className="font-semibold text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
                                                        <span className="font-semibold text-gray-900 dark:text-white">{endIndex}</span> of{' '}
                                                        <span className="font-semibold text-gray-900 dark:text-white">{totalEvents}</span> events
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => handlePageChange(currentPage - 1)}
                                                            disabled={currentPage === 1}
                                                            className="px-4 py-2 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <ChevronLeft className="h-4 w-4 mr-2" />
                                                            Previous
                                                        </Button>

                                                        <div className="flex gap-1">
                                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                                <Button
                                                                    key={page}
                                                                    variant={currentPage === page ? "default" : "outline"}
                                                                    onClick={() => handlePageChange(page)}
                                                                    className={`px-3 py-2 min-w-[40px] ${
                                                                        currentPage === page
                                                                            ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                                                                            : "border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600"
                                                                    }`}
                                                                >
                                                                    {page}
                                                                </Button>
                                                            ))}
                                                        </div>

                                                        <Button
                                                            variant="outline"
                                                            onClick={() => handlePageChange(currentPage + 1)}
                                                            disabled={currentPage === totalPages}
                                                            className="px-4 py-2 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Next
                                                            <ChevronRight className="h-4 w-4 ml-2" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 max-w-md mx-auto">
                                        <Calendar className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No events found</h3>
                                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                                            {filters.search || (filters.status && filters.status !== 'all') || (filters.event_type_id && filters.event_type_id !== 'all') || (filters.organization_id && filters.organization_id !== 'all') || (filters.location_filter && filters.location_filter !== 'all') || (filters.month_filter && filters.month_filter !== 'all') || (filters.day_filter && filters.day_filter !== 'all')
                                                ? "Try adjusting your search criteria or filters to find more events."
                                                : "No events are currently available. Check back later for new events!"
                                            }
                                        </p>
                                        <Button
                                            onClick={clearAllFilters}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                                        >
                                            Clear All Filters
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

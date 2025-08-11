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
}

interface Organization {
    id: number;
    name: string;
}

interface EventsPageProps {
    events: Event[];
    eventTypes: EventType[];
    organizations: Organization[];
    search?: string;
    status?: string;
    eventTypeId?: string;
    organizationId?: string;
}

export default function EventsPage({ events, eventTypes, organizations, search, status, eventTypeId, organizationId }: EventsPageProps) {
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
    }>({
        search: search || '',
        status: status || 'all',
        event_type_id: eventTypeId || 'all',
        organization_id: organizationId || 'all'
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
            organization_id: 'all'
        })
    }

    const handleOrganizationChange = (value: string) => {
        setFilters((prev) => ({
            ...prev,
            organization_id: value
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
                <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-20">
                    <div className="container mx-auto px-4">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="text-center max-w-4xl mx-auto"
                        >
                            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">Events</h1>
                            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                                Discover amazing events happening in your community
                            </p>
                        </motion.div>
                    </div>
                </section>

                <div className="container-fluid mx-auto px-4 py-12">
                    {/* Search and Filter Section */}
                    <div className="flex flex-col lg:flex-row gap-4 mb-8">
                        <div className="flex-1">
                            <Input
                                type="text"
                                placeholder="Search events by name or address location city state"
                                value={filters.search}
                                onChange={handleSearchChange}
                                className="w-full p-3 border rounded-lg"
                            />
                        </div>
                        <div className="lg:w-48">
                            <Select value={filters.event_type_id} onValueChange={handleEventTypeChange}>
                                <SelectTrigger className="w-full">
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
                        <div className="lg:w-48">
                            <Select value={filters.organization_id} onValueChange={handleOrganizationChange}>
                                <SelectTrigger className="w-full">
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
                        <div className="lg:w-48">
                            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                                <SelectTrigger className="w-full">
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
                        <div className="lg:w-auto">
                            <Button
                                onClick={clearAllFilters}
                                variant="outline"
                                className="w-full lg:w-auto px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                disabled={!filters.search && filters.status === 'all' && filters.event_type_id === 'all' && filters.organization_id === 'all'}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Clear Filters
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Events Grid */}
                        <div className="lg:col-span-4">
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                                {totalEvents > 0 ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {currentEvents.map((event) => (
                                                <Card key={event.id} className="hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                                                    <div className="relative overflow-hidden">
                                                        <img
                                                            src={event.poster_image ? '/storage/' + event.poster_image : "/placeholder.svg"}
                                                            alt={event.name}
                                                            width={400}
                                                            height={200}
                                                            className="w-full h-48 object-cover"
                                                        />
                                                        <Badge 
                                                            variant="secondary" 
                                                            className={`absolute top-2 right-2 ${
                                                                event.status === 'upcoming' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                                event.status === 'ongoing' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                                event.status === 'completed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' :
                                                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                            }`}
                                                        >
                                                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <CardHeader>
                                                        <CardTitle className="text-xl">{event.name}</CardTitle>
                                                        <CardDescription className="mt-1">
                                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                                <Calendar className="h-4 w-4" />
                                                                <span>
                                                                    {new Date(event.start_date).toLocaleDateString('en-US', {
                                                                        weekday: 'long',
                                                                        year: 'numeric',
                                                                        month: 'long',
                                                                        day: 'numeric'
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </CardDescription>
                                                    </CardHeader>

                                                    <CardContent className="flex-grow">
                                                        <p className="line-clamp-3 text-muted-foreground mb-4">{event.description}</p>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center text-sm">
                                                                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                                                <span>{event.location || 'Location TBD'}</span>
                                                            </div>

                                                            {event.registration_fee && event.registration_fee > 0 && (
                                                                <div className="flex items-center text-sm">
                                                                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                                                                    <span>Registration Fee: ${event.registration_fee}</span>
                                                                </div>
                                                            )}

                                                            {event.max_participants && (
                                                                <div className="flex items-center text-sm">
                                                                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                                                                    <span>Max Participants: {event.max_participants}</span>
                                                                </div>
                                                            )}

                                                           
                                                            {event.organization && (
                                                                <div className="flex items-center text-sm">
                                                                    <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                                                                    <span>{event.organization.name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </CardContent>

                                                    <CardFooter className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            {event.event_type && (
                                                                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                                                    {event.event_type.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <Link href={route('viewEvent', event.id)} className="text-primary hover:underline text-sm font-medium">
                                                            View details
                                                        </Link>
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                        </div>

                                        {/* Pagination */}
                                        {totalPages > 1 && (
                                            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 pt-8">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handlePageChange(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                                                    >
                                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                                        <span className="hidden sm:inline">Previous</span>
                                                        <span className="sm:hidden">Prev</span>
                                                    </Button>

                                                    <div className="flex gap-1">
                                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                            <Button
                                                                key={page}
                                                                variant={currentPage === page ? "default" : "outline"}
                                                                onClick={() => handlePageChange(page)}
                                                                className={
                                                                    currentPage === page
                                                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                                                        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
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
                                                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                                                    >
                                                        <span className="hidden sm:inline">Next</span>
                                                        <span className="sm:hidden">Next</span>
                                                        <ChevronRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                </div>

                                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-0 sm:ml-4">
                                                    Showing {startIndex + 1}-{endIndex} of {totalEvents} events
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-12">
                                        <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No events found</h3>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            {filters.search || (filters.status && filters.status !== 'all') || (filters.event_type_id && filters.event_type_id !== 'all') || (filters.organization_id && filters.organization_id !== 'all')
                                                ? "Try adjusting your search criteria or filters."
                                                : "No events are currently available."
                                            }
                                        </p>
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

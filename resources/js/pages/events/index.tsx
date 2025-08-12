import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Plus, Search, Filter, Calendar, MapPin, Users, DollarSign, Edit, Trash2, Eye, EyeOff, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/frontend/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/frontend/ui/button';
import { Input } from '@/components/frontend/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/frontend/ui/select';
import { useState } from 'react';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Events',
        href: '/events',
    },
];

type EventType = {
    id: number;
    name: string;
    category: string;
    description?: string;
};

type Event = {
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
    visibility: 'public' | 'private';
    max_participants?: number;
    registration_fee?: number;
    requirements?: string;
    contact_info?: string;
    event_type?: EventType;
    organization?: {
        id: number;
        name: string;
    };
    created_at: string;
    updated_at: string;
};

type Props = {
    events: {
        data: Event[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    eventTypes: EventType[];
    userRole: string;
};

export default function EventsIndex({ events, eventTypes, userRole }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [visibilityFilter, setVisibilityFilter] = useState('all');
    const [eventTypeFilter, setEventTypeFilter] = useState('all');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'upcoming':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'ongoing':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'completed':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const getVisibilityColor = (visibility: string) => {
        switch (visibility) {
            case 'public':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'private':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleDelete = async (eventId: number) => {
        if (confirm('Are you sure you want to delete this event?')) {
            try {
                const response = await fetch(`/events/${eventId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': (window as any).Laravel?.csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                    },
                });
                
                if (response.ok) {
                    showSuccessToast('Event deleted successfully!');
                    window.location.reload();
                } else {
                    showErrorToast('Failed to delete event.');
                }
            } catch (error) {
                showErrorToast('An error occurred while deleting the event.');
            }
        }
    };

    const filteredEvents = events.data.filter(event => {
        const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            event.location.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
        const matchesVisibility = visibilityFilter === 'all' || event.visibility === visibilityFilter;
        const matchesEventType = eventTypeFilter === 'all' || event.event_type?.id.toString() === eventTypeFilter;
        
        return matchesSearch && matchesStatus && matchesVisibility && matchesEventType;
    });

    const clearAllFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setVisibilityFilter('all');
        setEventTypeFilter('all');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Events" />
            <div className="flex flex-col gap-6 m-3 md:m-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events</h1>
                        <p className="text-gray-600 dark:text-gray-300">
                            Manage your organization's events and activities
                        </p>
                    </div>
                    {userRole === 'organization' && (
                        <Link href={route('events.create')}>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Event
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Filters */}
                <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder="Search events..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                                    <SelectTrigger className="w-48">
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
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="upcoming">Upcoming</SelectItem>
                                        <SelectItem value="ongoing">Ongoing</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder="All Visibility" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Visibility</SelectItem>
                                        <SelectItem value="public">Public</SelectItem>
                                        <SelectItem value="private">Private</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={clearAllFilters}
                                    variant="outline"
                                    size="sm"
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    disabled={!searchTerm && statusFilter === 'all' && visibilityFilter === 'all' && eventTypeFilter === 'all'}
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Events Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map((event) => (
                        <Card key={event.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                            <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center relative">
                                {event.poster_image ? (
                                    <img 
                                        src={`/storage/${event.poster_image}`} 
                                        alt={event.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Calendar className="h-12 w-12 text-white" />
                                )}
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <Badge 
                                        variant="secondary" 
                                        className={getStatusColor(event.status)}
                                    >
                                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                    </Badge>
                                    <Badge 
                                        variant="secondary" 
                                        className={getVisibilityColor(event.visibility)}
                                    >
                                        {event.visibility === 'public' ? (
                                            <Eye className="h-3 w-3 mr-1" />
                                        ) : (
                                            <EyeOff className="h-3 w-3 mr-1" />
                                        )}
                                        {event.visibility.charAt(0).toUpperCase() + event.visibility.slice(1)}
                                    </Badge>
                                </div>
                            </div>
                            
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                                        {event.name}
                                    </h3>
                                    {event.registration_fee ? (
                                        <span className="text-sm font-medium text-green-600">
                                            ${event.registration_fee}
                                        </span>
                                    ) : (
                                        <span className="text-sm text-gray-500">Free</span>
                                    )}
                                </div>
                                
                                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                                    {event.description}
                                </p>
                                
                                <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>{formatDate(event.start_date)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        <span className="line-clamp-1">{event.location}</span>
                                    </div>
                                    {event.max_participants && (
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            <span>{event.max_participants} participants</span>
                                        </div>
                                    )}
                                    {event.event_type && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                                {event.event_type.name}
                                            </span>
                                        </div>
                                    )}
                                    {userRole === 'admin' && event.organization && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                                {event.organization.name}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex gap-2">
                                    <Link href={route('events.show', event.id)} className="flex-1">
                                        <Button size="sm" variant="outline" className="w-full">
                                            <Eye className="h-4 w-4 mr-2" />
                                            View
                                        </Button>
                                    </Link>
                                    {(userRole === 'admin' || userRole === 'organization') && (
                                        <>
                                            <Link href={route('events.edit', event.id)}>
                                                <Button size="sm" variant="outline">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => handleDelete(event.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Empty State */}
                {filteredEvents.length === 0 && (
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <CardContent className="p-12 text-center">
                            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No events found
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                {searchTerm || statusFilter !== 'all' || visibilityFilter !== 'all' || eventTypeFilter !== 'all'
                                    ? 'Try adjusting your search or filters.'
                                    : 'Get started by creating your first event.'
                                }
                            </p>
                            {userRole === 'organization' && !searchTerm && statusFilter === 'all' && visibilityFilter === 'all' && eventTypeFilter === 'all' && (
                                <Link href={route('events.create')}>
                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Your First Event
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {events.last_page > 1 && (
                    <div className="flex justify-center mt-8">
                        <nav className="flex items-center gap-2">
                            {Array.from({ length: events.last_page }, (_, i) => i + 1).map((page) => (
                                <Link
                                    key={page}
                                    href={route('events.index', { page })}
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                                        page === events.current_page
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {page}
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}
            </div>
        </AppLayout>
    );
} 
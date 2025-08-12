import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, Edit, Trash2, Phone, Mail, Globe, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/frontend/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/frontend/ui/button';
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
    {
        title: 'Event Details',
        href: '/events/show',
    },
];

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
    max_participants?: number;
    registration_fee?: number;
    requirements?: string;
    contact_info?: string;
    event_type?: {
        id: number;
        name: string;
        category: string;
        description?: string;
    };
    organization?: {
        id: number;
        name: string;
        email?: string;
        phone?: string;
        website?: string;
    };
    created_at: string;
    updated_at: string;
};

type Props = {
    event: Event;
    userRole?: string;
};

export default function ShowEvent({ event, userRole }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);

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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            setIsDeleting(true);
            try {
                const response = await fetch(`/events/${event.id}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': (window as any).Laravel?.csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                    },
                });
                
                if (response.ok) {
                    showSuccessToast('Event deleted successfully!');
                    window.location.href = route('events.index');
                } else {
                    showErrorToast('Failed to delete event.');
                }
            } catch (error) {
                showErrorToast('An error occurred while deleting the event.');
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const getFullAddress = () => {
        const parts = [event.address, event.city, event.state, event.zip].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : event.location;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={event.name} />
            <div className="flex flex-col gap-6 m-3 md:m-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{event.name}</h1>
                            <p className="text-gray-600 dark:text-gray-300">
                                Event Details
                            </p>
                        </div>
                    </div>
                    
                    {(userRole === 'admin' || userRole === 'organization') && (
                        <div className="flex gap-2">
                            <Link href={route('events.edit', event.id)}>
                                <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                            </Link>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="text-red-600 hover:text-red-700"
                            >
                                {isDeleting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                ) : (
                                    <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                Delete
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Event Poster */}
                        {event.poster_image && (
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 overflow-hidden">
                                <img 
                                    src={`/storage/${event.poster_image}`} 
                                    alt={event.name}
                                    className="w-full h-64 object-cover"
                                />
                            </Card>
                        )}

                        {/* Event Description */}
                        <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-gray-900 dark:text-white">About This Event</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {event.description}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Event Details */}
                        <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-gray-900 dark:text-white">Event Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-5 w-5 text-gray-500" />
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Start Date</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {formatDate(event.start_date)}
                                            </p>
                                        </div>
                                    </div>

                                    {event.end_date && (
                                        <div className="flex items-center gap-3">
                                            <Clock className="h-5 w-5 text-gray-500" />
                                            <div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">End Date</p>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {formatDate(event.end_date)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <MapPin className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {getFullAddress()}
                                        </p>
                                    </div>
                                </div>

                                {event.event_type && (
                                    <div className="flex items-center gap-3">
                                        <div className="h-5 w-5 text-gray-500 flex items-center justify-center">
                                            <span className="text-xs font-bold">🎯</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Event Type</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {event.event_type.name}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {event.event_type.category}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {event.max_participants && (
                                    <div className="flex items-center gap-3">
                                        <Users className="h-5 w-5 text-gray-500" />
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Maximum Participants</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {event.max_participants} people
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <DollarSign className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Registration Fee</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {event.registration_fee ? `$${event.registration_fee}` : 'Free'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Requirements */}
                        {event.requirements && (
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-gray-900 dark:text-white">Requirements</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {event.requirements}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Contact Information */}
                        {event.contact_info && (
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-gray-900 dark:text-white">Contact Information</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {event.contact_info}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Status */}
                        <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-gray-900 dark:text-white">Event Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Badge 
                                    variant="secondary" 
                                    className={`${getStatusColor(event.status)} text-sm font-medium px-3 py-1`}
                                >
                                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                </Badge>
                            </CardContent>
                        </Card>

                        {/* Organization Info */}
                        {event.organization && (
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-gray-900 dark:text-white flex items-center">
                                        <User className="mr-2 h-5 w-5" />
                                        Organizing Organization
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {event.organization.name}
                                        </p>
                                    </div>
                                    
                                    {event.organization.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-500" />
                                            <a 
                                                href={`mailto:${event.organization.email}`}
                                                className="text-blue-600 hover:text-blue-700 text-sm"
                                            >
                                                {event.organization.email}
                                            </a>
                                        </div>
                                    )}
                                    
                                    {event.organization.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-gray-500" />
                                            <a 
                                                href={`tel:${event.organization.phone}`}
                                                className="text-blue-600 hover:text-blue-700 text-sm"
                                            >
                                                {event.organization.phone}
                                            </a>
                                        </div>
                                    )}
                                    
                                    {event.organization.website && (
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-4 w-4 text-gray-500" />
                                            <a 
                                                href={event.organization.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-700 text-sm"
                                            >
                                                Visit Website
                                            </a>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Quick Actions */}
                        {/* <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-gray-900 dark:text-white">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                    Register for Event
                                </Button>
                                <Button variant="outline" className="w-full">
                                    Share Event
                                </Button>
                                <Button variant="outline" className="w-full">
                                    Add to Calendar
                                </Button>
                            </CardContent>
                        </Card> */}

                        {/* Event Statistics */}
                        <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-gray-900 dark:text-white">Event Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Created</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {new Date(event.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Last Updated</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {new Date(event.updated_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Event ID</span>
                                    <span className="text-gray-900 dark:text-white font-mono">
                                        #{event.id}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
} 
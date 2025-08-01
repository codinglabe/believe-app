import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, Upload, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/frontend/ui/card';
import { Button } from '@/components/frontend/ui/button';
import { Input } from '@/components/frontend/ui/input';
import { Textarea } from '@/components/frontend/ui/textarea';
import { Label } from '@/components/frontend/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/frontend/ui/select';
import { useState, useEffect } from 'react';
import { showErrorToast } from '@/lib/toast';

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
        title: 'Edit Event',
        href: '/events/edit',
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
    created_at: string;
    updated_at: string;
};

type Props = {
    event: Event;
};

export default function EditEvent({ event }: Props) {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    const { data, setData, post, processing, errors } = useForm({
        _method: 'put',
        name: event.name,
        description: event.description,
        start_date: event.start_date.slice(0, 16), // Format for datetime-local input
        end_date: event.end_date ? event.end_date.slice(0, 16) : '',
        location: event.location,
        address: event.address || '',
        city: event.city || '',
        state: event.state || '',
        zip: event.zip || '',
        status: event.status,
        max_participants: event.max_participants?.toString() || '',
        registration_fee: event.registration_fee?.toString() || '',
        requirements: event.requirements || '',
        contact_info: event.contact_info || '',
        poster_image: null as File | null,
    });

    // Set initial image preview if event has a poster
    useEffect(() => {
        if (event.poster_image) {
            setImagePreview(`/storage/${event.poster_image}`);
        }
    }, [event.poster_image]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('poster_image', file);
            
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('events.update', event.id), {
            onError: (errors) => {
                Object.values(errors).forEach(error => {
                    showErrorToast(error);
                });
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Event" />
            <div className="flex flex-col gap-6 m-3 md:m-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    {/* <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button> */}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Event</h1>
                        <p className="text-gray-600 dark:text-gray-300">
                            Update your event information
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Basic Information */}
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-gray-900 dark:text-white">Basic Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="name">Event Name *</Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="Enter event name"
                                            className={errors.name ? 'border-red-500' : ''}
                                        />
                                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="description">Description *</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Describe your event..."
                                            rows={4}
                                            className={errors.description ? 'border-red-500' : ''}
                                        />
                                        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="start_date">Start Date & Time *</Label>
                                            <Input
                                                id="start_date"
                                                type="datetime-local"
                                                value={data.start_date}
                                                onChange={(e) => setData('start_date', e.target.value)}
                                                className={errors.start_date ? 'border-red-500' : ''}
                                            />
                                            {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>}
                                        </div>

                                        <div>
                                            <Label htmlFor="end_date">End Date & Time</Label>
                                            <Input
                                                id="end_date"
                                                type="datetime-local"
                                                value={data.end_date}
                                                onChange={(e) => setData('end_date', e.target.value)}
                                                className={errors.end_date ? 'border-red-500' : ''}
                                            />
                                            {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Location Information */}
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-gray-900 dark:text-white flex items-center">
                                        <MapPin className="mr-2 h-5 w-5" />
                                        Location Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="location">Location Name *</Label>
                                        <Input
                                            id="location"
                                            value={data.location}
                                            onChange={(e) => setData('location', e.target.value)}
                                            placeholder="e.g., Community Center, Grand Hotel"
                                            className={errors.location ? 'border-red-500' : ''}
                                        />
                                        {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="address">Street Address</Label>
                                        <Input
                                            id="address"
                                            value={data.address}
                                            onChange={(e) => setData('address', e.target.value)}
                                            placeholder="123 Main Street"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="city">City</Label>
                                            <Input
                                                id="city"
                                                value={data.city}
                                                onChange={(e) => setData('city', e.target.value)}
                                                placeholder="City"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="state">State</Label>
                                            <Input
                                                id="state"
                                                value={data.state}
                                                onChange={(e) => setData('state', e.target.value)}
                                                placeholder="State"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="zip">ZIP Code</Label>
                                            <Input
                                                id="zip"
                                                value={data.zip}
                                                onChange={(e) => setData('zip', e.target.value)}
                                                placeholder="12345"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Event Details */}
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-gray-900 dark:text-white">Event Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="max_participants">Maximum Participants</Label>
                                            <Input
                                                id="max_participants"
                                                type="number"
                                                value={data.max_participants}
                                                onChange={(e) => setData('max_participants', e.target.value)}
                                                placeholder="100"
                                                min="1"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="registration_fee">Registration Fee ($)</Label>
                                            <Input
                                                id="registration_fee"
                                                type="number"
                                                value={data.registration_fee}
                                                onChange={(e) => setData('registration_fee', e.target.value)}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="requirements">Requirements</Label>
                                        <Textarea
                                            id="requirements"
                                            value={data.requirements}
                                            onChange={(e) => setData('requirements', e.target.value)}
                                            placeholder="Any special requirements for participants..."
                                            rows={3}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="contact_info">Contact Information</Label>
                                        <Textarea
                                            id="contact_info"
                                            value={data.contact_info}
                                            onChange={(e) => setData('contact_info', e.target.value)}
                                            placeholder="Phone, email, or other contact details..."
                                            rows={3}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Status */}
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-gray-900 dark:text-white">Event Status</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="upcoming">Upcoming</SelectItem>
                                            <SelectItem value="ongoing">Ongoing</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>

                            {/* Poster Image */}
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-gray-900 dark:text-white">Event Poster</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                                        {imagePreview ? (
                                            <div className="space-y-4">
                                                <img 
                                                    src={imagePreview} 
                                                    alt="Preview" 
                                                    className="w-full h-32 object-cover rounded"
                                                />
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => {
                                                        setImagePreview(null);
                                                        setData('poster_image', null);
                                                    }}
                                                >
                                                    Remove Image
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                                                <div>
                                                    <Label htmlFor="poster_image" className="cursor-pointer">
                                                        <span className="text-blue-600 hover:text-blue-700">Upload an image</span>
                                                        <span className="text-gray-500"> or drag and drop</span>
                                                    </Label>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        PNG, JPG, GIF up to 2MB
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        <Input
                                            id="poster_image"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Actions */}
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        <Button 
                                            type="submit" 
                                            className="w-full bg-blue-600 hover:bg-blue-700"
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <div className="flex items-center">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                    Updating...
                                                </div>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Update Event
                                                </>
                                            )}
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            className="w-full"
                                            onClick={() => window.history.back()}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
} 
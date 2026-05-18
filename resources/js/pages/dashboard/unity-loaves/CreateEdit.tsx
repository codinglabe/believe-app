import React from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Save } from 'lucide-react';
import GoogleMapPicker from './components/GoogleMapPicker';
import InputError from '@/components/input-error';

interface UnityLoavesLocation {
    id: number;
    name: string;
    description: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
    phone: string | null;
    website: string | null;
    meal_type: string;
    accepts_food_donations: boolean;
    dropoff_instructions: string | null;
    is_active: boolean;
}

interface CreateEditProps {
    location: UnityLoavesLocation | null;
}

export default function CreateEdit({ location }: CreateEditProps) {
    const isEditing = !!location;

    const { data, setData, post, put, processing, errors } = useForm({
        name: location?.name || '',
        description: location?.description || '',
        address: location?.address || '',
        city: location?.city || '',
        state: location?.state || '',
        zip: location?.zip || '',
        latitude: location?.latitude ? Number(location.latitude) : null,
        longitude: location?.longitude ? Number(location.longitude) : null,
        phone: location?.phone || '',
        website: location?.website || '',
        meal_type: location?.meal_type || 'food_pantry',
        accepts_food_donations: location?.accepts_food_donations ?? false,
        dropoff_instructions: location?.dropoff_instructions || '',
        is_active: location?.is_active ?? true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isEditing) {
            put(route('dashboard.unity-loaves.update', location.id));
        } else {
            post(route('dashboard.unity-loaves.store'));
        }
    };

    return (
        <AppLayout>
            <Head title={isEditing ? 'Edit Unity Loaves Location' : 'Add Unity Loaves Location'} />
            
            <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" asChild>
                            <Link href={route('dashboard.unity-loaves.index')}>
                                <ChevronLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {isEditing ? 'Edit Location' : 'Add New Location'}
                        </h1>
                    </div>
                </div>

                <div className="rounded-lg border bg-card p-6 shadow-sm">
                    <form onSubmit={submit} className="space-y-8">
                        
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Basic Details */}
                            <div className="space-y-4 md:col-span-2">
                                <h3 className="text-lg font-semibold">Basic Information</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="name">Location Name <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            rows={3}
                                        />
                                        <InputError message={errors.description} />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="meal_type">Primary Service Type <span className="text-destructive">*</span></Label>
                                        <Select
                                            value={data.meal_type}
                                            onValueChange={(val) => setData('meal_type', val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="food_pantry">Food Pantry</SelectItem>
                                                <SelectItem value="hot_meals">Hot Meals</SelectItem>
                                                <SelectItem value="community_meal">Community Meal</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.meal_type} />
                                    </div>
                                </div>
                            </div>

                            {/* Address & Contact */}
                            <div className="space-y-4 md:col-span-2">
                                <h3 className="text-lg font-semibold">Address & Contact</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="address">Street Address</Label>
                                        <Input
                                            id="address"
                                            value={data.address}
                                            onChange={(e) => setData('address', e.target.value)}
                                        />
                                        <InputError message={errors.address} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={data.city}
                                            onChange={(e) => setData('city', e.target.value)}
                                        />
                                        <InputError message={errors.city} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="state">State</Label>
                                            <Input
                                                id="state"
                                                value={data.state}
                                                onChange={(e) => setData('state', e.target.value)}
                                                maxLength={50}
                                            />
                                            <InputError message={errors.state} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="zip">ZIP Code</Label>
                                            <Input
                                                id="zip"
                                                value={data.zip}
                                                onChange={(e) => setData('zip', e.target.value)}
                                            />
                                            <InputError message={errors.zip} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                        />
                                        <InputError message={errors.phone} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="website">Website URL</Label>
                                        <Input
                                            id="website"
                                            type="url"
                                            value={data.website}
                                            onChange={(e) => setData('website', e.target.value)}
                                            placeholder="https://"
                                        />
                                        <InputError message={errors.website} />
                                    </div>
                                </div>
                            </div>

                            {/* Map Picker */}
                            <div className="space-y-4 md:col-span-2">
                                <div className="flex justify-between items-end mb-2">
                                    <h3 className="text-lg font-semibold">Map Location</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="latitude">Latitude</Label>
                                        <Input
                                            id="latitude"
                                            type="number"
                                            step="any"
                                            value={data.latitude !== null ? data.latitude : ''}
                                            onChange={(e) => setData('latitude', e.target.value !== '' ? Number(e.target.value) : null)}
                                            placeholder="e.g. 28.5383"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="longitude">Longitude</Label>
                                        <Input
                                            id="longitude"
                                            type="number"
                                            step="any"
                                            value={data.longitude !== null ? data.longitude : ''}
                                            onChange={(e) => setData('longitude', e.target.value !== '' ? Number(e.target.value) : null)}
                                            placeholder="e.g. -81.3792"
                                        />
                                    </div>
                                </div>

                                <GoogleMapPicker 
                                    lat={data.latitude || undefined}
                                    lng={data.longitude || undefined}
                                    onChange={(lat, lng) => {
                                        setData(prev => ({
                                            ...prev,
                                            latitude: lat,
                                            longitude: lng
                                        }));
                                    }}
                                />
                                <InputError message={errors.latitude} />
                                <InputError message={errors.longitude} />
                            </div>

                            {/* Additional Info */}
                            <div className="space-y-4 md:col-span-2 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Donations & Settings</h3>
                                
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="accepts_food_donations" 
                                        checked={data.accepts_food_donations}
                                        onCheckedChange={(checked) => setData('accepts_food_donations', checked === true)}
                                    />
                                    <Label htmlFor="accepts_food_donations">This location accepts food donations</Label>
                                </div>

                                {data.accepts_food_donations && (
                                    <div className="space-y-2 mt-4 ml-6 pl-4 border-l-2">
                                        <Label htmlFor="dropoff_instructions">Drop-off Instructions</Label>
                                        <Textarea
                                            id="dropoff_instructions"
                                            value={data.dropoff_instructions}
                                            onChange={(e) => setData('dropoff_instructions', e.target.value)}
                                            placeholder="Where to go, when to drop off, etc."
                                            rows={2}
                                        />
                                        <InputError message={errors.dropoff_instructions} />
                                    </div>
                                )}

                                <div className="flex items-center space-x-2 pt-4">
                                    <Checkbox 
                                        id="is_active" 
                                        checked={data.is_active}
                                        onCheckedChange={(checked) => setData('is_active', checked === true)}
                                    />
                                    <Label htmlFor="is_active">Location is active and visible in directory</Label>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-4 border-t pt-6">
                            <Button variant="outline" asChild>
                                <Link href={route('dashboard.unity-loaves.index')}>Cancel</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                <Save className="mr-2 h-4 w-4" />
                                {isEditing ? 'Save Changes' : 'Create Location'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}

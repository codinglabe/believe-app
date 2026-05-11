import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, MapPin, Edit, Trash2, Globe, Phone } from 'lucide-react';
import { ConfirmationModal } from '@/components/confirmation-modal';

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface UnityLoavesLocation {
    id: number;
    name: string;
    description: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    website: string | null;
    meal_type: string;
    is_active: boolean;
}

interface IndexProps {
    locations: PaginatedData<UnityLoavesLocation>;
}

export default function Index({ locations }: IndexProps) {
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);

    const handleDelete = () => {
        if (!itemToDelete) return;

        router.delete(route('dashboard.unity-loaves.destroy', itemToDelete), {
            onSuccess: () => setItemToDelete(null),
        });
    };

    const formatMealType = (type: string) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <AppLayout>
            <Head title="Unity Loaves Locations" />

            <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Unity Loaves Directory</h1>
                        <p className="text-muted-foreground mt-1">Manage your food distribution and meal locations.</p>
                    </div>
                    <Button asChild>
                        <Link href={route('dashboard.unity-loaves.create')}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Location
                        </Link>
                    </Button>
                </div>

                {locations.data.length === 0 ? (
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col items-center justify-center p-12 text-center">
                        <div className="bg-primary/10 p-3 rounded-full mb-4">
                            <MapPin className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold">No locations added</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm mb-6">
                            You haven't added any Unity Loaves locations yet. Add your first location to appear in the community directory.
                        </p>
                        <Button asChild variant="outline">
                            <Link href={route('dashboard.unity-loaves.create')}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Location
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {locations.data.map((location) => (
                            <Card key={location.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <CardTitle className="line-clamp-1">{location.name}</CardTitle>
                                            <CardDescription className="mt-1">
                                                <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-secondary-foreground/10">
                                                    {formatMealType(location.meal_type)}
                                                </span>
                                                {!location.is_active && (
                                                    <span className="ml-2 inline-flex items-center rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/20">
                                                        Inactive
                                                    </span>
                                                )}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 text-sm text-muted-foreground space-y-2">
                                    {location.address && (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                            <span>
                                                {location.address}
                                                {(location.city || location.state) && <><br/>{location.city}, {location.state}</>}
                                            </span>
                                        </div>
                                    )}
                                    {location.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 shrink-0" />
                                            <span>{location.phone}</span>
                                        </div>
                                    )}
                                    {location.website && (
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-4 w-4 shrink-0" />
                                            <a href={location.website} target="_blank" rel="noreferrer" className="text-primary hover:underline line-clamp-1">
                                                {location.website}
                                            </a>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="pt-4 border-t flex justify-between">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={route('dashboard.unity-loaves.edit', location.id)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setItemToDelete(location.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Pagination (if applicable) */}
                {locations.last_page > 1 && (
                    <div className="mt-8 flex justify-center">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                            {locations.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    className={`px-4 py-2 text-sm border rounded-md ${
                                        link.active
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-background hover:bg-muted text-muted-foreground'
                                    } ${!link.url && 'opacity-50 cursor-not-allowed'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={!!itemToDelete}
                onChange={(open) => !open && setItemToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Location"
                description="Are you sure you want to delete this location? This action cannot be undone."
                confirmLabel="Delete Location"
            />
        </AppLayout>
    );
}

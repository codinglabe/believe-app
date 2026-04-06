import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { LayoutGrid, Search, X, UserCheck, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Volunteers', href: '/volunteers' },
];

interface Volunteer {
    id: number;
    created_at: string;
    job_post: {
        title: string;
    };
    user: {
        name: string;
        email?: string;
    };
    city: string;
    state: string;
    country: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
}

interface Props {
    volunteers: {
        data: Volunteer[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    filters: {
        per_page: number;
        page: number;
        search: string;
    };
    allowedPerPage: number[];
}

export default function Index({ volunteers, filters, allowedPerPage }: Props) {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    const handlePerPageChange = (newPerPage: number) => {
        setLoading(true);
        router.get(
            "/volunteers",
            {
                per_page: newPerPage,
                page: 1,
                search: filters.search,
            },
            {
                preserveState: false,
                onFinish: () => setLoading(false),
            },
        );
    };

    const handlePageChange = (page: number) => {
        if (page < 1 || page > volunteers.last_page) return;
        setLoading(true);
        router.get(
            "/volunteers",
            {
                per_page: filters.per_page,
                page: page,
                search: filters.search,
            },
            {
                preserveState: false,
                onFinish: () => setLoading(false),
            },
        );
    };

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        const timeout = setTimeout(() => {
            setLoading(true);
            router.get(
                "/volunteers",
                {
                    per_page: filters.per_page,
                    page: 1,
                    search: value,
                },
                {
                    preserveState: false,
                    onFinish: () => setLoading(false),
                },
            );
        }, 500);
        setSearchTimeout(timeout);
    };

    const clearSearch = () => {
        setSearchTerm('');
        setLoading(true);
        router.get(
            "/volunteers",
            {
                per_page: filters.per_page,
                page: 1,
                search: '',
            },
            {
                preserveState: false,
                onFinish: () => setLoading(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Volunteers" />
            <div className="flex flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Volunteers</CardTitle>
                                <CardDescription>
                                    Approved volunteers in your organization. Total: {volunteers.total.toLocaleString()} volunteers
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mt-4 flex-wrap">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search by volunteer name or position ..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            {filters.search && (
                                <div className="text-sm text-gray-500">
                                    Searching for: "{filters.search}"
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        <div className="flex flex-col gap-4">
                            <div className="rounded-md border">
                                <table className="min-w-full rounded-md border border-muted w-full overflow-x-auto table-responsive text-sm text-left text-foreground">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 font-medium min-w-32">Volunteer Name</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Position</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Location</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Emergency Contact</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Joined Date</th>
                                            <th className="px-4 py-3 font-medium min-w-32 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {volunteers.data.map((volunteer) => (
                                            <tr key={volunteer.id} className="border-t border-muted hover:bg-muted/50 transition">
                                                <td className="px-4 py-3 min-w-32 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <UserCheck className="h-4 w-4 text-green-600" />
                                                        {volunteer.user.name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 min-w-32">
                                                    <Badge variant="outline">{volunteer.job_post.title}</Badge>
                                                </td>
                                                <td className="px-4 py-3 min-w-32">
                                                    {volunteer.city && volunteer.state ? (
                                                        <span>{volunteer.city}, {volunteer.state}</span>
                                                    ) : volunteer.country ? (
                                                        <span>{volunteer.country}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 min-w-32">
                                                    <div>
                                                        <div className="font-medium">{volunteer.emergency_contact_name || '-'}</div>
                                                        {volunteer.emergency_contact_phone && (
                                                            <div className="text-xs text-muted-foreground">{volunteer.emergency_contact_phone}</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 min-w-32">
                                                    {new Date(volunteer.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 min-w-28 text-right w-[1%] whitespace-nowrap">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => router.visit(`/volunteers/${volunteer.id}`)}
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {volunteers.data.length === 0 && (
                                    <div className="text-center py-12">
                                        <LayoutGrid className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-foreground mb-2">No volunteers found</h3>
                                        <p className="text-muted-foreground">
                                            {filters.search ?
                                                "Try adjusting your search criteria" :
                                                "There are no approved volunteers yet. Volunteers will appear here after their applications are approved."}
                                        </p>
                                    </div>
                                )}
                                {/* Pagination Controls */}
                                {volunteers.total > 0 && (
                                    <div className="flex items-center justify-between mt-6 px-4 mb-6 text-sm text-muted-foreground flex-wrap gap-4">
                                        <div>
                                            Showing {volunteers.from?.toLocaleString() || 0} to {volunteers.to?.toLocaleString() || 0} of{" "}
                                            {volunteers.total.toLocaleString()} volunteers.
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {/* Per Page Selector */}
                                            <div className="flex items-center gap-2">
                                                <label className="text-sm text-muted-foreground">Per page:</label>
                                                <select
                                                    className="border rounded px-2 py-1 text-sm bg-background"
                                                    value={filters.per_page}
                                                    onChange={(e) => handlePerPageChange(Number.parseInt(e.target.value))}
                                                    disabled={loading}
                                                >
                                                    {allowedPerPage.map((num) => (
                                                        <option key={num} value={num}>
                                                            {num}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {/* Pagination Buttons */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-muted transition"
                                                    onClick={() => handlePageChange(volunteers.current_page - 1)}
                                                    disabled={!volunteers.prev_page_url || loading}
                                                >
                                                    Prev
                                                </button>
                                                <span className="px-2">
                                                    Page {volunteers.current_page} of {volunteers.last_page}
                                                </span>
                                                <button
                                                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-muted transition"
                                                    onClick={() => handlePageChange(volunteers.current_page + 1)}
                                                    disabled={!volunteers.next_page_url || loading}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

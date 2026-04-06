import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Edit, LayoutGrid, Plus, Search, Trash2, X } from 'lucide-react';
import { showErrorToast } from '@/lib/toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';
import { PermissionButton } from '@/components/ui/permission-guard';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Job Posts', href: '/job-posts' },
];

interface JobPost {
    id: number;
    title: string;
    type: string;
    location_type: string;
    status: string;
    application_deadline: string;
    position: {
        title: string;
        category?: {
            name: string;
        }
    };
    organization: {
        name: string;
    };
}

interface Props {
    jobPosts: {
        data: JobPost[];
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
        status: string;
    };
    statusOptions: Record<string, string>;
    allowedPerPage: number[];
}

export default function Index({ jobPosts, filters, statusOptions, allowedPerPage }: Props) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Props | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    const handleDelete = (item: Props) => {
            setItemToDelete(item);
            setDeleteDialogOpen(true);
        };

        const confirmDelete = () => {
            if (itemToDelete) {
                router.delete(route('job-posts.destroy', itemToDelete.id), {
                    onError: () => {
                        showErrorToast("Failed to delete category");
                    },
                });
                setDeleteDialogOpen(false);
                setItemToDelete(null);
            }
        };

        const handlePerPageChange = (newPerPage: number) => {
            setLoading(true);
            router.get(
                "/job-posts",
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
            if (page < 1 || page > jobPosts.last_page) return;
            setLoading(true);
            router.get(
                "/job-posts",
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
                    "/job-posts",
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
                "/job-posts",
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

    const handleStatusFilter = (value: string) => {
        router.get('/job-posts', { status: value }, { preserveState: true });
    };

    const getStatusBadge = (status: string) => {
        const statusClasses = {
            draft: 'bg-gray-100 text-gray-800',
            open: 'bg-green-100 text-green-800',
            closed: 'bg-red-100 text-red-800',
            filled: 'bg-blue-100 text-blue-800',
        };
        return (
            <Badge className={`${statusClasses[status as keyof typeof statusClasses]}`}>
                {statusOptions[status]}
            </Badge>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Job Posts" />
            <div className="flex flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Job Posts</CardTitle>
                                <CardDescription>
                                    Manage all job postings. Total: {jobPosts.total.toLocaleString()} job posts
                                </CardDescription>
                            </div>
                            <PermissionButton permission="job.posts.create">
                                <Link href={route('job-posts.create')}>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Job Post
                                    </Button>
                                </Link>
                            </PermissionButton>
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search by job title ..."
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
                                            <th className="px-4 py-3 font-medium min-w-32">Title</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Position Category</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Position</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Organization</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Type</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Location</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Status</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Deadline</th>
                                            <th className="px-4 py-3 font-medium min-w-32 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jobPosts.data.map((item) => (
                                            <tr key={item.id} className="border-t border-muted hover:bg-muted/50 transition">
                                                <td className="px-4 py-3 min-w-32 font-medium">{item.title}</td>
                                                <td  className="px-4 py-3 min-w-32">{item.position?.category?.name}</td>
                                                <td  className="px-4 py-3 min-w-32">{item.position?.title}</td>
                                                <td  className="px-4 py-3 min-w-32">{item.organization?.name}</td>
                                                <td  className="px-4 py-3 min-w-32">
                                                    <Badge variant="outline" className="capitalize">
                                                        {item.type}
                                                    </Badge>
                                                </td>
                                                <td  className="px-4 py-3 min-w-32">
                                                    <Badge variant="outline" className="capitalize">
                                                        {item.location_type}
                                                    </Badge>
                                                </td>
                                                <td  className="px-4 py-3 min-w-32">{getStatusBadge(item.status)}</td>
                                                <td  className="px-4 py-3 min-w-32">
                                                    {item.application_deadline || '-'}
                                                </td>
                                                 <td className="px-4 py-3 min-w-28 text-right w-[1%] whitespace-nowrap">
                                                <div className="flex justify-end gap-2">
                                                    <PermissionButton permission="job.posts.edit">
                                                        <Link href={route('job-posts.edit', item.id)}>
                                                            <Button variant="outline" size="sm">
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </Button>
                                                        </Link>
                                                    </PermissionButton>
                                                    <PermissionButton permission="job.posts.delete">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(item)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </Button>
                                                    </PermissionButton>
                                                </div>
                                            </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {jobPosts.data.length === 0 && (
                                <div className="text-center py-12">
                                    <LayoutGrid className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-foreground mb-2">No Job post found</h3>
                                    <p className="text-muted-foreground">Create your first job post to get started.</p>
                                </div>
                            )}
                            {/* Pagination Controls */}
                            {jobPosts.total > 0 && (
                                <div className="flex items-center justify-between mt-6 px-4 mb-6 text-sm text-muted-foreground flex-wrap gap-4">
                                    <div>
                                        Showing {jobPosts.from?.toLocaleString() || 0} to {jobPosts.to?.toLocaleString() || 0} of{" "}
                                        {jobPosts.total.toLocaleString()} category(ies).
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
                                                onClick={() => handlePageChange(jobPosts.current_page - 1)}
                                                disabled={!jobPosts.prev_page_url || loading}
                                            >
                                                Prev
                                            </button>
                                            <span className="px-2">
                                                Page {jobPosts.current_page} of {jobPosts.last_page}
                                            </span>
                                            <button
                                                className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-muted transition"
                                                onClick={() => handlePageChange(jobPosts.current_page + 1)}
                                                disabled={!jobPosts.next_page_url || loading}
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

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Delete</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete category "{itemToDelete?.title}"? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={confirmDelete}>
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

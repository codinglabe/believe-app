import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Eye, FileText, Search, X } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"
import { PermissionButton } from '@/components/ui/permission-guard';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Deductibility Codes",
        href: "/deductibility-codes",
    },
]

interface DeductibilityCode {
    id: number;
    deductibility_code: number;
    description: string;
    created_at: string;
    updated_at: string;
}

interface Props {
    deductibilityCodes: {
        data: DeductibilityCode[];
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

export default function Index({ deductibilityCodes, filters, allowedPerPage }: Props) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<DeductibilityCode | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    const handleDelete = (item: DeductibilityCode) => {
        setItemToDelete(item);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            router.delete(route('deductibility-codes.destroy', itemToDelete.id), {
                onError: (errors) => {
                    showErrorToast("Failed to delete deductibility code");
                },
            });
            setDeleteDialogOpen(false);
            setItemToDelete(null);
        }
    };

    const handlePerPageChange = (newPerPage: number) => {
        setLoading(true);
        router.get(
            "/deductibility-codes",
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
        if (page < 1 || page > deductibilityCodes.last_page) return;

        setLoading(true);
        router.get(
            "/deductibility-codes",
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

        // Clear existing timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Set new timeout for search
        const timeout = setTimeout(() => {
            setLoading(true);
            router.get(
                "/deductibility-codes",
                {
                    per_page: filters.per_page,
                    page: 1, // Reset to first page when searching
                    search: value,
                },
                {
                    preserveState: false,
                    onFinish: () => setLoading(false),
                },
            );
        }, 500); // 500ms delay

        setSearchTimeout(timeout);
    };

    const clearSearch = () => {
        setSearchTerm('');
        setLoading(true);
        router.get(
            "/deductibility-codes",
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
            <Head title="Deductibility Codes" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Deductibility Codes</CardTitle>
                                <CardDescription>
                                    Manage deductibility codes for your organization. Total: {deductibilityCodes.total.toLocaleString()} codes
                                </CardDescription>
                            </div>
                            <PermissionButton permission="deductibility.code.create">
                                <Link href={route('deductibility-codes.create')}>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Deductibility Code
                                    </Button>
                                </Link>
                            </PermissionButton>
                        </div>

                        {/* Search Bar */}
                        <div className="flex items-center gap-4 mt-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search by code or description..."
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
                        {loading && (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 animate-spin mr-2 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                Loading deductibility codes...
                            </div>
                        )}

                        <div className="w-full overflow-x-auto">
                            <table className="min-w-full rounded-md border border-muted w-full overflow-x-auto table-responsive text-sm text-left text-foreground">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium min-w-32">Code</th>
                                        <th className="px-4 py-3 font-medium min-w-64">Description</th>
                                        {/* <th className="px-4 py-3 font-medium min-w-32">Created</th> */}
                                        {/* <th className="px-4 py-3 font-medium min-w-32">Updated</th> */}
                                        <th className="px-4 py-3 font-medium min-w-28 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deductibilityCodes.data.map((item) => (
                                        <tr key={item.id} className="border-t border-muted hover:bg-muted/50 transition">
                                            <td className="px-4 py-3 min-w-32">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-blue-500" />
                                                    <Badge variant="secondary" className="font-medium">
                                                        {item.deductibility_code}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 min-w-64">
                                                <span className="truncate block max-w-md" title={item.description}>
                                                    {item.description}
                                                </span>
                                            </td>
                                            {/* <td className="px-4 py-3 min-w-32">
                                                <div className="text-sm">
                                                    <div>{new Date(item.created_at).toLocaleDateString()}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(item.created_at).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 min-w-32">
                                                <div className="text-sm">
                                                    <div>{new Date(item.updated_at).toLocaleDateString()}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(item.updated_at).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </td> */}
                                            <td className="px-4 py-3 min-w-28 text-right w-[1%] whitespace-nowrap">
                                                <div className="flex justify-end gap-2">
                                                    {/* <Link href={route('classification-codes.show', item.id)}>
                                                        <Button variant="outline" size="sm">
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View
                                                        </Button>
                                                    </Link> */}
                                                    <PermissionButton permission="deductibility.code.edit">
                                                        <Link href={route('deductibility-codes.edit', item.id)}>
                                                            <Button variant="outline" size="sm">
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </Button>
                                                        </Link>
                                                    </PermissionButton>
                                                    <PermissionButton permission="deductibility.code.delete">
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

                            {deductibilityCodes.data.length === 0 && (
                                <div className="text-center py-12">
                                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-foreground mb-2">No deductibility codes found</h3>
                                    <p className="text-muted-foreground">Create your first deductibility code to get started.</p>
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {deductibilityCodes.total > 0 && (
                                <div className="flex items-center justify-between mt-6 px-4 mb-6 text-sm text-muted-foreground flex-wrap gap-4">
                                    <div>
                                        Showing {deductibilityCodes.from?.toLocaleString() || 0} to {deductibilityCodes.to?.toLocaleString() || 0} of{" "}
                                        {deductibilityCodes.total.toLocaleString()} deductibility code(s).
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
                                                onClick={() => handlePageChange(deductibilityCodes.current_page - 1)}
                                                disabled={!deductibilityCodes.prev_page_url || loading}
                                            >
                                                Prev
                                            </button>

                                            <span className="px-2">
                                                Page {deductibilityCodes.current_page} of {deductibilityCodes.last_page}
                                            </span>

                                            <button
                                                className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-muted transition"
                                                onClick={() => handlePageChange(deductibilityCodes.current_page + 1)}
                                                disabled={!deductibilityCodes.next_page_url || loading}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Delete</DialogTitle>
                            <DialogDescription>
                                    Are you sure you want to delete deductibility code "{itemToDelete?.deductibility_code}"? This action cannot be undone.
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

import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/admin/ui/input';
import { Combobox } from '@/components/admin/ui/combobox';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { LayoutGrid, Search, X, Plus, Edit, Trash2, Clock, Eye, Calendar, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Volunteers', href: '/volunteers' },
    { title: 'Time Sheet', href: '/volunteers/timesheet' },
];

interface Timesheet {
    id: number;
    work_date: string;
    start_date?: string;
    end_date?: string;
    hours: number;
    description: string;
    notes: string;
    status: 'pending' | 'approved' | 'rejected' | 'in_progress';
    is_completion_request?: boolean;
    created_at: string;
    job_application: {
        id: number;
        user: {
            name: string;
        };
        job_post: {
            title: string;
        };
    };
    created_by: {
        name: string;
    };
}

interface Volunteer {
    id: number;
    name: string;
    position?: string;
}

interface Props {
    timesheets: {
        data: Timesheet[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    volunteers: Volunteer[];
    filters: {
        per_page: number;
        page: number;
        search: string;
        volunteer_id: string;
        work_date: string;
    };
    allowedPerPage: number[];
}

export default function Index({ timesheets, volunteers, filters, allowedPerPage }: Props) {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const [volunteerFilter, setVolunteerFilter] = useState(filters.volunteer_id);
    const [workDate, setWorkDate] = useState(filters.work_date || '');
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handlePerPageChange = (newPerPage: number) => {
        setLoading(true);
        router.get(
            "/volunteers/timesheet",
            {
                per_page: newPerPage,
                page: 1,
                search: filters.search,
                volunteer_id: filters.volunteer_id,
                work_date: filters.work_date,
            },
            {
                preserveState: false,
                onFinish: () => setLoading(false),
            },
        );
    };

    const handlePageChange = (page: number) => {
        if (page < 1 || page > timesheets.last_page) return;
        setLoading(true);
        router.get(
            "/volunteers/timesheet",
            {
                per_page: filters.per_page,
                page: page,
                search: filters.search,
                volunteer_id: filters.volunteer_id,
                work_date: filters.work_date,
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
                "/volunteers/timesheet",
                {
                    per_page: filters.per_page,
                    page: 1,
                    search: value,
                    volunteer_id: volunteerFilter,
                    work_date: workDate,
                },
                {
                    preserveState: false,
                    onFinish: () => setLoading(false),
                },
            );
        }, 500);
        setSearchTimeout(timeout);
    };

    const handleVolunteerFilter = (value: string) => {
        setVolunteerFilter(value);
        setLoading(true);
        router.get(
            "/volunteers/timesheet",
            {
                per_page: filters.per_page,
                page: 1,
                search: filters.search,
                volunteer_id: value,
                work_date: workDate,
            },
            {
                preserveState: false,
                onFinish: () => setLoading(false),
            },
        );
    };

    const handleWorkDateChange = (value: string) => {
        setWorkDate(value);
        setLoading(true);
        router.get(
            "/volunteers/timesheet",
            {
                per_page: filters.per_page,
                page: 1,
                search: filters.search,
                volunteer_id: volunteerFilter,
                work_date: value,
            },
            {
                preserveState: false,
                onFinish: () => setLoading(false),
            },
        );
    };

    const handleDelete = (id: number) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!deleteId) return;
        
        setLoading(true);
        router.delete(`/volunteers/timesheet/${deleteId}`, {
            onSuccess: () => {
                showSuccessToast('Time sheet entry deleted successfully');
                setIsDeleteModalOpen(false);
                setDeleteId(null);
            },
            onError: () => {
                showErrorToast('Failed to delete time sheet entry');
            },
            onFinish: () => setLoading(false),
        });
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    const getStatusColor = (status: string) => {
        const colors = {
            'pending': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
            'approved': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
            'rejected': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
            'in_progress': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        };
        return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    };

    const getStatusText = (status: string) => {
        const texts = {
            'pending': 'Pending Review',
            'approved': 'Approved',
            'rejected': 'Rejected',
            'in_progress': 'In Progress',
        };
        return texts[status] || status;
    };


    // Convert decimal hours to HH:MM:SS format
    const formatTime = (decimalHours: number): string => {
        // Ensure we're working with a number and handle any precision issues
        const hoursValue = typeof decimalHours === 'string' ? parseFloat(decimalHours) : decimalHours;
        
        // Use precise calculation to avoid floating point errors
        // Multiply by 3600 and round to nearest integer to avoid precision issues
        const totalSeconds = Math.round(hoursValue * 3600);
        const hours = Math.floor(totalSeconds / 3600);
        const remainingSeconds = totalSeconds % 3600;
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        
        const parts: string[] = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
        
        return parts.join(' ');
    };

    // Calculate total hours
    const totalHours = timesheets.data.reduce((sum, ts) => sum + parseFloat(ts.hours.toString()), 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Time Sheet" />
            <div className="flex flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-foreground">Time Sheet</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage volunteer hours. Total: {timesheets.total.toLocaleString()} entries
                            {totalHours > 0 && ` • ${formatTime(totalHours)} total time`}
                        </p>
                    </div>
                    <Link href="/volunteers/timesheet/create" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Entry
                        </Button>
                    </Link>
                </div>

                {/* Search and Filter Section */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
                        <Input
                            type="text"
                            placeholder="Search by volunteer name or description ..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pl-10 pr-10"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => handleSearch('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <div className="relative flex items-center gap-2 w-full sm:w-[180px]">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
                        <Input
                            id="workDate"
                            type="date"
                            value={workDate}
                            onChange={(e) => handleWorkDateChange(e.target.value)}
                            className="w-full pl-10 pr-10"
                            placeholder="Work Date"
                        />
                        {workDate && (
                            <button
                                type="button"
                                onClick={() => handleWorkDateChange('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-[200px]">
                        <label htmlFor="volunteerFilter" className="sr-only">Filter by volunteer</label>
                        <Combobox
                            fetchUrl={route('volunteers.timesheet.fetch-volunteers')}
                            initialOptions={[
                                { value: '', label: 'All Volunteers' },
                                ...volunteers.map((volunteer) => ({
                                    value: volunteer.id.toString(),
                                    label: volunteer.position ? `${volunteer.name} - ${volunteer.position}` : volunteer.name,
                                }))
                            ]}
                            value={volunteerFilter || ''}
                            onValueChange={(value) => handleVolunteerFilter(value || '')}
                            placeholder="All Volunteers"
                            searchPlaceholder="Search volunteers..."
                            emptyText="No volunteer found."
                            className="w-full"
                        />
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-col gap-4">
                    {timesheets.data.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {timesheets.data.map((timesheet) => (
                                <Card key={timesheet.id} className="hover:shadow-md transition-all duration-200 border border-border/50 overflow-hidden">
                                    <div className="p-3 space-y-2">
                                        {/* Header with Volunteer Name */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-sm text-foreground truncate">
                                                    {timesheet.job_application.user.name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {timesheet.job_application.job_post.title}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Date and Hours */}
                                        <div className="space-y-2 pt-1 border-t border-border/30">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>
                                                        {timesheet.start_date && timesheet.end_date 
                                                            ? `${formatDate(timesheet.start_date)} - ${formatDate(timesheet.end_date)}`
                                                            : formatDate(timesheet.work_date)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{formatTime(parseFloat(timesheet.hours.toString()))}</span>
                                                </div>
                                            </div>
                                            {/* Status Badges Below Date Range */}
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {timesheet.is_completion_request && (
                                                    <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800 text-xs px-1.5 py-0.5">
                                                        Completion Request
                                                    </Badge>
                                                )}
                                                <Badge className={`${getStatusColor(timesheet.status)} border text-xs px-1.5 py-0.5`}>
                                                    {getStatusText(timesheet.status)}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Description Preview */}
                                        {timesheet.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
                                                {timesheet.description}
                                            </p>
                                        )}

                                        {/* View Button */}
                                        <div className="pt-2 border-t border-border/30">
                                            <Link href={`/volunteers/timesheet/${timesheet.id}`} className="w-full">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="w-full h-7 text-xs"
                                                >
                                                    <Eye className="h-3 w-3 mr-1.5" />
                                                    View Details
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <LayoutGrid className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">No time sheet entries found</h3>
                            <p className="text-muted-foreground mb-4">
                                {filters.search || filters.volunteer_id ?
                                    "Try adjusting your search or filter criteria" :
                                    "There are no time sheet entries yet."}
                            </p>
                            <Link href="/volunteers/timesheet/create">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add First Entry
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {timesheets.total > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-border">
                        <div className="text-sm text-muted-foreground">
                            Showing <span className="font-medium text-foreground">{timesheets.from?.toLocaleString() || 0}</span> to{" "}
                            <span className="font-medium text-foreground">{timesheets.to?.toLocaleString() || 0}</span> of{" "}
                            <span className="font-medium text-foreground">{timesheets.total.toLocaleString()}</span> entries
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Per Page Selector */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-muted-foreground whitespace-nowrap">Per page:</label>
                                <select
                                    className="border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(timesheets.current_page - 1)}
                                    disabled={!timesheets.prev_page_url || loading}
                                >
                                    Prev
                                </Button>
                                <div className="px-3 py-1.5 text-sm text-muted-foreground">
                                    Page <span className="font-medium text-foreground">{timesheets.current_page}</span> of{" "}
                                    <span className="font-medium text-foreground">{timesheets.last_page}</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(timesheets.current_page + 1)}
                                    disabled={!timesheets.next_page_url || loading}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Time Sheet Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this time sheet entry? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteModalOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}


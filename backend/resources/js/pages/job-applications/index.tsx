import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Edit, LayoutGrid, Plus, Search, Trash2, X, Eye } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';
import { Label } from '@/components/ui/label';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Job Applications', href: '/job-applications' },
];

interface JobApplication {
    id: number;
    status: string;
    created_at: string;
    updated_at: string;
    job_post: {
        title: string;
    };
    user: {
        name: string;
    };
    address: string;
    city: string;
    state: string;
    country: string;
    date_of_birth: string;
    postal_code: string;
    emergency_contact_name: string;
    emergency_contact_relationship: string;
    emergency_contact_phone: string;
    volunteer_experience: string;
    work_or_education_background: string;
    languages_spoken: string[];
    certifications: string[];
    medical_conditions: string;
    physical_limitations: string;
    consent_background_check: boolean;
    drivers_license_number: string;
    willing_background_check: boolean;
    ever_convicted: boolean;
    conviction_explanation: string;
    reference_name: string;
    reference_relationship: string;
    reference_contact: string;
    agreed_to_terms: boolean;
    digital_signature: string;
    signed_date: string;
    tshirt_size: string;
    heard_about_us: string;
    social_media_handle: string;
}

interface Props {
    jobApplications: {
        data: JobApplication[];
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

export default function Index({ jobApplications, filters, statusOptions, allowedPerPage }: Props) {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState('');

    const handlePerPageChange = (newPerPage: number) => {
        setLoading(true);
        router.get(
            "/job-applications",
            {
                per_page: newPerPage,
                page: 1,
                search: filters.search,
                status: filters.status,
            },
            {
                preserveState: false,
                onFinish: () => setLoading(false),
            },
        );
    };

    const handlePageChange = (page: number) => {
        if (page < 1 || page > jobApplications.last_page) return;
        setLoading(true);
        router.get(
            "/job-applications",
            {
                per_page: filters.per_page,
                page: page,
                search: filters.search,
                status: filters.status,
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
                "/job-applications",
                {
                    per_page: filters.per_page,
                    page: 1,
                    search: value,
                    status: filters.status,
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
            "/job-applications",
            {
                per_page: filters.per_page,
                page: 1,
                search: '',
                status: filters.status,
            },
            {
                preserveState: false,
                onFinish: () => setLoading(false),
            },
        );
    };

    const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setLoading(true);
        router.get(
            "/job-applications",
            {
                per_page: filters.per_page,
                page: 1,
                search: filters.search,
                status: value,
            },
            {
                preserveState: false,
                onFinish: () => setLoading(false),
            },
        );
    };

    const getStatusBadge = (status: string) => {
        const statusClasses = {
            pending: 'bg-yellow-100 text-yellow-800',
            reviewed: 'bg-blue-100 text-blue-800',
            accepted: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
        };
        return (
            <Badge className={`${statusClasses[status as keyof typeof statusClasses]}`}>
                {statusOptions[status]}
            </Badge>
        );
    };

    // Add this utility function at the top of your component file
const formatDate = (dateString: string) => {
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString; // fallback to raw string if parsing fails
  }
};

    const openViewModal = (application: JobApplication) => {
         let signature = application.digital_signature;

        // If the signature is base64 without prefix, add the data URL prefix
        if (signature && !signature.startsWith('data:')) {
            signature = `data:image/png;base64,${signature}`;
        }

        setSelectedApplication({
            ...application,
            digital_signature: signature
        });
        setNewStatus(application.status);
        setIsViewModalOpen(true);
    };

    const closeViewModal = () => {
        setIsViewModalOpen(false);
        setSelectedApplication(null);
        setNewStatus('');
    };

    const handleStatusUpdate = () => {
        if (!selectedApplication || !newStatus) return;

        setLoading(true);
        router.put(`/job-applications/${selectedApplication.id}/update-status`, {
            status: newStatus,
        }, {
            onSuccess: () => {
                showSuccessToast('Status updated successfully');
                closeViewModal();
                router.reload({ only: ['jobApplications'] });
            },
            onError: () => {
                showErrorToast('Failed to update status');
            },
            onFinish: () => setLoading(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Job Applications" />
            <div className="flex flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Job Applications</CardTitle>
                                <CardDescription>
                                    Manage all job applications. Total: {jobApplications.total.toLocaleString()} applications
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mt-4 flex-wrap">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search by applicant name ..."
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
                            <div className="flex items-center gap-2">
                                <label htmlFor="statusFilter" className="sr-only">Filter by status</label>
                                <select
                                    id="statusFilter"
                                    onChange={handleStatusFilter}
                                    value={filters.status}
                                    className="border rounded px-3 py-2 text-sm bg-background w-[180px]"
                                >
                                    <option value="">All Statuses</option>
                                    {Object.entries(statusOptions).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
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
                                            <th className="px-4 py-3 font-medium min-w-32">Applicant</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Job Post</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Applied Date</th>
                                            <th className="px-4 py-3 font-medium min-w-32">Status</th>
                                            <th className="px-4 py-3 font-medium min-w-32 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jobApplications.data.map((application) => (
                                            <tr key={application.id} className="border-t border-muted hover:bg-muted/50 transition">
                                                <td className="px-4 py-3 min-w-32 font-medium">{application.user.name}</td>
                                                <td className="px-4 py-3 min-w-32">{application.job_post.title}</td>
                                                <td className="px-4 py-3 min-w-32">
                                                    {new Date(application.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 min-w-32">
                                                    {getStatusBadge(application.status)}
                                                </td>
                                                <td className="px-4 py-3 min-w-28 text-right w-[1%] whitespace-nowrap">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openViewModal(application)}
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
                                {jobApplications.data.length === 0 && (
                                    <div className="text-center py-12">
                                        <LayoutGrid className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-foreground mb-2">No applications found</h3>
                                        <p className="text-muted-foreground">
                                            {filters.search || filters.status ?
                                                "Try adjusting your search or filter criteria" :
                                                "There are no applications to display"}
                                        </p>
                                    </div>
                                )}
                                {/* Pagination Controls */}
                                {jobApplications.total > 0 && (
                                    <div className="flex items-center justify-between mt-6 px-4 mb-6 text-sm text-muted-foreground flex-wrap gap-4">
                                        <div>
                                            Showing {jobApplications.from?.toLocaleString() || 0} to {jobApplications.to?.toLocaleString() || 0} of{" "}
                                            {jobApplications.total.toLocaleString()} applications.
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
                                                    onClick={() => handlePageChange(jobApplications.current_page - 1)}
                                                    disabled={!jobApplications.prev_page_url || loading}
                                                >
                                                    Prev
                                                </button>
                                                <span className="px-2">
                                                    Page {jobApplications.current_page} of {jobApplications.last_page}
                                                </span>
                                                <button
                                                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-muted transition"
                                                    onClick={() => handlePageChange(jobApplications.current_page + 1)}
                                                    disabled={!jobApplications.next_page_url || loading}
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

            {/* View Application Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Application Details</DialogTitle>
                        <DialogDescription>
                            View and manage this job application
                        </DialogDescription>
                    </DialogHeader>

                    {selectedApplication && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Applicant Name</Label>
                                    <p className="font-medium">{selectedApplication.user.name}</p>
                                </div>
                                <div>
                                    <Label>Job Post</Label>
                                    <p className="font-medium">{selectedApplication.job_post.title}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Application Status</Label>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(selectedApplication.status)}
                                        <select
                                            value={newStatus}
                                            onChange={(e) => setNewStatus(e.target.value)}
                                            disabled={loading}
                                            className="border rounded px-3 py-2 text-sm bg-background w-[180px]"
                                        >
                                            {Object.entries(statusOptions).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <Label>Applied Date</Label>
                                    <p>{new Date(selectedApplication.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-medium mb-2">Personal Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Address</Label>
                                        <p>{selectedApplication.address || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>City</Label>
                                        <p>{selectedApplication.city || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>State/Province</Label>
                                        <p>{selectedApplication.state || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>Country</Label>
                                        <p>{selectedApplication.country || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>Postal Code</Label>
                                        <p>{selectedApplication.postal_code || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>Date of Birth</Label>
                                        <p>{formatDate(selectedApplication.date_of_birth) || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-medium mb-2">Emergency Contact</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>Name</Label>
                                        <p>{selectedApplication.emergency_contact_name || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>Relationship</Label>
                                        <p>{selectedApplication.emergency_contact_relationship || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>Phone</Label>
                                        <p>{selectedApplication.emergency_contact_phone || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-medium mb-2">Background Information</h3>
                                <div className="grid gap-4">
                                    <div>
                                        <Label>Volunteer Experience</Label>
                                        <p>{selectedApplication.volunteer_experience || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>Work/Education Background</Label>
                                        <p>{selectedApplication.work_or_education_background || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>Languages Spoken</Label>
                                        <p>
                                            {selectedApplication.languages_spoken?.join(', ') || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <Label>Certifications</Label>
                                        <p>
                                            {selectedApplication.certifications?.join(', ') || '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-medium mb-2">Additional Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Medical Conditions</Label>
                                        <p>{selectedApplication.medical_conditions || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>Physical Limitations</Label>
                                        <p>{selectedApplication.physical_limitations || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>Driver's License Number</Label>
                                        <p>{selectedApplication.drivers_license_number || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>T-Shirt Size</Label>
                                        <p>{selectedApplication.tshirt_size || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-medium mb-2">References</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label>Reference Name</Label>
                                        <p>{selectedApplication.reference_name || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>Relationship</Label>
                                        <p>{selectedApplication.reference_relationship || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>Contact</Label>
                                        <p>{selectedApplication.reference_contact || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* <div className="border-t pt-4">
                                <h3 className="font-medium mb-2">Signature</h3>
                                <div className="grid gap-4">
                                    <div>
                                        <Label>Signed Date</Label>
                                        <p>{selectedApplication.signed_date || '-'}</p>
                                    </div>
                                    <div>
                                        <Label>Digital Signature</Label>
                                        {selectedApplication.digital_signature ? (
                                            <div className="mt-2 border rounded p-2">
                                                <img
                                                    src={selectedApplication.digital_signature}
                                                    alt="Applicant's signature"
                                                    className="max-w-full h-auto"
                                                />
                                            </div>
                                        ) : (
                                            <p>-</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>Agreed to Terms</Label>
                                        <p>{selectedApplication.agreed_to_terms ? 'Yes' : 'No'}</p>
                                    </div>
                                </div>
                            </div> */}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={closeViewModal}
                            disabled={loading}
                        >
                            Close
                        </Button>
                        <Button
                            onClick={handleStatusUpdate}
                            disabled={loading || !newStatus || newStatus === selectedApplication?.status}
                        >
                            Update Status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

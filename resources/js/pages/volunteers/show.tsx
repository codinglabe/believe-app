import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { ArrowLeft, UserCheck, Calendar, MapPin, Phone, Mail, Clock, FileText } from 'lucide-react';

interface Volunteer {
    id: number;
    created_at: string;
    user: {
        name: string;
        email?: string;
    };
    job_post: {
        title: string;
    };
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    date_of_birth: string;
    emergency_contact_name: string;
    emergency_contact_relationship: string;
    emergency_contact_phone: string;
    volunteer_experience: string;
    work_or_education_background: string;
    languages_spoken: string[];
    certifications: string[];
    medical_conditions: string;
    physical_limitations: string;
    drivers_license_number: string;
    tshirt_size: string;
    timesheets: Array<{
        id: number;
        work_date: string;
        hours: number;
        description: string;
        notes: string;
        created_at: string;
    }>;
}

interface Props {
    volunteer: Volunteer;
    totalHours: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Volunteers', href: '/volunteers' },
];

export default function Show({ volunteer, totalHours }: Props) {
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
            return dateString;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Volunteer: ${volunteer.user.name}`} />
            <div className="flex flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <div className="flex items-center justify-between mb-4">
                    <Link href="/volunteers">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Volunteers
                        </Button>
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Volunteer Information */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <UserCheck className="h-6 w-6 text-green-600" />
                                <div>
                                    <CardTitle>{volunteer.user.name}</CardTitle>
                                    <CardDescription>Volunteer Details</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Position</label>
                                <p className="font-medium">{volunteer.job_post.title}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Email</label>
                                <p>{volunteer.user.email || '-'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                                <p>{formatDate(volunteer.date_of_birth)}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Address</label>
                                <p>
                                    {volunteer.address && (
                                        <>{volunteer.address}<br /></>
                                    )}
                                    {volunteer.city && volunteer.state ? (
                                        <>{volunteer.city}, {volunteer.state} {volunteer.postal_code}</>
                                    ) : volunteer.country ? (
                                        volunteer.country
                                    ) : '-'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Emergency Contact */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Emergency Contact</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Name</label>
                                <p className="font-medium">{volunteer.emergency_contact_name || '-'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Relationship</label>
                                <p>{volunteer.emergency_contact_relationship || '-'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                                <p>{volunteer.emergency_contact_phone || '-'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Background Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Background Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Volunteer Experience</label>
                                <p className="text-sm">{volunteer.volunteer_experience || '-'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Work/Education Background</label>
                                <p className="text-sm">{volunteer.work_or_education_background || '-'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Languages Spoken</label>
                                <p>{volunteer.languages_spoken?.join(', ') || '-'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Certifications</label>
                                <p>{volunteer.certifications?.join(', ') || '-'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Time Sheet Summary */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                <CardTitle>Time Sheet Summary</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Total Hours</label>
                                <p className="text-2xl font-bold text-green-600">{totalHours.toFixed(2)}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Total Entries</label>
                                <p className="text-lg font-medium">{volunteer.timesheets.length}</p>
                            </div>
                            <Link href={`/volunteers/timesheet?volunteer_id=${volunteer.id}`}>
                                <Button className="w-full mt-4">
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Time Sheets
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Time Sheet Entries */}
                {volunteer.timesheets.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Time Sheet Entries</CardTitle>
                            <CardDescription>Last 5 entries</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {volunteer.timesheets.slice(0, 5).map((timesheet) => (
                                    <div key={timesheet.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <p className="font-medium">{formatDate(timesheet.work_date)}</p>
                                            <p className="text-sm text-muted-foreground">{timesheet.description || 'No description'}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline" className="text-lg">
                                                {timesheet.hours} hrs
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}


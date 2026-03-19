import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, User } from 'lucide-react';

interface TimelineRow {
    id: number;
    event_type: string;
    created_at: string;
}

interface Props {
    organization: { id: number; name: string };
    supporter: { id: number; name: string };
    timeline: TimelineRow[];
    isAdmin: boolean;
}

export default function SupporterActivityShow({ organization, supporter, timeline, isAdmin }: Props) {
    const activityIndexHref =
        isAdmin ? `/supporter-activity?organization_id=${organization.id}` : '/supporter-activity';

    const supporterProfileHref =
        isAdmin
            ? `/supporter-activity/supporters/${supporter.id}?organization_id=${organization.id}`
            : `/supporter-activity/supporters/${supporter.id}`;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Supporter Activity', href: activityIndexHref },
        { title: supporter.name, href: supporterProfileHref },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${supporter.name} · Activity`} />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl mx-auto">
                <div>
                    <Link
                        href={activityIndexHref}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to dashboard
                    </Link>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <User className="h-7 w-7 text-muted-foreground" />
                        {supporter.name}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Activity timeline · {organization.name}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Activity timeline</CardTitle>
                        <CardDescription>All recorded events for this supporter with your organization</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Event</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {timeline.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-muted-foreground text-center py-8">
                                            No events.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    timeline.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="whitespace-nowrap text-muted-foreground">
                                                {new Date(row.created_at).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{row.event_type}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

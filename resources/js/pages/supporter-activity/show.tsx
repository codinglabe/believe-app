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
    money_display: string;
    believe_points: number | null;
}

interface Props {
    organization: { id: number; name: string };
    supporter: { id: number; name: string };
    timeline: TimelineRow[];
    isAdmin: boolean;
    dashboardPeriod: '7' | '30' | 'all';
    periodLabels: Record<'7' | '30' | 'all', string>;
}

export default function SupporterActivityShow({
    organization,
    supporter,
    timeline,
    isAdmin,
    dashboardPeriod,
    periodLabels,
}: Props) {
    const indexQuery = new URLSearchParams();
    indexQuery.set('period', dashboardPeriod);
    if (isAdmin) {
        indexQuery.set('organization_id', String(organization.id));
    }
    const activityIndexHref = `/supporter-activity?${indexQuery.toString()}`;

    const profileQuery = new URLSearchParams(indexQuery);
    const supporterProfileHref = `/supporter-activity/supporters/${supporter.id}?${profileQuery.toString()}`;

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
                        Activity timeline · {organization.name} · list uses {periodLabels[dashboardPeriod]} context for navigation
                        only
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Activity timeline</CardTitle>
                        <CardDescription>
                            All recorded events for this supporter with your organization (all time)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Event</TableHead>
                                    <TableHead className="text-right">Money</TableHead>
                                    <TableHead className="text-right">Believe Points</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {timeline.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-muted-foreground text-center py-8">
                                            No events.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    timeline.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="whitespace-nowrap text-muted-foreground">
                                                {new Date(row.created_at).toLocaleString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                })}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{row.event_type}</TableCell>
                                            <TableCell className="text-right tabular-nums">{row.money_display}</TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {row.believe_points != null && row.believe_points > 0
                                                    ? row.believe_points
                                                    : '—'}
                                            </TableCell>
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

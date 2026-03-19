import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Check, TrendingUp, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Supporter Activity', href: '/supporter-activity' },
];

interface ActiveRow {
    supporter_id: number;
    name: string;
    donation: boolean;
    purchase: boolean;
    course: boolean;
    event: boolean;
    volunteer: boolean;
    last_activity: string;
}

interface TopRow {
    rank: number;
    supporter_id: number;
    name: string;
    donations: number;
    purchases: number;
    courses: number;
    events: number;
    volunteers: number;
}

interface OrgOption {
    id: number;
    name: string;
}

interface Props {
    organization: { id: number; name: string } | null;
    summary: {
        active_supporters: number;
        donors: number;
        buyers: number;
        course_participants: number;
        event_participants: number;
        volunteers: number;
    };
    activeSupporters: ActiveRow[];
    topSupporters: TopRow[];
    recentDays: number;
    isAdmin: boolean;
    organizationOptions: OrgOption[];
    selectedOrganizationId: number | null;
}

function CellMark({ on }: { on: boolean }) {
    return <span className="text-center block">{on ? <Check className="inline h-4 w-4 text-emerald-600" /> : '—'}</span>;
}

function supporterProfileUrl(
    supporterId: number,
    isAdmin: boolean,
    selectedOrganizationId: number | null,
): string {
    if (isAdmin && selectedOrganizationId) {
        return `/supporter-activity/supporters/${supporterId}?organization_id=${selectedOrganizationId}`;
    }
    return `/supporter-activity/supporters/${supporterId}`;
}

export default function SupporterActivityIndex({
    organization,
    summary,
    activeSupporters,
    topSupporters,
    recentDays,
    isAdmin,
    organizationOptions,
    selectedOrganizationId,
}: Props) {
    const onOrgChange = (value: string) => {
        router.get(
            '/supporter-activity',
            { organization_id: value },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Supporter Activity" />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <Activity className="h-7 w-7 text-muted-foreground" />
                        Supporter Activity
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {organization
                            ? `Engagement for ${organization.name} · recent window: last ${recentDays} days (active list & summary metric)`
                            : isAdmin
                              ? 'Choose an organization to view supporter engagement.'
                              : 'No organization profile is linked to this account.'}
                    </p>
                </div>

                {isAdmin && organizationOptions.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Organization</CardTitle>
                            <CardDescription>Admins can switch which nonprofit&apos;s activity to view.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-w-md">
                            <Select
                                value={selectedOrganizationId ? String(selectedOrganizationId) : undefined}
                                onValueChange={onOrgChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select organization" />
                                </SelectTrigger>
                                <SelectContent>
                                    {organizationOptions.map((o) => (
                                        <SelectItem key={o.id} value={String(o.id)}>
                                            {o.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>
                )}

                {!organization ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Not available</CardTitle>
                            <CardDescription>
                                {isAdmin && organizationOptions.length === 0
                                    ? 'There are no organizations in the database yet.'
                                    : 'Complete organization setup to track supporter activity.'}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ) : (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Active supporters</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{summary.active_supporters}</div>
                                    <p className="text-xs text-muted-foreground">With any activity in the last {recentDays} days</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Donors</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{summary.donors}</div>
                                    <p className="text-xs text-muted-foreground">Unique supporters (all time)</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Buyers</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{summary.buyers}</div>
                                    <p className="text-xs text-muted-foreground">Marketplace purchases (all time)</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Course participants</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{summary.course_participants}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Event participants</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{summary.event_participants}</div>
                                    <p className="text-xs text-muted-foreground">Course type &quot;event&quot; completed</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Volunteers</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{summary.volunteers}</div>
                                    <p className="text-xs text-muted-foreground">Accepted volunteer applications</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Active supporters</CardTitle>
                                <CardDescription>Recent engagement in the last {recentDays} days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Supporter</TableHead>
                                            <TableHead className="text-center">Donation</TableHead>
                                            <TableHead className="text-center">Purchase</TableHead>
                                            <TableHead className="text-center">Course</TableHead>
                                            <TableHead className="text-center">Event</TableHead>
                                            <TableHead className="text-center">Volunteer</TableHead>
                                            <TableHead className="text-right">Last activity</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activeSupporters.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-muted-foreground text-center py-8">
                                                    No activity in this period yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            activeSupporters.map((row) => (
                                                <TableRow key={row.supporter_id}>
                                                    <TableCell className="font-medium">
                                                        <Link
                                                            href={supporterProfileUrl(
                                                                row.supporter_id,
                                                                isAdmin,
                                                                selectedOrganizationId,
                                                            )}
                                                            className="text-primary hover:underline"
                                                        >
                                                            {row.name}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>
                                                        <CellMark on={row.donation} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <CellMark on={row.purchase} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <CellMark on={row.course} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <CellMark on={row.event} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <CellMark on={row.volunteer} />
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">{row.last_activity}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Top supporters</CardTitle>
                                <CardDescription>Ranked by total tracked actions</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-14">Rank</TableHead>
                                            <TableHead>Supporter</TableHead>
                                            <TableHead className="text-right">Donations</TableHead>
                                            <TableHead className="text-right">Purchases</TableHead>
                                            <TableHead className="text-right">Courses</TableHead>
                                            <TableHead className="text-right">Events</TableHead>
                                            <TableHead className="text-right">Volunteers</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topSupporters.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-muted-foreground text-center py-8">
                                                    No supporter activity recorded yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            topSupporters.map((row) => (
                                                <TableRow key={row.supporter_id}>
                                                    <TableCell>{row.rank}</TableCell>
                                                    <TableCell className="font-medium">
                                                        <Link
                                                            href={supporterProfileUrl(
                                                                row.supporter_id,
                                                                isAdmin,
                                                                selectedOrganizationId,
                                                            )}
                                                            className="text-primary hover:underline"
                                                        >
                                                            {row.name}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="text-right">{row.donations}</TableCell>
                                                    <TableCell className="text-right">{row.purchases}</TableCell>
                                                    <TableCell className="text-right">{row.courses}</TableCell>
                                                    <TableCell className="text-right">{row.events}</TableCell>
                                                    <TableCell className="text-right">{row.volunteers}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    );
}

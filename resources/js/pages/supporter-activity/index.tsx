import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Activity, Check, TrendingUp, Users, X } from 'lucide-react';

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
    money_display: string;
    points_display: string;
}

interface RecentRow {
    id: number;
    supporter_id: number;
    supporter_name: string;
    event_type: string;
    organization_name: string;
    date_display: string;
    money_display: string;
    points_display: string;
}

interface DrillRow {
    supporter_id: number;
    name: string;
    transaction_count: number;
    money_display: string;
    points_display: string;
    last_activity: string;
}

interface OrgOption {
    id: number;
    name: string;
}

type PeriodKey = '7' | '30' | 'all';

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
    recentActivity: RecentRow[];
    metricDrilldown: DrillRow[];
    metric: string | null;
    metricLabels: Record<string, string>;
    period: PeriodKey;
    periodLabels: Record<PeriodKey, string>;
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
    period: string,
): string {
    const q = new URLSearchParams();
    if (isAdmin && selectedOrganizationId) q.set('organization_id', String(selectedOrganizationId));
    q.set('period', period);
    const qs = q.toString();
    return `/supporter-activity/supporters/${supporterId}${qs ? `?${qs}` : ''}`;
}

function navigateDashboard(
    period: string,
    isAdmin: boolean,
    selectedOrganizationId: number | null,
    metric: string | null,
) {
    const params: Record<string, string> = { period };
    if (isAdmin && selectedOrganizationId) params.organization_id = String(selectedOrganizationId);
    if (metric) params.metric = metric;
    router.get('/supporter-activity', params, { preserveState: true, preserveScroll: true });
}

export default function SupporterActivityIndex({
    organization,
    summary,
    activeSupporters,
    topSupporters,
    recentActivity,
    metricDrilldown,
    metric,
    metricLabels,
    period,
    periodLabels,
    isAdmin,
    organizationOptions,
    selectedOrganizationId,
}: Props) {
    const onOrgChange = (value: string) => {
        router.get(
            '/supporter-activity',
            {
                organization_id: value,
                period,
                ...(metric ? { metric } : {}),
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const periodButtons: PeriodKey[] = ['7', '30', 'all'];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Supporter Activity" />

            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                            <Activity className="h-7 w-7 text-muted-foreground" />
                            Supporter Activity
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {organization
                                ? `Engagement for ${organization.name} — who is active, what they did, and money / Believe Points where tracked.`
                                : isAdmin
                                  ? 'Choose an organization to view supporter engagement.'
                                  : 'No organization profile is linked to this account.'}
                        </p>
                    </div>
                    {organization && (
                        <div className="flex flex-col items-stretch sm:items-end gap-2">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time range</span>
                            <div className="flex flex-wrap gap-2">
                                {periodButtons.map((p) => (
                                    <Button
                                        key={p}
                                        type="button"
                                        variant={period === p ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => navigateDashboard(p, isAdmin, selectedOrganizationId, null)}
                                    >
                                        {periodLabels[p]}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
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
                            <button
                                type="button"
                                onClick={() =>
                                    navigateDashboard(period, isAdmin, selectedOrganizationId, 'active_supporters')
                                }
                                className="text-left rounded-lg border bg-card transition hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <Card className="border-0 shadow-none">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">Active supporters</CardTitle>
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{summary.active_supporters}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Unique people with activity · {periodLabels[period]}
                                        </p>
                                        <p className="text-xs text-primary mt-1">Click to list</p>
                                    </CardContent>
                                </Card>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigateDashboard(period, isAdmin, selectedOrganizationId, 'donors')}
                                className="text-left rounded-lg border bg-card transition hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <Card className="border-0 shadow-none">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">Donors</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{summary.donors}</div>
                                        <p className="text-xs text-muted-foreground">{periodLabels[period]}</p>
                                        <p className="text-xs text-primary mt-1">Click to list</p>
                                    </CardContent>
                                </Card>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigateDashboard(period, isAdmin, selectedOrganizationId, 'buyers')}
                                className="text-left rounded-lg border bg-card transition hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <Card className="border-0 shadow-none">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">Buyers</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{summary.buyers}</div>
                                        <p className="text-xs text-muted-foreground">{periodLabels[period]}</p>
                                        <p className="text-xs text-primary mt-1">Click to list</p>
                                    </CardContent>
                                </Card>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    navigateDashboard(period, isAdmin, selectedOrganizationId, 'course_participants')
                                }
                                className="text-left rounded-lg border bg-card transition hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <Card className="border-0 shadow-none">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Course participants</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{summary.course_participants}</div>
                                        <p className="text-xs text-muted-foreground">{periodLabels[period]}</p>
                                        <p className="text-xs text-primary mt-1">Click to list</p>
                                    </CardContent>
                                </Card>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    navigateDashboard(period, isAdmin, selectedOrganizationId, 'event_participants')
                                }
                                className="text-left rounded-lg border bg-card transition hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <Card className="border-0 shadow-none">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Event participants</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{summary.event_participants}</div>
                                        <p className="text-xs text-muted-foreground">Course type &quot;event&quot; completed</p>
                                        <p className="text-xs text-primary mt-1">Click to list</p>
                                    </CardContent>
                                </Card>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigateDashboard(period, isAdmin, selectedOrganizationId, 'volunteers')}
                                className="text-left rounded-lg border bg-card transition hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <Card className="border-0 shadow-none">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Volunteers</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{summary.volunteers}</div>
                                        <p className="text-xs text-muted-foreground">Accepted volunteer applications</p>
                                        <p className="text-xs text-primary mt-1">Click to list</p>
                                    </CardContent>
                                </Card>
                            </button>
                        </div>

                        {metric && (
                            <Card className="border-primary/30">
                                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <CardTitle>{metricLabels[metric] ?? metric}</CardTitle>
                                        <CardDescription>
                                            Supporters in this segment · {periodLabels[period]} · counts, money, and Believe
                                            Points (when recorded)
                                        </CardDescription>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1"
                                        onClick={() => navigateDashboard(period, isAdmin, selectedOrganizationId, null)}
                                    >
                                        <X className="h-4 w-4" />
                                        Clear filter
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Supporter</TableHead>
                                                <TableHead className="text-right">Transactions</TableHead>
                                                <TableHead className="text-right">Money</TableHead>
                                                <TableHead className="text-right">Believe Points</TableHead>
                                                <TableHead className="text-right">Last activity</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {metricDrilldown.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-muted-foreground text-center py-8">
                                                        No supporters in this segment for this period.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                metricDrilldown.map((row) => (
                                                    <TableRow key={row.supporter_id}>
                                                        <TableCell className="font-medium">
                                                            <Link
                                                                href={supporterProfileUrl(
                                                                    row.supporter_id,
                                                                    isAdmin,
                                                                    selectedOrganizationId,
                                                                    period,
                                                                )}
                                                                className="text-primary hover:underline"
                                                            >
                                                                {row.name}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell className="text-right">{row.transaction_count}</TableCell>
                                                        <TableCell className="text-right tabular-nums">{row.money_display}</TableCell>
                                                        <TableCell className="text-right tabular-nums">{row.points_display}</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">
                                                            {row.last_activity}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Recent supporters activity</CardTitle>
                                <CardDescription>
                                    Every tracked event · {periodLabels[period]} · who did what, when, and value where available
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Supporter</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Organization</TableHead>
                                            <TableHead className="text-right">Money</TableHead>
                                            <TableHead className="text-right">Points</TableHead>
                                            <TableHead className="text-right">Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentActivity.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-muted-foreground text-center py-8">
                                                    No activity in this period yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            recentActivity.map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="font-medium">
                                                        <Link
                                                            href={supporterProfileUrl(
                                                                row.supporter_id,
                                                                isAdmin,
                                                                selectedOrganizationId,
                                                                period,
                                                            )}
                                                            className="text-primary hover:underline"
                                                        >
                                                            {row.supporter_name}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{row.event_type}</TableCell>
                                                    <TableCell className="text-muted-foreground">{row.organization_name}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{row.money_display}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{row.points_display}</TableCell>
                                                    <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                                                        {row.date_display}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Active supporters (matrix)</CardTitle>
                                <CardDescription>
                                    Who touched which engagement types in {periodLabels[period]}
                                </CardDescription>
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
                                                                period,
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
                                <CardDescription>
                                    Ranked by total tracked actions · {periodLabels[period]} · includes money and Believe Points
                                    totals
                                </CardDescription>
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
                                            <TableHead className="text-right">Money</TableHead>
                                            <TableHead className="text-right">Points</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topSupporters.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-muted-foreground text-center py-8">
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
                                                                period,
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
                                                    <TableCell className="text-right tabular-nums">{row.money_display}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{row.points_display}</TableCell>
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

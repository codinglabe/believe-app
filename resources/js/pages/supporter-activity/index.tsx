import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Activity, Check, BookOpen, TrendingUp, Users, X } from 'lucide-react';

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

/** Transaction ledger row (recommended analytics / ledger columns + supporter). */
interface LedgerRow {
    id: number;
    supporter_id: number;
    supporter_name: string;
    submodule_type: string;
    page_name: string;
    route_name: string;
    action_type: string;
    interest_category_id: string;
    interest_category_name: string;
    target_entity_type: string;
    target_entity_id: string;
    target_entity_title: string;
    search_term: string;
    filter_json: string;
    referrer_url: string;
    entry_source: string;
    dwell_seconds: string;
    money_amount: string;
    points_amount: string;
    transaction_reference: string;
    outcome_type: string;
    metadata_json: string;
    created_at: string;
    updated_at: string;
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
    transactionLedger: LedgerRow[];
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
    transactionLedger,
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

                        <Card id="transaction-ledger" className="border-violet-200/80 dark:border-violet-900/50 scroll-mt-4">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                                    Transaction ledger
                                </CardTitle>
                                <CardDescription>
                                    Recommended ledger columns for each tracked event (up to 250 rows). Scroll horizontally to
                                    see all fields; empty values show as —. New events fill core columns automatically;
                                    page/route/search and dwell time can be wired from the frontend later.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 sm:p-6">
                                <div className="overflow-x-auto border-t sm:border sm:rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="sticky left-0 z-10 min-w-[140px] bg-card text-xs whitespace-nowrap shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)]">
                                                    Supporter
                                                </TableHead>
                                                <TableHead className="min-w-[120px] text-xs whitespace-nowrap" title="submodule_type">
                                                    Submodule
                                                </TableHead>
                                                <TableHead className="min-w-[120px] text-xs whitespace-nowrap" title="page_name">
                                                    Page
                                                </TableHead>
                                                <TableHead className="min-w-[120px] text-xs whitespace-nowrap" title="route_name">
                                                    Route
                                                </TableHead>
                                                <TableHead className="min-w-[140px] text-xs whitespace-nowrap" title="action_type">
                                                    Action
                                                </TableHead>
                                                <TableHead className="min-w-[100px] text-xs whitespace-nowrap" title="interest_category_id">
                                                    Category ID
                                                </TableHead>
                                                <TableHead className="min-w-[140px] text-xs whitespace-nowrap" title="interest_category_name">
                                                    Category name
                                                </TableHead>
                                                <TableHead className="min-w-[120px] text-xs whitespace-nowrap" title="target_entity_type">
                                                    Target type
                                                </TableHead>
                                                <TableHead className="min-w-[100px] text-xs whitespace-nowrap" title="target_entity_id">
                                                    Target ID
                                                </TableHead>
                                                <TableHead className="min-w-[160px] text-xs whitespace-nowrap" title="target_entity_title">
                                                    Target title
                                                </TableHead>
                                                <TableHead className="min-w-[120px] text-xs whitespace-nowrap" title="search_term">
                                                    Search
                                                </TableHead>
                                                <TableHead className="min-w-[160px] text-xs whitespace-nowrap" title="filter_json">
                                                    Filters (JSON)
                                                </TableHead>
                                                <TableHead className="min-w-[180px] text-xs whitespace-nowrap" title="referrer_url">
                                                    Referrer URL
                                                </TableHead>
                                                <TableHead className="min-w-[100px] text-xs whitespace-nowrap" title="entry_source">
                                                    Entry source
                                                </TableHead>
                                                <TableHead className="min-w-[90px] text-xs whitespace-nowrap" title="dwell_seconds">
                                                    Dwell (sec)
                                                </TableHead>
                                                <TableHead className="min-w-[100px] text-xs whitespace-nowrap" title="money_amount">
                                                    Money
                                                </TableHead>
                                                <TableHead className="min-w-[100px] text-xs whitespace-nowrap" title="points_amount">
                                                    Points
                                                </TableHead>
                                                <TableHead className="min-w-[120px] text-xs whitespace-nowrap" title="transaction_reference">
                                                    Transaction ref
                                                </TableHead>
                                                <TableHead className="min-w-[100px] text-xs whitespace-nowrap" title="outcome_type">
                                                    Outcome
                                                </TableHead>
                                                <TableHead className="min-w-[160px] text-xs whitespace-nowrap" title="metadata_json">
                                                    Metadata (JSON)
                                                </TableHead>
                                                <TableHead className="min-w-[150px] text-xs whitespace-nowrap" title="created_at">
                                                    Created
                                                </TableHead>
                                                <TableHead className="min-w-[150px] text-xs whitespace-nowrap" title="updated_at">
                                                    Updated
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactionLedger.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={22}
                                                        className="text-muted-foreground text-center py-10 text-sm"
                                                    >
                                                        No ledger rows in this period yet.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                transactionLedger.map((row) => (
                                                    <TableRow key={row.id}>
                                                        <TableCell className="sticky left-0 z-10 min-w-[140px] bg-card align-top text-xs font-medium shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)]">
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
                                                        <TableCell className="align-top text-xs max-w-[200px] truncate" title={row.submodule_type}>
                                                            {row.submodule_type}
                                                        </TableCell>
                                                        <TableCell className="align-top text-xs max-w-[200px] truncate" title={row.page_name}>
                                                            {row.page_name}
                                                        </TableCell>
                                                        <TableCell className="align-top text-xs max-w-[200px] truncate" title={row.route_name}>
                                                            {row.route_name}
                                                        </TableCell>
                                                        <TableCell className="align-top text-xs font-mono max-w-[220px] truncate" title={row.action_type}>
                                                            {row.action_type}
                                                        </TableCell>
                                                        <TableCell className="align-top text-xs tabular-nums">{row.interest_category_id}</TableCell>
                                                        <TableCell className="align-top text-xs max-w-[180px] truncate" title={row.interest_category_name}>
                                                            {row.interest_category_name}
                                                        </TableCell>
                                                        <TableCell className="align-top text-xs">{row.target_entity_type}</TableCell>
                                                        <TableCell className="align-top text-xs font-mono">{row.target_entity_id}</TableCell>
                                                        <TableCell className="align-top text-xs max-w-[200px] truncate" title={row.target_entity_title}>
                                                            {row.target_entity_title}
                                                        </TableCell>
                                                        <TableCell className="align-top text-xs max-w-[160px] truncate" title={row.search_term}>
                                                            {row.search_term}
                                                        </TableCell>
                                                        <TableCell className="align-top text-xs font-mono max-w-[200px] truncate" title={row.filter_json}>
                                                            {row.filter_json}
                                                        </TableCell>
                                                        <TableCell className="align-top text-xs max-w-[220px] truncate" title={row.referrer_url}>
                                                            {row.referrer_url}
                                                        </TableCell>
                                                        <TableCell className="align-top text-xs">{row.entry_source}</TableCell>
                                                        <TableCell className="align-top text-xs tabular-nums">{row.dwell_seconds}</TableCell>
                                                        <TableCell className="align-top text-xs tabular-nums">{row.money_amount}</TableCell>
                                                        <TableCell className="align-top text-xs tabular-nums">{row.points_amount}</TableCell>
                                                        <TableCell className="align-top text-xs font-mono">{row.transaction_reference}</TableCell>
                                                        <TableCell className="align-top text-xs">{row.outcome_type}</TableCell>
                                                        <TableCell className="align-top text-xs font-mono max-w-[220px] truncate" title={row.metadata_json}>
                                                            {row.metadata_json}
                                                        </TableCell>
                                                        <TableCell className="align-top text-xs text-muted-foreground whitespace-nowrap">
                                                            {row.created_at}
                                                        </TableCell>
                                                        <TableCell className="align-top text-xs text-muted-foreground whitespace-nowrap">
                                                            {row.updated_at}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

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

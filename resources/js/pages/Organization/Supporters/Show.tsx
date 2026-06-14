import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
    ArrowLeft,
    ArrowRightLeft,
    BarChart3,
    Eye,
    Gift,
    Heart,
    Mail,
    User,
    Users,
} from 'lucide-react';

type MembershipFilter = 'all' | 'primary' | 'secondary' | 'departed';

interface ActionLink {
    key: string;
    label: string;
    href: string;
    external: boolean;
}

interface SupporterRow {
    supporter_id: number;
    slug?: string | null;
    name: string;
    email: string;
    join_date_display: string;
    depart_date_display: string;
    current_status: MembershipFilter;
    current_status_label: string;
    join_type_label: string;
    primary_organization_name: string;
    last_organization_name: string;
    amount_donated: number;
    purchases: number;
    volunteer_hours: number;
    total_engagement: number;
    last_activity_display: string;
}

interface TimelineRow {
    id: number;
    event_type: string;
    created_at: string;
    money_display: string;
    believe_points: number | null;
}

interface OrganizationChange {
    id: number;
    created_at: string;
    date_display: string;
    direction: 'departed' | 'joined' | 'notified';
    direction_label: string;
    previous_organization_name: string;
    new_organization_name: string;
    reason: string;
}

interface Props {
    organization: { id: number; name: string; ein?: string | null };
    supporter: SupporterRow;
    timeline: TimelineRow[];
    organizationChanges: OrganizationChange[];
    actionLinks: ActionLink[];
    ledgerIndexUrl: string;
}

function money(n: number) {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function initials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'S';
}

function dash(value: string) {
    return value?.trim() ? value : '—';
}

function statusBadgeClass(status: string) {
    switch (status) {
        case 'primary':
            return 'bg-purple-600/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
        case 'secondary':
            return 'bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
        case 'departed':
            return 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30';
        default:
            return '';
    }
}

function changeBadgeClass(direction: OrganizationChange['direction']) {
    switch (direction) {
        case 'departed':
            return 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30';
        case 'joined':
            return 'bg-blue-600/15 text-blue-800 dark:text-blue-200 border-blue-500/30';
        default:
            return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
    }
}

function OrganizationChangeCard({ change }: { change: OrganizationChange }) {
    return (
        <Card className="overflow-hidden border-border/70 shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className={cn('text-xs font-medium', changeBadgeClass(change.direction))}>
                        {change.direction_label}
                    </Badge>
                    <span className="shrink-0 text-xs text-muted-foreground">{change.date_display}</span>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                    <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Previous</p>
                        <p className="truncate font-medium" title={change.previous_organization_name}>
                            {dash(change.previous_organization_name)}
                        </p>
                    </div>
                    <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-purple-500 dark:text-purple-400" />
                    <div className="min-w-0 text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">New</p>
                        <p className="truncate font-medium" title={change.new_organization_name}>
                            {dash(change.new_organization_name)}
                        </p>
                    </div>
                </div>

                <div className="rounded-md border-l-2 border-purple-500/70 bg-muted/30 px-3 py-2 dark:border-purple-400/60 dark:bg-muted/20">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                        Reason
                    </p>
                    <p className="mt-1 line-clamp-3 text-sm leading-snug text-muted-foreground">
                        {change.reason || 'No reason provided.'}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function actionIcon(key: string) {
    switch (key) {
        case 'ledger':
            return Eye;
        case 'activity':
            return BarChart3;
        case 'dashboard':
            return BarChart3;
        case 'profile':
            return User;
        case 'email':
            return Mail;
        case 'gift':
            return Gift;
        case 'volunteer_interests':
            return Heart;
        default:
            return Users;
    }
}

export default function OrganizationSupportersShow({
    organization,
    supporter,
    timeline,
    organizationChanges,
    actionLinks,
    ledgerIndexUrl,
}: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Organization', href: '/organization' },
        { title: 'Supporters', href: ledgerIndexUrl },
        { title: supporter.name, href: route('organization.supporters.show', supporter.supporter_id) },
    ];

    const quickLinks = actionLinks.filter((link) => link.key !== 'ledger');
    const [showAllChanges, setShowAllChanges] = useState(false);
    const visibleChanges = showAllChanges ? organizationChanges : organizationChanges.slice(0, 6);
    const hasMoreChanges = organizationChanges.length > 6;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${supporter.name} — Supporter Ledger`} />

            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
                            <Link href={ledgerIndexUrl}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div className="flex min-w-0 items-center gap-4">
                            <Avatar className="h-14 w-14 border border-purple-200/50 dark:border-purple-800/40">
                                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-base font-semibold text-white">
                                    {initials(supporter.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold tracking-tight">{supporter.name}</h1>
                                <p className="text-sm text-muted-foreground">{supporter.email}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={cn('font-medium', statusBadgeClass(supporter.current_status))}
                                    >
                                        {supporter.current_status_label}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        with {organization.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Donated</CardDescription>
                            <CardTitle className="text-xl">{money(supporter.amount_donated)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Purchases</CardDescription>
                            <CardTitle className="text-xl">{money(supporter.purchases)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Volunteer hours</CardDescription>
                            <CardTitle className="text-xl">{supporter.volunteer_hours.toFixed(1)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Engagement</CardDescription>
                            <CardTitle className="text-xl">{supporter.total_engagement}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>Membership details</CardTitle>
                        <CardDescription>Ledger record for your organization</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                            <div>
                                <p className="text-xs text-muted-foreground">Join date</p>
                                <p className="font-medium">{dash(supporter.join_date_display)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Depart date</p>
                                <p className="font-medium">{dash(supporter.depart_date_display)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Join type</p>
                                <p className="font-medium">{supporter.join_type_label}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Last activity</p>
                                <p className="font-medium">{dash(supporter.last_activity_display)}</p>
                            </div>
                            <div className="sm:col-span-2 lg:col-span-1 xl:col-span-1">
                                <p className="text-xs text-muted-foreground">Primary organization</p>
                                <p className="truncate font-medium" title={supporter.primary_organization_name}>
                                    {dash(supporter.primary_organization_name)}
                                </p>
                            </div>
                            <div className="sm:col-span-2 lg:col-span-1 xl:col-span-1">
                                <p className="text-xs text-muted-foreground">Last organization</p>
                                <p className="truncate font-medium" title={supporter.last_organization_name}>
                                    {dash(supporter.last_organization_name)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="flex items-center gap-2 text-base font-semibold">
                                <ArrowRightLeft className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                Primary organization changes
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Reasons when this supporter changed their primary organization
                            </p>
                        </div>
                        {organizationChanges.length > 0 ? (
                            <Badge variant="secondary" className="shrink-0">
                                {organizationChanges.length} total
                            </Badge>
                        ) : null}
                    </div>

                    {organizationChanges.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                No primary organization changes recorded for your organization.
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {visibleChanges.map((change) => (
                                    <OrganizationChangeCard key={change.id} change={change} />
                                ))}
                            </div>
                            {hasMoreChanges ? (
                                <div className="flex justify-center">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowAllChanges((open) => !open)}
                                    >
                                        {showAllChanges
                                            ? 'Show fewer changes'
                                            : `Show all ${organizationChanges.length} changes`}
                                    </Button>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {quickLinks.map((link) => {
                        const Icon = actionIcon(link.key);

                        if (link.external) {
                            return (
                                <Button key={link.key} variant="outline" size="sm" className="gap-2" asChild>
                                    <a href={link.href} target="_blank" rel="noreferrer">
                                        <Icon className="h-4 w-4" />
                                        {link.label}
                                    </a>
                                </Button>
                            );
                        }

                        return (
                            <Button key={link.key} variant="outline" size="sm" className="gap-2" asChild>
                                <Link href={link.href}>
                                    <Icon className="h-4 w-4" />
                                    {link.label}
                                </Link>
                            </Button>
                        );
                    })}
                </div>

                <Card id="activity-timeline">
                    <CardHeader>
                        <CardTitle>Activity timeline</CardTitle>
                        <CardDescription>Recorded events with {organization.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="px-6">Date</TableHead>
                                        <TableHead className="px-6">Event</TableHead>
                                        <TableHead className="px-6 text-right">Money</TableHead>
                                        <TableHead className="px-6 text-right">Believe Points</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {timeline.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                                                No activity recorded yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        timeline.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="whitespace-nowrap px-6 text-muted-foreground">
                                                    {new Date(row.created_at).toLocaleString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                    })}
                                                </TableCell>
                                                <TableCell className="px-6 font-mono text-sm">{row.event_type}</TableCell>
                                                <TableCell className="px-6 text-right tabular-nums">{row.money_display}</TableCell>
                                                <TableCell className="px-6 text-right tabular-nums">
                                                    {row.believe_points != null && row.believe_points > 0
                                                        ? row.believe_points
                                                        : '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

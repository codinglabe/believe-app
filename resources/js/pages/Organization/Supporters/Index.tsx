import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    FileSpreadsheet,
    FileText,
    Gift,
    Heart,
    Loader2,
    Mail,
    MoreVertical,
    Search,
    User,
    Users,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Organization', href: '/organization' },
    { title: 'Supporters', href: '/organization/supporters' },
];

type MembershipFilter = 'all' | 'primary' | 'secondary' | 'departed';
type JoinTypeFilter = 'all' | 'self' | 'organization_link' | 'admin_added';

interface LedgerRow {
    supporter_id: number;
    slug?: string | null;
    name: string;
    email: string;
    join_date_display: string;
    depart_date_display: string;
    current_status: MembershipFilter;
    current_status_label: string;
    join_type: JoinTypeFilter;
    join_type_label: string;
    primary_organization_name: string;
    last_organization_name: string;
    amount_donated: number;
    purchases: number;
    volunteer_hours: number;
    total_engagement: number;
    last_activity_display: string;
    action_links: ActionLink[];
}

interface ActionLink {
    key: string;
    label: string;
    href: string;
    external: boolean;
}

interface LedgerFilters {
    membership: MembershipFilter;
    join_type: JoinTypeFilter;
    q: string;
    date_from: string;
    date_to: string;
    min_donation: string;
    max_donation: string;
    min_purchases: string;
    max_purchases: string;
    per_page: number;
    page: number;
}

interface Props {
    organization: { id: number; name: string; ein?: string | null };
    filters: LedgerFilters;
    ledger: {
        rows: LedgerRow[];
        total: number;
        page: number;
        per_page: number;
        last_page: number;
        summary: {
            primary: number;
            secondary: number;
            departed: number;
            total_donated: number;
            total_purchases: number;
        };
    };
    exportUrls: {
        csv: string;
        xlsx: string;
        pdf: string;
    };
}

const PAGE_KEYS = ['organization', 'filters', 'ledger', 'exportUrls'] as const;
const SEARCH_DEBOUNCE_MS = 400;

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

function moneyCell(amount: number) {
    if (amount <= 0) {
        return <span className="text-muted-foreground">$0.00</span>;
    }
    return <span className="font-medium text-foreground">{money(amount)}</span>;
}

function supporterShowHref(supporterId: number) {
    return route('organization.supporters.show', supporterId);
}

function actionLinkIcon(key: string) {
    switch (key) {
        case 'ledger':
            return Eye;
        case 'activity':
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

const LEDGER_TABLE_MIN_WIDTH = 1520;

function SupporterRowActions({ row }: { row: LedgerRow }) {
    const dropdownLinks = row.action_links ?? [];

    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 px-3" asChild>
                <Link href={supporterShowHref(row.supporter_id)}>
                    <Eye className="h-4 w-4" />
                    View
                </Link>
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 px-3">
                        <MoreVertical className="h-4 w-4" />
                        Actions
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Supporter actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {dropdownLinks.map((link) => {
                        const Icon = actionLinkIcon(link.key);

                        if (link.external) {
                            return (
                                <DropdownMenuItem key={link.key} asChild>
                                    <a href={link.href} target="_blank" rel="noreferrer" className="gap-2">
                                        <Icon className="h-4 w-4" />
                                        {link.label}
                                    </a>
                                </DropdownMenuItem>
                            );
                        }

                        return (
                            <DropdownMenuItem key={link.key} asChild>
                                <Link href={link.href} className="gap-2">
                                    <Icon className="h-4 w-4" />
                                    {link.label}
                                </Link>
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function SupporterIdentity({ row }: { row: LedgerRow }) {
    return (
        <div className="flex min-w-[240px] items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0 border border-purple-200/50 dark:border-purple-800/40">
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-sm font-semibold text-white">
                    {initials(row.name)}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{row.name}</p>
                <p className="truncate text-sm text-muted-foreground">{row.email}</p>
            </div>
        </div>
    );
}

export default function OrganizationSupportersIndex({
    organization,
    filters,
    ledger,
    exportUrls,
}: Props) {
    const [localFilters, setLocalFilters] = useState(filters);
    const [loading, setLoading] = useState(false);
    const skipSearchDebounce = useRef(false);

    useEffect(() => {
        setLocalFilters(filters);
        skipSearchDebounce.current = true;
    }, [filters]);

    const buildQuery = useCallback(
        (next: LedgerFilters) => {
            const q: Record<string, string | number> = {
                page: next.page,
                per_page: next.per_page,
                membership: next.membership,
                join_type: next.join_type,
            };
            if (next.q.trim()) q.q = next.q.trim();
            if (next.date_from) q.date_from = next.date_from;
            if (next.date_to) q.date_to = next.date_to;
            if (next.min_donation) q.min_donation = next.min_donation;
            if (next.max_donation) q.max_donation = next.max_donation;
            if (next.min_purchases) q.min_purchases = next.min_purchases;
            if (next.max_purchases) q.max_purchases = next.max_purchases;
            return q;
        },
        [],
    );

    const applyFilters = useCallback(
        (patch: Partial<LedgerFilters>, resetPage = true) => {
            const next = {
                ...localFilters,
                ...patch,
                page: resetPage ? 1 : patch.page ?? localFilters.page,
            };
            setLocalFilters(next);
            router.get(route('organization.supporters.index'), buildQuery(next), {
                only: [...PAGE_KEYS],
                preserveState: true,
                preserveScroll: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            });
        },
        [localFilters, buildQuery],
    );

    useEffect(() => {
        if (skipSearchDebounce.current) {
            skipSearchDebounce.current = false;
            return;
        }
        if (localFilters.q.trim() === filters.q.trim()) return;

        const timer = window.setTimeout(() => {
            applyFilters({ q: localFilters.q }, true);
        }, SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [localFilters.q, filters.q, applyFilters]);

    const download = (url: string) => {
        window.location.href = url;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Supporters Ledger — ${organization.name}`} />

            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Supporter Ledger</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Accounting-style report for {organization.name} — track membership, donations,
                            purchases, and engagement. Export for your records.
                                        </p>
                                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => download(exportUrls.csv)}>
                            <Download className="mr-2 h-4 w-4" />
                            CSV
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => download(exportUrls.xlsx)}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Excel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
                            onClick={() => download(exportUrls.pdf)}
                        >
                            <FileText className="mr-2 h-4 w-4" />
                            PDF
                        </Button>
                    </div>
                                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Primary</CardDescription>
                            <CardTitle className="text-2xl">{ledger.summary.primary}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Secondary</CardDescription>
                            <CardTitle className="text-2xl">{ledger.summary.secondary}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Departed</CardDescription>
                            <CardTitle className="text-2xl">{ledger.summary.departed}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Donations (filtered)</CardDescription>
                            <CardTitle className="text-xl">{money(ledger.summary.total_donated)}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Purchases (filtered)</CardDescription>
                            <CardTitle className="text-xl">{money(ledger.summary.total_purchases)}</CardTitle>
                        </CardHeader>
                        </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Filters</CardTitle>
                        <CardDescription>Narrow the ledger before viewing or exporting.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1.5">
                                <Label>Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        className="pl-9"
                                        placeholder="Name or email"
                                        value={localFilters.q}
                                        onChange={(e) => setLocalFilters((f) => ({ ...f, q: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Membership</Label>
                                <Select
                                    value={localFilters.membership}
                                    onValueChange={(v) => applyFilters({ membership: v as MembershipFilter })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All supporters</SelectItem>
                                        <SelectItem value="primary">Primary members</SelectItem>
                                        <SelectItem value="secondary">Secondary supporters</SelectItem>
                                        <SelectItem value="departed">Departed supporters</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Join type</Label>
                                <Select
                                    value={localFilters.join_type}
                                    onValueChange={(v) => applyFilters({ join_type: v as JoinTypeFilter })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All join types</SelectItem>
                                        <SelectItem value="self">Self</SelectItem>
                                        <SelectItem value="organization_link">Organization link</SelectItem>
                                        <SelectItem value="admin_added">Admin added</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Per page</Label>
                                <Select
                                    value={String(localFilters.per_page)}
                                    onValueChange={(v) => applyFilters({ per_page: Number(v) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                            <div className="space-y-1.5">
                                <Label>Date from</Label>
                                <Input
                                    type="date"
                                    value={localFilters.date_from}
                                    onChange={(e) => setLocalFilters((f) => ({ ...f, date_from: e.target.value }))}
                                    onBlur={() => applyFilters({ date_from: localFilters.date_from })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Date to</Label>
                                <Input
                                    type="date"
                                    value={localFilters.date_to}
                                    onChange={(e) => setLocalFilters((f) => ({ ...f, date_to: e.target.value }))}
                                    onBlur={() => applyFilters({ date_to: localFilters.date_to })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Min donation ($)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={localFilters.min_donation}
                                    onChange={(e) => setLocalFilters((f) => ({ ...f, min_donation: e.target.value }))}
                                    onBlur={() => applyFilters({ min_donation: localFilters.min_donation })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Max donation ($)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={localFilters.max_donation}
                                    onChange={(e) => setLocalFilters((f) => ({ ...f, max_donation: e.target.value }))}
                                    onBlur={() => applyFilters({ max_donation: localFilters.max_donation })}
                                />
                                    </div>
                            <div className="space-y-1.5">
                                <Label>Min purchases ($)</Label>
                                    <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={localFilters.min_purchases}
                                    onChange={(e) => setLocalFilters((f) => ({ ...f, min_purchases: e.target.value }))}
                                    onBlur={() => applyFilters({ min_purchases: localFilters.min_purchases })}
                                    />
                                </div>
                            <div className="space-y-1.5">
                                <Label>Max purchases ($)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={localFilters.max_purchases}
                                    onChange={(e) => setLocalFilters((f) => ({ ...f, max_purchases: e.target.value }))}
                                    onBlur={() => applyFilters({ max_purchases: localFilters.max_purchases })}
                                />
                            </div>
                                    </div>
                            </CardContent>
                        </Card>

                <Card className="overflow-hidden border-border/70 shadow-sm">
                    <CardHeader className="border-b bg-muted/20 pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            Supporter ledger
                            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {ledger.total} supporter{ledger.total === 1 ? '' : 's'} matching your filters
                                </CardDescription>
                            </CardHeader>
                    <CardContent className="p-0">
                        {ledger.rows.length === 0 ? (
                            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                                <Users className="h-10 w-10 opacity-30" />
                                <p className="font-medium">No supporters match your filters</p>
                                <p className="text-sm">Try adjusting membership or date range.</p>
                            </div>
                        ) : (
                            <>
                                <div className="hidden md:block">
                                    <div className="overflow-x-auto [scrollbar-gutter:stable]">
                                        <table
                                            className="w-max min-w-full border-collapse text-sm"
                                            style={{ minWidth: LEDGER_TABLE_MIN_WIDTH }}
                                        >
                                            <TableHeader>
                                                <TableRow className="border-b border-border/70 bg-muted/40 hover:bg-muted/40">
                                                    <TableHead className="min-w-[260px] whitespace-nowrap px-6 py-4 pl-6 font-semibold">
                                                        Supporter
                                                    </TableHead>
                                                    <TableHead className="min-w-[120px] whitespace-nowrap px-6 py-4 font-semibold">
                                                        Join date
                                                    </TableHead>
                                                    <TableHead className="min-w-[120px] whitespace-nowrap px-6 py-4 font-semibold">
                                                        Depart date
                                                    </TableHead>
                                                    <TableHead className="min-w-[110px] whitespace-nowrap px-6 py-4 font-semibold">
                                                        Status
                                                    </TableHead>
                                                    <TableHead className="min-w-[130px] whitespace-nowrap px-6 py-4 font-semibold">
                                                        Join type
                                                    </TableHead>
                                                    <TableHead className="min-w-[180px] whitespace-nowrap px-6 py-4 font-semibold">
                                                        Primary org
                                                    </TableHead>
                                                    <TableHead className="min-w-[180px] whitespace-nowrap px-6 py-4 font-semibold">
                                                        Last org
                                                    </TableHead>
                                                    <TableHead className="min-w-[110px] whitespace-nowrap px-6 py-4 text-right font-semibold">
                                                        Donated
                                                    </TableHead>
                                                    <TableHead className="min-w-[110px] whitespace-nowrap px-6 py-4 text-right font-semibold">
                                                        Purchases
                                                    </TableHead>
                                                    <TableHead className="min-w-[90px] whitespace-nowrap px-6 py-4 text-right font-semibold">
                                                        Vol. hrs
                                                    </TableHead>
                                                    <TableHead className="min-w-[110px] whitespace-nowrap px-6 py-4 text-right font-semibold">
                                                        Engagement
                                                    </TableHead>
                                                    <TableHead className="min-w-[130px] whitespace-nowrap px-6 py-4 font-semibold">
                                                        Last activity
                                                    </TableHead>
                                                    <TableHead className="min-w-[200px] whitespace-nowrap px-6 py-4 pr-6 text-right font-semibold">
                                                        Actions
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {ledger.rows.map((row, index) => (
                                                    <TableRow
                                                        key={row.supporter_id}
                                                        className={cn(
                                                            'border-b border-border/50',
                                                            index % 2 === 1 && 'bg-muted/15',
                                                        )}
                                                    >
                                                        <TableCell className="px-6 py-4 pl-6">
                                                            <SupporterIdentity row={row} />
                                                        </TableCell>
                                                        <TableCell className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                                                            {dash(row.join_date_display)}
                                                        </TableCell>
                                                        <TableCell className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                                                            {dash(row.depart_date_display)}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4">
                                                            <Badge
                                                                variant="outline"
                                                                className={cn('whitespace-nowrap font-medium', statusBadgeClass(row.current_status))}
                                                            >
                                                                {row.current_status_label}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4">
                                                            <span className="inline-flex whitespace-nowrap rounded-md border border-border/70 bg-muted/30 px-2.5 py-1 text-sm font-medium text-foreground">
                                                                {row.join_type_label}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4" title={row.primary_organization_name}>
                                                            <span className="block max-w-[220px] truncate">
                                                                {dash(row.primary_organization_name)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4" title={row.last_organization_name}>
                                                            <span className="block max-w-[220px] truncate text-muted-foreground">
                                                                {dash(row.last_organization_name)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-right tabular-nums">
                                                            {moneyCell(row.amount_donated)}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-right tabular-nums">
                                                            {moneyCell(row.purchases)}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-right tabular-nums">
                                                            {row.volunteer_hours > 0 ? (
                                                                <span className="font-medium">{row.volunteer_hours.toFixed(1)}</span>
                                                            ) : (
                                                                <span className="text-muted-foreground">0</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-right tabular-nums">
                                                            {row.total_engagement > 0 ? (
                                                                <span className="inline-flex min-w-[2rem] justify-center rounded-full bg-purple-100 px-2.5 py-1 text-sm font-semibold text-purple-800 dark:bg-purple-950/60 dark:text-purple-200">
                                                                    {row.total_engagement}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground">0</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                                                            {dash(row.last_activity_display)}
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 pr-6">
                                                            <SupporterRowActions row={row} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </table>
                                    </div>
                                                        </div>

                                <div className="space-y-4 p-4 md:hidden">
                                    {ledger.rows.map((row) => (
                                        <Card key={row.supporter_id} className="border-border/60">
                                            <CardContent className="space-y-4 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <SupporterIdentity row={row} />
                                                    <Badge
                                                        variant="outline"
                                                        className={cn('shrink-0 whitespace-nowrap font-medium', statusBadgeClass(row.current_status))}
                                                    >
                                                        {row.current_status_label}
                                                    </Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                        <p className="text-muted-foreground">Join date</p>
                                                        <p className="font-medium">{dash(row.join_date_display)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Depart date</p>
                                                        <p className="font-medium">{dash(row.depart_date_display)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Join type</p>
                                                        <p className="font-medium">{row.join_type_label}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Last activity</p>
                                                        <p className="font-medium">{dash(row.last_activity_display)}</p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-muted-foreground">Primary org</p>
                                                        <p className="font-medium">{dash(row.primary_organization_name)}</p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-muted-foreground">Last org</p>
                                                        <p className="font-medium">{dash(row.last_organization_name)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Donated</p>
                                                        <p className="font-medium tabular-nums">{money(row.amount_donated)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Purchases</p>
                                                        <p className="font-medium tabular-nums">{money(row.purchases)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Vol. hrs</p>
                                                        <p className="font-medium tabular-nums">{row.volunteer_hours.toFixed(1)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Engagement</p>
                                                        <p className="font-medium tabular-nums">{row.total_engagement}</p>
                                                    </div>
                                                </div>
                                                <SupporterRowActions row={row} />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </>
                        )}

                        {ledger.last_page > 1 && (
                            <div className="flex flex-col gap-3 border-t bg-muted/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Showing page {ledger.page} of {ledger.last_page} · {ledger.total} total
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={ledger.page <= 1 || loading}
                                        onClick={() => applyFilters({ page: ledger.page - 1 }, false)}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={ledger.page >= ledger.last_page || loading}
                                        onClick={() => applyFilters({ page: ledger.page + 1 }, false)}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                            </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
            </div>
        </AppLayout>
    );
}

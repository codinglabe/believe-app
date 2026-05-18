import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { HeartHandshake, Loader2, MapPin, Search, UserRound, X, ExternalLink } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Supporter volunteer interests', href: '/volunteers/supporter-interests' },
];

function avatarSrc(image: string | null | undefined): string | undefined {
    if (!image) return undefined;
    if (image.startsWith('http') || image.startsWith('/storage/') || image.startsWith('/')) {
        return image.startsWith('http') || image.startsWith('/')
            ? image
            : `/storage/${image.replace(/^\//, '')}`;
    }
    return `/storage/${image}`;
}

interface Cause {
    id: number;
    name: string;
}

interface SupporterRow {
    id: number;
    name: string;
    slug: string | null;
    city: string | null;
    state: string | null;
    image: string | null;
    volunteer_interest_statement: string;
    updated_at: string | null;
    causes: Cause[];
}

interface Props {
    supporters: {
        data: SupporterRow[];
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
    };
    allowedPerPage: number[];
}

function formatUpdated(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '—';
    }
}

export default function SupporterInterestsIndex({ supporters, filters, allowedPerPage }: Props) {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

    const visit = (params: Record<string, string | number>) => {
        setLoading(true);
        router.get('/volunteers/supporter-interests', params, {
            preserveState: true,
            onFinish: () => setLoading(false),
        });
    };

    const handlePerPageChange = (v: string) => {
        visit({ per_page: Number(v), page: 1, search: filters.search });
    };

    const handlePageChange = (page: number) => {
        if (page < 1 || page > supporters.last_page) return;
        visit({ per_page: filters.per_page, page, search: filters.search });
    };

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        if (searchTimeout) clearTimeout(searchTimeout);
        const t = setTimeout(() => {
            visit({ per_page: filters.per_page, page: 1, search: value });
        }, 400);
        setSearchTimeout(t);
    };

    const clearSearch = () => {
        setSearchTerm('');
        visit({ per_page: filters.per_page, page: 1, search: '' });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Supporter volunteer interests" />
            <div className="flex flex-1 flex-col gap-6 rounded-xl py-4 px-4 md:py-6 md:px-10">
                {/* Header band */}
                <div className="relative overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white shadow-lg dark:border-violet-900/40 dark:from-violet-950 dark:via-purple-950 dark:to-indigo-950 md:p-8">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_100%_0%,rgba(255,255,255,0.12),transparent)]" />
                    <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm md:h-14 md:w-14">
                                <HeartHandshake className="h-6 w-6 md:h-7 md:w-7" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight md:text-2xl">Supporter volunteer interests</h1>
                                <p className="mt-1 max-w-2xl text-sm text-white/90 md:text-base">
                                    Supporters who shared what they want to volunteer for on Volunteer Opportunities. Use this to
                                    understand skills and causes before you connect or post roles.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm backdrop-blur-sm">
                            <UserRound className="h-4 w-4 opacity-90" />
                            <span className="font-semibold tabular-nums">{supporters.total.toLocaleString()}</span>
                            <span className="text-white/85">supporters</span>
                        </div>
                    </div>
                </div>

                <Card className="overflow-hidden border-border/80 shadow-sm">
                    <CardHeader className="space-y-4 border-b bg-muted/30 px-4 py-5 md:px-6">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle className="text-lg md:text-xl">Directory</CardTitle>
                                <CardDescription className="mt-1">
                                    Search by name, location, or keywords in their volunteer statement.
                                </CardDescription>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <div className="relative w-full min-w-[200px] sm:max-w-xs">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search supporters…"
                                        value={searchTerm}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30"
                                    />
                                    {searchTerm ? (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                                            aria-label="Clear search"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    ) : null}
                                </div>
                                <Select
                                    value={String(filters.per_page)}
                                    onValueChange={handlePerPageChange}
                                    disabled={loading}
                                >
                                    <SelectTrigger className="h-10 w-full sm:w-[140px]">
                                        <SelectValue placeholder="Per page" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allowedPerPage.map((n) => (
                                            <SelectItem key={n} value={String(n)}>
                                                {n} per page
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading && (
                            <div className="flex items-center justify-center gap-2 border-b py-3 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading…
                            </div>
                        )}

                        {supporters.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                    <HeartHandshake className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold">No supporters yet</h3>
                                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                                    {filters.search
                                        ? 'Try a different search, or clear filters.'
                                        : 'When supporters write what they want to volunteer for on the public Volunteer Opportunities page, they will appear here.'}
                                </p>
                                {filters.search ? (
                                    <Button variant="outline" className="mt-6" onClick={clearSearch}>
                                        Clear search
                                    </Button>
                                ) : null}
                            </div>
                        ) : (
                            <>
                                {/* Mobile cards */}
                                <div className="divide-y md:hidden">
                                    {supporters.data.map((s) => (
                                        <div key={s.id} className="space-y-3 p-4">
                                            <div className="flex items-start gap-3">
                                                <Avatar className="h-11 w-11 border border-border">
                                                    <AvatarImage src={avatarSrc(s.image)} alt="" />
                                                    <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                                                        {s.name.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold leading-tight">{s.name}</p>
                                                    {(s.city || s.state) && (
                                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                                            <MapPin className="h-3 w-3 shrink-0" />
                                                            {[s.city, s.state].filter(Boolean).join(', ')}
                                                        </p>
                                                    )}
                                                    {s.causes.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {s.causes.map((c) => (
                                                                <Badge
                                                                    key={c.id}
                                                                    variant="secondary"
                                                                    className="text-[10px] font-normal"
                                                                >
                                                                    {c.name}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                                                {s.volunteer_interest_statement}
                                            </p>
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                                                <span className="text-xs text-muted-foreground">
                                                    Updated {formatUpdated(s.updated_at)}
                                                </span>
                                                {s.slug ? (
                                                    <Button variant="outline" size="sm" className="h-8" asChild>
                                                        <a href={`/users/${s.slug}`} target="_blank" rel="noreferrer">
                                                            Profile
                                                            <ExternalLink className="ml-1 h-3 w-3" />
                                                        </a>
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop table */}
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="min-w-[200px] pl-6">Supporter</TableHead>
                                                <TableHead className="min-w-[120px]">Location</TableHead>
                                                <TableHead className="min-w-[160px]">Profile causes</TableHead>
                                                <TableHead className="min-w-[280px]">What they want to volunteer for</TableHead>
                                                <TableHead className="w-[110px] whitespace-nowrap">Updated</TableHead>
                                                <TableHead className="w-[100px] pr-6 text-right"> </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {supporters.data.map((s) => (
                                                <TableRow key={s.id} className="align-top">
                                                    <TableCell className="pl-6">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-10 w-10 border border-border">
                                                                <AvatarImage src={avatarSrc(s.image)} alt="" />
                                                                <AvatarFallback className="bg-violet-100 text-xs text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                                                                    {s.name.slice(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium">{s.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {[s.city, s.state].filter(Boolean).join(', ') || '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {s.causes.length ? (
                                                            <div className="flex max-w-[220px] flex-wrap gap-1">
                                                                {s.causes.map((c) => (
                                                                    <Badge
                                                                        key={c.id}
                                                                        variant="outline"
                                                                        className="font-normal text-xs"
                                                                    >
                                                                        {c.name}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <p
                                                            className="max-w-xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 line-clamp-4"
                                                            title={s.volunteer_interest_statement}
                                                        >
                                                            {s.volunteer_interest_statement}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                                                        {formatUpdated(s.updated_at)}
                                                    </TableCell>
                                                    <TableCell className="pr-6 text-right">
                                                        {s.slug ? (
                                                            <Button variant="ghost" size="sm" className="h-8 gap-1 text-violet-600" asChild>
                                                                <a href={`/users/${s.slug}`} target="_blank" rel="noreferrer">
                                                                    View
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </a>
                                                            </Button>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {supporters.last_page > 1 && (
                                    <div className="flex flex-col items-center justify-between gap-4 border-t px-4 py-4 sm:flex-row md:px-6">
                                        <p className="text-sm text-muted-foreground">
                                            {supporters.from != null && supporters.to != null
                                                ? `Showing ${supporters.from}–${supporters.to} of ${supporters.total}`
                                                : `${supporters.total} total`}
                                        </p>
                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={supporters.current_page <= 1 || loading}
                                                onClick={() => handlePageChange(supporters.current_page - 1)}
                                            >
                                                Previous
                                            </Button>
                                            <span className="px-2 text-sm text-muted-foreground tabular-nums">
                                                Page {supporters.current_page} / {supporters.last_page}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={supporters.current_page >= supporters.last_page || loading}
                                                onClick={() => handlePageChange(supporters.current_page + 1)}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

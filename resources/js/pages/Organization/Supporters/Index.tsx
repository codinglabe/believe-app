import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
    ArrowRight,
    ExternalLink,
    History,
    Loader2,
    Search,
    UserCheck,
    Users,
    UserPlus,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Organization', href: '/organization' },
    { title: 'Supporters', href: '/organization/supporters' },
];

interface SupporterRow {
    id: number;
    user_id: number;
    slug?: string | null;
    name: string;
    email?: string;
    image?: string | null;
    organization_status?: string;
    user?: {
        id: number;
        slug?: string | null;
        name: string;
        email?: string;
        image?: string | null;
    };
    joined_at?: string | null;
}

interface ChangeLogRow {
    id: number;
    reason: string;
    created_at?: string | null;
    supporter?: {
        id: number;
        name: string;
        email?: string;
        slug?: string | null;
    } | null;
    previous_organization?: { id: number; name: string } | null;
    new_organization?: { id: number; name: string } | null;
}

type SupportersTab = 'primary' | 'secondary' | 'activity';

const SUPPORTERS_PAGE_KEYS = [
    'activeTab',
    'organization',
    'searchQuery',
    'primarySupporters',
    'secondarySupporters',
    'primarySupportersCount',
    'secondarySupportersCount',
    'changeLogsCount',
    'changeLogs',
] as const;

const SEARCH_DEBOUNCE_MS = 400;

interface Props {
    activeTab: SupportersTab;
    searchQuery: string;
    organization: { id: number; name: string; ein?: string | null };
    primarySupporters: SupporterRow[];
    secondarySupporters: SupporterRow[];
    primarySupportersCount: number;
    secondarySupportersCount: number;
    changeLogsCount: number;
    changeLogs: ChangeLogRow[];
}

function supporterName(s: SupporterRow) {
    return s.user?.name ?? s.name ?? 'Supporter';
}

function supporterEmail(s: SupporterRow) {
    return s.user?.email ?? s.email ?? '';
}

function supporterSlug(s: SupporterRow) {
    return s.user?.slug ?? s.slug ?? null;
}

function supporterImage(s: SupporterRow) {
    return s.user?.image ?? s.image ?? null;
}

function avatarSrc(image: string | null | undefined) {
    if (!image) return undefined;
    if (image.startsWith('http') || image.startsWith('/')) return image;
    return `/storage/${image}`;
}

function initials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase() || 'S';
}

function EmptyState({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/15 to-blue-600/15">
                <Icon className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-base font-semibold text-foreground">{title}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
    );
}

function SupporterCard({ supporter, variant }: { supporter: SupporterRow; variant: 'primary' | 'secondary' }) {
    const name = supporterName(supporter);
    const email = supporterEmail(supporter);
    const slug = supporterSlug(supporter);
    const image = supporterImage(supporter);
    const profileHref = slug ? route('users.show', slug) : null;

    const content = (
        <div
            className={cn(
                'group relative flex items-center gap-4 rounded-xl border bg-card p-4 transition-all duration-200',
                'hover:border-purple-500/35 hover:shadow-md hover:shadow-purple-500/5',
                variant === 'primary'
                    ? 'border-purple-500/20 bg-gradient-to-br from-purple-500/[0.04] to-blue-500/[0.04]'
                    : 'border-border/60',
            )}
        >
            <Avatar className="h-11 w-11 shrink-0 ring-2 ring-background shadow-sm">
                <AvatarImage src={avatarSrc(image)} alt={name} />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-sm font-semibold text-white">
                    {initials(name)}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-foreground">{name}</p>
                    {profileHref && (
                        <ExternalLink
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden
                        />
                    )}
                </div>
                {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
                <Badge
                    variant="outline"
                    className={cn(
                        'mt-2 text-[10px] font-medium capitalize',
                        variant === 'primary'
                            ? 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                            : 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
                    )}
                >
                    {variant === 'primary' ? 'Primary member' : 'Secondary supporter'}
                </Badge>
            </div>
            {profileHref && (
                <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                    aria-hidden
                />
            )}
        </div>
    );

    if (profileHref) {
        return (
            <Link href={profileHref} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl">
                {content}
            </Link>
        );
    }

    return content;
}

function TabLoading() {
    return (
        <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-label="Loading" />
        </div>
    );
}

export default function OrganizationSupportersIndex({
    activeTab,
    searchQuery,
    organization,
    primarySupporters,
    secondarySupporters,
    primarySupportersCount,
    secondarySupportersCount,
    changeLogsCount,
    changeLogs,
}: Props) {
    const [primarySearch, setPrimarySearch] = useState(searchQuery);
    const [secondarySearch, setSecondarySearch] = useState('');
    const [selectedTab, setSelectedTab] = useState<SupportersTab>(activeTab);
    const [tabLoading, setTabLoading] = useState(false);
    const skipPrimarySearchDebounceRef = useRef(false);
    const skipSecondarySearchDebounceRef = useRef(false);

    useEffect(() => {
        setSelectedTab(activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'primary') {
            setPrimarySearch(searchQuery);
            skipPrimarySearchDebounceRef.current = true;
        }
        if (activeTab === 'secondary') {
            setSecondarySearch(searchQuery);
            skipSecondarySearchDebounceRef.current = true;
        }
    }, [activeTab, searchQuery]);

    useEffect(() => {
        if (window.location.search) {
            window.history.replaceState(window.history.state, '', route('organization.supporters.index'));
        }
    }, []);

    const reloadSupporters = useCallback(
        (tab: SupportersTab, q: string) => {
            const trimmed = q.trim();
            router.reload({
                data: {
                    tab,
                    ...(trimmed !== '' ? { q: trimmed } : {}),
                },
                only: [...SUPPORTERS_PAGE_KEYS],
                preserveUrl: true,
                preserveState: true,
                preserveScroll: true,
                onStart: () => setTabLoading(true),
                onFinish: () => setTabLoading(false),
                onError: () => setTabLoading(false),
            });
        },
        [],
    );

    const visitTab = (tab: SupportersTab) => {
        setSelectedTab(tab);

        if (tab === activeTab) {
            return;
        }

        const q = tab === 'primary' ? primarySearch : tab === 'secondary' ? secondarySearch : '';
        reloadSupporters(tab, q);
    };

    useEffect(() => {
        if (activeTab !== 'primary' || selectedTab !== 'primary') {
            return;
        }
        if (skipPrimarySearchDebounceRef.current) {
            skipPrimarySearchDebounceRef.current = false;
            return;
        }
        if (primarySearch.trim() === searchQuery.trim()) {
            return;
        }

        const timer = window.setTimeout(() => {
            reloadSupporters('primary', primarySearch);
        }, SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [primarySearch, activeTab, selectedTab, searchQuery, reloadSupporters]);

    useEffect(() => {
        if (activeTab !== 'secondary' || selectedTab !== 'secondary') {
            return;
        }
        if (skipSecondarySearchDebounceRef.current) {
            skipSecondarySearchDebounceRef.current = false;
            return;
        }
        if (secondarySearch.trim() === searchQuery.trim()) {
            return;
        }

        const timer = window.setTimeout(() => {
            reloadSupporters('secondary', secondarySearch);
        }, SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [secondarySearch, activeTab, selectedTab, searchQuery, reloadSupporters]);

    const isTabLoading = (tab: SupportersTab) => tabLoading && selectedTab === tab;

    const hasPrimarySearch = activeTab === 'primary' && searchQuery.trim() !== '';
    const hasSecondarySearch = activeTab === 'secondary' && searchQuery.trim() !== '';

    const totalEngaged = primarySupportersCount + secondarySupportersCount;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Supporters" />
            <div className="flex flex-1 flex-col gap-6 rounded-xl py-4 px-4 md:py-6 md:px-10 w-full">

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                    {[
                        {
                            label: 'Primary members',
                            value: primarySupportersCount,
                            icon: UserCheck,
                            accent: 'text-purple-600 dark:text-purple-400',
                            bg: 'from-purple-500/10 to-purple-600/5',
                        },
                        {
                            label: 'Secondary supporters',
                            value: secondarySupportersCount,
                            icon: Users,
                            accent: 'text-blue-600 dark:text-blue-400',
                            bg: 'from-blue-500/10 to-blue-600/5',
                        },
                        {
                            label: 'Total engaged',
                            value: totalEngaged,
                            icon: UserPlus,
                            accent: 'text-indigo-600 dark:text-indigo-400',
                            bg: 'from-indigo-500/10 to-indigo-600/5',
                        },
                        {
                            label: 'Primary org changes',
                            value: changeLogsCount,
                            icon: History,
                            accent: 'text-amber-600 dark:text-amber-400',
                            bg: 'from-amber-500/10 to-amber-600/5',
                        },
                    ].map((stat) => (
                        <Card key={stat.label} className="border-border/50 shadow-sm overflow-hidden">
                            <CardContent className={cn('p-4 md:p-5 bg-gradient-to-br', stat.bg)}>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:text-xs">
                                            {stat.label}
                                        </p>
                                        <p className={cn('mt-1 text-2xl font-bold tabular-nums md:text-3xl', stat.accent)}>
                                            {stat.value.toLocaleString()}
                                        </p>
                                    </div>
                                    <stat.icon className={cn('h-5 w-5 shrink-0 opacity-70', stat.accent)} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Tabs */}
                <Tabs value={selectedTab} onValueChange={(value) => visitTab(value as SupportersTab)} className="space-y-4">
                    <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1 md:w-fit">
                        <TabsTrigger
                            value="primary"
                            className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                        >
                            <UserCheck className="h-4 w-4" />
                            Primary members
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] tabular-nums">
                                {primarySupportersCount}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="secondary"
                            className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                        >
                            <Users className="h-4 w-4" />
                            Secondary
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] tabular-nums">
                                {secondarySupportersCount}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="activity"
                            className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                        >
                            <History className="h-4 w-4" />
                            Activity
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] tabular-nums">
                                {changeLogsCount}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="primary" className="mt-0 space-y-4">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Primary supporters (members)</CardTitle>
                                <CardDescription>
                                    Supporters whose primary organization is {organization.name}. These are your
                                    official members for reporting and growth metrics.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative max-w-md">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name or email…"
                                        value={primarySearch}
                                        onChange={(e) => setPrimarySearch(e.target.value)}
                                        className="pl-9"
                                        disabled={isTabLoading('primary')}
                                    />
                                </div>
                                {isTabLoading('primary') ? (
                                    <TabLoading />
                                ) : !hasPrimarySearch && primarySupporters.length === 0 ? (
                                    <EmptyState
                                        icon={UserCheck}
                                        title="No primary members yet"
                                        description="Encourage supporters to select your organization as their primary on their profile."
                                    />
                                ) : primarySupporters.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-8 text-center">No matches for your search.</p>
                                ) : (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {primarySupporters.map((s) => (
                                            <SupporterCard key={s.user_id ?? s.id} supporter={s} variant="primary" />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="secondary" className="mt-0 space-y-4">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Secondary supporters</CardTitle>
                                <CardDescription>
                                    Supporters who follow or engage with you but belong to another organization as
                                    their primary. They can still donate, volunteer, and attend events.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative max-w-md">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name or email…"
                                        value={secondarySearch}
                                        onChange={(e) => setSecondarySearch(e.target.value)}
                                        className="pl-9"
                                        disabled={isTabLoading('secondary')}
                                    />
                                </div>
                                {isTabLoading('secondary') ? (
                                    <TabLoading />
                                ) : !hasSecondarySearch && secondarySupporters.length === 0 ? (
                                    <EmptyState
                                        icon={Users}
                                        title="No secondary supporters yet"
                                        description="When supporters follow your organization but have a different primary org, they will appear here."
                                    />
                                ) : secondarySupporters.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-8 text-center">No matches for your search.</p>
                                ) : (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {secondarySupporters.map((s) => (
                                            <SupporterCard key={s.user_id ?? s.id} supporter={s} variant="secondary" />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="activity" className="mt-0 space-y-4">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Primary organization changes</CardTitle>
                                <CardDescription>
                                    Informational log when a member changes their primary organization away from yours.
                                    No approval is required — you are notified for awareness.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isTabLoading('activity') ? (
                                    <TabLoading />
                                ) : changeLogs.length === 0 ? (
                                    <EmptyState
                                        icon={History}
                                        title="No changes recorded"
                                        description="When a primary member selects a new organization and provides a reason, the details will appear here."
                                    />
                                ) : (
                                    <div className="relative space-y-0">
                                        <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border md:left-[21px]" />
                                        {changeLogs.map((log) => (
                                            <div key={log.id} className="relative flex gap-4 pb-6 last:pb-0">
                                                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-purple-600 to-blue-600 shadow-sm">
                                                    <History className="h-4 w-4 text-white" />
                                                </div>
                                                <div className="flex-1 rounded-xl border border-border/60 bg-muted/20 p-4 min-w-0">
                                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                                        <div>
                                                            {log.supporter?.slug ? (
                                                                <Link
                                                                    href={route('users.show', log.supporter.slug)}
                                                                    className="font-semibold text-foreground hover:text-purple-600 dark:hover:text-purple-400"
                                                                >
                                                                    {log.supporter.name}
                                                                </Link>
                                                            ) : (
                                                                <p className="font-semibold">
                                                                    {log.supporter?.name ?? 'Supporter'}
                                                                </p>
                                                            )}
                                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                                Moved to{' '}
                                                                <span className="font-medium text-foreground">
                                                                    {log.new_organization?.name ?? 'another organization'}
                                                                </span>
                                                            </p>
                                                        </div>
                                                        {log.created_at && (
                                                            <time
                                                                className="text-xs text-muted-foreground shrink-0"
                                                                dateTime={log.created_at}
                                                            >
                                                                {new Date(log.created_at).toLocaleString(undefined, {
                                                                    dateStyle: 'medium',
                                                                    timeStyle: 'short',
                                                                })}
                                                            </time>
                                                        )}
                                                    </div>
                                                    <div className="mt-3 rounded-lg border border-purple-500/15 bg-purple-500/5 px-3 py-2.5">
                                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                            Reason
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground leading-relaxed">
                                                            {log.reason}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}

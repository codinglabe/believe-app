import { Link, router } from '@inertiajs/react';
import { PageHead } from '@/components/frontend/PageHead';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Search,
    Calendar,
    Users,
    DollarSign,
    Gift,
    Clock,
    CheckCircle,
    ArrowRight,
    Sparkles,
    Loader2,
} from 'lucide-react';
import type { PageProps } from '@/types';
import FrontendLayout from '@/layouts/frontend/frontend-layout';
import CountdownTimer from '@/components/ui/countdown-timer';
import { cn } from '@/lib/utils';

interface Raffle {
    id: number;
    title: string;
    description: string;
    ticket_price: number;
    total_tickets: number;
    sold_tickets: number;
    draw_date: string;
    status: string;
    image?: string;
    prizes: Array<{
        name: string;
        description?: string;
    }>;
    winners_count: number;
    organization: {
        name: string;
    };
    is_active: boolean;
    is_completed: boolean;
    is_draw_time: boolean;
    available_tickets: number;
}

interface RafflesIndexProps extends PageProps {
    raffles: {
        data: Raffle[];
        links: { url: string | null; label: string; active: boolean }[];
        meta: unknown;
    };
    filters: {
        search?: string;
        status?: string;
    };
}

/** Matches frontend layout tokens (navbar/footer): bg-background, bg-card, blue→purple accents */
const cardSurface =
    'rounded-xl border border-border bg-card text-card-foreground shadow-sm';

export default function RafflesIndex({ raffles, filters }: RafflesIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [navigating, setNavigating] = useState(false);
    const skipSearchDebounceRef = useRef(true);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const statusRef = useRef(status);
    statusRef.current = status;

    const visitIndex = useCallback((q: string, s: string) => {
        const statusParam = s === 'all' ? undefined : s;
        router.get(
            route('frontend.raffles.index'),
            { search: q.trim() || undefined, status: statusParam },
            {
                preserveState: true,
                replace: true,
                onStart: () => setNavigating(true),
                onFinish: () => setNavigating(false),
                onCancel: () => setNavigating(false),
            },
        );
    }, []);

    useEffect(() => {
        if (skipSearchDebounceRef.current) {
            skipSearchDebounceRef.current = false;
            return;
        }
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }
        searchDebounceRef.current = setTimeout(() => {
            visitIndex(search, statusRef.current);
            searchDebounceRef.current = null;
        }, 450);
        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
            }
        };
    }, [search, visitIndex]);

    const handleStatusChange = (value: string) => {
        setStatus(value);
        visitIndex(search, value);
    };

    const getStatusBadge = (raffle: Raffle) => {
        if (raffle.is_completed) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Completed
                </span>
            );
        }
        if (raffle.status === 'cancelled') {
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    Cancelled
                </span>
            );
        }
        if (raffle.is_draw_time) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:text-amber-100">
                    <Clock className="h-3.5 w-3.5" />
                    Draw near
                </span>
            );
        }
        if (raffle.is_active) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Active
                </span>
            );
        }
        return (
            <span className="inline-flex rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Inactive
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <FrontendLayout>
            <PageHead
                title="Sweepstakes"
                description="Enter to win prizes while supporting nonprofits. Optional donations and secure checkout where offered."
            />

            <div className="min-h-screen bg-background pb-16 font-sans text-foreground">
                {/* Hero — gradient only (no photo); search + status in one bar */}
                <div className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-950 pb-16 pt-20 dark:from-purple-950 dark:via-indigo-950 dark:to-blue-950">
                    <div className="relative z-10 container mx-auto px-4">
                        <div className="mx-auto flex max-w-3xl flex-col items-center text-center text-white">
                            <h1 className="mb-4 text-4xl font-extrabold tracking-tight md:text-6xl">
                                Enter to win.{' '}
                                <span className="bg-gradient-to-r from-purple-200 to-blue-200 bg-clip-text text-transparent">
                                    Support causes.
                                </span>
                            </h1>
                            <p className="mb-8 max-w-lg text-lg font-medium text-white/90 md:text-xl">
                                Support nonprofits with every entry—transparent winner selection and secure checkout where
                                donations are offered.
                            </p>

                            <div
                                role="search"
                                aria-label="Sweepstakes search"
                                className="flex w-full max-w-2xl flex-col gap-2 rounded-2xl bg-card p-2 shadow-2xl ring-4 ring-white/10 sm:flex-row sm:items-stretch sm:gap-0 sm:rounded-full sm:pl-4 dark:ring-white/5"
                            >
                                <span className="sr-only">
                                    {navigating
                                        ? 'Searching…'
                                        : 'Results update automatically a short moment after you type.'}
                                </span>
                                <div className="relative flex min-h-[3.25rem] flex-1 items-center px-2 sm:px-0">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="search"
                                        autoComplete="off"
                                        placeholder="Search by title or description…"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="h-11 border-0 bg-transparent pl-10 pr-2 text-base text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-lg"
                                        aria-busy={navigating}
                                    />
                                </div>
                                <div className="flex shrink-0 items-center justify-center px-2 sm:px-1">
                                    <div
                                        className={cn(
                                            'relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 p-[2px] shadow-md transition-transform',
                                            navigating ? 'scale-105' : 'animate-pulse',
                                        )}
                                    >
                                        <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
                                            {navigating ? (
                                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                            ) : (
                                                <Sparkles className="h-5 w-5 text-primary opacity-90" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:border-l sm:border-border sm:pl-2 sm:pr-2">
                                    <Select value={status} onValueChange={handleStatusChange}>
                                        <SelectTrigger className="h-11 w-full border-border bg-background/95 text-foreground sm:w-[10.5rem] sm:border-0 sm:bg-transparent sm:shadow-none sm:focus:ring-0">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All statuses</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 lg:pt-12">
                    {raffles.data.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                            {raffles.data.map((raffle) => (
                                <article
                                    key={raffle.id}
                                    className={cn(
                                        'group flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-md',
                                        cardSurface,
                                    )}
                                >
                                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                                        {raffle.image ? (
                                            <img
                                                src={`/storage/${raffle.image}`}
                                                alt=""
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/30">
                                                <Gift className="h-14 w-14 text-primary/60" />
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent p-4 pt-12">
                                            <p className="line-clamp-2 text-sm font-semibold text-white drop-shadow-sm">
                                                {raffle.title}
                                            </p>
                                            <p className="mt-0.5 text-xs text-white/85">{raffle.organization.name}</p>
                                        </div>
                                        <div className="absolute right-3 top-3">{getStatusBadge(raffle)}</div>
                                    </div>

                                    <div className="flex flex-1 flex-col p-5">
                                        <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                                            {raffle.description}
                                        </p>

                                        <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                                            <div className="rounded-xl bg-muted/80 py-2">
                                                <DollarSign className="mx-auto mb-0.5 h-3.5 w-3.5 text-primary" />
                                                <span className="font-semibold text-foreground">
                                                    ${Number(raffle.ticket_price).toFixed(0)}
                                                </span>
                                                <div className="text-[10px] uppercase tracking-wide opacity-80">donation</div>
                                            </div>
                                            <div className="rounded-xl bg-muted/80 py-2">
                                                <Users className="mx-auto mb-0.5 h-3.5 w-3.5 text-primary" />
                                                <span className="font-semibold text-foreground">
                                                    {raffle.sold_tickets}/{raffle.total_tickets}
                                                </span>
                                                <div className="text-[10px] uppercase tracking-wide opacity-80">entries</div>
                                            </div>
                                            <div className="rounded-xl bg-muted/80 py-2">
                                                <Gift className="mx-auto mb-0.5 h-3.5 w-3.5 text-primary" />
                                                <span className="font-semibold text-foreground">
                                                    {raffle.prizes?.length ?? 0}
                                                </span>
                                                <div className="text-[10px] uppercase tracking-wide opacity-80">prizes</div>
                                            </div>
                                        </div>

                                        {raffle.is_active && !raffle.is_completed && (
                                            <div className="mb-4 rounded-xl border border-border bg-muted/40 px-3 py-2">
                                                <CountdownTimer drawDate={raffle.draw_date} size="small" showLabel />
                                            </div>
                                        )}

                                        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                                            <span className="inline-flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                                {formatDate(raffle.draw_date)}
                                            </span>
                                        </div>

                                        <Link href={route('frontend.raffles.show', raffle.id)} className="mt-4 block">
                                            <Button className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-purple-700">
                                                Enter to win
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className={cn('py-16 text-center', cardSurface)}>
                            <Gift className="mx-auto mb-4 h-14 w-14 text-muted-foreground/50" />
                            <h3 className="text-lg font-semibold text-foreground">No sweepstakes match</h3>
                            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                                {filters.search || filters.status
                                    ? 'Try different keywords or reset the status filter.'
                                    : 'New fundraisers will appear here soon.'}
                            </p>
                        </div>
                    )}

                    {raffles.data.length > 0 && raffles.links?.length ? (
                        <nav className="mt-12 flex w-full justify-center" aria-label="Pagination">
                            <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2">
                                {raffles.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || '#'}
                                        className={cn(
                                            'inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors',
                                            link.active
                                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm'
                                                : 'border border-border bg-background text-foreground hover:bg-muted/80',
                                            !link.url && 'pointer-events-none opacity-40',
                                        )}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </nav>
                    ) : null}
                </div>
            </div>
        </FrontendLayout>
    );
}

import { Link, router } from '@inertiajs/react';
import { PageHead } from '@/components/frontend/PageHead';
import { useState } from 'react';
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
    Ticket,
    Sparkles,
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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const statusParam = status === 'all' ? undefined : status;
        router.get(route('frontend.raffles.index'), { search, status: statusParam }, { preserveState: true });
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);
        const statusParam = value === 'all' ? undefined : value;
        router.get(route('frontend.raffles.index'), { search, status: statusParam }, { preserveState: true });
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
        if (raffle.is_draw_time) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:text-amber-100">
                    <Clock className="h-3.5 w-3.5" />
                    Draw time
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
                title="Raffles"
                description="Enter raffles to win prizes while supporting nonprofits. Buy tickets through secure checkout."
            />

            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-14">
                    {/* Hero */}
                    <header className="mb-10 text-center lg:mb-12">
                        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md">
                            <Ticket className="h-7 w-7" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                            Raffles for good
                        </h1>
                        <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
                            Support nonprofits with every ticket. Transparent draws, secure payments, and prizes you will
                            love.
                        </p>
                    </header>

                    {/* Filters */}
                    <div className={cn('mb-10 p-4 sm:p-5', cardSurface)}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <form onSubmit={handleSearch} className="w-full max-w-md flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search by title or description…"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="h-11 border-input bg-background pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                                    />
                                </div>
                            </form>
                            <Select value={status} onValueChange={handleStatusChange}>
                                <SelectTrigger className="h-11 w-full border-input bg-background md:w-52">
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

                    {/* Grid */}
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
                                                <div className="text-[10px] uppercase tracking-wide opacity-80">each</div>
                                            </div>
                                            <div className="rounded-xl bg-muted/80 py-2">
                                                <Users className="mx-auto mb-0.5 h-3.5 w-3.5 text-primary" />
                                                <span className="font-semibold text-foreground">
                                                    {raffle.sold_tickets}/{raffle.total_tickets}
                                                </span>
                                                <div className="text-[10px] uppercase tracking-wide opacity-80">sold</div>
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
                                                View raffle
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
                            <h3 className="text-lg font-semibold text-foreground">No raffles match</h3>
                            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                                {filters.search || filters.status
                                    ? 'Try different keywords or reset the status filter.'
                                    : 'New fundraisers will appear here soon.'}
                            </p>
                        </div>
                    )}

                    {raffles.data.length > 0 && raffles.links?.length ? (
                        <nav className="mt-12 flex flex-wrap justify-center gap-2" aria-label="Pagination">
                            {raffles.links.map((link, index) => (
                                <Link
                                    key={index}
                                    href={link.url || '#'}
                                    className={cn(
                                        'min-w-[2.5rem] rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                        link.active
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm'
                                            : 'border border-border bg-background text-foreground hover:bg-muted/80',
                                        !link.url && 'pointer-events-none opacity-40',
                                    )}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </nav>
                    ) : null}
                </div>
            </div>
        </FrontendLayout>
    );
}

import { Link, router, useForm, usePage } from '@inertiajs/react';
import { PageHead } from '@/components/frontend/PageHead';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/frontend/ui/switch';
import {
    Gift,
    Clock,
    CheckCircle,
    ArrowLeft,
    Ticket,
    Crown,
    Medal,
    Award,
    Loader2,
    Sparkles,
    Info,
    Coins,
    CreditCard,
    ChevronRight,
} from 'lucide-react';
import type { PageProps, ProcessingFeeRates } from '@/types';
import FrontendLayout from '@/layouts/frontend/frontend-layout';
import CountdownTimer from '@/components/ui/countdown-timer';
import RaffleTicket from '@/components/ui/raffle-ticket';
import { cn } from '@/lib/utils';

/** Raffle preview is card-only; rail is always `card` from the server. */
interface FeePreviewFromServer {
    mode: 'donor_covers' | 'org_covers';
    rail?: 'card';
    base_gift_usd: number;
    checkout_total_usd: number;
    processing_fee_estimate: number;
    estimated_net_to_org_usd: number;
}

const DEFAULT_PROCESSING_FEE_RATES: ProcessingFeeRates = {
    card_percent: 0.029,
    card_fixed_usd: 0.3,
    ach_percent: 0.008,
    ach_fee_cap_usd: 5,
};

const cardSurface =
    'rounded-xl border border-border bg-card text-card-foreground shadow-sm';

interface RaffleTicket {
    id: number;
    ticket_number: string;
    user_id: number;
    price: number;
    status: string;
    user: {
        name: string;
    };
    is_winner: boolean;
}

interface RaffleWinner {
    id: number;
    position: number;
    prize_name: string;
    prize_description?: string;
    announced_at: string;
    user: {
        name: string;
    };
    ticket: {
        ticket_number: string;
    };
}

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
        id?: number;
        name: string;
        role?: string;
        organization?: {
            name: string;
            description?: string | null;
        } | null;
        description?: string;
    };
    tickets: RaffleTicket[];
    winners: RaffleWinner[];
    is_active: boolean;
    is_completed: boolean;
    is_draw_time: boolean;
    available_tickets: number;
}

interface RaffleShowProps extends PageProps {
    raffle: Raffle;
    feePreview?: FeePreviewFromServer | null;
    /** When false, only Stripe checkout is offered */
    believePointsEnabled?: boolean;
    /** Purchased Believe Points balance (1 point ≈ $1 toward eligible purchases) */
    believePointsBalance?: number;
    auth: {
        user: {
            name: string;
            email: string;
        };
    };
}

export default function RaffleShow({
    raffle,
    auth,
    believePointsEnabled = false,
    believePointsBalance = 0,
}: RaffleShowProps) {
    const page = usePage<RaffleShowProps & { processingFeeRates?: ProcessingFeeRates }>();
    const feePreview = page.props.feePreview ?? null;
    const processingFeeRates = page.props.processingFeeRates ?? DEFAULT_PROCESSING_FEE_RATES;

    const { data, setData, post, processing, errors } = useForm({
        quantity: 1,
        donor_covers_processing_fees: true,
        payment_method: 'stripe' as 'stripe' | 'believe_points',
    });

    const lineSubtotal = Math.round(Number(raffle.ticket_price) * data.quantity * 100) / 100;
    const canPayWithBelievePoints =
        believePointsEnabled && lineSubtotal > 0 && believePointsBalance >= lineSubtotal;

    const showPaymentPicker = Boolean(believePointsEnabled);
    const [checkoutStep, setCheckoutStep] = useState<1 | 2>(() => (showPaymentPicker ? 1 : 2));

    const [feePreviewLoading, setFeePreviewLoading] = useState(false);
    const rafflePreviewPartialReloadSkipRef = useRef(true);

    useEffect(() => {
        if (rafflePreviewPartialReloadSkipRef.current) {
            rafflePreviewPartialReloadSkipRef.current = false;
            return;
        }
        if (checkoutStep !== 2) {
            return;
        }
        if (data.payment_method !== 'stripe') {
            return;
        }
        const baseUsd = Math.round(Number(raffle.ticket_price) * data.quantity * 100) / 100;
        if (baseUsd <= 0) {
            return;
        }
        const t = window.setTimeout(() => {
            setFeePreviewLoading(true);
            router.get(
                route('frontend.raffles.show', raffle.id),
                {
                    fee_preview_amount: baseUsd,
                    fee_preview_donor_covers: data.donor_covers_processing_fees ? 1 : 0,
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    replace: true,
                    only: ['feePreview'],
                    onFinish: () => setFeePreviewLoading(false),
                    onCancel: () => setFeePreviewLoading(false),
                },
            );
        }, 300);
        return () => clearTimeout(t);
    }, [
        checkoutStep,
        data.quantity,
        data.donor_covers_processing_fees,
        data.payment_method,
        raffle.id,
        raffle.ticket_price,
    ]);

    const handlePurchase = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('frontend.raffles.purchase', raffle.id), {
            onSuccess: () => {
                setData('quantity', 1);
                setData('donor_covers_processing_fees', true);
                setData('payment_method', 'stripe');
                setCheckoutStep(showPaymentPicker ? 1 : 2);
            },
        });
    };

    const selectPaymentMethod = (method: 'stripe' | 'believe_points') => {
        setData('payment_method', method);
        setCheckoutStep(2);
    };

    const goBackToPaymentStep = () => {
        setCheckoutStep(1);
    };

    const getStatusBadge = () => {
        if (raffle.is_completed) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-100">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Completed
                </span>
            );
        }
        if (raffle.is_draw_time) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-950 dark:text-amber-100">
                    <Clock className="h-3.5 w-3.5" />
                    Draw time
                </span>
            );
        }
        if (raffle.is_active) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Active
                </span>
            );
        }
        return (
            <span className="inline-flex rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                Inactive
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getPositionIcon = (position: number) => {
        switch (position) {
            case 1:
                return <Crown className="h-5 w-5 text-amber-500" />;
            case 2:
                return <Medal className="h-5 w-5 text-muted-foreground" />;
            case 3:
                return <Award className="h-5 w-5 text-amber-600" />;
            default:
                return <Gift className="h-5 w-5 text-primary" />;
        }
    };

    const metaDescription = raffle.description ? String(raffle.description).slice(0, 160) : undefined;

    const hostingOrganizationName = (() => {
        const u = raffle.organization;
        if (!u?.name) {
            return null as string | null;
        }
        const profileName = u.organization?.name?.trim();
        if (profileName) {
            return profileName;
        }
        const role = u.role ?? '';
        if (role === 'organization' || role === 'organization_pending' || role === 'care_alliance') {
            return u.name.trim();
        }
        return null as string | null;
    })();

    const organizationCardName = hostingOrganizationName ?? raffle.organization.name;
    const organizationCardDescription =
        raffle.organization.organization?.description?.trim() ||
        raffle.organization.description?.trim() ||
        null;

    return (
        <FrontendLayout>
            <PageHead title={raffle.title} description={metaDescription} />

            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-10">
                    <Link
                        href={route('frontend.raffles.index')}
                        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
                    >
                        <ArrowLeft className="h-4 w-4 shrink-0" />
                        All raffles
                    </Link>

                    {/* Hero */}
                    <header className={cn('mb-10 p-6 sm:p-8', cardSurface)}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                                {hostingOrganizationName ? (
                                    <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                                        {hostingOrganizationName}
                                    </p>
                                ) : null}
                                <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                    {raffle.title}
                                </h1>
                                {!hostingOrganizationName ? (
                                    <p className="mt-2 text-muted-foreground">Hosted by {raffle.organization.name}</p>
                                ) : null}
                                <div className="mt-4">{getStatusBadge()}</div>
                            </div>
                            <div className="flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-4 text-white shadow-md sm:p-5">
                                <Ticket className="h-10 w-10 sm:h-12 sm:w-12" />
                            </div>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            {raffle.image ? (
                                <div className={cn('overflow-hidden p-0', cardSurface)}>
                                    <div className="aspect-video overflow-hidden">
                                        <img
                                            src={`/storage/${raffle.image}`}
                                            alt={raffle.title}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                </div>
                            ) : null}

                            <div className={cn('overflow-hidden p-0', cardSurface)}>
                                <div className="border-b border-border bg-muted/40 px-5 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Draw countdown
                                    </p>
                                </div>
                                <div className="p-2 sm:p-4">
                                    <CountdownTimer drawDate={raffle.draw_date} size="medium" />
                                </div>
                            </div>

                            <section className={cn('p-6 sm:p-8', cardSurface)}>
                                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                                    <Info className="h-5 w-5 text-primary" />
                                    About this raffle
                                </h2>
                                <p className="leading-relaxed text-muted-foreground">{raffle.description}</p>
                            </section>

                            <section className={cn('p-6 sm:p-8', cardSurface)}>
                                <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
                                    <Gift className="h-5 w-5 text-primary" />
                                    Prizes
                                </h2>
                                <ul className="space-y-3">
                                    {raffle.prizes.map((prize, index) => (
                                        <li
                                            key={index}
                                            className="flex gap-4 rounded-xl border border-border bg-muted/30 p-4"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background shadow-sm">
                                                {getPositionIcon(index + 1)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-foreground">{prize.name}</h3>
                                                {prize.description ? (
                                                    <p className="mt-1 text-sm text-muted-foreground">{prize.description}</p>
                                                ) : null}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {raffle.is_completed && raffle.winners?.length ? (
                                <section className={cn('p-6 sm:p-8', cardSurface)}>
                                    <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
                                        <Crown className="h-5 w-5 text-amber-500" />
                                        Winners
                                    </h2>
                                    <ul className="space-y-3">
                                        {raffle.winners.map((winner) => (
                                            <li
                                                key={winner.id}
                                                className="flex flex-col justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center dark:border-amber-500/30 dark:bg-amber-950/20"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getPositionIcon(winner.position)}
                                                    <div>
                                                        <p className="font-semibold text-foreground">{winner.user.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Ticket #{winner.ticket.ticket_number}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-left sm:text-right">
                                                    <p className="font-semibold text-foreground">{winner.prize_name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(winner.announced_at)}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ) : null}
                        </div>

                        <aside className="space-y-6">
                            {((raffle.is_active && !raffle.is_completed) ||
                                (raffle.status === 'active' && raffle.available_tickets > 0)) && (
                                <Card className={cardSurface}>
                                    <CardHeader className="border-b border-border pb-4">
                                        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                                            <Ticket className="h-5 w-5 text-primary" />
                                            Get tickets
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            {showPaymentPicker && checkoutStep === 1
                                                ? 'Choose how you’d like to pay.'
                                                : data.payment_method === 'believe_points'
                                                  ? 'Choose quantity and confirm with Believe Points.'
                                                  : 'Choose quantity and continue to checkout.'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {showPaymentPicker && checkoutStep === 1 ? (
                                            <div className="space-y-3">
                                                <p className="text-sm font-semibold tracking-wide text-foreground">
                                                    Payment method
                                                </p>
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => selectPaymentMethod('stripe')}
                                                        className={cn(
                                                            'group flex w-full items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-left shadow-sm outline-none ring-offset-background transition-all',
                                                            'hover:border-primary/50 hover:bg-muted/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring',
                                                            'active:scale-[0.995]',
                                                        )}
                                                    >
                                                        <CreditCard
                                                            className="h-5 w-5 shrink-0 text-primary"
                                                            aria-hidden
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <span className="block text-sm font-semibold text-foreground">
                                                                Card
                                                            </span>
                                                            <span className="block text-xs leading-snug text-muted-foreground">
                                                                Debit or credit via secure checkout
                                                            </span>
                                                        </div>
                                                        <ChevronRight
                                                            className="h-4 w-4 shrink-0 text-muted-foreground opacity-70 transition-transform group-hover:translate-x-0.5"
                                                            aria-hidden
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => selectPaymentMethod('believe_points')}
                                                        className={cn(
                                                            'group flex w-full items-center gap-3 rounded-xl border border-border bg-amber-500/[0.06] px-3 py-2.5 text-left shadow-sm outline-none ring-offset-background transition-all',
                                                            'hover:border-amber-500/45 hover:bg-amber-500/10 focus-visible:border-amber-600 focus-visible:ring-2 focus-visible:ring-amber-500/25',
                                                            'active:scale-[0.995]',
                                                        )}
                                                    >
                                                        <Coins
                                                            className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
                                                            aria-hidden
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <span className="block text-sm font-semibold text-foreground">
                                                                Believe Points
                                                            </span>
                                                            <span className="block text-xs leading-snug text-muted-foreground">
                                                                Balance{' '}
                                                                <strong className="font-semibold text-foreground">
                                                                    {believePointsBalance.toFixed(2)}
                                                                </strong>{' '}
                                                                pts · 1 pt = $1
                                                            </span>
                                                        </div>
                                                        <ChevronRight
                                                            className="h-4 w-4 shrink-0 text-muted-foreground opacity-70 transition-transform group-hover:translate-x-0.5"
                                                            aria-hidden
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                        <form onSubmit={handlePurchase} className="space-y-5">
                                            {showPaymentPicker ? (
                                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                            {data.payment_method === 'believe_points'
                                                                ? 'Believe Points'
                                                                : 'Card'}
                                                        </span>
                                                        <span className="text-sm text-muted-foreground">
                                                            {data.payment_method === 'believe_points'
                                                                ? `${believePointsBalance.toFixed(2)} pts available`
                                                                : 'Pay at checkout'}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 shrink-0 gap-1 text-muted-foreground hover:text-foreground"
                                                        onClick={goBackToPaymentStep}
                                                    >
                                                        <ArrowLeft className="h-4 w-4" aria-hidden />
                                                        Change method
                                                    </Button>
                                                </div>
                                            ) : null}

                                            <div>
                                                <Label htmlFor="quantity" className="text-foreground">
                                                    Quantity
                                                </Label>
                                                <Input
                                                    id="quantity"
                                                    type="number"
                                                    min={1}
                                                    max={10}
                                                    value={data.quantity}
                                                    onChange={(e) => {
                                                        const value = parseInt(e.target.value, 10) || 1;
                                                        setData('quantity', Math.min(10, Math.max(1, value)));
                                                    }}
                                                    className="mt-1.5 h-11 border-border bg-background"
                                                />
                                                {errors.quantity ? (
                                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quantity}</p>
                                                ) : null}
                                            </div>

                                            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                                                <div className="flex justify-between text-sm text-muted-foreground">
                                                    <span>Price per ticket</span>
                                                    <span className="font-semibold text-foreground">
                                                        ${Number(raffle.ticket_price).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm text-muted-foreground">
                                                    <span>
                                                        Subtotal ({data.quantity} ticket{data.quantity !== 1 ? 's' : ''})
                                                    </span>
                                                    <span className="font-semibold text-foreground">
                                                        ${lineSubtotal.toFixed(2)}
                                                    </span>
                                                </div>

                                                {lineSubtotal > 0 && data.payment_method === 'stripe' ? (
                                                    <>
                                                        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-foreground">
                                                                    Cover processing fees
                                                                </p>
                                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                                    When on, your total is adjusted so the nonprofit receives the full
                                                                    subtotal.
                                                                </p>
                                                            </div>
                                                            <Switch
                                                                checked={data.donor_covers_processing_fees}
                                                                onCheckedChange={(v) => setData('donor_covers_processing_fees', v)}
                                                            />
                                                        </div>

                                                        <div className="relative min-h-[4rem] space-y-1.5 text-xs">
                                                            {feePreviewLoading && !feePreview ? (
                                                                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                                                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                                                    Updating estimate…
                                                                </div>
                                                            ) : null}
                                                            {feePreview ? (
                                                                <div className={cn('space-y-1.5', feePreviewLoading && 'opacity-60')}>
                                                                    {feePreview.mode === 'donor_covers' ? (
                                                                        <>
                                                                            <div className="flex justify-between text-foreground">
                                                                                <span>To nonprofit</span>
                                                                                <span className="font-medium tabular-nums">
                                                                                    ${feePreview.base_gift_usd.toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between text-muted-foreground">
                                                                                <span>Est. processing</span>
                                                                                <span className="tabular-nums">
                                                                                    +${feePreview.processing_fee_estimate.toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
                                                                                <span>Est. total</span>
                                                                                <span className="tabular-nums">
                                                                                    ${feePreview.checkout_total_usd.toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <div className="flex justify-between text-foreground">
                                                                                <span>You pay</span>
                                                                                <span className="font-medium tabular-nums">
                                                                                    ${feePreview.base_gift_usd.toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between text-muted-foreground">
                                                                                <span>Est. processing</span>
                                                                                <span className="tabular-nums">
                                                                                    −${feePreview.processing_fee_estimate.toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between border-t border-border pt-2 font-medium text-foreground">
                                                                                <span>Est. to nonprofit</span>
                                                                                <span className="font-medium tabular-nums">
                                                                                    ${feePreview.estimated_net_to_org_usd.toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                    {feePreviewLoading ? (
                                                                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[1px]">
                                                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            ) : null}
                                                            <p className="pt-2 text-[11px] text-muted-foreground">
                                                                Uses {(processingFeeRates.card_percent * 100).toFixed(1)}% + $
                                                                {processingFeeRates.card_fixed_usd.toFixed(2)} estimate. Final amount at
                                                                checkout.
                                                            </p>
                                                        </div>
                                                    </>
                                                ) : lineSubtotal > 0 && data.payment_method === 'believe_points' ? (
                                                    <div className="border-t border-border pt-3 text-sm text-muted-foreground">
                                                        <p>
                                                            This order uses{' '}
                                                            <strong className="text-foreground">
                                                                {lineSubtotal.toFixed(2)} Believe Points
                                                            </strong>{' '}
                                                            (no card processing fees).
                                                        </p>
                                                    </div>
                                                ) : null}
                                            </div>

                                            {errors.payment_method ? (
                                                <p className="text-sm text-red-600 dark:text-red-400">{errors.payment_method}</p>
                                            ) : null}

                                            {data.payment_method === 'believe_points' &&
                                            lineSubtotal > 0 &&
                                            !canPayWithBelievePoints ? (
                                                <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                                                    This order needs{' '}
                                                    <strong>{lineSubtotal.toFixed(2)}</strong> points; your balance is{' '}
                                                    <strong>{believePointsBalance.toFixed(2)}</strong>. Lower the quantity or use
                                                    card — or{' '}
                                                    <button
                                                        type="button"
                                                        className="font-semibold underline underline-offset-2 hover:no-underline"
                                                        onClick={() => selectPaymentMethod('stripe')}
                                                    >
                                                        switch to Card
                                                    </button>
                                                    .
                                                </p>
                                            ) : null}

                                            <Button
                                                type="submit"
                                                disabled={
                                                    processing ||
                                                    data.quantity > raffle.available_tickets ||
                                                    (data.payment_method === 'believe_points' && !canPayWithBelievePoints)
                                                }
                                                className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-purple-700"
                                            >
                                                {processing
                                                    ? data.payment_method === 'believe_points'
                                                        ? 'Completing…'
                                                        : 'Redirecting…'
                                                    : data.payment_method === 'believe_points'
                                                      ? `Use ${lineSubtotal.toFixed(2)} Believe Points · ${data.quantity} ticket${data.quantity > 1 ? 's' : ''}`
                                                      : `Card · ${data.quantity} ticket${data.quantity > 1 ? 's' : ''}`}
                                            </Button>

                                            {data.quantity > raffle.available_tickets ? (
                                                <p className="text-center text-sm text-red-600 dark:text-red-400">Not enough tickets left</p>
                                            ) : null}
                                        </form>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            <section className={cn('p-6', cardSurface)}>
                                <h2 className="mb-4 text-lg font-bold text-foreground">Raffle details</h2>
                                <dl className="space-y-3 text-sm">
                                    {[
                                        ['Ticket price', `$${raffle.ticket_price}`],
                                        ['Total tickets', String(raffle.total_tickets)],
                                        ['Sold', String(raffle.sold_tickets)],
                                        ['Available', String(raffle.available_tickets)],
                                        ['Draw date', formatDate(raffle.draw_date)],
                                        ['Winner spots', String(raffle.winners_count)],
                                    ].map(([k, v]) => (
                                        <div key={k} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
                                            <dt className="text-muted-foreground">{k}</dt>
                                            <dd className="font-medium text-foreground">{v}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>

                            <section className={cn('p-6', cardSurface)}>
                                <h2 className="mb-3 text-lg font-bold text-foreground">Organization</h2>
                                <p className="text-base font-semibold text-primary">{organizationCardName}</p>
                                {organizationCardDescription ? (
                                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                                        {organizationCardDescription}
                                    </p>
                                ) : null}
                            </section>

                            <section className={cn('p-6', cardSurface)}>
                                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
                                    <Ticket className="h-5 w-5 text-primary" />
                                    Ticket preview
                                </h2>
                                <p className="mb-4 text-sm text-muted-foreground">Sample layout for your purchased tickets</p>
                                <div className="flex w-full justify-center pb-2">
                                    <RaffleTicket
                                        ticket={{
                                            id: 0,
                                            ticket_number: 'XXXX-XXXX-XXXX',
                                            price: raffle.ticket_price,
                                            purchased_at: new Date().toISOString(),
                                            user: auth.user,
                                            raffle: raffle,
                                        }}
                                        showStub
                                    />
                                </div>
                            </section>
                        </aside>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    );
}

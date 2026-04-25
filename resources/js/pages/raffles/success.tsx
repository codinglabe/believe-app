import React, { useEffect, useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Calendar,
    CheckCircle,
    Coins,
    Download,
    Eye,
    Loader2,
    Sparkles,
    Ticket,
    Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import FrontendLayout from '@/layouts/frontend/frontend-layout';
import RaffleTicket from '@/components/ui/raffle-ticket';
import { downloadTicket, printTicket } from '@/lib/ticket-download';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface SuccessPageProps {
    raffle: {
        id: number;
        title: string;
        ticket_price: number;
        draw_date: string;
        organization: {
            name: string;
            role?: string;
            description?: string | null;
            organization?: {
                name: string;
                description?: string | null;
            } | null;
        };
    };
    tickets: Array<{
        id: number;
        ticket_number: string;
        price: number;
        purchased_at: string;
        raffle: {
            id: number;
            title: string;
            draw_date: string;
            organization: {
                name: string;
            };
        };
    }>;
    auth: {
        user: {
            name: string;
            email: string;
        };
    };
    paymentMethod?: 'stripe' | 'believe_points';
    believePointsUsed?: number | null;
}

type TicketExportBusy =
    | null
    | {
          ticketId: number;
          action: 'download' | 'print';
      };

/** Fixed sparkle anchors — avoids random inline styles (deterministic layout). */
const sparkleAnchors = [
    'left-[8%] top-[12%]',
    'left-[78%] top-[8%]',
    'left-[22%] top-[38%]',
    'left-[88%] top-[28%]',
    'left-[45%] top-[6%]',
    'left-[12%] top-[72%]',
    'left-[92%] top-[62%]',
    'left-[55%] top-[42%]',
    'left-[30%] top-[56%]',
    'left-[70%] top-[78%]',
    'left-[5%] top-[48%]',
    'left-[65%] top-[18%]',
];

export default function RaffleSuccessPage({
    raffle,
    tickets,
    auth,
    paymentMethod = 'stripe',
    believePointsUsed: believePointsUsedProp,
}: SuccessPageProps) {
    const [mounted, setMounted] = useState(false);
    const [showCelebration, setShowCelebration] = useState(true);
    const [ticketExportBusy, setTicketExportBusy] = useState<TicketExportBusy>(null);
    const ticketRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    const isTicketExportBusy = (ticketId: number) => ticketExportBusy?.ticketId === ticketId;

    async function handleDownloadTicket(ticketId: number, ticketNumber: string) {
        const element = ticketRefs.current[ticketId];
        if (!element) {
            toast.error('Ticket is not ready yet. Refresh and try again.');
            return;
        }
        setTicketExportBusy({ ticketId, action: 'download' });
        try {
            await downloadTicket(element, ticketNumber);
        } catch (err) {
            console.error(err);
            toast.error('Could not download the ticket. Try Print or refresh the page.');
        } finally {
            setTicketExportBusy(null);
        }
    }

    async function handlePrintTicket(ticketId: number) {
        const element = ticketRefs.current[ticketId];
        if (!element) {
            toast.error('Ticket is not ready yet. Refresh and try again.');
            return;
        }
        setTicketExportBusy({ ticketId, action: 'print' });
        try {
            await printTicket(element);
        } catch (err) {
            console.error(err);
            toast.error('Could not open print. Disable popup blockers or try Download.');
        } finally {
            setTicketExportBusy(null);
        }
    }

    const paidWithBelievePoints = paymentMethod === 'believe_points';

    const lineTotalUsd = Math.round(Number(raffle.ticket_price) * tickets.length * 100) / 100;
    const believePointsUsed =
        paidWithBelievePoints && believePointsUsedProp != null && !Number.isNaN(believePointsUsedProp)
            ? Math.round(Number(believePointsUsedProp) * 100) / 100
            : lineTotalUsd;

    const feePct = 0.08;
    const adminFeePts = paidWithBelievePoints ? Math.round(believePointsUsed * feePct * 100) / 100 : 0;
    const toOrgPts = paidWithBelievePoints ? Math.round((believePointsUsed - adminFeePts) * 100) / 100 : 0;

    const organizationCardName = (() => {
        const u = raffle.organization;
        if (!u?.name) {
            return 'Organization';
        }
        const profileName = u.organization?.name?.trim();
        if (profileName) {
            return profileName;
        }
        const role = u.role ?? '';
        if (role === 'organization' || role === 'organization_pending' || role === 'care_alliance') {
            return u.name.trim();
        }
        return u.name.trim();
    })();

    const drawFormatted = new Date(raffle.draw_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    useEffect(() => {
        setMounted(true);
        const t = setTimeout(() => setShowCelebration(false), 2800);
        return () => clearTimeout(t);
    }, []);

    return (
        <FrontendLayout>
            <Head title="Purchase successful" />

            <div className="relative min-h-screen overflow-hidden bg-background">
                {/* Ambient */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-24 top-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl dark:bg-emerald-500/10" />
                    <div className="absolute -right-20 bottom-32 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-500/10" />
                    <div className="absolute left-1/2 top-20 h-px w-[min(100%,56rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
                </div>

                {/* Celebration sparkles */}
                {showCelebration ? (
                    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
                        {sparkleAnchors.map((pos, i) => (
                            <div
                                key={i}
                                className={cn(
                                    'absolute animate-pulse text-amber-400/90 dark:text-amber-300/80',
                                    pos,
                                    i % 4 === 0 && 'delay-75',
                                    i % 4 === 1 && 'delay-150',
                                    i % 4 === 2 && 'delay-300',
                                    i % 4 === 3 && 'delay-500',
                                )}
                            >
                                <Sparkles className="h-4 w-4" aria-hidden />
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="relative mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
                    <div
                        className={cn(
                            'transition-all duration-700',
                            mounted ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
                        )}
                    >
                        {/* Hero */}
                        <div className="mb-10 text-center">
                            <div
                                className={cn(
                                    'mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm',
                                    paidWithBelievePoints
                                        ? 'border-amber-500/30 bg-amber-500/[0.08] dark:border-amber-400/25 dark:bg-amber-950/40'
                                        : 'border-emerald-500/25 bg-emerald-500/[0.08] dark:border-emerald-400/20 dark:bg-emerald-950/35',
                                )}
                            >
                                {paidWithBelievePoints ? (
                                    <Coins className="h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden />
                                ) : (
                                    <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden />
                                )}
                            </div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                {organizationCardName}
                            </p>
                            <h1 className="mb-3 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                You&apos;re in
                            </h1>
                            <p className="mx-auto mb-6 max-w-lg text-base leading-relaxed text-muted-foreground">
                                {paidWithBelievePoints
                                    ? 'Your tickets are secured using Believe Points — thank you for supporting this raffle.'
                                    : 'Payment confirmed. Your raffle tickets are ready below.'}
                            </p>
                            <span
                                className={cn(
                                    'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide',
                                    paidWithBelievePoints
                                        ? 'border-amber-500/35 bg-amber-500/[0.08] text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/40 dark:text-amber-100'
                                        : 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-100',
                                )}
                            >
                                {paidWithBelievePoints ? (
                                    <>
                                        <Coins className="h-3.5 w-3.5" aria-hidden />
                                        Believe Points
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-3.5 w-3.5" aria-hidden />
                                        Card payment
                                    </>
                                )}
                            </span>
                        </div>

                        {/* Stats row */}
                        <Card className="mb-6 border-border/80 shadow-sm">
                            <CardContent className="grid gap-6 p-6 sm:grid-cols-3 sm:gap-4">
                                <div className="text-center sm:border-r sm:border-border sm:pr-4">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Tickets
                                    </p>
                                    <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                                        {tickets.length}
                                    </p>
                                </div>
                                <div className="text-center sm:border-r sm:border-border sm:px-4">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        {paidWithBelievePoints ? 'Per ticket' : 'Price each'}
                                    </p>
                                    <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                                        {paidWithBelievePoints ? (
                                            <>
                                                {Number(raffle.ticket_price).toFixed(2)}{' '}
                                                <span className="text-lg font-medium text-amber-600 dark:text-amber-400">
                                                    pts
                                                </span>
                                            </>
                                        ) : (
                                            `$${raffle.ticket_price}`
                                        )}
                                    </p>
                                </div>
                                <div className="text-center sm:pl-4">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        {paidWithBelievePoints ? 'Points used' : 'Total'}
                                    </p>
                                    <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                                        {paidWithBelievePoints ? (
                                            <>
                                                {believePointsUsed.toFixed(2)}{' '}
                                                <span className="text-lg font-medium text-amber-600 dark:text-amber-400">
                                                    pts
                                                </span>
                                            </>
                                        ) : (
                                            `$${(raffle.ticket_price * tickets.length).toFixed(2)}`
                                        )}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Breakdown */}
                        <div className="mb-8 rounded-2xl border border-border bg-muted/30 px-5 py-5 dark:bg-muted/20">
                            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {paidWithBelievePoints ? 'Believe Points breakdown' : 'Payment breakdown'}
                            </p>
                            {paidWithBelievePoints ? (
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">Applied</span>
                                        <span className="font-medium tabular-nums text-foreground">
                                            {believePointsUsed.toFixed(2)} pts
                                        </span>
                                    </div>
                                    <p className="text-center text-xs text-muted-foreground">
                                        No card processing fees. 1 point = $1 toward eligible purchases.
                                    </p>
                                    <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">
                                            Est. platform fee ({(feePct * 100).toFixed(0)}%)
                                        </span>
                                        <span className="font-medium tabular-nums text-orange-600 dark:text-orange-400">
                                            −{adminFeePts.toFixed(2)} pts
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-4 border-t border-border pt-3 font-semibold">
                                        <span className="text-foreground">Est. value to organization</span>
                                        <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                                            {toOrgPts.toFixed(2)} pts
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span className="font-medium tabular-nums text-foreground">
                                            ${(raffle.ticket_price * tickets.length).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">
                                            Administrative fee ({(feePct * 100).toFixed(0)}%)
                                        </span>
                                        <span className="font-medium tabular-nums text-orange-600 dark:text-orange-400">
                                            −${((raffle.ticket_price * tickets.length) * feePct).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-4 border-t border-border pt-3 font-semibold">
                                        <span className="text-foreground">Amount to organization</span>
                                        <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                                            ${((raffle.ticket_price * tickets.length) * (1 - feePct)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Raffle context */}
                        <div className="mb-10 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
                            <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                                    <Building2 className="h-4 w-4 shrink-0" aria-hidden />
                                    <span className="text-xs font-semibold uppercase tracking-wide">
                                        Supporting
                                    </span>
                                </div>
                                <h2 className="mb-1 text-lg font-semibold leading-snug text-foreground">
                                    {raffle.title}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Benefiting{' '}
                                    <span className="font-medium text-foreground">{organizationCardName}</span>
                                </p>
                            </div>
                            <div className="flex shrink-0 items-start gap-2 rounded-xl bg-muted/50 px-4 py-3 text-sm dark:bg-muted/30">
                                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Draw
                                    </p>
                                    <p className="font-medium text-foreground">{drawFormatted}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tickets */}
                        <div className="mb-10">
                            <div className="mb-6 flex items-center justify-center gap-2">
                                <Ticket className="h-5 w-5 text-primary" aria-hidden />
                                <h2 className="text-center text-xl font-bold text-foreground">Your tickets</h2>
                            </div>

                            <div className="mx-auto flex w-full max-w-lg flex-col gap-10 sm:max-w-xl">
                                {tickets.map((ticket) => (
                                    <div key={ticket.id} className="relative w-full">
                                        <div
                                            ref={(el) => {
                                                ticketRefs.current[ticket.id] = el;
                                            }}
                                            className="mx-auto w-full"
                                        >
                                            <RaffleTicket
                                                ticket={{
                                                    ...ticket,
                                                    user: auth.user,
                                                    is_winner: false,
                                                }}
                                                showStub={true}
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="mt-5 flex flex-wrap justify-center gap-3">
                                            <Button
                                                type="button"
                                                variant="default"
                                                disabled={isTicketExportBusy(ticket.id)}
                                                aria-busy={
                                                    ticketExportBusy?.ticketId === ticket.id &&
                                                    ticketExportBusy?.action === 'download'
                                                }
                                                onClick={() => void handleDownloadTicket(ticket.id, ticket.ticket_number)}
                                                className="h-11 min-w-[9.5rem] rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 font-semibold hover:from-blue-700 hover:to-violet-700"
                                            >
                                                {ticketExportBusy?.ticketId === ticket.id &&
                                                ticketExportBusy?.action === 'download' ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                                ) : (
                                                    <Download className="mr-2 h-4 w-4" aria-hidden />
                                                )}
                                                {ticketExportBusy?.ticketId === ticket.id &&
                                                ticketExportBusy?.action === 'download'
                                                    ? 'Preparing…'
                                                    : 'Download'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={isTicketExportBusy(ticket.id)}
                                                aria-busy={
                                                    ticketExportBusy?.ticketId === ticket.id &&
                                                    ticketExportBusy?.action === 'print'
                                                }
                                                onClick={() => void handlePrintTicket(ticket.id)}
                                                className="h-11 min-w-[9.5rem] rounded-xl border-border"
                                            >
                                                {ticketExportBusy?.ticketId === ticket.id &&
                                                ticketExportBusy?.action === 'print' ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                                ) : (
                                                    <Eye className="mr-2 h-4 w-4" aria-hidden />
                                                )}
                                                {ticketExportBusy?.ticketId === ticket.id &&
                                                ticketExportBusy?.action === 'print'
                                                    ? 'Preparing…'
                                                    : 'Print'}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTAs */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Button
                                className="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-8 font-semibold shadow-md hover:from-blue-700 hover:to-violet-700"
                                asChild
                            >
                                <Link href="/frontend/raffles">
                                    Browse raffles
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button variant="outline" className="h-12 rounded-xl border-border px-8" asChild>
                                <Link href="/profile/raffle-tickets">My tickets</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    );
}

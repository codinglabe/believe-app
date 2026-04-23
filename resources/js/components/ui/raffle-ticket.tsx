import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Ticket, User, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RaffleTicketProps {
    ticket: {
        id: number;
        ticket_number: string;
        price: number | string;
        /** Prefer explicit purchase time when present */
        purchased_at?: string | null;
        /** Laravel timestamps — used when purchased_at was never persisted */
        created_at?: string | null;
        is_winner?: boolean;
        user?: {
            name: string;
            email: string;
        };
        raffle?: {
            id: number;
            title: string;
            draw_date: string;
            organization?: {
                name: string;
                organization?: {
                    name: string;
                } | null;
            };
        };
    };
    showStub?: boolean;
    className?: string;
}

/** Deterministic pseudo-QR tiles when the image fails to load (stable across re-renders). */
function qrFallbackBits(seed: number, count: number): boolean[] {
    const bits: boolean[] = [];
    for (let i = 0; i < count; i++) {
        const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
        const f = x - Math.floor(x);
        bits.push(f > 0.45);
    }
    return bits;
}

const QR_PX = 64;

/** Parse Laravel / ISO-ish strings reliably (avoids Invalid Date from space-separated datetimes). */
function parseFlexibleDate(raw: unknown): Date | null {
    if (raw === null || raw === undefined) {
        return null;
    }
    const s = String(raw).trim();
    if (s === '') {
        return null;
    }
    const instant = new Date(s);
    if (!Number.isNaN(instant.getTime())) {
        return instant;
    }
    // "Y-m-d H:i:s" (MySQL) without timezone
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(s)) {
        const z = new Date(s.replace(' ', 'T'));
        if (!Number.isNaN(z.getTime())) {
            return z;
        }
    }
    // Date-only
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(`${s}T12:00:00`);
        if (!Number.isNaN(d.getTime())) {
            return d;
        }
    }
    return null;
}

/** Single line: date and time together (e.g. "Apr 23, 2026, 2:30 AM"). */
function formatTicketDateTimeOneLine(raw: unknown, fallbackRaw?: unknown): string | null {
    const d = parseFlexibleDate(raw) ?? parseFlexibleDate(fallbackRaw);
    if (!d) {
        return null;
    }
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export default function RaffleTicket({ ticket, showStub = true, className = '' }: RaffleTicketProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [qrFailed, setQrFailed] = useState(false);

    useEffect(() => {
        const t = window.setTimeout(() => setIsVisible(true), 50);
        return () => window.clearTimeout(t);
    }, []);

    const formatPrice = (price: number | string) => {
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        if (isNaN(numPrice)) {
            return '$0.00';
        }
        return `$${numPrice.toFixed(2)}`;
    };

    const formatTicketNumber = (number: string) => {
        const cleanNumber = number.replace(/[^A-Z0-9]/gi, '');
        return cleanNumber.replace(/(.{4})/g, '$1-').replace(/-$/, '');
    };

    const title = ticket.raffle?.title?.trim() || 'Raffle';
    const orgName =
        ticket.raffle?.organization?.organization?.name?.trim() ||
        ticket.raffle?.organization?.name?.trim();
    const drawDate = ticket.raffle?.draw_date;
    const formattedNumber = formatTicketNumber(ticket.ticket_number);
    const qrBits = useMemo(() => qrFallbackBits(ticket.id, 64), [ticket.id]);
    const purchasedLine =
        formatTicketDateTimeOneLine(ticket.purchased_at, ticket.created_at) ?? '—';
    const drawLine =
        drawDate ? formatTicketDateTimeOneLine(drawDate) ?? '—' : null;

    return (
        <div className={cn('relative', className)}>
            <div
                className={cn(
                    'relative mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-md transition-all duration-500',
                    'hover:shadow-lg',
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
                    ticket.is_winner && 'ring-2 ring-amber-400/60 dark:ring-amber-500/40',
                )}
            >
                {ticket.is_winner ? (
                    <div
                        className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm sm:right-3 sm:top-3 sm:px-2.5 sm:text-xs"
                        aria-label="Winning ticket"
                    >
                        <Award className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                        Winner
                    </div>
                ) : null}

                <div className="flex flex-col sm:flex-row sm:items-stretch">
                    <div
                        className="h-1 w-full shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 sm:h-auto sm:w-1 sm:bg-gradient-to-b sm:from-blue-600 sm:to-purple-600"
                        aria-hidden
                    />

                    <div className="flex min-w-0 flex-1 flex-col justify-start gap-2 p-3 sm:gap-2 sm:p-4">
                        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-sm sm:h-9 sm:w-9">
                                <Ticket className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[10px]">
                                    Digital raffle ticket
                                </p>
                                <h3 className="line-clamp-2 text-sm font-semibold leading-tight tracking-tight text-foreground sm:line-clamp-1 sm:text-base">
                                    {title}
                                </h3>
                                {orgName ? (
                                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary sm:text-sm">
                                        {orgName}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <dl className="grid grid-cols-2 items-start gap-x-4 gap-y-3 border-t border-border pt-3">
                            <div className="min-w-0">
                                <dt className="text-[10px] font-medium text-muted-foreground sm:text-xs">Ticket #</dt>
                                <dd className="truncate font-mono text-[11px] font-semibold tabular-nums text-foreground sm:text-xs">
                                    {formattedNumber}
                                </dd>
                            </div>
                            <div className="min-w-0">
                                <dt className="text-[10px] font-medium text-muted-foreground sm:text-xs">Amount</dt>
                                <dd className="text-[11px] font-semibold text-foreground sm:text-xs">{formatPrice(ticket.price)}</dd>
                            </div>
                            <div className={cn('min-w-0', !drawDate && 'col-span-2')}>
                                <dt className="flex min-h-[14px] items-center gap-1 text-[10px] font-medium leading-none text-muted-foreground sm:min-h-[16px] sm:text-xs">
                                    <Calendar className="h-2.5 w-2.5 shrink-0 opacity-80 sm:h-3 sm:w-3" aria-hidden />
                                    <span className="whitespace-nowrap">Purchased</span>
                                </dt>
                                <dd className="mt-1 text-[11px] tabular-nums leading-snug text-foreground sm:text-xs">
                                    {purchasedLine}
                                </dd>
                            </div>
                            {drawDate ? (
                                <div className="min-w-0">
                                    <dt className="flex min-h-[14px] items-center gap-1 text-[10px] font-medium leading-none text-muted-foreground sm:min-h-[16px] sm:text-xs">
                                        <Calendar className="h-2.5 w-2.5 shrink-0 opacity-80 sm:h-3 sm:w-3" aria-hidden />
                                        <span className="whitespace-nowrap">Draw</span>
                                    </dt>
                                    <dd className="mt-1 text-[11px] tabular-nums leading-snug text-foreground sm:text-xs">
                                        {drawLine}
                                    </dd>
                                </div>
                            ) : null}
                        </dl>

                        <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-2">
                            {ticket.user?.name ? (
                                <span className="inline-flex max-w-full items-center gap-1 truncate text-[10px] text-muted-foreground sm:text-xs">
                                    <User className="h-3 w-3 shrink-0" aria-hidden />
                                    <span className="font-medium text-foreground">{ticket.user.name}</span>
                                </span>
                            ) : null}
                            <span
                                className={cn(
                                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs',
                                    ticket.is_winner
                                        ? 'bg-amber-500/15 text-amber-900 dark:text-amber-100'
                                        : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
                                )}
                            >
                                {ticket.is_winner ? 'Winning entry' : 'Confirmed'}
                            </span>
                        </div>
                    </div>

                    {showStub ? (
                        <>
                            <div
                                className="relative hidden w-7 shrink-0 flex-col items-center justify-center border-l border-dashed border-border bg-muted/25 sm:flex"
                                aria-hidden
                            >
                                <span className="pointer-events-none rotate-180 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground [writing-mode:vertical-rl]">
                                    Stub
                                </span>
                            </div>

                            <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t border-dashed border-border bg-muted/30 px-3 py-2.5 sm:w-[108px] sm:flex-col sm:justify-center sm:border-l sm:border-t-0 sm:px-2 sm:py-3">
                                <div className="relative shrink-0 rounded-lg border border-border bg-background p-1 shadow-inner">
                                    {ticket.id <= 0 ? (
                                        <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-border bg-muted/40 px-1 text-center text-[9px] text-muted-foreground">
                                            Preview
                                        </div>
                                    ) : !qrFailed ? (
                                        <img
                                            src={`/raffles/tickets/${ticket.id}/qr-code?v=${ticket.id}`}
                                            alt=""
                                            width={QR_PX}
                                            height={QR_PX}
                                            className="h-16 w-16 rounded object-contain"
                                            loading="lazy"
                                            decoding="async"
                                            onError={() => setQrFailed(true)}
                                        />
                                    ) : (
                                        <div
                                            className="grid h-16 w-16 grid-cols-8 gap-px rounded border border-border bg-background p-0.5"
                                            role="img"
                                            aria-label="Ticket verification pattern"
                                        >
                                            {qrBits.map((on, i) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        'rounded-[1px]',
                                                        on ? 'bg-foreground' : 'bg-background',
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 text-right sm:w-full sm:flex-none sm:text-center">
                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Scan to verify
                                    </p>
                                    <p className="mt-0.5 break-all font-mono text-[9px] leading-tight text-muted-foreground sm:text-[10px]">
                                        {formattedNumber}
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>

            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, HelpCircle, Ticket, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FrontendLayout from '@/layouts/frontend/frontend-layout';
import { cn } from '@/lib/utils';

interface CancelPageProps {
    auth: {
        user: {
            name: string;
            email: string;
        } | null;
    };
}

const reasons = [
    'You closed checkout or clicked back before paying',
    'Your card or bank declined the charge',
    'A network or browser issue interrupted checkout',
];

const tips = [
    'Confirm your card has funds and isn’t expired',
    'Try another card or payment method',
    'Temporarily disable extensions that block popups',
];

export default function RaffleCancelPage({ auth: _auth }: CancelPageProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <FrontendLayout>
            <Head title="Checkout cancelled" />

            <div className="relative min-h-screen overflow-hidden bg-background">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-24 top-32 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl dark:bg-rose-500/5" />
                    <div className="absolute -right-16 bottom-40 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl dark:bg-amber-500/5" />
                    <div className="absolute left-1/2 top-1/4 h-px w-[min(100%,48rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>

                <div className="relative mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:py-24">
                    <div
                        className={cn(
                            'transition-all duration-500',
                            mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                        )}
                    >
                        {/* Hero */}
                        <div className="mb-10 text-center">
                            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/25 bg-rose-500/[0.08] shadow-sm dark:border-rose-400/20 dark:bg-rose-950/40">
                                <XCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" aria-hidden />
                            </div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Raffle checkout
                            </p>
                            <h1 className="mb-3 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                Checkout cancelled
                            </h1>
                            <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground">
                                No payment was completed. You can try again anytime — nothing was charged.
                            </p>
                        </div>

                        {/* Main panel */}
                        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                            <div className="mb-8 rounded-xl border border-dashed border-amber-500/35 bg-amber-500/[0.06] px-4 py-3 text-center text-sm text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/25 dark:text-amber-100">
                                <strong className="font-semibold">Your account was not charged.</strong>{' '}
                                Returning to checkout is safe.
                            </div>

                            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                Common reasons
                            </h2>
                            <ul className="mb-8 space-y-2.5 text-sm text-foreground">
                                {reasons.map((line) => (
                                    <li key={line} className="flex gap-3">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                                        <span className="leading-relaxed text-muted-foreground">{line}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex items-start gap-3 rounded-xl bg-muted/50 px-4 py-3 dark:bg-muted/30">
                                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                                <div>
                                    <p className="mb-2 text-sm font-medium text-foreground">If it keeps failing</p>
                                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                                        {tips.map((t) => (
                                            <li key={t}>{t}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Button
                                type="button"
                                variant="default"
                                className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 font-semibold text-white shadow-md hover:from-blue-700 hover:to-violet-700 sm:min-w-[11rem]"
                                onClick={() => window.history.back()}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                                Go back
                            </Button>
                            <Button variant="outline" className="h-11 rounded-xl border-border" asChild>
                                <Link href="/frontend/raffles">
                                    <Ticket className="mr-2 h-4 w-4" aria-hidden />
                                    Browse raffles
                                </Link>
                            </Button>
                            <Button variant="ghost" className="h-11 rounded-xl text-muted-foreground" asChild>
                                <Link href="/dashboard">Dashboard</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    );
}

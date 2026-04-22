import { Link, router, useForm, usePage } from '@inertiajs/react';
import { PageHead } from '@/components/frontend/PageHead';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

/** Fallback if shared `processingFeeRates` is missing. */
const DEFAULT_PROCESSING_FEE_RATES: ProcessingFeeRates = {
    card_percent: 0.029,
    card_fixed_usd: 0.3,
    ach_percent: 0.008,
    ach_fee_cap_usd: 5,
};

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
        /** User account role when host is nonprofit / alliance */
        role?: string;
        /** Linked nonprofit profile name (organizations table), when present */
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
    auth: {
        user: {
            name: string;
            email: string;
        };
    };
}

export default function RaffleShow({ raffle, auth }: RaffleShowProps) {
    const page = usePage<RaffleShowProps & { processingFeeRates?: ProcessingFeeRates }>();
    const feePreview = page.props.feePreview ?? null;
    const processingFeeRates = page.props.processingFeeRates ?? DEFAULT_PROCESSING_FEE_RATES;

    const { data, setData, post, processing, errors } = useForm({
        quantity: 1,
        donor_covers_processing_fees: true,
    });

    const [feePreviewLoading, setFeePreviewLoading] = useState(false);
    const rafflePreviewPartialReloadSkipRef = useRef(true);

    /** Inertia partial reload: feePreview (quantity + cover fees switch). Card-only — same estimator as checkout. */
    useEffect(() => {
        if (rafflePreviewPartialReloadSkipRef.current) {
            rafflePreviewPartialReloadSkipRef.current = false;
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
    }, [data.quantity, data.donor_covers_processing_fees, raffle.id, raffle.ticket_price]);

    const handlePurchase = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('frontend.raffles.purchase', raffle.id), {
            onSuccess: () => {
                setData('quantity', 1);
                setData('donor_covers_processing_fees', true);
            },
        });
    };

    const getStatusBadge = () => {
        if (raffle.is_completed) {
            return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
        }
        if (raffle.is_draw_time) {
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Draw Time</Badge>;
        }
        if (raffle.is_active) {
            return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Gift className="w-3 h-3 mr-1" />Active</Badge>;
        }
        return <Badge variant="outline">Inactive</Badge>;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPositionIcon = (position: number) => {
        switch (position) {
            case 1:
                return <Crown className="w-5 h-5 text-yellow-500" />;
            case 2:
                return <Medal className="w-5 h-5 text-gray-400" />;
            case 3:
                return <Award className="w-5 h-5 text-amber-600" />;
            default:
                return <Gift className="w-5 h-5 text-purple-500" />;
        }
    };

    const metaDescription = raffle.description ? String(raffle.description).slice(0, 160) : undefined;

    /** Nonprofit-facing name when the raffle host is an organization or care alliance (profile name preferred). */
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
            
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <Link 
                            href={route('frontend.raffles.index')}
                            className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Raffles
                        </Link>
                        
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                {hostingOrganizationName ? (
                                    <>
                                        <p className="text-lg sm:text-xl font-semibold text-purple-700 dark:text-purple-300 mb-2">
                                            {hostingOrganizationName}
                                        </p>
                                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                            {raffle.title}
                                        </h1>
                                    </>
                                ) : (
                                    <>
                                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                            {raffle.title}
                                        </h1>
                                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                                            by {raffle.organization.name}
                                        </p>
                                    </>
                                )}
                                {getStatusBadge()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Image */}
                            {raffle.image && (
                                <Card className="overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="aspect-video overflow-hidden">
                                            <img
                                                src={`/storage/${raffle.image}`}
                                                alt={raffle.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Countdown Timer */}
                            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
                                <CardContent className="p-0">
                                    <CountdownTimer drawDate={raffle.draw_date} size="medium" />
                                </CardContent>
                            </Card>

                            {/* Description */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>About This Raffle</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {raffle.description}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Prizes */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Gift className="w-5 h-5 mr-2 text-purple-600" />
                                        Prizes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {raffle.prizes.map((prize, index) => (
                                            <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <div className="flex-shrink-0">
                                                    {getPositionIcon(index + 1)}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white">
                                                        {prize.name}
                                                    </h4>
                                                    {prize.description && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            {prize.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Winners */}
                            {raffle.is_completed && raffle.winners && raffle.winners.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center">
                                            <Crown className="w-5 h-5 mr-2 text-yellow-500" />
                                            Winners
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {raffle.winners.map((winner) => (
                                                <div key={winner.id} className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                                    <div className="flex items-center space-x-3">
                                                        {getPositionIcon(winner.position)}
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900 dark:text-white">
                                                                {winner.user.name}
                                                            </h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                Ticket #{winner.ticket.ticket_number}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-gray-900 dark:text-white">
                                                            {winner.prize_name}
                                                        </p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            {formatDate(winner.announced_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Purchase Card */}
                            {((raffle.is_active && !raffle.is_completed) || (raffle.status === 'active' && raffle.available_tickets > 0)) && (
                                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-purple-800 dark:text-purple-200">
                                            <Ticket className="w-5 h-5 mr-2" />
                                            Purchase Tickets
                                        </CardTitle>
                                        <CardDescription className="text-purple-600 dark:text-purple-400">
                                            Secure payment via Stripe
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handlePurchase} className="space-y-4">
                                            <div>
                                                <Label htmlFor="quantity">Quantity</Label>
                                                <Input
                                                    id="quantity"
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={data.quantity}
                                                    onChange={(e) => {
                                                        const value = parseInt(e.target.value, 10) || 1;
                                                        const clamped = Math.min(10, Math.max(1, value));
                                                        setData('quantity', clamped);
                                                    }}
                                                    className="mt-1"
                                                />
                                                {errors.quantity && (
                                                    <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Price per ticket:</span>
                                                    <span className="font-semibold">${Number(raffle.ticket_price).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        Subtotal ({data.quantity} ticket{data.quantity !== 1 ? 's' : ''}):
                                                    </span>
                                                    <span className="font-semibold">
                                                        ${(Number(raffle.ticket_price) * data.quantity).toFixed(2)}
                                                    </span>
                                                </div>

                                                {Number(raffle.ticket_price) * data.quantity > 0 && (
                                                    <>
                                                        <div className="flex items-center justify-between gap-3 border-t border-slate-200/60 pt-3 dark:border-white/10">
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                    Cover processing fees
                                                                </div>
                                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">
                                                                    When on, your total is adjusted so the nonprofit receives the full subtotal.
                                                                </p>
                                                            </div>
                                                            <Switch
                                                                checked={data.donor_covers_processing_fees}
                                                                onCheckedChange={(v) =>
                                                                    setData('donor_covers_processing_fees', v)
                                                                }
                                                            />
                                                        </div>

                                                        <div className="text-xs space-y-1.5 relative min-h-[4rem]">
                                                            {feePreviewLoading && !feePreview ? (
                                                                <div className="flex items-center gap-2 py-4 text-gray-600 dark:text-gray-400">
                                                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                                                                    <span>Updating estimate…</span>
                                                                </div>
                                                            ) : null}
                                                            {feePreview ? (
                                                                <div className={cn('relative space-y-1.5', feePreviewLoading && 'opacity-60')}>
                                                                    {feePreview.mode === 'donor_covers' ? (
                                                                        <>
                                                                            <div className="flex justify-between text-gray-700 dark:text-gray-200">
                                                                                <span>To nonprofit</span>
                                                                                <span className="font-medium tabular-nums">
                                                                                    ${feePreview.base_gift_usd.toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                                                                <span>Est. processing</span>
                                                                                <span className="tabular-nums">
                                                                                    +${feePreview.processing_fee_estimate.toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between font-semibold text-gray-900 dark:text-white pt-1 border-t border-slate-200/50 dark:border-white/10">
                                                                                <span>Est. total</span>
                                                                                <span className="tabular-nums">
                                                                                    ${feePreview.checkout_total_usd.toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <div className="flex justify-between text-gray-700 dark:text-gray-200">
                                                                                <span>You pay</span>
                                                                                <span className="font-medium tabular-nums">
                                                                                    ${feePreview.base_gift_usd.toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                                                                <span>Est. processing</span>
                                                                                <span className="tabular-nums">
                                                                                    −${feePreview.processing_fee_estimate.toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between text-gray-700 dark:text-gray-200 pt-1 border-t border-slate-200/50 dark:border-white/10">
                                                                                <span>Est. to nonprofit</span>
                                                                                <span className="font-medium tabular-nums">
                                                                                    ${feePreview.estimated_net_to_org_usd.toFixed(2)}
                                                                                </span>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                    {feePreviewLoading ? (
                                                                        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/60 dark:bg-gray-900/60">
                                                                            <Loader2
                                                                                className="h-5 w-5 animate-spin text-purple-600 dark:text-purple-300"
                                                                                aria-hidden
                                                                            />
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            ) : null}
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-500">
                                                                Uses {(processingFeeRates.card_percent * 100).toFixed(1)}% + $
                                                                {processingFeeRates.card_fixed_usd.toFixed(2)} estimate. Final amount in Stripe
                                                                Checkout.
                                                            </p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <Button 
                                                type="submit" 
                                                disabled={processing || data.quantity > raffle.available_tickets}
                                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                                            >
                                                {processing ? 'Processing...' : `Pay with Stripe - ${data.quantity} Ticket${data.quantity > 1 ? 's' : ''}`}
                                            </Button>

                                            {data.quantity > raffle.available_tickets && (
                                                <p className="text-red-500 text-sm text-center">
                                                    Not enough tickets available
                                                </p>
                                            )}
                                        </form>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Raffle Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Raffle Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Ticket Price:</span>
                                        <span className="font-semibold">${raffle.ticket_price}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Total Tickets:</span>
                                        <span className="font-semibold">{raffle.total_tickets}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Sold:</span>
                                        <span className="font-semibold">{raffle.sold_tickets}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Available:</span>
                                        <span className="font-semibold text-green-600">{raffle.available_tickets}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Draw Date:</span>
                                        <span className="font-semibold">{formatDate(raffle.draw_date)}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Winners:</span>
                                        <span className="font-semibold">{raffle.winners_count}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Organization Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Organization</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-3">
                                        {organizationCardName}
                                    </p>
                                    {organizationCardDescription ? (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {organizationCardDescription}
                                        </p>
                                    ) : null}
                                </CardContent>
                            </Card>

                            {/* Ticket Preview */}
                            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center text-blue-800 dark:text-blue-200">
                                        <Ticket className="w-5 h-5 mr-2" />
                                        Your Ticket Preview
                                    </CardTitle>
                                    <CardDescription className="text-blue-600 dark:text-blue-400">
                                        This is how your raffle ticket will look
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-center">
                                        <RaffleTicket 
                                            ticket={{
                                                id: 0,
                                                ticket_number: 'XXXX-XXXX-XXXX',
                                                price: raffle.ticket_price,
                                                purchased_at: new Date().toISOString(),
                                                user: auth.user,
                                                raffle: raffle
                                            }}
                                            showStub={true}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    );
}

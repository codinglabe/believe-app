import { Link, useForm } from '@inertiajs/react';
import { PageHead } from '@/components/frontend/PageHead';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Calendar, 
    Users, 
    DollarSign, 
    Gift, 
    Clock, 
    CheckCircle, 
    ArrowLeft,
    Ticket,
    Crown,
    Medal,
    Award
} from 'lucide-react';
import { PageProps } from '@/types';
import FrontendLayout from '@/layouts/frontend/frontend-layout';
import CountdownTimer from '@/components/ui/countdown-timer';
import RaffleTicket from '@/components/ui/raffle-ticket';

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
        name: string;
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
    auth: {
        user: {
            name: string;
            email: string;
        };
    };
}

export default function RaffleShow({ raffle, auth }: RaffleShowProps) {
    const [quantity, setQuantity] = useState(1);
    
    const { data, setData, post, processing, errors } = useForm({
        quantity: 1,
    });

    const handlePurchase = (e: React.FormEvent) => {
        e.preventDefault();
        setData('quantity', quantity);
        post(route('frontend.raffles.purchase', raffle.id), {
            onSuccess: () => {
                // Reset form after successful purchase
                setQuantity(1);
            }
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
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                    {raffle.title}
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    by {raffle.organization.name}
                                </p>
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
                                                        const value = parseInt(e.target.value) || 1;
                                                        setQuantity(value);
                                                        setData('quantity', value);
                                                    }}
                                                    className="mt-1"
                                                />
                                                {errors.quantity && (
                                                    <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>
                                                )}
                                            </div>

                                            
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Price per ticket:</span>
                                                    <span className="font-semibold">${raffle.ticket_price}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                                                    <span className="font-semibold">${(raffle.ticket_price * data.quantity).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-orange-600">
                                                    <span>Processing fee (2.9% + $0.30):</span>
                                                    <span>+${((raffle.ticket_price * data.quantity * 0.029) + 0.30).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm font-semibold text-lg border-t pt-2">
                                                    <span>Total:</span>
                                                    <span>${((raffle.ticket_price * data.quantity) + (raffle.ticket_price * data.quantity * 0.029) + 0.30).toFixed(2)}</span>
                                                </div>
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
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                        {raffle.organization.name}
                                    </h4>
                                    {raffle.organization.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {raffle.organization.description}
                                        </p>
                                    )}
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

import { Head, Link, router, useForm } from '@inertiajs/react';
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
    Edit, 
    Trash2, 
    Trophy,
    Ticket,
    Crown,
    Medal,
    Award
} from 'lucide-react';
import { PermissionButton } from '@/components/ui/permission-guard';
import { PageProps } from '@/types';
import AppLayout from '@/layouts/app-layout';

interface RaffleTicket {
    id: number;
    ticket_number: string;
    price: number;
    status: 'active' | 'winner' | 'refunded';
    is_winner: boolean;
    created_at: string;
}

interface RaffleWinner {
    id: number;
    position: number;
    prize_name: string;
    prize_description?: string;
    announced_at: string;
    position_name: string;
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
    status: 'active' | 'completed' | 'cancelled';
    image?: string;
    prizes: Array<{ name: string; description?: string }>;
    winners_count: number;
    available_tickets: number;
    is_active: boolean;
    is_completed: boolean;
    is_draw_time: boolean;
    organization: {
        name: string;
    };
    tickets: RaffleTicket[];
    winners: RaffleWinner[];
    created_at: string;
}

interface RaffleShowProps extends PageProps {
    raffle: Raffle;
    userTickets: RaffleTicket[];
}

export default function RaffleShow({ raffle, userTickets }: RaffleShowProps) {
    const [quantity, setQuantity] = useState(1);

    const { post, processing } = useForm({
        quantity: 1,
    });

    const handlePurchase = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('raffles.purchase', raffle.id), {
            data: { quantity },
            onSuccess: () => {
                setQuantity(1);
            }
        });
    };

    const handleDraw = () => {
        if (confirm('Are you sure you want to draw winners now? This action cannot be undone.')) {
            post(route('raffles.draw', raffle.id));
        }
    };

    const getStatusBadge = () => {
        if (raffle.is_completed) {
            return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
        }
        if (raffle.is_draw_time) {
            return <Badge variant="destructive" className="bg-red-100 text-red-800"><Clock className="w-3 h-3 mr-1" />Draw Time!</Badge>;
        }
        if (raffle.is_active) {
            return <Badge variant="default" className="bg-blue-100 text-blue-800">Active</Badge>;
        }
        return <Badge variant="outline">Cancelled</Badge>;
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
            case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
            case 2: return <Medal className="w-5 h-5 text-gray-400" />;
            case 3: return <Award className="w-5 h-5 text-amber-600" />;
            default: return <Trophy className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <AppLayout>
            <Head title={raffle.title} />
            
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{raffle.title}</h1>
                            {getStatusBadge()}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">by {raffle.organization.name}</p>
                    </div>
                    
                    <div className="flex gap-2">
                        <PermissionButton permission="raffle.edit">
                            <Link href={route('raffles.edit', raffle.id)}>
                                <Button variant="outline">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </Button>
                            </Link>
                        </PermissionButton>
                        
                        {raffle.is_draw_time && raffle.status === 'active' && (
                            <PermissionButton permission="raffle.draw">
                                <Button onClick={handleDraw} className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700">
                                    <Trophy className="w-4 h-4 mr-2" />
                                    Draw Winners
                                </Button>
                            </PermissionButton>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Image */}
                        {raffle.image && (
                            <Card>
                                <CardContent className="p-0">
                                    <img
                                        src={`/storage/${raffle.image}`}
                                        alt={raffle.title}
                                        className="w-full h-64 object-cover rounded-t-lg"
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Description */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {raffle.description}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Prizes */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Gift className="w-5 h-5 mr-2" />
                                    Prizes
                                </CardTitle>
                                <CardDescription>
                                    {raffle.prizes.length} prize{raffle.prizes.length !== 1 ? 's' : ''} available
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {raffle.prizes.map((prize, index) => (
                                        <div key={index} className="p-4 border rounded-lg">
                                            <div className="flex items-center gap-3 mb-2">
                                                {getPositionIcon(index + 1)}
                                                <h4 className="font-semibold text-lg">{prize.name}</h4>
                                            </div>
                                            {prize.description && (
                                                <p className="text-gray-600 dark:text-gray-400">{prize.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Winners */}
                        {raffle.winners.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Trophy className="w-5 h-5 mr-2" />
                                        Winners
                                    </CardTitle>
                                    <CardDescription>
                                        Congratulations to our lucky winners!
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {raffle.winners.map((winner) => (
                                            <div key={winner.id} className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                                <div className="flex items-center gap-3 mb-2">
                                                    {getPositionIcon(winner.position)}
                                                    <h4 className="font-semibold text-lg">{winner.position_name}</h4>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 font-medium">{winner.user.name}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Ticket: {winner.ticket.ticket_number}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Prize: {winner.prize_name}
                                                </p>
                                                {winner.prize_description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        {winner.prize_description}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Purchase Tickets */}
                        {raffle.is_active && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Ticket className="w-5 h-5 mr-2" />
                                        Buy Tickets
                                    </CardTitle>
                                    <CardDescription>
                                        ${raffle.ticket_price} per ticket
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handlePurchase} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="quantity">Quantity</Label>
                                            <Input
                                                id="quantity"
                                                type="number"
                                                min="1"
                                                max="10"
                                                value={quantity}
                                                onChange={(e) => setQuantity(parseInt(e.target.value))}
                                            />
                                        </div>
                                        
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                ${(raffle.ticket_price * quantity).toFixed(2)}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Total for {quantity} ticket{quantity !== 1 ? 's' : ''}
                                            </p>
                                        </div>

                                        <PermissionButton permission="raffle.purchase">
                                            <Button 
                                                type="submit" 
                                                disabled={processing || raffle.available_tickets < quantity}
                                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                            >
                                                {processing ? 'Processing...' : 'Buy Tickets'}
                                            </Button>
                                        </PermissionButton>
                                        
                                        {raffle.available_tickets < quantity && (
                                            <p className="text-sm text-red-500 text-center">
                                                Not enough tickets available
                                            </p>
                                        )}
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        {/* Raffle Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Raffle Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center text-gray-600 dark:text-gray-400">
                                        <DollarSign className="w-4 h-4 mr-1" />
                                        Ticket Price
                                    </span>
                                    <span className="font-semibold">${raffle.ticket_price}</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center text-gray-600 dark:text-gray-400">
                                        <Users className="w-4 h-4 mr-1" />
                                        Tickets Sold
                                    </span>
                                    <span className="font-semibold">
                                        {raffle.sold_tickets}/{raffle.total_tickets}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="flex items-center text-gray-600 dark:text-gray-400">
                                        <Ticket className="w-4 h-4 mr-1" />
                                        Available
                                    </span>
                                    <span className="font-semibold">{raffle.available_tickets}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="flex items-center text-gray-600 dark:text-gray-400">
                                        <Calendar className="w-4 h-4 mr-1" />
                                        Draw Date
                                    </span>
                                    <span className="font-semibold text-sm">
                                        {formatDate(raffle.draw_date)}
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                        <span>Progress</span>
                                        <span>{Math.round((raffle.sold_tickets / raffle.total_tickets) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${(raffle.sold_tickets / raffle.total_tickets) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* My Tickets */}
                        {userTickets.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>My Tickets</CardTitle>
                                    <CardDescription>
                                        {userTickets.length} ticket{userTickets.length !== 1 ? 's' : ''} purchased
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {userTickets.map((ticket) => (
                                            <div key={ticket.id} className="flex items-center justify-between p-2 border rounded">
                                                <span className="font-mono text-sm">{ticket.ticket_number}</span>
                                                {ticket.is_winner && (
                                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                                        Winner!
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}


import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Calendar, Users, DollarSign, Gift, Clock, CheckCircle } from 'lucide-react';
import { PermissionButton } from '@/components/ui/permission-guard';
import { PageProps } from '@/types';
import AppLayout from '@/layouts/app-layout';
import CountdownTimer from '@/components/ui/countdown-timer';

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
    created_at: string;
}

interface RafflesIndexProps extends PageProps {
    raffles: {
        data: Raffle[];
        links: any[];
        meta: any;
    };
    filters: {
        search?: string;
        status?: string;
    };
}

export default function RafflesIndex({ raffles, filters }: RafflesIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const statusParam = status === 'all' ? undefined : status;
        router.get(route('raffles.index'), { search, status: statusParam }, { preserveState: true });
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);
        const statusParam = value === 'all' ? undefined : value;
        router.get(route('raffles.index'), { search, status: statusParam }, { preserveState: true });
    };

    const getStatusBadge = (raffle: Raffle) => {
        if (raffle.is_completed) {
            return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
        }
        if (raffle.is_draw_time) {
            return <Badge variant="destructive" className="bg-red-100 text-red-800"><Clock className="w-3 h-3 mr-1" />Draw Time!</Badge>;
        }
        if (raffle.status === 'active' && raffle.is_active) {
            return <Badge variant="default" className="bg-blue-100 text-blue-800">Active</Badge>;
        }
        if (raffle.status === 'cancelled') {
            return <Badge variant="outline">Cancelled</Badge>;
        }
        if (raffle.status === 'active' && !raffle.is_active) {
            return <Badge variant="destructive" className="bg-red-100 text-red-800"><Clock className="w-3 h-3 mr-1" />Draw Time!</Badge>;
        }
        return <Badge variant="outline">Inactive</Badge>;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AppLayout>
            <Head title="Raffle Draws" />
            
            <div className="space-y-6 px-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Raffle Draws</h1>
                        <p className="text-gray-600 dark:text-gray-400">Manage and participate in raffle draws</p>
                    </div>
                    <PermissionButton permission="raffle.create">
                        <Link href={route('raffles.create')}>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Raffle
                            </Button>
                        </Link>
                    </PermissionButton>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSearch} className="flex gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        placeholder="Search raffles..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <Select value={status} onValueChange={handleStatusChange}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="submit">Search</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Raffles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {raffles.data.map((raffle) => (
                        <Card key={raffle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                            {raffle.image && (
                                <div className="aspect-video bg-gray-200 dark:bg-gray-700">
                                    <img
                                        src={`/storage/${raffle.image}`}
                                        alt={raffle.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg line-clamp-2">{raffle.title}</CardTitle>
                                        <CardDescription className="mt-1">
                                            by {raffle.organization.name}
                                        </CardDescription>
                                    </div>
                                    {getStatusBadge(raffle)}
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                                    {raffle.description}
                                </p>

                                {/* Essential Info */}
                                <div className="flex items-center justify-between text-sm mb-3">
                                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                                        <DollarSign className="w-4 h-4 mr-1" />
                                        ${raffle.ticket_price}
                                    </div>
                                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                                        <Users className="w-4 h-4 mr-1" />
                                        {raffle.sold_tickets}/{raffle.total_tickets}
                                    </div>
                                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                                        <Gift className="w-4 h-4 mr-1" />
                                        {raffle.prizes.length} prizes
                                    </div>
                                </div>

                                {/* Countdown Timer */}
                                {raffle.is_active && !raffle.is_completed && (
                                    <div className="py-2">
                                        <CountdownTimer drawDate={raffle.draw_date} size="small" showLabel={false} />
                                    </div>
                                )}

                                {/* Progress Bar */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                        <span>Progress</span>
                                        <span>{Math.round((raffle.sold_tickets / raffle.total_tickets) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${(raffle.sold_tickets / raffle.total_tickets) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex gap-2">
                                <Link href={route('raffles.show', raffle.id)} className="flex-1">
                                    <Button variant="outline" className="w-full">
                                        View Details
                                    </Button>
                                </Link>
                                
                                {raffle.is_active && (
                                    <PermissionButton permission="raffle.purchase">
                                        <Link href={route('raffles.show', raffle.id)}>
                                            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                                                <Gift className="w-4 h-4 mr-1" />
                                                Buy Tickets
                                            </Button>
                                        </Link>
                                    </PermissionButton>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {/* Pagination */}
                {raffles.data.length === 0 && (
                    <Card>
                        <CardContent className="text-center py-12">
                            <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No raffles found</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {filters.search || filters.status 
                                    ? 'Try adjusting your search criteria.'
                                    : 'Get started by creating your first raffle draw.'
                                }
                            </p>
                            <PermissionButton permission="raffle.create">
                                <Link href={route('raffles.create')}>
                                    <Button>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Raffle
                                    </Button>
                                </Link>
                            </PermissionButton>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}


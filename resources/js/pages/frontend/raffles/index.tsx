import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar, Users, DollarSign, Gift, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { PageProps } from '@/types';
import FrontendLayout from '@/layouts/frontend/frontend-layout';
import CountdownTimer from '@/components/ui/countdown-timer';

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
        router.get(route('frontend.raffles.index'), { search, status: statusParam }, { preserveState: true });
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);
        const statusParam = value === 'all' ? undefined : value;
        router.get(route('frontend.raffles.index'), { search, status: statusParam }, { preserveState: true });
    };

    const getStatusBadge = (raffle: Raffle) => {
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
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <FrontendLayout>
            <Head title="Raffle Draws" />
            
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <h1 className="text-4xl md:text-6xl font-bold mb-4">
                                🎟️ Raffle Draws
                            </h1>
                            <p className="text-xl md:text-2xl mb-8 text-purple-100">
                                Win amazing prizes while supporting great causes!
                            </p>
                            <div className="flex justify-center">
                                <Gift className="w-16 h-16 text-yellow-300 animate-bounce" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Search and Filter */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <form onSubmit={handleSearch} className="flex-1 max-w-md">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        type="text"
                                        placeholder="Search raffles..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </form>
                            
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
                        </div>
                    </div>

                    {/* Raffles Grid */}
                    {raffles.data.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {raffles.data.map((raffle) => (
                                <Card key={raffle.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    {raffle.image && (
                                        <div className="aspect-video overflow-hidden">
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
                                                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                                                    {raffle.title}
                                                </CardTitle>
                                                <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    by {raffle.organization.name}
                                                </CardDescription>
                                            </div>
                                            {getStatusBadge(raffle)}
                                        </div>
                                    </CardHeader>

                                    <CardContent>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4">
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
                                                {raffle.prizes?.length || 0} prizes
                                            </div>
                                        </div>

                                        {/* Countdown Timer */}
                                        {raffle.is_active && !raffle.is_completed && (
                                            <div className="mb-3">
                                                <CountdownTimer drawDate={raffle.draw_date} size="small" showLabel={false} />
                                            </div>
                                        )}
                                    </CardContent>

                                    <CardFooter>
                                        <Link
                                            href={route('frontend.raffles.show', raffle.id)}
                                            className="w-full"
                                        >
                                            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                                                View Details
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="text-center py-12">
                            <CardContent>
                                <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    No raffles found
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {filters.search || filters.status 
                                        ? 'Try adjusting your search criteria.'
                                        : 'Check back later for new raffle draws!'
                                    }
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Pagination */}
                    {raffles.data.length > 0 && raffles.links && (
                        <div className="mt-8 flex justify-center">
                            <div className="flex space-x-2">
                                {raffles.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url || '#'}
                                        className={`px-3 py-2 text-sm rounded-md ${
                                            link.active
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </FrontendLayout>
    );
}



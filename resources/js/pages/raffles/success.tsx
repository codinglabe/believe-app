import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle, Ticket, Sparkles, ArrowRight, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FrontendLayout from '@/layouts/frontend/frontend-layout';
import RaffleTicket from '@/components/ui/raffle-ticket';
import { downloadTicket, printTicket } from '@/lib/ticket-download';
import { useRef } from 'react';

interface SuccessPageProps {
    raffle: {
        id: number;
        title: string;
        ticket_price: number;
        draw_date: string;
        organization: {
            name: string;
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
}

export default function RaffleSuccessPage({ raffle, tickets, auth }: SuccessPageProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const ticketRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    useEffect(() => {
        // Trigger animations on mount
        setIsVisible(true);
        setShowConfetti(true);
        
        // Stop confetti after 3 seconds
        const timer = setTimeout(() => setShowConfetti(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <FrontendLayout>
            <Head title="Purchase Successful" />
            
            {/* Confetti Animation */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    {Array.from({ length: 50 }, (_, i) => (
                        <div
                            key={i}
                            className="absolute animate-bounce"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${2 + Math.random() * 2}s`,
                            }}
                        >
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                        </div>
                    ))}
                </div>
            )}

            <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* Success Header */}
                    <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 dark:bg-green-900 rounded-full mb-6 animate-pulse">
                            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            🎉 Purchase Successful!
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                            Your raffle tickets have been purchased successfully
                        </p>
                        
                        {/* Success Badge */}
                        <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-lg px-6 py-3 mb-8">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Payment Confirmed
                        </Badge>
                    </div>

                    {/* Purchase Summary */}
                    <Card className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
                        <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
                            <CardTitle className="flex items-center text-2xl">
                                <Ticket className="w-6 h-6 mr-3" />
                                Purchase Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                                        {tickets.length}
                                    </div>
                                    <div className="text-gray-600 dark:text-gray-300">Tickets Purchased</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                                        ${raffle.ticket_price}
                                    </div>
                                    <div className="text-gray-600 dark:text-gray-300">Price Per Ticket</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                                        ${(raffle.ticket_price * tickets.length).toFixed(2)}
                                    </div>
                                    <div className="text-gray-600 dark:text-gray-300">Total Amount</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Raffle Details */}
                    <Card className={`mb-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
                        <CardHeader>
                            <CardTitle className="text-2xl text-gray-900 dark:text-white">Raffle Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {raffle.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                                        Organized by <span className="font-semibold">{raffle.organization.name}</span>
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Draw Date: {new Date(raffle.draw_date).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <div className="flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                                            <Ticket className="w-8 h-8 text-white" />
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300">
                                            Good luck with your tickets!
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Your Tickets */}
                    <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                            Your Raffle Tickets
                        </h2>
                        
                        <div className="space-y-8">
                            {tickets.map((ticket, index) => (
                                <div key={ticket.id} className="relative">
                                    <div ref={(el) => { ticketRefs.current[ticket.id] = el; }}>
                                        <RaffleTicket 
                                            ticket={{
                                                ...ticket,
                                                user: auth.user,
                                                is_winner: false
                                            }}
                                            showStub={true}
                                        />
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-3 mt-4 justify-center">
                                        <Button
                                            onClick={() => {
                                                const element = ticketRefs.current[ticket.id];
                                                if (element) {
                                                    downloadTicket(element, ticket.ticket_number);
                                                }
                                            }}
                                            variant="outline"
                                            size="sm"
                                            className="flex items-center"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                const element = ticketRefs.current[ticket.id];
                                                if (element) {
                                                    printTicket(element);
                                                }
                                            }}
                                            variant="outline"
                                            size="sm"
                                            className="flex items-center"
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            Print
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={`text-center mt-12 transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/frontend/raffles">
                                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 text-lg">
                                    Browse More Raffles
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                            <Link href="/profile/raffle-tickets">
                                <Button variant="outline" className="px-8 py-3 text-lg border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    View All My Tickets
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    );
}

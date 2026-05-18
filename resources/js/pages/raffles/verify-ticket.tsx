import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
    CheckCircle, 
    XCircle, 
    Calendar, 
    MapPin, 
    User, 
    Award, 
    Ticket, 
    Shield,
    Clock,
    Building2,
    Mail,
    Phone,
    QrCode,
    Sparkles,
    Crown,
    Medal,
    Trophy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import FrontendLayout from '@/layouts/frontend/frontend-layout';

interface VerifyTicketPageProps {
    ticket: {
        id: number;
        ticket_number: string;
        price: number;
        purchased_at: string;
        is_winner?: boolean;
        user: {
            name: string;
            email: string;
        };
        raffle: {
            id: number;
            title: string;
            draw_date: string;
            status: string;
            organization: {
                name: string;
            };
        };
    };
    verification_data: {
        ticket_number: string;
        raffle_title: string;
        organization_name: string;
        purchased_at: string;
        is_winner: boolean;
        user_name: string;
        user_email: string;
    };
}

export default function VerifyTicketPage({ ticket, verification_data }: VerifyTicketPageProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        setIsVisible(true);
        
        // Show confetti if winner
        if (ticket.is_winner) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
        }
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatPrice = (price: number) => {
        return `$${price.toFixed(2)}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
        }
    };

    const getPrizeIcon = (isWinner: boolean) => {
        if (isWinner) {
            return <Crown className="w-8 h-8 text-yellow-500" />;
        }
        return <Ticket className="w-8 h-8 text-blue-500" />;
    };

    return (
        <FrontendLayout>
            <Head title="Ticket Verification" />
            
            {/* Confetti Animation for Winners */}
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

            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* Header */}
                    <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full mb-6">
                            <Shield className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            🎫 Ticket Verification
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-300">
                            QR Code scanned successfully! Here are the ticket details.
                        </p>
                    </div>

                    {/* Verification Status */}
                    <Card className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
                        <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
                            <CardTitle className="flex items-center text-2xl">
                                <CheckCircle className="w-6 h-6 mr-3" />
                                Verification Successful
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-center space-x-4">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                                        ✓ VERIFIED
                                    </div>
                                    <div className="text-gray-600 dark:text-gray-300">
                                        This ticket is authentic and valid
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ticket Information */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Ticket Details */}
                        <Card className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
                            <CardHeader>
                                <CardTitle className="flex items-center text-xl text-gray-900 dark:text-white">
                                    <Ticket className="w-5 h-5 mr-2" />
                                    Ticket Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <span className="text-gray-600 dark:text-gray-300">Ticket Number:</span>
                                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                                        {verification_data.ticket_number}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <span className="text-gray-600 dark:text-gray-300">Price:</span>
                                    <span className="font-bold text-green-600 dark:text-green-400">
                                        {formatPrice(ticket.price)}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <span className="text-gray-600 dark:text-gray-300">Purchased:</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {formatDate(verification_data.purchased_at)}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <span className="text-gray-600 dark:text-gray-300">Status:</span>
                                    <Badge className={getStatusColor(ticket.raffle.status)}>
                                        {ticket.raffle.status.toUpperCase()}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Raffle Details */}
                        <Card className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
                            <CardHeader>
                                <CardTitle className="flex items-center text-xl text-gray-900 dark:text-white">
                                    <Award className="w-5 h-5 mr-2" />
                                    Raffle Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                                        {verification_data.raffle_title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                                        Organized by {verification_data.organization_name}
                                    </p>
                                </div>
                                
                                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <Calendar className="w-5 h-5 text-blue-500" />
                                    <div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300">Draw Date</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {formatDate(ticket.raffle.draw_date)}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <Building2 className="w-5 h-5 text-green-500" />
                                    <div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300">Organization</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {verification_data.organization_name}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Winner Status */}
                    {ticket.is_winner && (
                        <Card className={`mb-8 transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900 dark:to-orange-900 border-yellow-200 dark:border-yellow-700`}>
                            <CardHeader>
                                <CardTitle className="flex items-center text-2xl text-yellow-800 dark:text-yellow-200">
                                    <Crown className="w-6 h-6 mr-3" />
                                    🏆 WINNER! 🏆
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400 mb-4">
                                        Congratulations!
                                    </div>
                                    <p className="text-lg text-yellow-700 dark:text-yellow-300 mb-6">
                                        This ticket is a WINNER! You have won a prize in this raffle.
                                    </p>
                                    <div className="bg-yellow-100 dark:bg-yellow-800 rounded-lg p-4">
                                        <p className="text-yellow-800 dark:text-yellow-200 font-semibold">
                                            Please contact the organization to claim your prize!
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* User Information */}
                    <Card className={`mb-8 transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
                        <CardHeader>
                            <CardTitle className="flex items-center text-xl text-gray-900 dark:text-white">
                                <User className="w-5 h-5 mr-2" />
                                Ticket Holder Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <User className="w-5 h-5 text-blue-500" />
                                    <div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300">Name</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {verification_data.user_name}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <Mail className="w-5 h-5 text-green-500" />
                                    <div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300">Email</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {verification_data.user_email}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className={`text-center transition-all duration-1000 delay-1200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/frontend/raffles">
                                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 text-lg">
                                    Browse More Raffles
                                </Button>
                            </Link>
                            <Button 
                                onClick={() => window.history.back()}
                                variant="outline" 
                                className="px-8 py-3 text-lg border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Go Back
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    );
}


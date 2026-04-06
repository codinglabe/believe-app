import React, { useState, useEffect } from 'react';
import { Ticket, Calendar, User, MapPin, QrCode, Gift, Star, Award } from 'lucide-react';

interface RaffleTicketProps {
    ticket: {
        id: number;
        ticket_number: string;
        price: number | string;
        purchased_at: string;
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
            };
        };
    };
    showStub?: boolean;
    className?: string;
}

export default function RaffleTicket({ ticket, showStub = true, className = '' }: RaffleTicketProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatPrice = (price: number | string) => {
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        if (isNaN(numPrice)) {
            return '$0';
        }
        return `$${numPrice.toFixed(0)}`;
    };

    const formatTicketNumber = (number: string) => {
        const cleanNumber = number.replace(/[^A-Z0-9]/gi, '');
        return cleanNumber.replace(/(.{4})/g, '$1-').replace(/-$/, '');
    };

    // Generate QR code pattern
    const generateQRPattern = () => {
        return Array.from({ length: 64 }, (_, i) => (
            <div
                key={i}
                className={`w-1 h-1 ${
                    Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'
                }`}
            />
        ));
    };

    return (
        <div className={`relative group ${className}`}>
            {/* Main Ticket */}
            <div 
                className={`
                    relative bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 
                    rounded-lg shadow-lg overflow-hidden max-w-sm mx-auto
                    transform transition-all duration-1000 ease-out
                    hover:scale-105 hover:shadow-xl
                    ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                    ${ticket.is_winner ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''}
                `}
            >
                {/* Winner Badge */}
                {ticket.is_winner && (
                    <div className="absolute -top-1 -right-1 z-20">
                        <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white px-2 py-1 rounded-full shadow-lg animate-bounce">
                            <div className="flex items-center space-x-1">
                                <Award className="w-3 h-3" />
                                <span className="text-xs font-bold">WINNER!</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex h-32">
                    {/* Main Ticket Section */}
                    <div className="flex-1 p-3">
                        {/* Header */}
                        <div className="text-center mb-3 border-b border-dashed border-gray-300 dark:border-gray-600 pb-2">
                            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                                RAFFLE TICKET
                            </h2>
                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {ticket.raffle?.title || 'Grand Prize Raffle'}
                            </div>
                        </div>

                        {/* Ticket Details */}
                        <div className="space-y-2 mb-3">
                            <div className="flex justify-between items-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Ticket #</div>
                                <div className="text-sm font-mono font-bold text-gray-800 dark:text-gray-200">
                                    {formatTicketNumber(ticket.ticket_number)}
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Price</div>
                                <div className="text-sm font-bold text-green-600 dark:text-green-400">
                                    {formatPrice(ticket.price)}
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                                <div className={`text-xs font-bold ${ticket.is_winner ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                                    {ticket.is_winner ? 'WINNER' : 'ACTIVE'}
                                </div>
                            </div>
                        </div>

                        {/* Prize Info */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 text-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prize</div>
                            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                                {formatPrice(ticket.price)}
                            </div>
                        </div>
                    </div>

                    {/* Perforated Line */}
                    <div className="w-6 flex flex-col justify-center items-center bg-gray-100 dark:bg-gray-700 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 flex flex-col justify-center space-y-1">
                            {Array.from({ length: 12 }, (_, i) => (
                                <div key={i} className="w-0.5 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                            ))}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-bold transform -rotate-90 whitespace-nowrap">
                            STUB
                        </div>
                    </div>

                    {/* Ticket Stub */}
                    <div className="w-24 bg-gray-100 dark:bg-gray-700 p-3 flex flex-col justify-center items-center">
                        <div className="text-center">
                            {/* QR Code */}
                            <div className="w-16 h-16 bg-white rounded border-2 border-gray-400 p-1 mb-2 shadow-sm">
                                <img
                                    src={`/raffles/tickets/${ticket.id}/qr-code?t=${Date.now()}`}
                                    alt="QR Code"
                                    className="w-full h-full rounded"
                                    style={{ imageRendering: 'pixelated' }}
                                    onLoad={() => console.log('QR Code loaded successfully')}
                                    onError={(e) => {
                                        console.error('QR Code failed to load:', e);
                                        const target = e.currentTarget as HTMLImageElement;
                                        const fallback = target.nextElementSibling as HTMLElement;
                                        if (fallback) {
                                            target.style.display = 'none';
                                            fallback.style.display = 'grid';
                                        }
                                    }}
                                />
                                <div className="hidden w-full h-full bg-gray-100 rounded grid grid-cols-8 gap-0.5">
                                    {generateQRPattern()}
                                </div>
                            </div>
                            
                            {/* Stub Info */}
                            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                <div className="font-bold text-xs">SCAN</div>
                                <div className="font-mono text-xs">{formatTicketNumber(ticket.ticket_number)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
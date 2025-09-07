import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, User, QrCode, Ticket as TicketIcon, DollarSign } from 'lucide-react';

interface RaffleTicketProps {
    ticket: {
        id: number;
        ticket_number: string;
        price: number;
        purchased_at: string;
        is_winner?: boolean;
        user?: {
            name: string;
            email: string;
        };
        raffle: {
            id: number;
            title: string;
            draw_date: string;
            organization: {
                name: string;
            };
        };
    };
    showStub?: boolean;
    className?: string;
}

export default function RaffleTicket({ ticket, showStub = true, className = '' }: RaffleTicketProps) {
    const isWinner = ticket.is_winner || false;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatTicketNumber = (number: string) => {
        const cleanNumber = number.replace(/[^A-Z0-9]/gi, '');
        return cleanNumber.replace(/(.{4})/g, '$1-').replace(/-$/, '');
    };

    const generateBarcode = (ticketNumber: string) => {
        const chars = ticketNumber.replace(/-/g, '');
        const barcodePattern = chars.split('').map(char => {
            const charCode = char.charCodeAt(0);
            return Array.from({ length: 4 }, (_, i) => 
                Math.floor((charCode + i) % 3) + 1
            );
        }).flat();
        
        return barcodePattern.map((width, index) => (
            <div
                key={index}
                className="bg-black"
                style={{
                    width: `${width}px`,
                    height: '12px',
                    marginRight: '0.5px'
                }}
            />
        ));
    };

    return (
        <div className={`relative w-full max-w-5xl mx-auto ${className}`}>
            {/* Complete Professional Raffle Ticket */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                <div className="flex h-36">
                    
                    {/* SECTION 1: Left - Main Ticket Info (Orange-Pink Gradient) */}
                    <div className="flex-1 relative bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 p-5 text-white">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-2 right-4 w-12 h-12 bg-white/10 rounded-full blur-sm"></div>
                        <div className="absolute bottom-2 left-4 w-8 h-8 bg-yellow-300/20 rounded-full blur-sm"></div>
                        <div className="absolute top-1/2 right-6 w-6 h-6 bg-pink-300/30 rounded-full blur-sm"></div>
                        
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            {/* Header with Badge */}
                            <div className="flex items-center justify-between mb-3">
                                <Badge className="bg-white/20 text-white border-white/30 text-xs px-3 py-1.5 flex items-center">
                                    <TicketIcon className="w-3 h-3 mr-1" />
                                    RAFFLE TICKET
                                </Badge>
                                {isWinner && (
                                    <Badge className="bg-yellow-400 text-black font-bold text-xs px-3 py-1.5">
                                        🏆 WINNER
                                    </Badge>
                                )}
                            </div>

                            {/* Main Content */}
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white leading-tight">
                                    {ticket.raffle?.title?.toUpperCase() || 'RAFFLE TICKET'}
                                </h2>
                                
                                <div className="text-yellow-300 font-semibold text-sm">
                                    LIVE DRAW EVENT
                                </div>

                                {/* Event Details */}
                                <div className="space-y-1">
                                    <div className="flex items-center text-sm">
                                        <Calendar className="w-3 h-3 mr-2 text-yellow-300 flex-shrink-0" />
                                        <span className="font-medium">{ticket.raffle?.draw_date ? formatDate(ticket.raffle.draw_date) : 'TBD'}</span>
                                    </div>
                                    
                                    <div className="flex items-center text-sm">
                                        <MapPin className="w-3 h-3 mr-2 text-yellow-300 flex-shrink-0" />
                                        <span className="truncate font-medium">{ticket.raffle?.organization?.name || 'Organization'}</span>
                                    </div>

                                    {/* User Details */}
                                    {ticket.user && (
                                        <div className="flex items-center text-sm">
                                            <User className="w-3 h-3 mr-2 text-yellow-300 flex-shrink-0" />
                                            <span className="truncate font-medium">{ticket.user.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Middle - QR Code & Verification (Purple Gradient) */}
                    <div className="w-40 bg-gradient-to-b from-purple-600 to-purple-800 p-4 text-white flex flex-col justify-center items-center">
                        <div className="text-center mb-3">
                            <div className="text-xs text-yellow-300 mb-2 font-semibold">VERIFICATION</div>
                            <div className="w-20 h-20 bg-white rounded-lg p-2 flex items-center justify-center">
                                <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                                    <div className="grid grid-cols-8 gap-0.5">
                                        {Array.from({ length: 64 }, (_, i) => (
                                            <div
                                                key={i}
                                                className={`w-1 h-1 ${
                                                    Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ticket Number */}
                        <div className="bg-purple-900/50 rounded-lg p-2 text-center w-full">
                            <div className="text-xs text-yellow-300 mb-1 font-semibold">TICKET #</div>
                            <div className="text-xs font-bold break-all">#{formatTicketNumber(ticket.ticket_number)}</div>
                        </div>
                    </div>

                    {/* SECTION 3: Right - Price & Barcode (Orange Gradient) */}
                    <div className="w-36 bg-gradient-to-b from-orange-500 to-orange-600 p-4 text-white flex flex-col justify-center items-center">
                        {/* Price */}
                        <div className="text-center mb-3">
                            <div className="text-xs text-yellow-200 mb-1 font-semibold">TICKET PRICE</div>
                            <div className="text-2xl font-bold">${ticket.price}</div>
                        </div>

                        {/* Barcode */}
                        <div className="w-full">
                            <div className="bg-white/20 p-2 rounded mb-1">
                                <div className="flex items-center justify-center space-x-0.5">
                                    {generateBarcode(ticket.ticket_number)}
                                </div>
                            </div>
                            <div className="text-xs text-center text-yellow-200 font-semibold">
                                {formatTicketNumber(ticket.ticket_number)}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: Stub - Tear-off Section (Orange) */}
                    {showStub && (
                        <>
                            {/* Perforated Line */}
                            <div className="w-1 bg-gradient-to-b from-transparent via-gray-400 to-transparent flex flex-col justify-center">
                                {Array.from({ length: 14 }, (_, i) => (
                                    <div key={i} className="w-0.5 h-1 bg-gray-400 rounded-full mb-1"></div>
                                ))}
                            </div>

                            <div className="w-32 bg-orange-400 p-3 text-white flex flex-col justify-center">
                                <div className="text-center space-y-2">
                                    <div className="text-xs font-bold">KEEP THIS</div>
                                    <div className="text-xs font-semibold leading-tight">
                                        {ticket.raffle?.title?.substring(0, 10).toUpperCase() || 'RAFFLE'}
                                    </div>
                                    <div className="text-xs break-all">#{formatTicketNumber(ticket.ticket_number)}</div>
                                    <div className="text-xs font-bold">${ticket.price}</div>
                                    <div className="text-xs text-yellow-200">STUB</div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Footer Info */}
            <div className="mt-4 text-center text-xs text-gray-600 dark:text-gray-400">
                <p className="font-medium">
                    Keep this ticket safe! Purchased on {formatDate(ticket.purchased_at)}
                    {ticket.user && ` • ${ticket.user.email}`}
                </p>
            </div>
        </div>
    );
}
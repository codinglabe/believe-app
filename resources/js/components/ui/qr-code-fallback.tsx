import React from 'react';
import { QrCode } from 'lucide-react';

interface QRCodeFallbackProps {
    ticketId: number;
    className?: string;
}

export default function QRCodeFallback({ ticketId, className = '' }: QRCodeFallbackProps) {
    const qrCodeUrl = `/raffles/tickets/${ticketId}/qr-code`;

    return (
        <div className={`w-full h-full flex items-center justify-center ${className}`}>
            <div className="w-20 h-20 bg-white rounded-lg p-2 flex items-center justify-center">
                <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (nextElement) {
                            nextElement.style.display = 'flex';
                        }
                    }}
                />
                <div className="hidden w-full h-full bg-gray-200 rounded items-center justify-center">
                    <QrCode className="w-8 h-8 text-gray-400" />
                </div>
            </div>
        </div>
    );
}

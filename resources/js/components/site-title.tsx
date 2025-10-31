import React from 'react';
import { Link } from '@inertiajs/react';

interface SiteTitleProps {
    className?: string;
    href?: string;
}

export default function SiteTitle({ className, href }: SiteTitleProps) {
    return (
        <Link href={href || route("home")} className={`flex items-center space-x-2 ${className || ''}`}>
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-2 rounded-xl shadow-lg">
                <img
                    src="/favicon-96x96.png"
                    alt="501c3ers Logo"
                    className="h-6 w-6 object-contain filter brightness-0 invert sepia hue-rotate-60"
                />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                501c3ers
            </span>
        </Link>
    );
}

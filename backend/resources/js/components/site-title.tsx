import React from 'react';
import { Link } from '@inertiajs/react';

interface SiteTitleProps {
    className?: string;
    href?: string;
}

export default function SiteTitle({ className, href }: SiteTitleProps) {
    return (
        <Link
            href={href || route('home')}
            className={`flex items-center space-x-2 [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:justify-center [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:space-x-0 ${className || ''}`}
        >
            {/* <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-2 rounded-xl shadow-lg shrink-0 [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:p-1.5 [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:h-8 [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:w-8 [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:flex [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:items-center [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:justify-center">
                <img
                    src="/favicon-96x96.png"
                    alt="Believe In Unity Logo"
                    className="h-6 w-6 object-contain filter brightness-0 invert sepia hue-rotate-60 [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:h-5 [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:w-5"
                />
            </div> */}
            <img
                src="/favicon-96x96.png"
                alt="Believe In Unity Logo"
                className="h-14 w-14 dark:object-contain dark:brightness-0 dark:hue-rotate-60 dark:invert dark:sepia dark:filter dark:[.group\\/sidebar-wrapper[data-collapsible=icon]_&]:h-5 dark:[.group\\/sidebar-wrapper[data-collapsible=icon]_&]:w-5"
            />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-xl font-bold text-transparent [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:hidden">
                Believe In Unity
            </span>
        </Link>
    );
}

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
            className={`flex min-w-0 items-center gap-2 [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:justify-center [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:gap-0 ${className || ''}`}
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
                className="h-9 w-9 shrink-0 sm:h-10 sm:w-10 lg:h-11 lg:w-11 dark:object-contain dark:brightness-0 dark:hue-rotate-60 dark:invert dark:sepia dark:filter dark:[.group\\/sidebar-wrapper[data-collapsible=icon]_&]:h-5 dark:[.group\\/sidebar-wrapper[data-collapsible=icon]_&]:w-5"
            />
            <span className="truncate bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-base font-bold text-transparent sm:text-lg [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:hidden">
                Believe In Unity
            </span>
        </Link>
    );
}

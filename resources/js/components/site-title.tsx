import React from 'react';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

/** Dark UI theme: show a light-on-dark mark (same treatment as navbar). */
const brandImageDarkThemeTreatment =
    'dark:object-contain dark:brightness-0 dark:hue-rotate-60 dark:invert dark:sepia dark:filter dark:[.group\\/sidebar-wrapper[data-collapsible=icon]_&]:h-5 dark:[.group\\/sidebar-wrapper[data-collapsible=icon]_&]:w-5';

const defaultBrandImageClass = cn(
    'h-9 w-9 shrink-0 sm:h-10 sm:w-10 lg:h-11 lg:w-11',
    brandImageDarkThemeTreatment,
);

const defaultBrandWordmarkClass =
    'truncate bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-base font-bold text-transparent sm:text-lg [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:hidden';

const meetOverlayBrandImageClass = cn(
    'h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8',
    brandImageDarkThemeTreatment,
);

/** Light theme: saturated mark on light pill; dark theme: brighter gradient on dark pill. */
const meetOverlayBrandWordmarkClass =
    'truncate bg-gradient-to-r from-purple-700 to-blue-800 bg-clip-text text-xs font-bold text-transparent sm:text-sm dark:from-purple-200 dark:to-blue-200';

export function BelieveInUnityBrandMark({
    className,
    imageClassName,
    wordmarkClassName,
    variant = 'navbar',
}: {
    className?: string;
    imageClassName?: string;
    wordmarkClassName?: string;
    variant?: 'navbar' | 'meet-overlay';
}) {
    const isMeetOverlay = variant === 'meet-overlay';

    const resolvedImageClass =
        imageClassName ??
        (isMeetOverlay ? meetOverlayBrandImageClass : defaultBrandImageClass);

    const resolvedWordmarkClass =
        wordmarkClassName ??
        (isMeetOverlay ? meetOverlayBrandWordmarkClass : defaultBrandWordmarkClass);

    return (
        <span className={cn('flex min-w-0 items-center gap-2', className)}>
            <img
                src="/favicon-96x96.png"
                alt="Believe In Unity Logo"
                className={resolvedImageClass}
            />
            <span className={resolvedWordmarkClass}>Believe In Unity</span>
        </span>
    );
}

interface SiteTitleProps {
    className?: string;
    href?: string;
}

export default function SiteTitle({ className, href }: SiteTitleProps) {
    return (
        <Link
            href={href || route('home')}
            className={cn(
                'flex min-w-0 items-center gap-2 [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:justify-center [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:gap-0',
                className,
            )}
        >
            <BelieveInUnityBrandMark className="min-w-0 gap-2 [.group\\/sidebar-wrapper[data-collapsible=icon]_&]:gap-0" />
        </Link>
    );
}

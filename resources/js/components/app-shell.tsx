import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarResizeProvider, useSidebarResize } from '@/contexts/sidebar-resize-context';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { AppSidebar } from './app-sidebar';
import type { CSSProperties } from 'react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

function AppShellSidebarBody({ children }: { children: React.ReactNode }) {
    const isOpen = usePage<SharedData>().props.sidebarOpen;
    const { sidebarWidthPx } = useSidebarResize();

    const style = {
        '--sidebar-width': `${sidebarWidthPx}px`,
    } as CSSProperties;

    return (
        <SidebarProvider
            defaultOpen={isOpen}
            style={style}
            className="[&_.group\\/sidebar-wrapper.has-data-\\[variant\\=inset\\]]:!bg-background [&[data-collapsible=icon]_header]:md:!left-[calc(var(--sidebar-width-icon,3rem)+1rem+2px)]"
        >
            <div className="shrink-0">
                <AppSidebar />
            </div>

            <div className="min-w-0 flex-1 overflow-x-auto">{children}</div>
        </SidebarProvider>
    );
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    if (variant === 'header') {
        return <div className="flex min-h-screen w-full flex-col">{children}</div>;
    }

    return (
        <SidebarResizeProvider>
            <AppShellSidebarBody>{children}</AppShellSidebarBody>
        </SidebarResizeProvider>
    );
}

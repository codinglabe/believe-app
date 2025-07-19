import { SidebarProvider } from '@/components/ui/sidebar';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { AppSidebar } from './app-sidebar';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    const isOpen = usePage<SharedData>().props.sidebarOpen;

    if (variant === 'header') {
        return <div className="flex min-h-screen w-full flex-col">{children}</div>;
    }

    return (
        <SidebarProvider defaultOpen={isOpen}>
            <div className="md:w-64 md:shrink-0">
                <AppSidebar />
            </div>

            <div className="md:flex-1 overflow-x-auto">
                {children}
            </div>
        </SidebarProvider>);
}

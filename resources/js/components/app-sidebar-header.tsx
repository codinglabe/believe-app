import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { NavUser } from './nav-user';
import { usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
import { showSuccessToast } from '@/lib/toast';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { isImpersonating } = usePage<{ isImpersonating?: boolean }>().props;

    const handleStopImpersonate = () => {
        router.post(route('users.stop-impersonate'), {}, {
            onSuccess: () => {
                showSuccessToast('Impersonation stopped. You are now logged in as yourself.');
            },
            onError: (errors) => {
                console.error('Error stopping impersonation:', errors);
            },
        });
    };

    return (
        <header className="border-sidebar-border/50 flex justify-between h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4 sticky top-0 w-full z-10 bg-background">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="flex items-center gap-2">
                {isImpersonating && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleStopImpersonate}
                        className="flex items-center gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Exit Impersonation</span>
                        <span className="sm:hidden">Exit</span>
                    </Button>
                )}
                <SidebarFooter>
                    <NavUser />
                </SidebarFooter>
            </div>
        </header>
    );
}

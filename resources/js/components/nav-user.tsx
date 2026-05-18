import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export function NavUser({ className }: { className?: string }) {
    const { auth } = usePage<SharedData>().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn(
                        'flex h-9 min-h-9 shrink-0 items-center gap-2 px-2 text-foreground',
                        'hover:bg-accent hover:text-accent-foreground',
                        'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
                        'max-w-[min(100%,18rem)] min-w-0',
                        className
                    )}
                >
                    <UserInfo user={auth.user} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                align="end"
                side={isMobile ? 'bottom' : state === 'collapsed' ? 'left' : 'bottom'}
            >
                <UserMenuContent user={auth.user} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type User } from '@/types';
import { Link, router } from '@inertiajs/react';
import { LinkIcon, LogOut, Settings, CreditCard, Crown } from 'lucide-react';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm min-w-0">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Plan Information */}
            {(user as any).current_plan_details && (
                <>
                    <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Current Plan
                    </DropdownMenuLabel>
                    <div className="px-2 py-1.5">
                        <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-2">
                            <Crown className="h-4 w-4 text-primary" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                    {(user as any).current_plan_details?.name || 'Plan'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    ${((user as any).current_plan_details?.price || 0).toFixed(2)} / {
                                        ((user as any).current_plan_details?.frequency || 'month') === 'one-time' 
                                            ? 'One-time' 
                                            : ((user as any).current_plan_details?.frequency || 'month')
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                    <DropdownMenuItem asChild>
                        <Link className="block w-full" href={route('plans.index')} as="button" prefetch onClick={cleanup}>
                            <Crown className="mr-2" />
                            Manage Plan
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                </>
            )}
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link className="block w-full" href={route('home')} as="button" prefetch>
                        <LinkIcon className="mr-2" />
                        Website
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link className="block w-full" href={route('billing.index')} as="button" prefetch onClick={cleanup}>
                        <CreditCard className="mr-2" />
                        Billings
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link className="block w-full" href={route('profile.edit')} as="button" prefetch onClick={cleanup}>
                        <Settings className="mr-2" />
                        Settings
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            {/* Show Plans link if no current plan */}
            {!(user as any).current_plan_id && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link className="block w-full" href={route('plans.index')} as="button" prefetch onClick={cleanup}>
                            <Crown className="mr-2" />
                            View Plans
                        </Link>
                    </DropdownMenuItem>
                </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link className="block w-full" method="post" href={route('logout')} as="button" onClick={handleLogout}>
                    <LogOut className="mr-2" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}

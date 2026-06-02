import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type SharedData, type User } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { HeartHandshake, LinkIcon, LogOut, Settings, CreditCard, Crown, Globe, Users } from 'lucide-react';
import { prepareLogout } from '@/lib/logout';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    const { auth, supporterSubscription } = usePage<SharedData & { supporterSubscription?: SupporterSubscriptionState | null }>().props;
    const authRoles = auth?.roles ?? [];
    const hasCareAllianceRole = authRoles.some((r) => String(r).toLowerCase() === 'care_alliance');
    const careAllianceHub = (user as { care_alliance?: { slug: string; name: string } | null }).care_alliance;

    const isAdmin = user.role === 'admin';
    const isSupporter = user.role === 'user';
    const isOrganization = user.role === 'organization' || user.role === 'organization_pending';
    const organizationPublicViewSlug = (user as any).organization?.public_view_slug;
    const showOrgAllianceMembership = isOrganization && !hasCareAllianceRole;
    const planDetails = (user as any).current_plan_details as
        | { name?: string; price?: number; frequency?: string }
        | null
        | undefined;
    const activeSupporterPlan = isSupporter ? supporterSubscription : null;
    const activePlanName = isSupporter ? activeSupporterPlan?.name ?? planDetails?.name : planDetails?.name;
    const activePlanPrice = isSupporter
        ? (activeSupporterPlan?.price ?? planDetails?.price ?? 0)
        : (planDetails?.price ?? 0);
    const activePlanFrequency = isSupporter
        ? 'month'
        : ((planDetails?.frequency || 'month') === 'one-time' ? 'One-time' : (planDetails?.frequency || 'month'));
    const hasActivePlan = Boolean(isSupporter ? activeSupporterPlan || planDetails?.name : planDetails?.name);
    const planManageHref = route('plans.index');
    const showViewPlans = !isAdmin && !hasActivePlan && (isSupporter || !(user as any).current_plan_id);

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        cleanup();
        await prepareLogout();
        router.post('/logout');
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
            {!isAdmin && hasActivePlan && (
                <>
                    <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Current Plan
                    </DropdownMenuLabel>
                    <div className="px-2 py-1.5">
                        <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-2">
                            <Crown className="h-4 w-4 text-primary" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                    {activePlanName || 'Plan'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    ${Number(activePlanPrice).toFixed(2)} / {activePlanFrequency}
                                </p>
                            </div>
                        </div>
                    </div>
                    <DropdownMenuItem asChild>
                        <Link className="block w-full" href={planManageHref} as="button" prefetch onClick={cleanup}>
                            <Crown className="mr-2" />
                            Manage Plan
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                </>
            )}
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link className="block w-full" href="/" as="button" prefetch>
                        <LinkIcon className="mr-2" />
                        Website
                    </Link>
                </DropdownMenuItem>
                {hasCareAllianceRole && careAllianceHub?.slug && (
                    <DropdownMenuItem asChild>
                        <Link
                            className="block w-full"
                            href={route('alliances.show', careAllianceHub.slug)}
                            as="button"
                            prefetch
                            onClick={cleanup}
                        >
                            <Globe className="mr-2" />
                            Alliance public page
                        </Link>
                    </DropdownMenuItem>
                )}
                {isOrganization && organizationPublicViewSlug && (
                    <DropdownMenuItem asChild>
                        <Link
                            className="block w-full"
                            href={route('organizations.show', organizationPublicViewSlug)}
                            as="button"
                            prefetch
                            onClick={cleanup}
                        >
                            <Globe className="mr-2" />
                            Public View
                        </Link>
                    </DropdownMenuItem>
                )}
                {hasCareAllianceRole && (
                    <DropdownMenuItem asChild>
                        <Link
                            className="block w-full"
                            href={route('care-alliance.dashboard')}
                            as="button"
                            prefetch
                            onClick={cleanup}
                        >
                            <HeartHandshake className="mr-2" />
                            Unity Impact Alliance
                        </Link>
                    </DropdownMenuItem>
                )}
                {showOrgAllianceMembership && (
                    <DropdownMenuItem asChild>
                        <Link
                            className="block w-full"
                            href={route('organization.alliance-membership')}
                            as="button"
                            prefetch
                            onClick={cleanup}
                        >
                            <Users className="mr-2" />
                            Alliance membership
                        </Link>
                    </DropdownMenuItem>
                )}
                {!isAdmin && (
                    <DropdownMenuItem asChild>
                        <Link className="block w-full" href="/settings/billing" as="button" prefetch onClick={cleanup}>
                            <CreditCard className="mr-2" />
                            Billings
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                    <Link className="block w-full" href="/settings/profile" as="button" prefetch onClick={cleanup}>
                        <Settings className="mr-2" />
                        Settings
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            {showViewPlans && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link className="block w-full" href={planManageHref} as="button" prefetch onClick={cleanup}>
                            <Crown className="mr-2" />
                            View Plans
                        </Link>
                    </DropdownMenuItem>
                </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link className="block w-full" method="post" href="/logout" as="button" onClick={handleLogout}>
                    <LogOut className="mr-2" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}

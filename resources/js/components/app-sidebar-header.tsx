import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarFooter, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { NavUser } from './nav-user';
import { NotificationBell } from './notification-bell';
import AppearanceToggleDropdown from './appearance-dropdown';
import { usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { LogOut, Wallet } from 'lucide-react';
import { showSuccessToast } from '@/lib/toast';
import { useEffect, useState } from 'react';
import { route } from 'ziggy-js';
import { WalletPopup } from './WalletPopup';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { isImpersonating, auth } = usePage<{ 
        isImpersonating?: boolean;
        auth?: {
            user?: {
                role?: string;
                balance?: number;
            };
        };
    }>().props;
    
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletPopupOpen, setWalletPopupOpen] = useState(false);
    
    const isOrgUser = auth?.user?.role === 'organization' || auth?.user?.role === 'organization_pending';

    // Get sidebar state - wrapped in try-catch since header might render outside provider
    let sidebarCollapsed = false;
    try {
        const { state } = useSidebar();
        sidebarCollapsed = state === 'collapsed';
    } catch {
        // Sidebar context not available, will use CSS fallback
    }

    // Fetch organization balance directly (no wallet connection checks)
    useEffect(() => {
        const fetchOrganizationBalance = async () => {
            if (!isOrgUser) return;
            
            try {
                // Fetch organization balance directly
                const balanceResponse = await fetch(`/wallet/balance?t=${Date.now()}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                    cache: 'no-cache',
                });
                
                if (balanceResponse.ok) {
                    const balanceData = await balanceResponse.json();
                    if (balanceData.success) {
                        setWalletBalance(balanceData.balance || balanceData.organization_balance || balanceData.local_balance || 0);
                        setWalletConnected(true); // Always connected for organization users
                    }
                }
            } catch (error) {
                console.error('Failed to fetch organization balance:', error);
                setWalletBalance(0);
            }
        };
        
        fetchOrganizationBalance();
        
        // Refresh balance every 30 seconds
        const interval = setInterval(fetchOrganizationBalance, 30000);
        return () => clearInterval(interval);
    }, [isOrgUser]);

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
        <header 
            className="flex justify-between h-16 shrink-0 items-center gap-2 border-b-2 border-gray-200 dark:border-gray-800 px-3 sm:px-4 md:px-6 transition-[left,width] duration-200 ease-linear fixed top-0 left-0 md:left-[var(--sidebar-width,16rem)] right-0 z-40 bg-background shadow-sm"
            style={typeof window !== 'undefined' && window.innerWidth >= 768 && sidebarCollapsed ? {
                left: 'calc(var(--sidebar-width-icon, 3rem) + 1rem + 2px)'
            } : undefined}
        >
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <div className="hidden sm:block min-w-0">
                <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {isImpersonating && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleStopImpersonate}
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    >
                        <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Exit Impersonation</span>
                        <span className="sm:hidden">Exit</span>
                    </Button>
                )}
                
                {/* Notification Bell */}
                {auth?.user?.id && (
                    <NotificationBell userId={auth.user.id} />
                )}
                
                {/* Wallet Balance Display for Organization Users - Always visible */}
                {isOrgUser && (
                    <button
                        onClick={() => setWalletPopupOpen(true)}
                        className={`flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold rounded-md sm:rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 transition-colors ${
                            walletConnected && walletBalance !== null
                                ? 'text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20'
                                : 'text-muted-foreground bg-muted border border-border hover:bg-muted/80'
                        }`}
                        title="View wallet details"
                    >
                        <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span className="whitespace-nowrap">
                            {walletConnected && walletBalance !== null ? (
                                `$${walletBalance.toLocaleString('en-US', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                })}`
                            ) : walletBalance !== null ? (
                                `$${walletBalance.toLocaleString('en-US', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                })}`
                            ) : (
                                '$0.00'
                            )}
                        </span>
                    </button>
                )}
                
                {/* Wallet Popup */}
                {isOrgUser && (
                    <WalletPopup
                        isOpen={walletPopupOpen}
                        onClose={() => setWalletPopupOpen(false)}
                        organizationName={(auth?.user as any)?.organization?.name || undefined}
                    />
                )}
                
                {/* Theme Toggle */}
                <AppearanceToggleDropdown />
                
                <SidebarFooter>
                    <NavUser />
                </SidebarFooter>
            </div>
        </header>
    );
}

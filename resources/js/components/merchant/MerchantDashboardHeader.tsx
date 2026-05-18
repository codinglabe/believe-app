import React from 'react'
import { Link, router } from '@inertiajs/react'
import { Search, Settings, LogOut, ChevronDown, CreditCard, Bell } from 'lucide-react'
import { usePage } from '@inertiajs/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MerchantDashboardHeaderProps {
  className?: string
}

export function MerchantDashboardHeader({ className = '' }: MerchantDashboardHeaderProps) {
  const { auth } = usePage().props as {
    auth?: { user?: { pending_pool_approval_count?: number; [key: string]: unknown } }
  }
  const merchant = auth?.user
  const pendingApprovals = Number(merchant?.pending_pool_approval_count ?? 0)

  const handleLogout = () => {
    router.post(route('merchant.logout'))
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 h-[3.75rem] border-b border-white/[0.06] bg-[#0a0c1b]/85 backdrop-blur-md sm:h-16 lg:left-64 ${className}`}
    >
      <div className="flex h-full items-center justify-between gap-3 pl-14 pr-4 sm:pl-6 sm:pr-6">
        <div className="hidden min-w-0 flex-1 md:block md:max-w-xl lg:max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              placeholder="Search orders, redemptions, rewards..."
              className="w-full rounded-xl border border-white/[0.08] bg-[#161B30]/90 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-500/25"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center md:flex-initial md:justify-end">
          <div className="relative flex w-full md:hidden">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              placeholder="Search..."
              aria-label="Search orders, redemptions, rewards"
              className="w-full rounded-xl border border-white/[0.08] bg-[#161B30]/90 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-500/25"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/marketplace-pool-approvals"
            className="relative flex shrink-0 rounded-xl border border-white/[0.08] bg-[#161B30]/80 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white sm:p-2.5"
            aria-label="Approvals and notifications"
          >
            <Bell className="h-5 w-5" />
            {pendingApprovals > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-gradient-to-br from-[#8E2DE2] to-[#4A00E0] px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                {pendingApprovals > 99 ? '99+' : pendingApprovals}
              </span>
            )}
          </Link>
          {merchant && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/35 sm:px-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8E2DE2] to-[#4A00E0]">
                    <span className="text-white font-bold text-xs">
                      {merchant.name?.charAt(0).toUpperCase() || 'M'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-white">
                      {merchant.business_name || merchant.name}
                    </p>
                    <p className="text-xs capitalize text-white/60">{merchant.role || 'Merchant'}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/60 hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border border-white/10 bg-[#161B30] text-white shadow-xl"
              >
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{merchant.business_name || merchant.name}</p>
                    <p className="text-xs text-white/60 truncate">{merchant.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white">
                  <Link href="/settings" className="flex items-center gap-2 cursor-pointer text-white/80">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                {auth?.user?.has_active_subscription && (
                  <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white">
                    <Link href="/subscription" className="flex items-center gap-2 cursor-pointer text-white/80">
                      <CreditCard className="w-4 h-4" />
                      Manage Subscription
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  variant="destructive"
                  className="flex items-center gap-2 cursor-pointer text-red-300 focus:text-red-200 focus:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}

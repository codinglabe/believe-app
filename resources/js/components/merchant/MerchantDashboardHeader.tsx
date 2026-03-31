import React from 'react'
import { Link, router } from '@inertiajs/react'
import { MerchantButton } from '@/components/merchant-ui'
import { Search, Settings, LogOut, ChevronDown, CreditCard } from 'lucide-react'
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
  const { auth } = usePage().props as any
  const merchant = auth?.user

  const handleLogout = () => {
    router.post(route('merchant.logout'))
  }

  return (
    <header
      className={`fixed top-0 left-0 lg:left-64 right-0 h-16 z-30 bg-black/30 backdrop-blur border-b border-[#2563EB]/20 ${className}`}
    >
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              placeholder="Search offers, redemptions..."
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-[#2563EB]/25 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:border-[#2563EB]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {merchant && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35">
                  <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {merchant.name?.charAt(0).toUpperCase() || 'M'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-white">
                      {merchant.business_name || merchant.name}
                    </p>
                    <p className="text-xs text-white/60">{merchant.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/60 hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#0A2540] border border-[#2563EB]/25 text-white shadow-xl"
              >
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{merchant.business_name || merchant.name}</p>
                    <p className="text-xs text-white/60 truncate">{merchant.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#2563EB]/20" />
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
                <DropdownMenuSeparator className="bg-[#2563EB]/20" />
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

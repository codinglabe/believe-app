import React from 'react'
import { Link, router } from '@inertiajs/react'
import { MerchantButton } from '@/components/merchant-ui'
import { Search, Settings, LogOut, ChevronDown } from 'lucide-react'
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
    <header className={`fixed top-0 left-0 lg:left-64 right-0 h-16 z-30 bg-black/95 backdrop-blur border-b border-[#FF1493]/20 ${className}`}>
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search offers, redemptions..."
              className="w-full pl-10 pr-4 py-2 bg-black/50 border border-[#FF1493]/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF1493]/50 focus:border-[#FF1493]/50"
            />
          </div>
        </div>

        {/* Right Side - Auth Dropdown */}
        <div className="flex items-center gap-3">
          {merchant && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FF1493]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF1493]/50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {merchant.name?.charAt(0).toUpperCase() || 'M'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-white">
                      {merchant.business_name || merchant.name}
                    </p>
                    <p className="text-xs text-gray-400">{merchant.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 bg-black/95 border border-[#FF1493]/20 text-white shadow-xl"
              >
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold text-white">
                      {merchant.business_name || merchant.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{merchant.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#FF1493]/20" />
                <DropdownMenuItem asChild className="focus:bg-[#FF1493]/10 focus:text-white">
                  <Link 
                    href="/settings" 
                    className="flex items-center gap-2 cursor-pointer text-gray-300"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#FF1493]/20" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  variant="destructive"
                  className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10"
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


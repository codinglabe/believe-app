import React from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { MerchantButton } from '@/components/merchant-ui'
import { Menu, Bell, User, ArrowLeft, Settings, LogOut, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MerchantHeaderProps {
  variant?: 'public' | 'authenticated'
  title?: string
  showMenu?: boolean
  showBack?: boolean
  backUrl?: string
  showNotifications?: boolean
  showUser?: boolean
  onMenuClick?: () => void
  className?: string
  rightActions?: React.ReactNode
}

export function MerchantHeader({
  variant = 'public',
  title,
  showMenu = false,
  showBack = false,
  backUrl,
  showNotifications = false,
  showUser = false,
  onMenuClick,
  className = '',
  rightActions
}: MerchantHeaderProps) {
  const { auth } = usePage().props as any
  const merchant = auth?.user
  const isAuthenticated = !!merchant

  const handleLogout = () => {
    router.post(route('merchant.logout'))
  }

  const headerClasses = 'fixed top-0 left-0 right-0 z-50 w-full'

  return (
    <header className={`${headerClasses} bg-black/95 dark:bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/95 dark:supports-[backdrop-filter]:bg-black/95 shadow-lg ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            {showBack && backUrl ? (
              <Link href={backUrl}>
                <MerchantButton 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9"
                >
                  <ArrowLeft className="h-5 w-5" />
                </MerchantButton>
              </Link>
            ) : showMenu ? (
              <MerchantButton 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9"
                onClick={onMenuClick}
              >
                <Menu className="h-5 w-5" />
              </MerchantButton>
            ) : null}
            <Link href="/" className="flex items-center gap-2">
              <img 
                src="/merchant/merchant.png" 
                alt={`${import.meta.env.VITE_APP_NAME || 'Believe'} Merchant`} 
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
              />
              {title ? (
                <h1 className="text-lg sm:text-xl font-bold text-white">
                  {title}
                </h1>
              ) : (
                <>
                  <span className="text-lg sm:text-xl font-bold text-white hidden sm:inline">
                    {import.meta.env.VITE_APP_NAME || 'Believe'} Merchant
                  </span>
                  <span className="text-base font-bold text-white sm:hidden">
                    {import.meta.env.VITE_APP_NAME || 'Believe'} Merchant
                  </span>
                </>
              )}
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {rightActions ? (
              rightActions
            ) : isAuthenticated ? (
              // Show auth dropdown when logged in
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
                      <p className="text-xs text-gray-400">{merchant.role || 'Merchant'}</p>
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
                      href="/dashboard" 
                      className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white"
                    >
                      <User className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="focus:bg-[#FF1493]/10 focus:text-white">
                    <Link 
                      href="/settings" 
                      className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#FF1493]/20" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex items-center gap-2 cursor-pointer text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : variant === 'public' ? (
              // Show sign in/register buttons when not logged in
              <>
                <Link href="/login">
                  <MerchantButton variant="ghost" className="text-xs sm:text-sm px-3 sm:px-4 py-2">
                    Sign In
                  </MerchantButton>
                </Link>
                <Link href="/register">
                  <MerchantButton className="text-xs sm:text-sm px-3 sm:px-4 py-2">
                    Get Started
                  </MerchantButton>
                </Link>
              </>
            ) : (
              // Authenticated variant (legacy)
              <>
                {showNotifications && (
                  <MerchantButton variant="ghost" size="icon" className="h-9 w-9 relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                  </MerchantButton>
                )}
                {showUser && (
                  <MerchantButton variant="ghost" size="icon" className="h-9 w-9">
                    <User className="h-5 w-5" />
                  </MerchantButton>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

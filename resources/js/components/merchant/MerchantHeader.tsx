import React from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { MerchantButton } from '@/components/merchant-ui'
import { Menu, Bell, User, ArrowLeft, Settings, LogOut, ChevronDown, CreditCard } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface MerchantHeaderAnchorNavItem {
  id: string
  label: string
}

interface MerchantHeaderProps {
  variant?: 'public' | 'authenticated'
  title?: string
  /** Shown under the brand name on the public header (e.g. tagline). */
  tagline?: string
  /** In-page section links rendered as #anchors (public marketing pages). */
  anchorNav?: MerchantHeaderAnchorNavItem[]
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
  tagline,
  anchorNav,
  showMenu = false,
  showBack = false,
  backUrl,
  showNotifications = false,
  showUser = false,
  onMenuClick,
  className = '',
  rightActions,
}: MerchantHeaderProps) {
  const { auth } = usePage().props as any
  const merchant = auth?.user
  const isAuthenticated = !!merchant

  const handleLogout = () => {
    router.post(route('merchant.logout'))
  }

  const actions = rightActions ? (
    rightActions
  ) : isAuthenticated ? (
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
            <p className="text-xs text-white/60">{merchant.role || 'Merchant'}</p>
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
          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer text-white/80">
            <User className="w-4 h-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
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
          className="flex items-center gap-2 cursor-pointer text-red-300 focus:text-red-200 focus:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : variant === 'public' ? (
    <>
      <Link href="/login">
        <MerchantButton variant="ghost" className="text-xs sm:text-sm px-3 sm:px-4 py-2">
          Sign In
        </MerchantButton>
      </Link>
      <Link href="/register">
        <MerchantButton className="text-xs sm:text-sm px-3 sm:px-4 py-2">Get Started</MerchantButton>
      </Link>
    </>
  ) : (
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
  )

  const sectionNav =
    variant === 'public' && anchorNav?.length ? (
      <nav
        className="flex w-full flex-wrap justify-center gap-x-3 gap-y-1 text-xs font-medium text-white/90 sm:text-sm lg:w-auto lg:flex-nowrap lg:justify-end"
        aria-label="Page sections"
      >
        {anchorNav.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="whitespace-nowrap rounded-md px-1 py-0.5 transition-colors hover:text-white hover:underline underline-offset-4"
          >
            {item.label}
          </a>
        ))}
      </nav>
    ) : null

  const headerClasses = 'fixed top-0 left-0 right-0 z-50 w-full'

  return (
    <header
      className={`${headerClasses} bg-black/30 backdrop-blur supports-[backdrop-filter]:bg-black/30 border-b border-[#2563EB]/20 shadow-lg ${className}`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Mobile / tablet: brand + actions on one row; section nav full width below */}
        <div className="flex flex-col gap-3 lg:hidden">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {showBack && backUrl ? (
                <Link href={backUrl}>
                  <MerchantButton variant="ghost" size="icon" className="h-9 w-9">
                    <ArrowLeft className="h-5 w-5" />
                  </MerchantButton>
                </Link>
              ) : showMenu ? (
                <MerchantButton variant="ghost" size="icon" className="h-9 w-9" onClick={onMenuClick}>
                  <Menu className="h-5 w-5" />
                </MerchantButton>
              ) : null}
              <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
                <img src="/merchant/merchant.png" alt="BIU Merchant" className="h-8 w-8 shrink-0 object-contain sm:h-10 sm:w-10" />
                {title ? (
                  <h1 className="truncate text-lg font-bold text-white sm:text-xl">{title}</h1>
                ) : (
                  <div className="min-w-0 leading-tight">
                    <span className="block truncate text-base font-bold text-white sm:text-lg sm:text-xl">BIU Merchant</span>
                    {tagline ? (
                      <span className="mt-0.5 block truncate text-[11px] font-medium text-violet-300/95 sm:text-xs">{tagline}</span>
                    ) : null}
                  </div>
                )}
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">{actions}</div>
          </div>
          {sectionNav ? (
            <div className="border-t border-white/10 pt-3">{sectionNav}</div>
          ) : null}
        </div>

        {/* Desktop: space-between — brand left; nav + actions grouped on the right */}
        <div className="hidden w-full items-center justify-between gap-6 lg:flex">
          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            {showBack && backUrl ? (
              <Link href={backUrl}>
                <MerchantButton variant="ghost" size="icon" className="h-9 w-9">
                  <ArrowLeft className="h-5 w-5" />
                </MerchantButton>
              </Link>
            ) : showMenu ? (
              <MerchantButton variant="ghost" size="icon" className="h-9 w-9" onClick={onMenuClick}>
                <Menu className="h-5 w-5" />
              </MerchantButton>
            ) : null}
            <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
              <img src="/merchant/merchant.png" alt="BIU Merchant" className="h-8 w-8 shrink-0 object-contain sm:h-10 sm:w-10" />
              {title ? (
                <h1 className="truncate text-lg font-bold text-white sm:text-xl">{title}</h1>
              ) : (
                <div className="min-w-0 leading-tight">
                  <span className="block truncate text-base font-bold text-white sm:text-lg sm:text-xl">BIU Merchant</span>
                  {tagline ? (
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-violet-300/95 sm:text-xs">{tagline}</span>
                  ) : null}
                </div>
              )}
            </Link>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-5 xl:gap-6">
            {sectionNav}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">{actions}</div>
          </div>
        </div>
      </div>
    </header>
  )
}

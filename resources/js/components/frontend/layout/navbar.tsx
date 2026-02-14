"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/frontend/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/frontend/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import {
  Menu,
  X,
  User,
  LogOut,
  LayoutGrid,
  Wallet,
  Eye,
  EyeOff,
  Text,
  ShoppingBag,
  Gift,
  ChevronDown,
  Newspaper,
  Calendar,
  Briefcase,
  GraduationCap,
  Store,
  Users,
  MessageSquare,
  Building2,
  Mail,
  Sparkles,
  Coins,
  HeartHandshake,
  UserPlus,
  Video,
  Handshake,
  Globe,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeToggle } from "@/components/frontend/theme-toggle"
import { Link, router, usePage } from "@inertiajs/react"
import { useMobileNavigation } from "@/hooks/use-mobile-navigation"
import { NotificationBell } from "@/components/notification-bell"
import SiteTitle from "@/components/site-title"
import { WalletPopup } from "@/components/WalletPopup"
import { UserWalletSubscriptionModal } from "@/components/UserWalletSubscriptionModal"
import { BelievePointsDisplay } from "@/components/believe-points-display"

// Extending SharedData interface to include wallet_balance
interface SharedData extends Record<string, unknown> {
  auth: {
    user: {
      id: number
      name: string
      email: string
      phone?: string
      image?: string
      joined: string
      total_donated?: number
      favorite_organizations_count?: number
      total_orders?: number
      impact_score?: number
      referral_link?: string
      balance?: string // Added wallet_balance
      reward_points?: number // Added reward_points
      believe_points?: number // Added believe_points
      role?: string // Ensure role is also present
      email_verified_at?: string | null // Email verification status
      service_seller_profile?: {
        id: number
        verification_status?: string
      } | null // Added service_seller_profile
    }
  }
}

export default function Navbar() {
  const { auth } = usePage<SharedData>().props
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(!!auth?.user)

  // Wallet specific states
  const [showBalance, setShowBalance] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [showWalletPopup, setShowWalletPopup] = useState(false)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  // Core navigation items (always visible)
  const coreNavItems = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Believe FundMe", href: "/believe-fundme" },
    { name: "Donate", href: "/donate" },
  ]

  // Community dropdown items
  const communityItems = [
    { name: "News", href: "/nonprofit-news", icon: Newspaper },
    { name: "Community Videos", href: "/community-videos", icon: Video },
    ...(isLoggedIn ? [
      { name: "Social Feed", href: route("social-feed.index"), icon: Users },
      { name: "Find Supporters", href: route("find-supporters.index"), icon: UserPlus },
      { name: "Chat", href: route("chat.index"), icon: MessageSquare },
    ] : []),
  ]

  // Services dropdown items (Nonprofit Barter only when organization is logged in)
  const isOrgUser = auth?.user?.role === "organization" || auth?.user?.role === "organization_pending"
  const servicesItems = [
    ...(isOrgUser ? [{ name: "Nonprofit Barter", href: route("barter.index"), icon: Handshake }] : []),
    { name: "Service Hub", href: "/service-hub", icon: Sparkles },
    { name: "Merchant Hub", href: "/merchant-hub", icon: ShoppingBag },
    { name: "Marketplace", href: "/marketplace", icon: Store },
    { name: "Gift Cards", href: route("gift-cards.index"), icon: Gift },
    { name: "Volunteer Opportunity", href: "/volunteer-opportunities", icon: HeartHandshake },
    { name: "Jobs", href: "/jobs", icon: Briefcase },
    { name: "Courses & Events", href: route("course.index"), icon: GraduationCap },
    { name: "Event Calendar", href: "/all-events", icon: Calendar },
  ]

  // More dropdown items (Fractional Ownership commented out)
  const moreItems = [
    // { name: "Fractional Ownership", href: "/fractional", icon: Building2 },
    { name: "Contact", href: "/contact", icon: Mail },
  ]

  const cleanup = useMobileNavigation()

  const handleLogout = () => {
    cleanup()
    setIsLoggedIn(false)
    router.flushAll()
  }


  // Fetch balance only when logged in (do not hit /wallet/balance on public pages)
  useEffect(() => {
    if (!isLoggedIn || !auth?.user?.id) {
      setWalletBalance(null)
      return
    }

    const fetchBalance = async () => {
      if (!auth?.user?.email_verified_at) {
        if (auth?.user?.balance) {
          setWalletBalance(parseFloat(auth.user.balance.toString()))
        }
        return
      }

      try {
        const balanceResponse = await fetch(`/wallet/balance?t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
          cache: 'no-cache',
        })

        // Check if response is JSON before parsing
        const contentType = balanceResponse.headers.get('content-type')
        if (balanceResponse.ok && contentType && contentType.includes('application/json')) {
          const balanceData = await balanceResponse.json()
          if (balanceData.success) {
            setWalletBalance(balanceData.balance || balanceData.local_balance || 0)
            // Set subscription status (for regular users/supporters)
            if (balanceData.has_subscription !== undefined) {
              setHasSubscription(balanceData.has_subscription)
            }
          }
        } else if (balanceResponse.status === 403) {
          // Email not verified - use fallback balance
          if (auth?.user?.balance) {
            setWalletBalance(parseFloat(auth.user.balance.toString()))
          }
        }
      } catch (error) {
        console.error('Failed to fetch wallet balance:', error)
        // Fallback to user balance from auth
        if (auth?.user?.balance) {
          setWalletBalance(parseFloat(auth.user.balance.toString()))
        }
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 30000)
    return () => clearInterval(interval)
  }, [isLoggedIn, auth?.user?.id, auth?.user?.balance])

  // Fetch balance function for manual refresh
  const fetchBalance = async () => {
    if (!isLoggedIn) {
      setWalletBalance(null)
      return
    }

    // Don't fetch balance if email is not verified
    if (!auth?.user?.email_verified_at) {
      // Use fallback balance from auth if available
      if (auth?.user?.balance) {
        setWalletBalance(parseFloat(auth.user.balance.toString()))
      }
      return
    }

    try {
      const balanceResponse = await fetch(`/wallet/balance?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        cache: 'no-cache',
      })

      // Check if response is JSON before parsing
      const contentType = balanceResponse.headers.get('content-type')
      if (balanceResponse.ok && contentType && contentType.includes('application/json')) {
        const balanceData = await balanceResponse.json()
        if (balanceData.success) {
          setWalletBalance(balanceData.balance || balanceData.local_balance || 0)
          // Set subscription status (for regular users/supporters)
          if (balanceData.has_subscription !== undefined) {
            setHasSubscription(balanceData.has_subscription)
          }
        }
      } else if (balanceResponse.status === 403) {
        // Email not verified - use fallback balance
        if (auth?.user?.balance) {
          setWalletBalance(parseFloat(auth.user.balance.toString()))
        }
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error)
      // Fallback to user balance from auth
      if (auth?.user?.balance) {
        setWalletBalance(parseFloat(auth.user.balance.toString()))
      }
    }
  }

  // Handle wallet button click - check subscription first
  const handleWalletClick = () => {
    // Check if user is a regular user (supporter)
    const isRegularUser = auth?.user?.role === 'user' || !auth?.user?.role

    if (isRegularUser) {
      // For regular users, check subscription status from existing state
      // If subscription status is null (not loaded), false, or not explicitly true, show subscription modal
      if (hasSubscription === null || hasSubscription === false || hasSubscription !== true) {
        setShowSubscriptionModal(true)
        return // Don't show wallet popup, show subscription modal instead
      }
      // Only if hasSubscription is explicitly true, proceed to wallet popup
    }

    // Has subscription or is organization user, show wallet popup
    setShowWalletPopup(true)
  }

  // Refresh balance when wallet popup closes
  const handleWalletPopupClose = () => {
    setShowWalletPopup(false)
    // Refresh balance after a short delay to allow backend operations to complete
    setTimeout(() => {
      fetchBalance()
    }, 1000)
  }

  // Use wallet balance if available, otherwise fall back to user balance
  const userBalance = walletBalance !== null ? walletBalance : (auth?.user?.balance ? parseFloat(auth.user.balance.toString()) : 0)

  return (
      <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
          <div className="container mx-auto px-4">
              <div className="flex h-16 items-center justify-between">
                  {/* Logo */}
                  <SiteTitle />

                  {/* Desktop Navigation */}
                  <div className="hidden items-center space-x-1 xl:flex">
                      {/* Core items - always visible */}
                      {coreNavItems.map((item) => (
                          <Link key={item.name} href={item.href}>
                              <Button variant="ghost" className="hover:bg-accent cursor-pointer text-sm font-medium">
                                  {item.name}
                              </Button>
                          </Link>
                      ))}

                      {/* Community Dropdown */}
                      {communityItems.length > 0 && (
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="hover:bg-accent cursor-pointer text-sm font-medium">
                                      Community
                                      <ChevronDown className="ml-1 h-3 w-3" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-48">
                                  {communityItems.map((item) => (
                                      <DropdownMenuItem key={item.name} asChild>
                                          <Link href={item.href} className="flex cursor-pointer items-center">
                                              {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                              <span>{item.name}</span>
                                          </Link>
                                      </DropdownMenuItem>
                                  ))}
                              </DropdownMenuContent>
                          </DropdownMenu>
                      )}

                      {/* Services Dropdown */}
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="hover:bg-accent cursor-pointer text-sm font-medium">
                                  Services
                                  <ChevronDown className="ml-1 h-3 w-3" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                              {servicesItems.map((item) => (
                                  <DropdownMenuItem key={item.name} asChild>
                                      <Link href={item.href} className="flex cursor-pointer items-center">
                                          {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                          <span>{item.name}</span>
                                      </Link>
                                  </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                      </DropdownMenu>

                      {/* More Dropdown */}
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="hover:bg-accent cursor-pointer text-sm font-medium">
                                  More
                                  <ChevronDown className="ml-1 h-3 w-3" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                              {moreItems.map((item) => (
                                  <DropdownMenuItem key={item.name} asChild>
                                      <Link href={item.href} className="flex cursor-pointer items-center">
                                          {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                          <span>{item.name}</span>
                                      </Link>
                                  </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </div>

                  {/* Desktop Actions */}
                  <div className="hidden items-center space-x-2 xl:flex">
                      <ThemeToggle />
                      {isLoggedIn ? (
                          <>
                              {/* <Button variant="ghost" size="sm" className="h-9 w-9 px-0">
                                  <Bell className="h-4 w-4" />
                              </Button> */}
                              <NotificationBell userId={auth.user.id} emailVerified={!!auth.user.email_verified_at} />

                {/* Wallet Balance Button - Hide for admin users */}
                {isLoggedIn && auth?.user?.role !== "admin" && (
                  <div
                    onClick={handleWalletClick}
                    className="h-9 px-3 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <Wallet className="h-4 w-4 text-green-600" />
                    {/* Only show balance and eye icon if user has subscription (or is organization user) */}
                    {(() => {
                      const isRegularUser = auth?.user?.role === 'user' || !auth?.user?.role
                      const shouldShowBalance = !isRegularUser || hasSubscription === true

                      if (!shouldShowBalance) {
                        return null // Only show icon, no balance
                      }

                      return (
                        <>
                          <span className="font-medium text-sm">
                            {showBalance ? `$${userBalance.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}` : "••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowBalance(!showBalance)
                            }}
                            className="p-0 h-auto inline-flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          >
                            {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </>
                      )
                    })()}
                  </div>
                )}

                              {/* Coins Icon Dropdown - Shows Believe Points and Reward Points (hidden for admin) */}
                              {isLoggedIn && auth?.user?.role !== 'admin' && (auth?.user?.believe_points !== undefined || auth?.user?.reward_points !== undefined) && (
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-9 w-9 px-0 relative">
                                              <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent className="w-64" align="end" forceMount>
                                          <div className="p-3 space-y-3">
                                              {/* Reward Points */}
                                              {auth?.user?.reward_points !== undefined && (
                                                  <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
                                                      <div className="flex items-center gap-2">
                                                          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                                                              <Gift className="h-4 w-4 text-white" />
                                                          </div>
                                                          <div>
                                                              <p className="text-xs text-muted-foreground">Reward Points</p>
                                                              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                                                  {(auth.user.reward_points || 0).toLocaleString()}
                                                              </p>
                                                          </div>
                                                      </div>
                                                  </div>
                                              )}

                                              {/* Believe Points */}
                                              {auth?.user?.believe_points !== undefined && (
                                                  <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
                                                      <div className="flex items-center gap-2">
                                                          <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center">
                                                              <Sparkles className="h-4 w-4 text-white" />
                                                          </div>
                                                          <div>
                                                              <p className="text-xs text-muted-foreground">Believe Points</p>
                                                              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                                                                  {(auth.user.believe_points || 0).toLocaleString()}
                                                              </p>
                                                          </div>
                                                      </div>
                                                  </div>
                                              )}
                                          </div>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              )}

                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                          <Avatar className="h-9 w-9">
                                              <AvatarImage
                                                  src={auth?.user?.image ? auth?.user?.image : '/placeholder.svg?height=36&width=36'}
                                                  alt="User"
                                              />
                                              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">JD</AvatarFallback>
                                          </Avatar>
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="w-56" align="end" forceMount>
                                      <div className="flex items-center justify-start gap-2 p-2">
                                          <div className="flex flex-col space-y-1 leading-none">
                                              <p className="font-medium">{auth?.user?.name ?? 'John Doe'}</p>
                                              <p className="text-muted-foreground w-[200px] truncate text-sm">
                                                  {auth?.user?.email ?? 'john@example.com'}
                                              </p>
                                          </div>
                                      </div>
                                      <DropdownMenuSeparator />
                                      {/* {auth?.user?.role === "user" && ( */}
                                      <DropdownMenuItem asChild>
                                          <Link href={route('cart.index')}>
                                              <ShoppingBag className="mr-2 h-4 w-4" />
                                              <span>Cart</span>
                                          </Link>
                                      </DropdownMenuItem>
                                      {/* )} */}
                                      <DropdownMenuItem asChild>
                                          <Link href={auth?.user?.role === 'user' ? route('user.profile.index') : route('profile.edit')}>
                                              <User className="mr-2 h-4 w-4" />
                                              <span>Profile</span>
                                          </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem asChild>
                                          <Link href={
                                              (auth?.user?.role === 'organization' || auth?.user?.role === 'organization_pending')
                                                  ? route('organizations.show', (auth?.user as any)?.organization?.public_view_slug ?? (auth?.user as any)?.slug ?? auth?.user?.id)
                                                  : route('users.show', (auth?.user as any)?.slug ?? auth?.user?.id)
                                          }>
                                              <Globe className="mr-2 h-4 w-4" />
                                              <span>Public View</span>
                                          </Link>
                                      </DropdownMenuItem>
                                      {auth?.user?.role === 'user' && (
                                          <DropdownMenuItem asChild>
                                              <Link href={route('chat.index')}>
                                                  <Text className="mr-2 h-4 w-4" />
                                                  <span>Chat</span>
                                              </Link>
                                          </DropdownMenuItem>
                                      )}
                                      {(auth?.user?.role === 'admin' ||
                                          auth?.user?.role === 'organization' ||
                                          auth?.user?.role === 'organization_pending') && (
                                          <DropdownMenuItem asChild>
                                              <Link href={route('dashboard')}>
                                                  <LayoutGrid className="mr-2 h-4 w-4" />
                                                  <span>Dashboard</span>
                                              </Link>
                                          </DropdownMenuItem>
                                      )}
                                      {auth?.user?.service_seller_profile && (
                                          <>
                                              <DropdownMenuItem asChild>
                                                  <Link href={route('service-hub.seller.profile', auth.user.id)}>
                                                      <User className="mr-2 h-4 w-4" />
                                                      <span>Seller Profile</span>
                                                  </Link>
                                              </DropdownMenuItem>
                                              <DropdownMenuItem asChild>
                                                  <Link href={route('service-hub.seller-dashboard')}>
                                                      <Store className="mr-2 h-4 w-4" />
                                                      <span>Seller Dashboard</span>
                                                  </Link>
                                              </DropdownMenuItem>
                                          </>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem asChild>
                                          <Link method="post" className="w-full" href={route('logout.main')} onClick={handleLogout}>
                                              <LogOut className="mr-2 h-4 w-4" />
                                              <span>Log out</span>
                                          </Link>
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </>
                      ) : (
                          <>
                              <Link href={route('login')}>
                                  <Button variant="ghost" size="sm">
                                      Sign In
                                  </Button>
                              </Link>
                              <Link href={route('register')}>
                                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                      Get Started
                                  </Button>
                              </Link>
                          </>
                      )}
                  </div>

                  {/* Mobile menu button */}
                  <div className="flex items-center space-x-2 xl:hidden">
                      <ThemeToggle />
                      {isLoggedIn ? (
                          <>
                              <NotificationBell userId={auth.user.id} emailVerified={!!auth.user.email_verified_at} />
                          </>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
                          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                      </Button>
                  </div>
              </div>

              {/* Mobile Navigation */}
              <AnimatePresence>
                  {isOpen && (
                      <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t xl:hidden"
                      >
                          <div className="max-h-[calc(100vh-4rem)] space-y-2 overflow-y-auto py-4">
                              {/* Core items */}
                              <div className="px-3 py-2">
                                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Main</p>
                                  {coreNavItems.map((item) => (
                                      <Link
                                          key={item.name}
                                          href={item.href}
                                          className="text-foreground hover:bg-accent block cursor-pointer rounded-md px-3 py-2 text-base font-medium"
                                          onClick={() => setIsOpen(false)}
                                      >
                                          {item.name}
                                      </Link>
                                  ))}
                              </div>

                              {/* Community section */}
                              {communityItems.length > 0 && (
                                  <div className="border-t px-3 py-2">
                                      <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Community</p>
                                      {communityItems.map((item) => (
                                          <Link
                                              key={item.name}
                                              href={item.href}
                                              className="text-foreground hover:bg-accent flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                              onClick={() => setIsOpen(false)}
                                          >
                                              {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                              {item.name}
                                          </Link>
                                      ))}
                                  </div>
                              )}

                              {/* Services section */}
                              <div className="border-t px-3 py-2">
                                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Services</p>
                                  {servicesItems.map((item) => (
                                      <Link
                                          key={item.name}
                                          href={item.href}
                                          className="text-foreground hover:bg-accent flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                          onClick={() => setIsOpen(false)}
                                      >
                                          {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                          {item.name}
                                      </Link>
                                  ))}
                              </div>

                              {/* More section */}
                              <div className="border-t px-3 py-2">
                                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">More</p>
                                  {moreItems.map((item) => (
                                      <Link
                                          key={item.name}
                                          href={item.href}
                                          className="text-foreground hover:bg-accent flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                          onClick={() => setIsOpen(false)}
                                      >
                                          {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                          {item.name}
                                      </Link>
                                  ))}
                              </div>

                              {/* User section */}
                              <div className="space-y-2 border-t pt-4">
                                  {isLoggedIn ? (
                                      <div className="space-y-2">
                                          <div className="flex items-center space-x-3 px-3 py-2">
                                              <Avatar className="h-8 w-8">
                                                  <AvatarImage src={auth?.user?.image || '/placeholder.svg?height=32&width=32'} alt="User" />
                                                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                                                      JD
                                                  </AvatarFallback>
                                              </Avatar>
                                              <div>
                                                  <p className="text-sm font-medium">{auth?.user?.name ?? 'John Doe'}</p>
                                                  <p className="text-muted-foreground text-xs">{auth?.user?.email ?? 'john@example.com'}</p>
                                              </div>
                                          </div>

                                          {/* Points Display for Mobile - Shows Reward Points and Believe Points (hidden for admin) */}
                                          {auth?.user?.role !== 'admin' && (auth?.user?.reward_points !== undefined || auth?.user?.believe_points !== undefined) && (
                                              <div className="px-3 py-2 space-y-2">
                                                  {/* Reward Points */}
                                                  {auth?.user?.reward_points !== undefined && (
                                                      <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
                                                          <div className="flex items-center gap-2">
                                                              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                                                                  <Gift className="h-4 w-4 text-white" />
                                                              </div>
                                                              <div>
                                                                  <p className="text-xs text-muted-foreground">Reward Points</p>
                                                                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                                                      {(auth.user.reward_points || 0).toLocaleString()}
                                                                  </p>
                                                              </div>
                                                          </div>
                                                      </div>
                                                  )}

                                                  {/* Believe Points */}
                                                  {auth?.user?.believe_points !== undefined && (
                                                      <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
                                                          <div className="flex items-center gap-2">
                                                              <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center">
                                                                  <Sparkles className="h-4 w-4 text-white" />
                                                              </div>
                                                              <div>
                                                                  <p className="text-xs text-muted-foreground">Believe Points</p>
                                                                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                                                                      {(auth.user.believe_points || 0).toLocaleString()}
                                                                  </p>
                                                              </div>
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                          )}

                                          {/* Wallet section for mobile - Hide for admin users */}
                                          {isLoggedIn && auth?.user?.role !== 'admin' && (
                                              <Button
                                                  variant="ghost"
                                                  className="w-full justify-start rounded-md bg-gray-50 dark:bg-gray-800"
                                                  onClick={handleWalletClick}
                                              >
                                                  <div className="flex w-full items-center justify-between">
                                                      <div className="flex items-center gap-2">
                                                          <Wallet className="h-4 w-4 text-green-600" />
                                                          <span className="text-sm font-medium">Wallet Balance</span>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                                              {showBalance
                                                                  ? `$${userBalance.toLocaleString('en-US', {
                                                                        minimumFractionDigits: 2,
                                                                        maximumFractionDigits: 2,
                                                                    })}`
                                                                  : '••••••'}
                                                          </span>
                                                          <Button
                                                              variant="ghost"
                                                              size="sm"
                                                              onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  setShowBalance(!showBalance);
                                                              }}
                                                              className="p-1"
                                                          >
                                                              {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                          </Button>
                                                      </div>
                                                  </div>
                                              </Button>
                                          )}


                                          {/* cart mobile button */}
                                          <Link href={route('cart.index')}>
                                              <Button variant="ghost" className="w-full justify-start">
                                                  <ShoppingBag className="mr-2 h-4 w-4" />
                                                  <span>Cart</span>
                                              </Button>
                                          </Link>
                                          <Link href={auth?.user?.role === 'user' ? route('user.profile.index') : route('profile.edit')}>
                                              <Button variant="ghost" className="w-full justify-start">
                                                  <User className="mr-2 h-4 w-4" />
                                                  Profile
                                              </Button>
                                          </Link>
                                          <Link href={
                                              (auth?.user?.role === 'organization' || auth?.user?.role === 'organization_pending')
                                                  ? route('organizations.show', (auth?.user as any)?.organization?.public_view_slug ?? (auth?.user as any)?.slug ?? auth?.user?.id)
                                                  : route('users.show', (auth?.user as any)?.slug ?? auth?.user?.id)
                                          }>
                                              <Button variant="ghost" className="w-full justify-start">
                                                  <Globe className="mr-2 h-4 w-4" />
                                                  Public View
                                              </Button>
                                          </Link>

                                          {auth?.user?.role === 'user' && (
                                              <Link href={route('chat.index')}>
                                                  <Button variant="ghost" className="w-full justify-start">
                                                      <Text className="mr-2 h-4 w-4" />
                                                      Chat
                                                  </Button>
                                              </Link>
                                          )}
                                          {(auth?.user?.role === 'admin' ||
                                              auth?.user?.role === 'organization' ||
                                              auth?.user?.role === 'organization_pending') && (
                                              <Link href={route('dashboard')}>
                                                  <Button variant="ghost" className="w-full justify-start">
                                                      <LayoutGrid className="mr-2 h-4 w-4" />
                                                      Dashboard
                                                  </Button>
                                              </Link>
                                          )}
                                          {auth?.user?.service_seller_profile && auth?.user?.role !== 'admin' && (
                                              <>
                                                  <Link href={route('service-hub.seller.profile', auth.user.id)}>
                                                      <Button variant="ghost" className="w-full justify-start">
                                                          <User className="mr-2 h-4 w-4" />
                                                          Seller Profile
                                                      </Button>
                                                  </Link>
                                                  <Link href={route('service-hub.seller-orders')}>
                                                      <Button variant="ghost" className="w-full justify-start">
                                                          <Store className="mr-2 h-4 w-4" />
                                                          Seller Dashboard
                                                      </Button>
                                                  </Link>
                                              </>
                                          )}
                                          <Link
                                              method="post"
                                              href={route('logout.main')}
                                              onClick={handleLogout}
                                              className="flex w-full cursor-pointer items-center justify-start rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:bg-opacity-50"
                                          >
                                              <LogOut className="mr-3 h-4 w-4 shrink-0" />
                                              Log out
                                          </Link>
                                      </div>
                                  ) : (
                                      <>
                                          <Link href={route('login')} className="block px-3">
                                              <Button variant="ghost" className="w-full">
                                                  Sign In
                                              </Button>
                                          </Link>
                                          <Link href={route('register')} className="block px-3">
                                              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                                  Get Started
                                              </Button>
                                          </Link>
                                      </>
                                  )}
                              </div>
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>

          {/* Wallet Popup */}
          {showWalletPopup && <WalletPopup isOpen={showWalletPopup} onClose={handleWalletPopupClose} />}

          {/* User Wallet Subscription Modal - For supporters without subscription */}
          {showSubscriptionModal && <UserWalletSubscriptionModal isOpen={showSubscriptionModal} onClose={() => setShowSubscriptionModal(false)} />}
      </nav>
  );
}

// Render modals outside nav to avoid z-index issues
export function NavbarModals({
  showWalletPopup,
  showSubscriptionModal,
  onWalletClose,
  onSubscriptionClose
}: {
  showWalletPopup: boolean
  showSubscriptionModal: boolean
  onWalletClose: () => void
  onSubscriptionClose: () => void
}) {
  return (
    <>
      {/* Wallet Popup */}
      {showWalletPopup && (
        <WalletPopup
          isOpen={showWalletPopup}
          onClose={onWalletClose}
        />
      )}

      {/* User Wallet Subscription Modal - For supporters without subscription */}
      {showSubscriptionModal && (
        <UserWalletSubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={onSubscriptionClose}
        />
      )}
    </>
  )
}

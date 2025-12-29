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
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeToggle } from "@/components/frontend/theme-toggle"
import { Link, router, usePage } from "@inertiajs/react"
import { useMobileNavigation } from "@/hooks/use-mobile-navigation"
import { showSuccessToast, showErrorToast } from "@/lib/toast" // Import toast utilities
import { NotificationBell } from "@/components/notification-bell"
import SiteTitle from "@/components/site-title"
import { WalletPopup } from "@/components/WalletPopup"
import { UserWalletSubscriptionModal } from "@/components/UserWalletSubscriptionModal"
import { BelievePointsDisplay } from "@/components/believe-points-display"

// Extending SharedData interface to include wallet_balance
interface SharedData {
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
    { name: "Donate", href: "/donate" },
  ]

  // Community dropdown items
  const communityItems = [
    { name: "News", href: "/nonprofit-news", icon: Newspaper },
    ...(isLoggedIn ? [
      { name: "Social Feed", href: route("social-feed.index"), icon: Users },
      { name: "Chat", href: route("chat.index"), icon: MessageSquare },
    ] : []),
  ]

  // Services dropdown items
  const servicesItems = [
    { name: "Service Hub", href: "/service-hub", icon: Sparkles },
    { name: "Marketplace", href: "/marketplace", icon: Store },
    { name: "Gift Cards", href: route("gift-cards.index"), icon: Gift },
    { name: "Jobs", href: "/jobs", icon: Briefcase },
    { name: "Courses & Events", href: route("course.index"), icon: GraduationCap },
    { name: "Event Calendar", href: "/all-events", icon: Calendar },
  ]

  // More dropdown items
  const moreItems = [
    { name: "Fractional Ownership", href: "/fractional", icon: Building2 },
    { name: "Contact", href: "/contact", icon: Mail },
  ]

  const cleanup = useMobileNavigation()

  const handleLogout = () => {
    cleanup()
    setIsLoggedIn(false)
    router.flushAll()
  }


  // Fetch balance on mount and when dependencies change
  useEffect(() => {
    const fetchBalance = async () => {
      if (!isLoggedIn) {
        setWalletBalance(null)
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

        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json()
          if (balanceData.success) {
            setWalletBalance(balanceData.balance || balanceData.local_balance || 0)
            // Set subscription status (for regular users/supporters)
            if (balanceData.has_subscription !== undefined) {
              setHasSubscription(balanceData.has_subscription)
            }
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

    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000)

    return () => clearInterval(interval)
  }, [isLoggedIn, auth?.user?.balance])

  // Fetch balance function for manual refresh
  const fetchBalance = async () => {
    if (!isLoggedIn) {
      setWalletBalance(null)
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

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        if (balanceData.success) {
          setWalletBalance(balanceData.balance || balanceData.local_balance || 0)
          // Set subscription status (for regular users/supporters)
          if (balanceData.has_subscription !== undefined) {
            setHasSubscription(balanceData.has_subscription)
          }
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
      // For regular users, check subscription status
      // If hasSubscription is null, we're still loading - allow access for now
      // If hasSubscription is false, show subscription modal
      if (hasSubscription === false) {
        // No subscription, show subscription modal
        setShowSubscriptionModal(true)
        return
      }
      // If hasSubscription is true or null, proceed to wallet popup
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
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <SiteTitle />

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center space-x-1">
            {/* Core items - always visible */}
            {coreNavItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button variant="ghost" className="text-sm font-medium hover:bg-accent cursor-pointer">
                  {item.name}
                </Button>
              </Link>
            ))}

            {/* Community Dropdown */}
            {communityItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-sm font-medium hover:bg-accent cursor-pointer">
                    Community
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {communityItems.map((item) => (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link href={item.href} className="flex items-center cursor-pointer">
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
                <Button variant="ghost" className="text-sm font-medium hover:bg-accent cursor-pointer">
                  Services
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {servicesItems.map((item) => (
                  <DropdownMenuItem key={item.name} asChild>
                    <Link href={item.href} className="flex items-center cursor-pointer">
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
                <Button variant="ghost" className="text-sm font-medium hover:bg-accent cursor-pointer">
                  More
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {moreItems.map((item) => (
                  <DropdownMenuItem key={item.name} asChild>
                    <Link href={item.href} className="flex items-center cursor-pointer">
                      {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                      <span>{item.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop Actions */}
          <div className="hidden xl:flex items-center space-x-2">
            <ThemeToggle />
            {isLoggedIn ? (
              <>
                {/* <Button variant="ghost" size="sm" className="h-9 w-9 px-0">
                                  <Bell className="h-4 w-4" />
                              </Button> */}
                <NotificationBell userId={auth.user.id} />

                {/* Wallet Balance Button - Hide for admin users */}
                {isLoggedIn && auth?.user?.role !== "admin" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleWalletClick}
                    className="h-9 px-3 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Wallet className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">
                      {showBalance ? `$${userBalance.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}` : "••••••"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowBalance(!showBalance)
                      }}
                      className="p-0 h-auto"
                    >
                      {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </Button>
                )}

                {/* Believe Points Display - Visible for all authenticated users */}
                {isLoggedIn && auth?.user?.believe_points !== undefined && (
                  <BelievePointsDisplay
                    balance={auth.user.believe_points || 0}
                    variant="compact"
                    showLabel={false}
                  />
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={auth?.user?.image ? auth?.user?.image : "/placeholder.svg?height=36&width=36"}
                          alt="User"
                        />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                          JD
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{auth?.user?.name ?? "John Doe"}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {auth?.user?.email ?? "john@example.com"}
                        </p>
                      </div>
                    </div>
                                      <DropdownMenuSeparator />
                    {/* {auth?.user?.role === "user" && ( */}
                                      <DropdownMenuItem asChild>
                                    <Link href={route("cart.index")}>
                                        <ShoppingBag className="mr-2 h-4 w-4" />
                                        <span>Cart</span>
                                    </Link>
                                    </DropdownMenuItem>
                    {/* )} */}
                    <DropdownMenuItem asChild>
                      <Link href={auth?.user?.role === "user" ? route("user.profile.index") : route("profile.edit")}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    {auth?.user?.role === "user" && (
                      <DropdownMenuItem asChild>
                        <Link href={route("chat.index")}>
                          <Text className="mr-2 h-4 w-4" />
                          <span>Chat</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {(auth?.user?.role === "admin" || auth?.user?.role === "organization" || auth?.user?.role === "organization_pending") && (
                      <DropdownMenuItem asChild>
                        <Link href={route("dashboard")}>
                          <LayoutGrid className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link method="post" className="w-full" href={route("logout")} onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href={route("login")}>
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href={route("register")}>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="xl:hidden flex items-center space-x-2">
            <ThemeToggle />
            {isLoggedIn ? (
              <>
                <NotificationBell userId={auth.user.id} />
              </>) : null}
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
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="xl:hidden border-t"
            >
              <div className="py-4 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
                {/* Core items */}
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Main</p>
                  {coreNavItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="block px-3 py-2 text-base font-medium text-foreground hover:bg-accent rounded-md cursor-pointer"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>

                {/* Community section */}
                {communityItems.length > 0 && (
                  <div className="px-3 py-2 border-t">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Community</p>
                    {communityItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="flex items-center px-3 py-2 text-base font-medium text-foreground hover:bg-accent rounded-md cursor-pointer"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Services section */}
                <div className="px-3 py-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Services</p>
                  {servicesItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center px-3 py-2 text-base font-medium text-foreground hover:bg-accent rounded-md cursor-pointer"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                      {item.name}
                    </Link>
                  ))}
                </div>

                {/* More section */}
                <div className="px-3 py-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">More</p>
                  {moreItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center px-3 py-2 text-base font-medium text-foreground hover:bg-accent rounded-md cursor-pointer"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="pt-4 border-t space-y-2">
                  {isLoggedIn ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 px-3 py-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={auth?.user?.image || "/placeholder.svg?height=32&width=32"} alt="User" />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                            JD
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{auth?.user?.name ?? "John Doe"}</p>
                          <p className="text-xs text-muted-foreground">{auth?.user?.email ?? "john@example.com"}</p>
                        </div>
                      </div>
                      {/* Wallet section for mobile - Hide for admin users */}
                      {isLoggedIn && auth?.user?.role !== "admin" && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start bg-gray-50 dark:bg-gray-800 rounded-md"
                          onClick={handleWalletClick}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-sm">Wallet Balance</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                {showBalance ? `$${userBalance.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}` : "••••••"}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowBalance(!showBalance)
                                }}
                                className="p-1"
                              >
                                {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </Button>
                      )}

                      {/* Reward Points section for mobile */}
                      {auth?.user?.reward_points !== undefined && (
                      <div className="px-3 py-2 space-y-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <span className="font-medium text-sm">Reward Points</span>
                        </div>
                        <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                          {(auth.user.reward_points || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          })}
                        </div>
                      </div>
                      )}

                      {/* Believe Points section for mobile */}
                      {auth?.user?.believe_points !== undefined && (
                        <BelievePointsDisplay
                          balance={auth.user.believe_points || 0}
                          variant="mobile"
                        />
                      )}

                                          {/* cart mobile button */}
                                          <Link href={route("cart.index")}>
                                              <Button variant="ghost" className="w-full justify-start">

                                        <ShoppingBag className="mr-2 h-4 w-4" />
                                        <span>Cart</span>
                                              </Button>
                                    </Link>
                      <Link href={auth?.user?.role === "user" ? route("user.profile.index") : route("profile.edit")}>
                        <Button variant="ghost" className="w-full justify-start">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Button>
                      </Link>

                      {auth?.user?.role === "user" && (
                        <Link href={route("chat.index")}>
                          <Button variant="ghost" className="w-full justify-start">
                            <Text className="mr-2 h-4 w-4" />
                            Chat
                          </Button>
                        </Link>
                      )}
                      {(auth?.user?.role === "admin" || auth?.user?.role === "organization" || auth?.user?.role === "organization_pending") && (
                        <Link href={route("dashboard")}>
                          <Button variant="ghost" className="w-full justify-start">
                            <LayoutGrid className="mr-2 h-4 w-4" />
                            Dashboard
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={handleLogout}
                      >
                        <Link method="post" className="w-full flex justify-start align-items-center cursor-pointer" href={route("logout")} onClick={handleLogout}>
                          <LogOut className="mr-3 mt-0.5 h-3 w-3 d-flex justify-center align-middle align-items-center" />
                          Log out
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Link href={route("login")} className="block px-3">
                        <Button variant="ghost" className="w-full">
                          Sign In
                        </Button>
                      </Link>
                      <Link href={route("register")} className="block px-3">
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
      {showWalletPopup && (
        <WalletPopup
          isOpen={showWalletPopup}
          onClose={handleWalletPopupClose}
        />
      )}

      {/* User Wallet Subscription Modal - For supporters without subscription */}
      {showSubscriptionModal && (
        <UserWalletSubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
        />
      )}
    </nav>
  )
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

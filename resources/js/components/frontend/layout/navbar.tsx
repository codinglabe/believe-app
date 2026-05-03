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
  Home,
  Bell,
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
  ChevronRight,
  Newspaper,
  Calendar,
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
  Radio,
  Handshake,
  Globe,
  Heart,
  TrendingUp,
  Briefcase,
  Monitor,
  Compass,
  Ticket,
  Trophy,
  Activity,
  BarChart3,
  Settings,
  HelpCircle,
  Link2,
  Tag,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeToggle } from "@/components/frontend/theme-toggle"
import { Link, router, usePage } from "@inertiajs/react"
import toast from "react-hot-toast"
import { useMobileNavigation } from "@/hooks/use-mobile-navigation"
import { NotificationBell } from "@/components/notification-bell"
import SiteTitle from "@/components/site-title"
import { WalletPopup } from "@/components/WalletPopup"
import { UserWalletSubscriptionModal } from "@/components/UserWalletSubscriptionModal"
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
      /** Gifted bucket (retail gift cards, etc.); purchased balance is `believe_points`. */
      gifted_believe_points?: number
      role?: string // Ensure role is also present
      email_verified_at?: string | null // Email verification status
      care_alliance?: { slug: string; name: string } | null
      /** false when care_alliance user lacks a valid 9-digit alliance EIN (dashboard messaging). */
      care_alliance_wallet_eligible?: boolean
      /** false when org/CA user lacks a valid 9-digit EIN for wallet in header. */
      wallet_header_visible?: boolean
      service_seller_profile?: {
        id: number
        verification_status?: string
      } | null // Added service_seller_profile
    }
    roles?: string[]
  }
}

type LandingNavItem = {
  name: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children?: LandingNavItem[]
}

function LandingNavDropdown({ label, items }: { label: string; items: LandingNavItem[] }) {
  if (items.length === 0) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="hover:bg-accent h-9 max-w-[10.5rem] shrink-0 cursor-pointer px-2 text-xs font-medium whitespace-nowrap 2xl:max-w-none 2xl:px-2.5 2xl:text-sm"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-0.5 h-3 w-3 shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[min(70vh,28rem)] w-[min(100vw-2rem,18rem)] overflow-y-auto sm:w-56">
        {items.map((item) => {
          if (item.children?.length) {
            return (
              <div key={item.name}>
                <div className="text-muted-foreground flex items-center px-2 py-1.5 text-xs font-semibold uppercase tracking-wide">
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.children.map((child) => (
                  <DropdownMenuItem key={`${item.name}-${child.name}`} asChild>
                    <Link href={child.href ?? "#"} className="flex cursor-pointer items-center pl-6">
                      <child.icon className="mr-2 h-4 w-4 shrink-0" />
                      <span>{child.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            )
          }

          return (
            <DropdownMenuItem key={item.name} asChild>
              <Link href={item.href ?? "#"} className="flex cursor-pointer items-center">
                <item.icon className="mr-2 h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function Navbar() {
  const { auth } = usePage<SharedData>().props
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(!!auth?.user)

  const authRoles = (auth?.roles ?? []) as string[]
  const hasCareAllianceRole = authRoles.some((r) => String(r).toLowerCase() === "care_alliance")
  const u = auth?.user
  const publicViewHref =
    u && hasCareAllianceRole && u.care_alliance?.slug
      ? route("alliances.show", u.care_alliance.slug)
      : u && (u.role === "organization" || u.role === "organization_pending")
        ? route("organizations.show", (u as { organization?: { public_view_slug?: string }; slug?: string }).organization?.public_view_slug ?? u.slug ?? u.id)
        : u
          ? route("users.show", u.slug ?? u.id)
          : "/"

  const showWalletInHeader =
    isLoggedIn &&
    auth?.user?.role !== "admin" &&
    auth?.user?.wallet_header_visible !== false

  // Wallet specific states
  const [showBalance, setShowBalance] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [showWalletPopup, setShowWalletPopup] = useState(false)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  const role = auth?.user?.role
  const isAdmin = role === "admin"
  const isOrgUser = role === "organization" || role === "organization_pending"
  /** Organizations + Care Alliance: show * (org-only) nav entries; admins see them too. */
  const showOrgOnlyNav = isOrgUser || hasCareAllianceRole || isAdmin

  const dashboardHref =
    !isLoggedIn
      ? "/"
      : isAdmin || isOrgUser
        ? route("dashboard")
        : hasCareAllianceRole
          ? route("care-alliance.dashboard")
          : route("user.profile.index")

  const homeNavItems: LandingNavItem[] = [
    { name: "Home", href: "/", icon: Home },
    ...(isLoggedIn
      ? [
          { name: "Dashboard", href: dashboardHref, icon: BarChart3 },
          { name: "Activity Feed", href: route("social-feed.index"), icon: Activity },
          { name: "Notifications", href: route("notifications.index"), icon: Bell },
        ]
      : []),
  ]

  const exploreNavItems: LandingNavItem[] = [
    ...(isLoggedIn ? [{ name: "Explore Causes", href: "/explore-by-cause", icon: Compass }] : []),
    { name: "Organizations", href: route("organizations"), icon: Building2 },
    { name: "Campaigns", href: route("fundme.index"), icon: Heart },
    { name: "Events", href: route("alleventsPage"), icon: Calendar },
    { name: "Volunteers", href: route("volunteer-opportunities.index"), icon: HeartHandshake },
    { name: "Service Hub", href: route("service-hub.index"), icon: Handshake },
    {
      name: "Connection Hub",
      icon: Link2,
      children: [
        { name: "Companion", href: `${route("course.index")}?type=companion`, icon: GraduationCap },
        { name: "Learning", href: `${route("course.index")}?type=learning`, icon: GraduationCap },
        { name: "Events", href: `${route("course.index")}?type=events`, icon: Calendar },
      ],
    },
    ...(isLoggedIn ? [{ name: "Challenge Hub", href: route("challenge-hub.index"), icon: Trophy }] : []),
    ...(isLoggedIn ? [{ name: "Supporters", href: route("find-supporters.index"), icon: UserPlus }] : []),
    ...(isLoggedIn ? [{ name: "Groups", href: route("groups"), icon: Users }] : []),
  ]

  const communityNavItems: LandingNavItem[] = [
    ...(isLoggedIn ? [{ name: "Social Feed", href: route("social-feed.index"), icon: Users }] : []),
    ...(isLoggedIn ? [{ name: "Find Supporters", href: route("find-supporters.index"), icon: UserPlus }] : []),
    { name: "Care Alliances", href: route("find-care-alliances.index"), icon: HeartHandshake },
    ...(isLoggedIn ? [{ name: "Groups", href: route("groups"), icon: Users }] : []),
    ...(isLoggedIn ? [{ name: "Chat", href: route("chat.index"), icon: MessageSquare }] : []),
  ]

  const giveNavItems: LandingNavItem[] = [
    { name: "Donate", href: "/donate", icon: Heart },
    { name: "FundMe", href: route("fundme.index"), icon: Handshake },
    { name: "Invest in a Project", href: route("support-a-project"), icon: TrendingUp },
    ...(showOrgOnlyNav
      ? [
          { name: "Manage Support Projects", href: "/fundme", icon: Handshake },
          { name: "Raffles", href: "/raffles", icon: Ticket },
        ]
      : []),
    { name: "Gift Cards", href: route("gift-cards.index"), icon: Gift },
  ]

  const earnSaveNavItems: LandingNavItem[] = [
    { name: "Marketplace", href: route("marketplace.index"), icon: Store },
    { name: "Merchant Deals", href: route("merchant-hub.index"), icon: ShoppingBag },
    ...(showOrgOnlyNav ? [{ name: "Add Jobs", href: route("job-posts.create"), icon: Briefcase }] : []),
    ...(isLoggedIn && !showOrgOnlyNav
      ? [{ name: "Raffles", href: route("frontend.raffles.index"), icon: Ticket }]
      : []),
    ...(isLoggedIn ? [{ name: "Feedback Campaigns", href: route("feedback-campaigns.index"), icon: MessageSquare }] : []),
    ...(isLoggedIn ? [{ name: "Add Points", href: route("believe-points.index"), icon: Coins }] : []),
    ...(showOrgOnlyNav
      ? [
          { name: "Sell Products", href: route("products.create"), icon: Store },
          { name: "My Earnings", href: "/orders", icon: TrendingUp },
        ]
      : []),
  ]

  const engagementNavItems: LandingNavItem[] = showOrgOnlyNav
    ? [
        { name: "Create Engagement", href: route("newsletter.create"), icon: Mail },
        { name: "Drip Campaigns (AI)", href: route("campaigns.ai-create"), icon: Sparkles },
        { name: "Connection Hub", href: route("admin.courses.index"), icon: Link2 },
        { name: "Audience / Recipients", href: route("newsletter.recipients"), icon: UserPlus },
        { name: "Usage Dashboard", href: "/supporter-activity", icon: BarChart3 },
      ]
    : []

  const mediaNavItems: LandingNavItem[] = [
    { name: "News", href: "/nonprofit-news", icon: Newspaper },
    { name: "Unity Videos", href: "/unity-videos", icon: Video },
    { name: "Unity Live & Meet", href: "/unity-live", icon: Radio },
  ]

  const toolsNavItems: LandingNavItem[] = [
    { name: "Kiosk", href: route("kiosk.index"), icon: Monitor },
    ...(showOrgOnlyNav ? [{ name: "Event Calendar", href: route("events.index"), icon: Calendar }] : []),
  ]

  const moreNavItems: LandingNavItem[] = [
    { name: "About", href: route("about"), icon: Globe },
    { name: "Pricing", href: route("pricing"), icon: Tag },
    ...(isLoggedIn
      ? [{ name: "Settings / Account", href: route("profile.edit"), icon: Settings }]
      : []),
    { name: "Help / Support", href: route("contact"), icon: HelpCircle },
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

    if (auth?.user?.wallet_header_visible === false) {
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
  }, [isLoggedIn, auth?.user?.id, auth?.user?.balance, auth?.user?.wallet_header_visible])

  // Fetch balance function for manual refresh
  const fetchBalance = async () => {
    if (!isLoggedIn) {
      setWalletBalance(null)
      return
    }

    if (auth?.user?.wallet_header_visible === false) {
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
    if (auth?.user?.wallet_header_visible === false) {
      toast.error(
        hasCareAllianceRole
          ? "Add a valid 9-digit EIN under Settings → Alliance Settings (profile) to use the wallet."
          : "Add a valid 9-digit EIN under your organization profile to use the wallet.",
      )
      return
    }

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
          {/* Same width as frontend footer: `container mx-auto px-4` */}
          <div className="container mx-auto flex h-16 min-w-0 items-center gap-2 px-4 sm:gap-3">
                  {/* Logo — compact in header to avoid overlap with nav */}
                  <SiteTitle className="max-[380px]:[&_span]:sr-only max-[380px]:[&_img]:h-8 max-[380px]:[&_img]:w-8" />

                  {/* Desktop Navigation — full inline bar only on wide screens (2xl+) */}
                  <div className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-x-0.5 gap-y-1 2xl:flex 2xl:flex-nowrap">
                      {isLoggedIn ? (
                          <LandingNavDropdown label="Home" items={homeNavItems} />
                      ) : (
                          <Link href="/">
                              <Button variant="ghost" className="hover:bg-accent cursor-pointer text-sm font-medium">
                                  Home
                              </Button>
                          </Link>
                      )}
                      <LandingNavDropdown label="Explore" items={exploreNavItems} />
                      <LandingNavDropdown label="Community" items={communityNavItems} />
                      <LandingNavDropdown label="Give" items={giveNavItems} />
                      <LandingNavDropdown label="Earn & Save" items={earnSaveNavItems} />
                      {engagementNavItems.length > 0 ? (
                          <LandingNavDropdown label="Engagement" items={engagementNavItems} />
                      ) : null}
                      <LandingNavDropdown label="Media" items={mediaNavItems} />
                      <LandingNavDropdown label="Tools" items={toolsNavItems} />
                      <LandingNavDropdown label="More" items={moreNavItems} />
                  </div>

                  {/* Desktop Actions */}
                  <div className="hidden shrink-0 items-center gap-1 2xl:flex 2xl:gap-2">
                      <ThemeToggle />
                      {isLoggedIn ? (
                          <>
                              {/* <Button variant="ghost" size="sm" className="h-9 w-9 px-0">
                                  <Bell className="h-4 w-4" />
                              </Button> */}
                              <NotificationBell userId={auth.user.id} emailVerified={!!auth.user.email_verified_at} />

                {/* Wallet Balance Button — hidden for admin; hidden when wallet_header_visible is false (no valid EIN context) */}
                {showWalletInHeader && (
                  <div
                    onClick={handleWalletClick}
                    className="flex h-9 max-w-[11rem] cursor-pointer items-center gap-1.5 rounded-full bg-gray-100 px-2 transition-colors hover:bg-gray-200 sm:max-w-none sm:gap-2 sm:px-3 dark:bg-gray-800 dark:hover:bg-gray-700"
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
                          <span className="max-w-[5.5rem] truncate text-sm font-medium sm:max-w-none">
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
                                                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
                                                      <div className="flex items-center gap-2 min-w-0">
                                                          <div className="h-8 w-8 shrink-0 rounded-full bg-blue-500 flex items-center justify-center">
                                                              <Gift className="h-4 w-4 text-white" />
                                                          </div>
                                                          <div className="min-w-0">
                                                              <p className="text-xs text-muted-foreground">Reward Points</p>
                                                              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                                                  {(auth.user.reward_points || 0).toLocaleString()}
                                                              </p>
                                                          </div>
                                                      </div>
                                                      <span className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                                          Earned
                                                      </span>
                                                  </div>
                                              )}

                                              {/* Believe Points — tap to buy / manage */}
                                              {auth?.user?.believe_points !== undefined && (
                                                  <Link
                                                      href={route("believe-points.index")}
                                                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-sm transition-all"
                                                  >
                                                      <div className="flex items-center gap-2 min-w-0">
                                                          <div className="h-8 w-8 shrink-0 rounded-full bg-purple-500 flex items-center justify-center">
                                                              <Sparkles className="h-4 w-4 text-white" />
                                                          </div>
                                                          <div className="min-w-0">
                                                              <p className="text-xs text-muted-foreground">Believe Points</p>
                                                              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                                                                  {(auth.user.believe_points || 0).toLocaleString(undefined, {
                                                                      minimumFractionDigits: 2,
                                                                      maximumFractionDigits: 2,
                                                                  })}
                                                              </p>
                                                              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                                                  <Gift className="h-3 w-3 shrink-0" aria-hidden />
                                                                  {(Number(auth.user.gifted_believe_points) || 0).toLocaleString(undefined, {
                                                                      minimumFractionDigits: 2,
                                                                      maximumFractionDigits: 2,
                                                                  })}{" "}
                                                                  Gifted
                                                              </p>
                                                          </div>
                                                      </div>
                                                      <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                                                          Buy
                                                          <ChevronRight className="h-4 w-4" />
                                                      </span>
                                                  </Link>
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
                                          <Link
                                              href={publicViewHref}
                                              aria-label={
                                                hasCareAllianceRole && u?.care_alliance?.slug
                                                  ? `Public Care Alliance page: ${u.care_alliance.name}`
                                                  : undefined
                                              }
                                          >
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
                                      {hasCareAllianceRole && (
                                          <DropdownMenuItem asChild>
                                              <Link href={route('care-alliance.dashboard')}>
                                                  <HeartHandshake className="mr-2 h-4 w-4" />
                                                  <span>Care Alliance</span>
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

                  {/* Tablet & mobile: utilities + sheet menu (below 2xl full nav) */}
                  <div className="ml-auto flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1 2xl:hidden">
                      <ThemeToggle />
                      {isLoggedIn ? (
                          <>
                              <NotificationBell userId={auth.user.id} emailVerified={!!auth.user.email_verified_at} />
                              {showWalletInHeader && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 shrink-0 text-green-600"
                                  aria-label="Wallet"
                                  onClick={handleWalletClick}
                                >
                                  <Wallet className="h-5 w-5" />
                                </Button>
                              )}
                              {auth?.user?.role !== "admin" &&
                                (auth?.user?.believe_points !== undefined || auth?.user?.reward_points !== undefined) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Points">
                                        <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-64" align="end" forceMount>
                                      <div className="space-y-3 p-3">
                                        {auth?.user?.reward_points !== undefined && (
                                          <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-2 dark:border-blue-800 dark:from-blue-950/20 dark:to-indigo-950/20">
                                            <div className="flex min-w-0 items-center gap-2">
                                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
                                                <Gift className="h-4 w-4 text-white" />
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-muted-foreground text-xs">Reward Points</p>
                                                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                                  {(auth.user.reward_points || 0).toLocaleString()}
                                                </p>
                                              </div>
                                            </div>
                                            <span className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400">Earned</span>
                                          </div>
                                        )}
                                        {auth?.user?.believe_points !== undefined && (
                                          <Link
                                            href={route("believe-points.index")}
                                            className="flex items-center justify-between gap-2 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-2 transition-all hover:border-purple-400 hover:shadow-sm dark:border-purple-800 dark:from-purple-950/20 dark:to-pink-950/20 dark:hover:border-purple-600"
                                          >
                                            <div className="flex min-w-0 items-center gap-2">
                                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500">
                                                <Sparkles className="h-4 w-4 text-white" />
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-muted-foreground text-xs">Believe Points</p>
                                                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                                                  {(auth.user.believe_points || 0).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  })}
                                                </p>
                                              </div>
                                            </div>
                                            <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                                              Buy
                                              <ChevronRight className="h-4 w-4" />
                                            </span>
                                          </Link>
                                        )}
                                      </div>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                          </>
                      ) : (
                          /* Guest CTAs in the bar from tablet up; hidden on mobile so the header stays compact and actions live in the menu sheet */
                          <div className="hidden min-w-0 shrink-0 items-center gap-1 md:flex md:gap-2">
                              <Link href={route('login')} className="min-w-0">
                                  <Button variant="ghost" size="sm" className="h-9 shrink-0 px-2 sm:px-3">
                                      Sign In
                                  </Button>
                              </Link>
                              <Link href={route('register')} className="min-w-0">
                                  <Button
                                      size="sm"
                                      className="h-9 shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 px-2.5 hover:from-blue-700 hover:to-purple-700 sm:px-3"
                                  >
                                      Get Started
                                  </Button>
                              </Link>
                          </div>
                      )}
                      <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 shrink-0 gap-1.5 px-2 sm:px-3"
                          onClick={() => setIsOpen(!isOpen)}
                          aria-expanded={isOpen}
                          aria-controls="site-nav-mobile-panel"
                          aria-label={isOpen ? "Close site menu" : "Open site menu"}
                      >
                          <span className="hidden text-xs font-medium sm:inline">Menu</span>
                          {isOpen ? <X className="h-5 w-5 shrink-0" /> : <Menu className="h-5 w-5 shrink-0" />}
                      </Button>
                  </div>
          </div>

              {/* Mobile / tablet Navigation sheet */}
              <AnimatePresence>
                  {isOpen && (
                      <motion.div
                          id="site-nav-mobile-panel"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t 2xl:hidden"
                      >
                          <div className="container mx-auto max-h-[calc(100vh-4rem)] space-y-2 overflow-y-auto px-4 py-4">
                              <div className="px-3 py-2">
                                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Home</p>
                                  {isLoggedIn ? (
                                      homeNavItems.map((item) => (
                                          <Link
                                              key={item.name}
                                              href={item.href}
                                              className="text-foreground hover:bg-accent flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                              onClick={() => setIsOpen(false)}
                                          >
                                              <item.icon className="mr-2 h-4 w-4 shrink-0" />
                                              {item.name}
                                          </Link>
                                      ))
                                  ) : (
                                      <Link
                                          href="/"
                                          className="text-foreground hover:bg-accent flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                          onClick={() => setIsOpen(false)}
                                      >
                                          <Home className="mr-2 h-4 w-4 shrink-0" />
                                          Home
                                      </Link>
                                  )}
                              </div>

                              <div className="border-t px-3 py-2">
                                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Explore</p>
                                  {exploreNavItems.map((item) => {
                                      if (item.children?.length) {
                                          return (
                                              <div key={item.name}>
                                                  <div className="text-muted-foreground flex items-center rounded-md px-3 py-2 text-sm font-semibold uppercase tracking-wide">
                                                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                                                      {item.name}
                                                  </div>
                                                  {item.children.map((child) => (
                                                      <Link
                                                          key={`${item.name}-${child.name}`}
                                                          href={child.href ?? "#"}
                                                          className="text-foreground hover:bg-accent ml-4 flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                                          onClick={() => setIsOpen(false)}
                                                      >
                                                          <child.icon className="mr-2 h-4 w-4 shrink-0" />
                                                          {child.name}
                                                      </Link>
                                                  ))}
                                              </div>
                                          )
                                      }

                                      return (
                                          <Link
                                              key={item.name}
                                              href={item.href ?? "#"}
                                              className="text-foreground hover:bg-accent flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                              onClick={() => setIsOpen(false)}
                                          >
                                              <item.icon className="mr-2 h-4 w-4 shrink-0" />
                                              {item.name}
                                          </Link>
                                      )
                                  })}
                              </div>

                              <div className="border-t px-3 py-2">
                                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Community</p>
                                  {communityNavItems.map((item) => (
                                      <Link
                                          key={`${item.name}-${item.href}`}
                                          href={item.href}
                                          className="text-foreground hover:bg-accent flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                          onClick={() => setIsOpen(false)}
                                      >
                                          <item.icon className="mr-2 h-4 w-4 shrink-0" />
                                          {item.name}
                                      </Link>
                                  ))}
                              </div>

                              <div className="border-t px-3 py-2">
                                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Give</p>
                                  {giveNavItems.map((item) => (
                                      <Link
                                          key={item.name}
                                          href={item.href}
                                          className="text-foreground hover:bg-accent flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                          onClick={() => setIsOpen(false)}
                                      >
                                          <item.icon className="mr-2 h-4 w-4 shrink-0" />
                                          {item.name}
                                      </Link>
                                  ))}
                              </div>

                              <div className="border-t px-3 py-2">
                                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Earn &amp; Save</p>
                                  {earnSaveNavItems.map((item) => (
                                      <Link
                                          key={item.name}
                                          href={item.href}
                                          className="text-foreground hover:bg-accent flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                          onClick={() => setIsOpen(false)}
                                      >
                                          <item.icon className="mr-2 h-4 w-4 shrink-0" />
                                          {item.name}
                                      </Link>
                                  ))}
                              </div>

                              {engagementNavItems.length > 0 ? (
                                  <div className="border-t px-3 py-2">
                                      <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Engagement</p>
                                      {engagementNavItems.map((item) => (
                                          <Link
                                              key={item.name}
                                              href={item.href}
                                              className="text-foreground hover:bg-accent flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                              onClick={() => setIsOpen(false)}
                                          >
                                              <item.icon className="mr-2 h-4 w-4 shrink-0" />
                                              {item.name}
                                          </Link>
                                      ))}
                                  </div>
                              ) : null}

                              <div className="border-t px-3 py-2">
                                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Media</p>
                                  {mediaNavItems.map((item) => (
                                      <Link
                                          key={item.name}
                                          href={item.href}
                                          className="text-foreground hover:bg-accent flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                          onClick={() => setIsOpen(false)}
                                      >
                                          <item.icon className="mr-2 h-4 w-4 shrink-0" />
                                          {item.name}
                                      </Link>
                                  ))}
                              </div>

                              <div className="border-t px-3 py-2">
                                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Tools</p>
                                  {toolsNavItems.map((item) => (
                                      <Link
                                          key={item.name}
                                          href={item.href}
                                          className="text-foreground hover:bg-accent flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                          onClick={() => setIsOpen(false)}
                                      >
                                          <item.icon className="mr-2 h-4 w-4 shrink-0" />
                                          {item.name}
                                      </Link>
                                  ))}
                              </div>

                              <div className="border-t px-3 py-2">
                                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">More</p>
                                  {moreNavItems.map((item) => (
                                      <Link
                                          key={item.name}
                                          href={item.href}
                                          className="text-foreground hover:bg-accent flex cursor-pointer items-center rounded-md px-3 py-2 text-base font-medium"
                                          onClick={() => setIsOpen(false)}
                                      >
                                          <item.icon className="mr-2 h-4 w-4 shrink-0" />
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
                                                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
                                                          <div className="flex items-center gap-2 min-w-0">
                                                              <div className="h-8 w-8 shrink-0 rounded-full bg-blue-500 flex items-center justify-center">
                                                                  <Gift className="h-4 w-4 text-white" />
                                                              </div>
                                                              <div className="min-w-0">
                                                                  <p className="text-xs text-muted-foreground">Reward Points</p>
                                                                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                                                      {(auth.user.reward_points || 0).toLocaleString()}
                                                                  </p>
                                                              </div>
                                                          </div>
                                                          <span className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                                              Earned
                                                          </span>
                                                      </div>
                                                  )}

                                                  {/* Believe Points — tap to buy / manage */}
                                                  {auth?.user?.believe_points !== undefined && (
                                                      <Link
                                                          href={route("believe-points.index")}
                                                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600"
                                                      >
                                                          <div className="flex items-center gap-2 min-w-0">
                                                              <div className="h-8 w-8 shrink-0 rounded-full bg-purple-500 flex items-center justify-center">
                                                                  <Sparkles className="h-4 w-4 text-white" />
                                                              </div>
                                                              <div className="min-w-0">
                                                                  <p className="text-xs text-muted-foreground">Believe Points</p>
                                                                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                                                                      {(auth.user.believe_points || 0).toLocaleString(undefined, {
                                                                          minimumFractionDigits: 2,
                                                                          maximumFractionDigits: 2,
                                                                      })}
                                                                  </p>
                                                                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                                                      <Gift className="h-3 w-3 shrink-0" aria-hidden />
                                                                      {(Number(auth.user.gifted_believe_points) || 0).toLocaleString(undefined, {
                                                                          minimumFractionDigits: 2,
                                                                          maximumFractionDigits: 2,
                                                                      })}{" "}
                                                                      Gifted
                                                                  </p>
                                                              </div>
                                                          </div>
                                                          <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                                                              Buy
                                                              <ChevronRight className="h-4 w-4" />
                                                          </span>
                                                      </Link>
                                                  )}
                                              </div>
                                          )}

                                          {/* Wallet section for mobile — same rules as desktop wallet */}
                                          {showWalletInHeader && (
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
                                          <Link href={publicViewHref}>
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
                                          {hasCareAllianceRole && (
                                              <Link href={route('care-alliance.dashboard')}>
                                                  <Button variant="ghost" className="w-full justify-start">
                                                      <HeartHandshake className="mr-2 h-4 w-4" />
                                                      Care Alliance
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

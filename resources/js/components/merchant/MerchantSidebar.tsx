import React, { useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  Menu,
  X,
  ShoppingBag,
  TrendingUp,
  Package,
  Receipt,
  ClipboardCheck,
  MessageSquare,
  Wallet,
  ChevronDown,
  ListChecks,
  Inbox,
  Coins,
  Megaphone,
  Rocket,
} from 'lucide-react'
import { MerchantButton } from '@/components/merchant-ui'
import { motion, AnimatePresence } from 'framer-motion'

interface MerchantSidebarProps {
  className?: string
}

interface SubNavItem {
  name: string
  href: string
}

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  badge?: number
  badgeFromAuth?: string
  children?: SubNavItem[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Products',
    href: '/marketplace-products',
    icon: Package,
    children: [
      { name: 'My Products', href: '/marketplace-products' },
      { name: 'Add Product', href: '/marketplace-products/create' },
    ],
  },
  {
    name: 'Offers',
    href: '/offers',
    icon: Receipt,
    children: [
      { name: 'All Offers', href: '/offers' },
      { name: 'Create Offer', href: '/offers/create' },
    ],
  },
  { name: 'BRP Funding', href: '/brp-funding', icon: Coins },
  { name: 'BRP Campaigns', href: '/brp-campaigns', icon: Megaphone },
  { name: 'Orders', href: '/marketplace-orders', icon: Receipt },
  { name: 'Redemptions', href: '/redemptions', icon: ShoppingBag },
  {
    name: 'Approvals',
    href: '/marketplace-pool-approvals',
    icon: ClipboardCheck,
    badgeFromAuth: 'pending_pool_approval_count',
  },
  {
    name: 'Feedback & Rewards',
    href: '/feedback-rewards',
    icon: MessageSquare,
    children: [
      { name: 'Campaigns', href: '/feedback-rewards' },
      { name: 'Responses', href: '/feedback-rewards?status=active' },
      { name: 'Rewards Wallet', href: '/wallet/brp' },
    ],
  },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function MerchantSidebar({ className = '' }: MerchantSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { url } = usePage()
  const currentPath = url

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed left-4 top-4 z-50 lg:hidden">
        <MerchantButton
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="h-10 w-10 border border-white/10 bg-[#161B30]/95 shadow-lg shadow-black/30 backdrop-blur"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </MerchantButton>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-[#0a0c1b]/70 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-64 z-50 lg:hidden"
            >
              <SidebarContent currentPath={currentPath} onNavigate={() => setIsMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex fixed top-0 left-0 h-full w-64 z-40 ${className}`}>
        <SidebarContent currentPath={currentPath} />
      </aside>
    </>
  )
}

function SidebarContent({
  currentPath,
  onNavigate,
}: {
  currentPath: string
  onNavigate?: () => void
}) {
  const { auth } = usePage().props as { auth?: { user?: Record<string, unknown> } }
  const hasActiveSubscription = (auth?.user?.has_active_subscription as boolean | undefined) ?? false

  // Track expanded groups
  const isProductsSection = currentPath.startsWith('/marketplace-products')
  const isOffersSection = currentPath.startsWith('/offers')
  const isFeedbackSection = currentPath.startsWith('/feedback-rewards') || currentPath.startsWith('/wallet/brp')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Products: isProductsSection,
    Offers: isOffersSection,
    'Feedback & Rewards': isFeedbackSection,
  })

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  const isActive = (href: string) => {
    if (currentPath === href) return true
    if (currentPath.startsWith(href + '/')) {
      const allHrefs = navigation.flatMap((item) =>
        item.children ? item.children.map((c) => c.href) : [item.href]
      )
      const hasMoreSpecificMatch = allHrefs.some(
        (navHref) => navHref !== href && currentPath.startsWith(navHref) && navHref.length > href.length
      )
      return !hasMoreSpecificMatch
    }
    return false
  }

  const isGroupActive = (item: NavItem) => {
    if (isActive(item.href)) return true
    if (item.children) return item.children.some((c) => isActive(c.href) || currentPath.startsWith(c.href.split('?')[0]))
    return false
  }

  return (
    <div className="flex h-full w-full flex-col border-r border-white/[0.06] bg-[#0a0c1b]/95 shadow-xl backdrop-blur-md">
      {/* Logo Section */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <img src="/merchant/merchant.png" alt="" className="h-10 w-10 shrink-0 object-contain" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold tracking-tight text-white">BRP Merchant Hub</span>
          <span className="text-xs text-slate-500">Dashboard</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5 sm:px-4">
        {navigation.map((item) => {
          const active = isGroupActive(item)
          const authBadge =
            item.badgeFromAuth && auth?.user
              ? Number((auth.user as Record<string, unknown>)[item.badgeFromAuth] ?? 0)
              : 0
          const showBadge = item.badge != null ? item.badge : item.badgeFromAuth ? authBadge : null
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = expandedGroups[item.name] || false

          if (hasChildren) {
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleGroup(item.name)}
                  type="button"
                  className={`
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 sm:px-4 sm:py-3
                    ${
                      active
                        ? 'border border-purple-500/25 bg-gradient-to-r from-[#8E2DE2]/35 to-[#4A00E0]/20 font-semibold text-white shadow-md shadow-purple-900/20'
                        : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                    }
                  `}
                >
                  <item.icon className={`h-5 w-5 shrink-0 ${active ? 'text-purple-200' : 'text-slate-400'}`} />
                  <span className="font-medium flex-1 text-left">{item.name}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3 sm:ml-5 sm:pl-4">
                        {item.children!.map((child) => {
                          const childActive = currentPath === child.href ||
                            currentPath.startsWith(child.href.split('?')[0] + '/')  ||
                            currentPath === child.href.split('?')[0]
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              onClick={onNavigate}
                              className={`
                                block px-3 py-2 rounded-md text-sm transition-all duration-200
                                ${
                                  childActive
                                    ? 'bg-purple-500/15 font-semibold text-purple-200'
                                    : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200'
                                }
                              `}
                            >
                              {child.name}
                            </Link>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={`
                flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 sm:px-4 sm:py-3
                ${
                  active
                    ? 'border border-purple-500/25 bg-gradient-to-r from-[#8E2DE2]/35 to-[#4A00E0]/20 font-semibold text-white shadow-md shadow-purple-900/20'
                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                }
              `}
            >
              <item.icon className={`h-5 w-5 shrink-0 ${active ? 'text-purple-200' : 'text-slate-400'}`} />
              <span className="font-medium">{item.name}</span>
              {showBadge != null && showBadge > 0 && (
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-amber-500 text-white rounded-full min-w-[1.25rem] text-center">
                  {showBadge > 99 ? '99+' : showBadge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {hasActiveSubscription ? (
        <div className="border-t border-white/[0.06] px-3 py-4 sm:px-4">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#8E2DE2] via-[#6b21a8] to-[#4A00E0] p-4 shadow-lg shadow-purple-950/40">
            <div className="pointer-events-none absolute -right-2 -top-2 h-16 w-16 rounded-full bg-white/15 blur-2xl" />
            <div className="relative flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <Rocket className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">Boost your rewards!</p>
                <p className="mt-1 text-xs leading-snug text-white/85">Create a standout offer for your supporters.</p>
                <Link href="/offers/create" onClick={onNavigate} className="mt-3 block">
                  <MerchantButton
                    size="sm"
                    className="h-9 w-full border-0 bg-white text-xs font-semibold text-[#4A00E0] hover:bg-white/95"
                  >
                    Create Offer
                  </MerchantButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-white/[0.06] px-3 py-4 sm:px-4">
          <div className="rounded-xl border border-white/[0.08] bg-[#161B30]/90 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-gradient-to-br from-[#8E2DE2] to-[#4A00E0] p-2">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">You&apos;re on the Free Plan</p>
                <p className="mt-1 text-xs leading-snug text-slate-400">All features are included on the free plan. Upgrade to Pro for Advanced Analytics and Priority Support.</p>
                <Link href="/subscription" onClick={onNavigate} className="mt-3 block">
                  <MerchantButton size="sm" className="h-9 w-full text-xs">
                    Upgrade to Pro
                  </MerchantButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

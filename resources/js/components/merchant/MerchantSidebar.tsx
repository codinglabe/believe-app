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
  PieChart,
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
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <MerchantButton
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="h-10 w-10 border border-white/15 bg-black/30 shadow-sm"
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
              className="fixed inset-0 bg-[#0A2540]/40 z-40 lg:hidden"
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
    <div className="flex flex-col w-full h-full bg-black/35 backdrop-blur border-r border-[#2563EB]/20 shadow-sm">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2563EB]/20">
        <img src="/merchant/merchant.png" alt="BIU Merchant" className="w-10 h-10 object-contain" />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">BIU Merchant</span>
          <span className="text-xs text-white/60">Dashboard</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
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
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${
                      active
                        ? 'bg-[#2563EB]/15 text-white font-semibold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#2563EB]' : ''}`} />
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
                      <div className="ml-5 pl-4 border-l border-white/10 mt-1 space-y-1">
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
                                    ? 'text-[#2563EB] font-semibold bg-[#2563EB]/10'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
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
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${
                  active
                    ? 'bg-[#2563EB]/15 text-white border-l-2 border-[#2563EB] font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${active ? 'text-[#2563EB]' : ''}`} />
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

      {!hasActiveSubscription && (
        <div className="px-4 py-4 border-t border-[#2563EB]/20">
          <div className="px-3 py-3 rounded-lg bg-white/5 border border-[#2563EB]/20">
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-[#2563EB] rounded">
                <TrendingUp className="w-3 h-3 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white mb-1">Upgrade Plan</p>
                <p className="text-xs text-white/70 leading-tight mb-2">Unlock advanced features</p>
                <Link href="/subscription">
                  <MerchantButton size="sm" className="w-full text-xs py-1.5 h-auto">
                    Upgrade Now
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

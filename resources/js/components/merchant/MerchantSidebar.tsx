import React, { useState } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { 
  LayoutDashboard, 
  Gift, 
  BarChart3, 
  Settings, 
  Menu, 
  X,
  Plus,
  FileText,
  ShoppingBag,
  TrendingUp
} from 'lucide-react'
import { MerchantButton } from '@/components/merchant-ui'
import { motion, AnimatePresence } from 'framer-motion'

interface MerchantSidebarProps {
  className?: string
}

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  badge?: number
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Offers', href: '/offers', icon: Gift },
  { name: 'Create Offer', href: '/offers/create', icon: Plus },
  { name: 'Redemptions', href: '/redemptions', icon: ShoppingBag },
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
          className="h-10 w-10"
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
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-64 z-50 lg:hidden"
            >
              <SidebarContent 
                currentPath={currentPath} 
                onNavigate={() => setIsMobileOpen(false)}
              />
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
  onNavigate 
}: { 
  currentPath: string
  onNavigate?: () => void
}) {

  const isActive = (href: string) => {
    // Exact match
    if (currentPath === href) {
      return true
    }
    
    // For parent routes, only match if it's a direct child (not another nav item)
    // Check if current path starts with href + '/' but exclude other nav item paths
    if (currentPath.startsWith(href + '/')) {
      // Get all navigation hrefs
      const navHrefs = navigation.map(item => item.href)
      // Check if there's a more specific nav item that matches
      const hasMoreSpecificMatch = navHrefs.some(navHref => 
        navHref !== href && 
        currentPath.startsWith(navHref) &&
        navHref.length > href.length
      )
      // Only activate if there's no more specific match
      return !hasMoreSpecificMatch
    }
    
    return false
  }

  return (
    <div className="flex flex-col w-full h-full bg-black/95 backdrop-blur border-r border-[#FF1493]/20">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#FF1493]/20">
        <img 
          src="/merchant/merchant.png" 
          alt={`${import.meta.env.VITE_APP_NAME || 'Believe'} Merchant`} 
          className="w-10 h-10 object-contain"
        />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">
            {import.meta.env.VITE_APP_NAME || 'Believe'} Merchant
          </span>
          <span className="text-xs text-gray-400">Dashboard</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${active 
                  ? 'bg-gradient-to-r from-[#FF1493]/30 via-[#DC143C]/30 to-[#E97451]/30 text-white border-l-2 border-[#FF1493]' 
                  : 'text-gray-300 hover:bg-[#FF1493]/10 hover:text-white'
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${active ? 'text-[#FF1493]' : ''}`} />
              <span className="font-medium">{item.name}</span>
              {item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-[#FF1493] text-white rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Upgrade Card */}
      <div className="px-4 py-4 border-t border-[#FF1493]/20">
        <div className="px-3 py-3 rounded-lg bg-gradient-to-br from-[#FF1493]/20 via-[#DC143C]/20 to-[#E97451]/20 border border-[#FF1493]/30">
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] rounded">
              <TrendingUp className="w-3 h-3 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white mb-1">Upgrade Plan</p>
              <p className="text-xs text-gray-300 leading-tight mb-2">
                Unlock advanced features
              </p>
              <Link href="/settings">
                <MerchantButton size="sm" className="w-full text-xs py-1.5 h-auto">
                  Upgrade Now
                </MerchantButton>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


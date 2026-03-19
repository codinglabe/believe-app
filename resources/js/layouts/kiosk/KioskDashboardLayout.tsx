"use client"

import { Link } from "@inertiajs/react"
import { type ReactNode, useState } from "react"
import { Monitor, LayoutGrid, LayoutDashboard, HelpCircle, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CategoryItem {
  slug: string
  title: string
}

interface KioskDashboardLayoutProps {
  children: ReactNode
  allCategories: CategoryItem[]
  currentSlug: string
}

export default function KioskDashboardLayout({
  children,
  allCategories,
  currentSlug,
}: KioskDashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const sidebarContent = (closeOnNavigate: boolean) => (
    <>
      {/* Logo / Brand — same height as fixed header (h-14) */}
      <div className="flex items-center gap-2 h-14 px-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <Link
          href={route("kiosk.index")}
          className="flex items-center gap-2 font-semibold text-foreground hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-slate-700 flex items-center justify-center shrink-0">
            <Monitor className="h-5 w-5 text-white" />
          </div>
          <span className="truncate">Kiosk</span>
        </Link>
      </div>

      {/* Dashboard + All services */}
      <div className="p-2 space-y-0.5">
        <Link
          href={allCategories.length > 0 ? route("kiosk.dashboard.show", allCategories[0].slug) : route("kiosk.index")}
          onClick={() => closeOnNavigate && setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-foreground transition-colors"
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span>Dashboard</span>
        </Link>
        <Link
          href={route("kiosk.index")}
          onClick={() => closeOnNavigate && setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-foreground transition-colors"
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />
          <span>All services</span>
        </Link>
      </div>

      {/* Category nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Services
        </p>
        <ul className="space-y-0.5">
          {allCategories.map((c) => {
            const isActive = c.slug === currentSlug
            return (
              <li key={c.slug}>
                <Link
                  href={route("kiosk.dashboard.show", c.slug)}
                  onClick={() => closeOnNavigate && setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gradient-to-br from-indigo-600 to-slate-700 text-white"
                      : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-foreground"
                  )}
                >
                  <span className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    isActive ? "bg-white" : "bg-slate-300 dark:bg-slate-600"
                  )} />
                  <span className="truncate">{c.title}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-700">
        <Link
          href="/contact"
          onClick={() => closeOnNavigate && setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span>Get help</span>
        </Link>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Fixed desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
        {sidebarContent(false)}
      </aside>

      {/* Mobile sidebar: overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-64 z-50 transform transition-transform duration-300 lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent(true)}
      </aside>

      {/* Fixed header: right of sidebar on desktop, full width on mobile */}
      <header className="fixed top-0 left-0 right-0 lg:left-64 z-30 h-14 flex items-center px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Main content: offset by fixed sidebar + fixed header */}
      <main className="flex flex-col min-h-screen pt-14 lg:pl-64">
        {children}
      </main>
    </div>
  )
}

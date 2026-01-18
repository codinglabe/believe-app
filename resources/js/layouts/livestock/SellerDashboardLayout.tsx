"use client"

import React, { useState, useEffect } from "react"
import { Link, usePage, useForm } from "@inertiajs/react"
import LivestockLogo from "@/components/livestock/LivestockLogo"
import { Button } from "@/components/ui/button"
import { 
    LayoutDashboard,
    Heart,
    DollarSign,
    User,
    LogOut,
    Menu,
    X,
    Home,
    ShoppingBag,
    Activity,
    ChevronRight
} from "lucide-react"
import toast, { Toaster } from "react-hot-toast"
import { route } from "ziggy-js"
import { cn } from "@/lib/utils"

interface SellerDashboardLayoutProps {
    children: React.ReactNode
}

interface NavItem {
    name: string
    href: string
    icon: React.ElementType
    badge?: number
}

export default function SellerDashboardLayout({ children }: SellerDashboardLayoutProps) {
    const page = usePage()
    const { auth } = page.props as any
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        if (page.props?.success) {
            toast.success(page.props?.success as string)
        }
        if (page.props?.error) {
            toast.error(page.props?.error as string)
        }
    }, [page.props?.success, page.props?.error])

    const navItems: NavItem[] = [
        { name: "Dashboard", href: route('seller.dashboard'), icon: LayoutDashboard },
        { name: "My Animals", href: route('animals.index'), icon: Heart },
        { name: "Marketplace", href: route('marketplace.index'), icon: ShoppingBag },
        { name: "Breeding", href: route('breeding.index'), icon: Activity },
        { name: "Payouts", href: route('payouts.index'), icon: DollarSign },
        { name: "Profile", href: route('seller.edit'), icon: User },
    ]

    const currentPath = page.url

    const isActive = (href: string) => {
        if (href === route('seller.dashboard')) {
            return currentPath === '/seller/dashboard'
        }
        return currentPath.startsWith(href)
    }

    const { post } = useForm()

    const handleLogout = (e: React.FormEvent) => {
        e.preventDefault()
        post(route('logout.livestock'))
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <Toaster
                position="top-right"
                reverseOrder={false}
                gutter={8}
                toastOptions={{
                    duration: 4000,
                    success: {
                        duration: 4000,
                        iconTheme: {
                            primary: "#f59e0b",
                            secondary: "#fff",
                        },
                    },
                    error: {
                        duration: 4000,
                        iconTheme: {
                            primary: "#ef4444",
                            secondary: "#fff",
                        },
                    },
                }}
            />

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 h-screen w-64 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out",
                    "lg:translate-x-0",
                    mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-6 border-b border-amber-200/50 dark:border-amber-900/30 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl">
                        <Link href={route('seller.dashboard')} className="flex-shrink-0">
                            <LivestockLogo size="sm" />
                        </Link>
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const active = isActive(item.href)
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                        active
                                            ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{item.name}</span>
                                    {item.badge && (
                                        <span className="ml-auto bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                    {active && (
                                        <ChevronRight className="h-4 w-4 ml-auto" />
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* User Section */}
                    <div className="border-t border-amber-200/50 dark:border-amber-900/30 p-4">
                        <div className="flex items-center gap-3 mb-3 px-2">
                            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {auth?.user?.name || "User"}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {auth?.user?.email || ""}
                                </p>
                            </div>
                        </div>
                        <form onSubmit={handleLogout}>
                            <Button
                                type="submit"
                                variant="ghost"
                                className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="lg:pl-64">
                {/* Fixed Header */}
                <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            <Menu className="h-6 w-6" />
                        </button>

                        {/* Right Side Actions */}
                        <div className="flex items-center gap-4 ml-auto">
                            <Link href={route('home')}>
                                <Button variant="ghost" size="sm" className="hidden sm:flex">
                                    <Home className="h-4 w-4 mr-2" />
                                    Home
                                </Button>
                            </Link>
                            <Link href={route('marketplace.index')}>
                                <Button variant="ghost" size="sm" className="hidden sm:flex">
                                    <ShoppingBag className="h-4 w-4 mr-2" />
                                    Browse
                                </Button>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}


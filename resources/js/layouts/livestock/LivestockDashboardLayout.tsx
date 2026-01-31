"use client"

import React, { useState, useEffect } from "react"
import { Link, usePage, useForm, router } from "@inertiajs/react"
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
    ChevronRight,
    Shield,
    Package,
    Users,
    ChevronDown,
    Settings,
    AlertCircle,
    Clock,
    CheckCircle,
    Hash
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import toast, { Toaster } from "react-hot-toast"
import { cn } from "@/lib/utils"

interface LivestockDashboardLayoutProps {
    children: React.ReactNode
}

interface NavItem {
    name: string
    href: string
    icon: React.ElementType
    badge?: number
    show?: boolean
}

export default function LivestockDashboardLayout({ children }: LivestockDashboardLayoutProps) {
    const page = usePage()
    const { auth } = page.props as any
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [showVerificationModal, setShowVerificationModal] = useState(false)

    useEffect(() => {
        if (page.props?.success) {
            toast.success(page.props?.success as string)
        }
        if (page.props?.error) {
            toast.error(page.props?.error as string)
        }
    }, [page.props?.success, page.props?.error])

    // Get current path - page.url gives us the current route path
    // Fallback to window.location.pathname if page.url is not available
    const currentPath = page.url || (typeof window !== 'undefined' ? window.location.pathname : '')

    // Check if user is seller
    // The middleware passes seller_profile (snake_case) not sellerProfile
    const isSeller = auth?.user?.seller_profile !== null && auth?.user?.seller_profile !== undefined
    const sellerProfile = auth?.user?.seller_profile
    const isVerified = sellerProfile?.verification_status === 'verified'
    const verificationStatus = sellerProfile?.verification_status || 'pending'
    
    // Check if user is buyer
    const isBuyer = auth?.user?.buyer_profile !== null && auth?.user?.buyer_profile !== undefined
    
    // Check if user has admin permissions
    // Check if they have admin.livestock.read permission or if they're on an admin page
    const hasAdminPermission = auth?.permissions?.includes('admin.livestock.read') || false
    const isAdmin = hasAdminPermission || currentPath.startsWith('/admin')

    // Dashboard items (first)
    const dashboardItems: NavItem[] = [
        { name: "Dashboard", href: route('seller.dashboard'), icon: LayoutDashboard, show: isSeller },
        { name: "Dashboard", href: route('buyer.dashboard'), icon: LayoutDashboard, show: isBuyer && !isSeller },
        { name: "Admin Dashboard", href: route('admin.index'), icon: Shield, show: isAdmin },
    ]

    // Seller navigation items
    const sellerNavItems: NavItem[] = [
        { name: "My Animals", href: route('animals.index'), icon: Heart, show: isSeller },
        { name: "Purchased Animals", href: route('animals.purchased'), icon: Package, show: isSeller },
        { name: "Breeding", href: route('breeding.index'), icon: Activity, show: isSeller },
        { name: "Payouts", href: route('payouts.index'), icon: DollarSign, show: isSeller },
    ]

    // Buyer navigation items (only visible to buyers, not sellers)
    const buyerNavItems: NavItem[] = [
        { name: "Livestock", href: route('buyer.animals'), icon: Heart, show: isBuyer && !isSeller },
        { name: "Purchased Animals", href: route('animals.purchased'), icon: Package, show: isBuyer && !isSeller },
        { name: "Pre-Generated Tags", href: route('buyer.pre-generated-tags.index'), icon: Hash, show: isBuyer && !isSeller },
        { name: "Breeding", href: route('breeding.index'), icon: Activity, show: isBuyer && !isSeller },
        { name: "Payout Requests", href: route('buyer.payouts'), icon: DollarSign, show: isBuyer && !isSeller },
    ]

    // Admin navigation items
    const adminNavItems: NavItem[] = [
        { name: "Sellers", href: route('admin.sellers'), icon: Users, show: isAdmin },
        { name: "Listings", href: route('admin.listings'), icon: Package, show: isAdmin },
        { name: "Payouts", href: route('admin.payouts'), icon: DollarSign, show: isAdmin },
    ]

    // Combine all navigation items and filter by show property
    const navItems: NavItem[] = [
        ...dashboardItems,
        ...sellerNavItems,
        ...buyerNavItems,
        ...adminNavItems,
    ].filter(item => item.show !== false)

    // Default dashboard route based on role
    const getDashboardRoute = () => {
        if (isAdmin) return route('admin.index')
        if (isSeller) return route('seller.dashboard')
        if (isBuyer) return route('buyer.dashboard')
        return route('home')
    }

    const isActive = (href: string) => {
        // Normalize paths - remove query strings, trailing slashes, and extract pathname from full URLs
        const normalizePath = (path: string) => {
            if (!path) return '/'
            try {
                // If it's a full URL, extract just the pathname
                if (path.startsWith('http://') || path.startsWith('https://')) {
                    const url = new URL(path)
                    path = url.pathname
                }
                // Remove query string and trailing slash
                const cleaned = path.split('?')[0].replace(/\/$/, '') || '/'
                return cleaned
            } catch {
                // If URL parsing fails, just clean the path
                return path.split('?')[0].replace(/\/$/, '') || '/'
            }
        }
        
        const normalizedCurrentPath = normalizePath(currentPath)
        const normalizedHref = normalizePath(href)
        
        // Exact match
        if (normalizedCurrentPath === normalizedHref) {
            return true
        }
        
        // Special handling for dashboard routes - only exact match
        const dashboardRoutes = ['/seller/dashboard', '/buyer/dashboard', '/admin']
        if (dashboardRoutes.includes(normalizedHref)) {
            return normalizedCurrentPath === normalizedHref
        }
        
        // Special handling for /animals route - don't match /animals/purchased
        if (normalizedHref === '/animals') {
            // Only match /animals and its sub-routes, but exclude /animals/purchased
            if (normalizedCurrentPath === '/animals' || 
                (normalizedCurrentPath.startsWith('/animals/') && normalizedCurrentPath !== '/animals/purchased')) {
                return true
            }
            return false
        }
        
        // Special handling for /animals/purchased - only exact match
        if (normalizedHref === '/animals/purchased') {
            return normalizedCurrentPath === '/animals/purchased'
        }
        
        // Special handling for /buyer/dashboard - only exact match
        if (normalizedHref === '/buyer/dashboard') {
            return normalizedCurrentPath === '/buyer/dashboard'
        }
        
        // Special handling for /buyer/animals - only exact match
        if (normalizedHref === '/buyer/animals') {
            return normalizedCurrentPath === '/buyer/animals'
        }
        
        // For routes like /breeding, /payouts
        // Match the base route and all nested routes
        // e.g., /breeding matches /breeding, /breeding/create, /breeding/1, etc.
        if (normalizedHref !== '/' && normalizedCurrentPath.startsWith(normalizedHref + '/')) {
            return true
        }
        
        return false
    }

    const { post } = useForm()

    const handleLogout = (e: React.FormEvent) => {
        e.preventDefault()
        post(route('logout.livestock'))
    }

    // Check if user should be blocked from navigation
    const shouldBlockNavigation = isSeller && !isVerified && currentPath !== '/seller/dashboard' && currentPath !== '/seller/edit' && currentPath !== '/seller/create'

    // Show modal when trying to navigate while not verified
    useEffect(() => {
        if (shouldBlockNavigation) {
            setShowVerificationModal(true)
            // Redirect to dashboard if trying to access other pages
            if (currentPath !== '/seller/dashboard') {
                router.visit(route('seller.dashboard'), { replace: true })
            }
        }
    }, [shouldBlockNavigation, currentPath])

    // Handle navigation clicks - block if not verified
    const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (isSeller && !isVerified) {
            // Allow dashboard and profile pages
            if (href === route('seller.dashboard') || href === route('seller.edit') || href === route('seller.create')) {
                return // Allow navigation
            }
            // Block other pages
            e.preventDefault()
            setShowVerificationModal(true)
        }
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
                        <Link href={getDashboardRoute()} className="flex-shrink-0">
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
                                    onClick={(e) => {
                                        setMobileMenuOpen(false)
                                        handleNavigation(e, item.href)
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative",
                                        active
                                            ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 text-amber-700 dark:text-amber-400 border-l-4 border-amber-500 dark:border-amber-600 shadow-sm"
                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-amber-600 dark:hover:text-amber-400"
                                    )}
                                >
                                    <Icon className={cn(
                                        "h-5 w-5 transition-colors",
                                        active 
                                            ? "text-amber-600 dark:text-amber-400" 
                                            : "text-gray-500 dark:text-gray-400"
                                    )} />
                                    <span className={cn(
                                        active && "font-semibold"
                                    )}>{item.name}</span>
                                    {item.badge && (
                                        <span className="ml-auto bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                    {active && (
                                        <ChevronRight className="h-4 w-4 ml-auto text-amber-600 dark:text-amber-400" />
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* User Section */}
                    <div className="border-t border-amber-200/50 dark:border-amber-900/30 p-4">
                        <div className="flex items-center gap-3 px-2">
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
                            
                            {/* User Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        className="flex items-center gap-2 h-9 px-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                            <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="hidden md:block text-left">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {auth?.user?.name || "User"}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {auth?.user?.email || ""}
                                            </p>
                                        </div>
                                        <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 hidden md:block" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {auth?.user?.name || "User"}
                                            </p>
                                            <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
                                                {auth?.user?.email || ""}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {isBuyer && !isSeller && (
                                        <>
                                            <Link href={route('buyer.dashboard')}>
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <LayoutDashboard className="h-4 w-4 mr-2" />
                                                    Dashboard
                                                </DropdownMenuItem>
                                            </Link>
                                            <Link href={route('buyer.edit')}>
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <Settings className="h-4 w-4 mr-2" />
                                                    Profile Settings
                                                </DropdownMenuItem>
                                            </Link>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}
                                    {isSeller && (
                                        <>
                                            <Link href={route('seller.dashboard')}>
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <LayoutDashboard className="h-4 w-4 mr-2" />
                                                    Dashboard
                                                </DropdownMenuItem>
                                            </Link>
                                            <Link href={route('seller.edit')}>
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <Settings className="h-4 w-4 mr-2" />
                                                    Profile Settings
                                                </DropdownMenuItem>
                                            </Link>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}
                                    {isAdmin && (
                                        <>
                                            <Link href={route('admin.index')}>
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <Shield className="h-4 w-4 mr-2" />
                                                    Admin Panel
                                                </DropdownMenuItem>
                                            </Link>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}
                                    <form onSubmit={handleLogout}>
                                        <DropdownMenuItem 
                                            asChild
                                            className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                        >
                                            <button type="submit" className="w-full flex items-center">
                                                <LogOut className="h-4 w-4 mr-2" />
                                                Logout
                                            </button>
                                        </DropdownMenuItem>
                                    </form>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>

            {/* Verification Modal */}
            <Dialog open={showVerificationModal} onOpenChange={(open) => {
                // Don't allow closing if not verified and trying to access restricted pages
                if (!open && isSeller && !isVerified && shouldBlockNavigation) {
                    return // Prevent closing
                }
                setShowVerificationModal(open)
            }}>
                <DialogContent className="sm:max-w-md" onInteractOutside={(e) => {
                    // Prevent closing by clicking outside if not verified
                    if (isSeller && !isVerified && shouldBlockNavigation) {
                        e.preventDefault()
                    }
                }}>
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            {verificationStatus === 'pending' ? (
                                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                            ) : verificationStatus === 'rejected' ? (
                                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                            ) : (
                                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            )}
                            <DialogTitle className="text-xl">
                                {verificationStatus === 'pending' 
                                    ? 'Verification Pending' 
                                    : verificationStatus === 'rejected'
                                    ? 'Verification Rejected'
                                    : 'Account Verification Required'}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-left pt-2">
                            {verificationStatus === 'pending' ? (
                                <div className="space-y-3">
                                    <p className="text-gray-700 dark:text-gray-300">
                                        Your seller profile is currently under review. Please wait for admin approval before accessing other features.
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        You can still view your dashboard and edit your profile while waiting for verification.
                                    </p>
                                </div>
                            ) : verificationStatus === 'rejected' ? (
                                <div className="space-y-3">
                                    <p className="text-gray-700 dark:text-gray-300">
                                        Your seller profile verification was rejected. Please update your profile information and resubmit for review.
                                    </p>
                                    {sellerProfile?.rejection_reason && (
                                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Rejection Reason:</p>
                                            <p className="text-sm text-red-700 dark:text-red-400">{sellerProfile.rejection_reason}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-700 dark:text-gray-300">
                                    Please complete your seller profile verification to access all features.
                                </p>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowVerificationModal(false)}
                            className="flex-1"
                        >
                            Close
                        </Button>
                        {verificationStatus === 'rejected' && (
                            <Link href={route('seller.edit')} className="flex-1">
                                <Button
                                    onClick={() => setShowVerificationModal(false)}
                                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                                >
                                    Update Profile
                                </Button>
                            </Link>
                        )}
                        {verificationStatus === 'pending' && (
                            <Link href={route('seller.dashboard')} className="flex-1">
                                <Button
                                    onClick={() => setShowVerificationModal(false)}
                                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                                >
                                    Go to Dashboard
                                </Button>
                            </Link>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}


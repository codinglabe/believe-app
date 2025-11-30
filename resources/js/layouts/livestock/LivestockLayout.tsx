"use client"

import type React from "react"
import { Link, usePage, router } from "@inertiajs/react"
import LivestockLogo from "@/components/livestock/LivestockLogo"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { route } from "ziggy-js"
import { 
    Home, 
    ShoppingBag, 
    User, 
    LogOut, 
    Menu, 
    X,
    Heart,
    ArrowRight,
    LayoutDashboard,
    Settings,
    Shield,
    ChevronDown
} from "lucide-react"
import { useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { useEffect } from "react"
import { motion } from "framer-motion"

interface LivestockLayoutProps {
    children: React.ReactNode
}

export default function LivestockLayout({ children }: LivestockLayoutProps) {
    const page = usePage()
    const { auth } = page.props as any
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    
    // Check if user is seller
    const isSeller = auth?.user?.seller_profile !== null && auth?.user?.seller_profile !== undefined
    
    // Check if user is buyer
    const isBuyer = auth?.user?.buyer_profile !== null && auth?.user?.buyer_profile !== undefined
    
    // Check if user has admin permissions
    const currentPath = page.url
    const hasAdminPermission = auth?.permissions?.includes('admin.livestock.read') || false
    const isAdmin = hasAdminPermission || currentPath.startsWith('/admin')

    useEffect(() => {
        if (page.props?.success) {
            toast.success(page.props?.success as string)
        }
        if (page.props?.error) {
            toast.error(page.props?.error as string)
        }
    }, [page.props?.success, page.props?.error])

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
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

            {/* Navigation - Matching Landing Page */}
            <motion.nav 
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="border-b border-amber-200/50 dark:border-amber-900/30 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl sticky top-0 z-50 shadow-sm"
            >
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                        {/* Logo */}
                        <Link href={route('home')} className="flex-shrink-0">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <LivestockLogo size="md" />
                            </motion.div>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-2 lg:gap-3">
                            <Link href={route('home')}>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-sm hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:hover:text-amber-300"
                                >
                                    Home
                                </Button>
                            </Link>
                            <Link href={route('marketplace.index')}>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-sm hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:hover:text-amber-300"
                                >
                                    <ShoppingBag className="h-4 w-4 mr-1" />
                                    Marketplace
                                </Button>
                            </Link>
                            
                            {auth?.user ? (
                                <>
                                    {/* User Dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                className="flex items-center gap-2 h-9 px-3 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                            >
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 flex items-center justify-center">
                                                    <User className="h-4 w-4 text-white" />
                                                </div>
                                                <div className="hidden md:block text-left">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {auth.user.name || "User"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {auth.user.email || ""}
                                                    </p>
                                                </div>
                                                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 hidden md:block" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuLabel>
                                                <div className="flex flex-col space-y-1">
                                                    <p className="text-sm font-medium leading-none">
                                                        {auth.user.name || "User"}
                                                    </p>
                                                    <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
                                                        {auth.user.email || ""}
                                                    </p>
                                                </div>
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <Link href={route('marketplace.index')}>
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <ShoppingBag className="h-4 w-4 mr-2" />
                                                    Browse Marketplace
                                                </DropdownMenuItem>
                                            </Link>
                                            {isBuyer && !isSeller && (
                                                <>
                                                    <Link href={route('buyer.dashboard')}>
                                                        <DropdownMenuItem className="cursor-pointer">
                                                            <LayoutDashboard className="h-4 w-4 mr-2" />
                                                            Dashboard
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
                                            <form onSubmit={(e) => { e.preventDefault(); router.post(route('logout')); }}>
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
                                </>
                            ) : (
                                <>
                                    <Link href={route('login')}>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-sm border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                        >
                                            Login
                                        </Button>
                                    </Link>
                                    <Link href={route('register')}>
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Button 
                                                size="sm" 
                                                className="text-sm bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-700 hover:via-orange-700 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30"
                                            >
                                                Get Started
                                                <ArrowRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        </motion.div>
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <motion.div
                    initial={false}
                    animate={{ height: mobileMenuOpen ? "auto" : 0, opacity: mobileMenuOpen ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="md:hidden overflow-hidden border-t border-amber-200/50 dark:border-amber-900/30 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl"
                >
                    <div className="px-4 py-4 space-y-3">
                        <Link
                            href={route('home')}
                            className="block"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Button variant="ghost" className="w-full justify-start">Home</Button>
                        </Link>
                        <Link
                            href={route('marketplace.index')}
                            className="block"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Button variant="ghost" className="w-full justify-start">
                                <ShoppingBag className="h-4 w-4 mr-2" />
                                Marketplace
                            </Button>
                        </Link>
                        
                        {auth?.user ? (
                            <>
                                <div className="pt-3 border-t border-amber-200/50 dark:border-amber-900/30">
                                    <div className="flex items-center gap-3 mb-3 px-2">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 flex items-center justify-center">
                                            <User className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {auth.user.name}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {auth.user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href={route('marketplace.index')}
                                        className="block mb-2"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Button variant="ghost" size="sm" className="w-full justify-start">
                                            <ShoppingBag className="h-4 w-4 mr-2" />
                                            Browse Marketplace
                                        </Button>
                                    </Link>
                                    {isBuyer && !isSeller && (
                                        <Link
                                            href={route('buyer.dashboard')}
                                            className="block mb-2"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <Button variant="ghost" size="sm" className="w-full justify-start">
                                                <LayoutDashboard className="h-4 w-4 mr-2" />
                                                Dashboard
                                            </Button>
                                        </Link>
                                    )}
                                    {isSeller && (
                                        <>
                                            <Link
                                                href={route('seller.dashboard')}
                                                className="block mb-2"
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                <Button variant="ghost" size="sm" className="w-full justify-start">
                                                    <LayoutDashboard className="h-4 w-4 mr-2" />
                                                    Dashboard
                                                </Button>
                                            </Link>
                                            <Link
                                                href={route('seller.edit')}
                                                className="block mb-2"
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                <Button variant="ghost" size="sm" className="w-full justify-start">
                                                    <Settings className="h-4 w-4 mr-2" />
                                                    Profile Settings
                                                </Button>
                                            </Link>
                                        </>
                                    )}
                                    {isAdmin && (
                                        <Link
                                            href={route('admin.index')}
                                            className="block mb-2"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <Button variant="ghost" size="sm" className="w-full justify-start">
                                                <Shield className="h-4 w-4 mr-2" />
                                                Admin Panel
                                            </Button>
                                        </Link>
                                    )}
                                    <form onSubmit={(e) => { e.preventDefault(); router.post(route('logout')); }}>
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            size="sm"
                                            className="w-full text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20"
                                        >
                                            <LogOut className="h-4 w-4 mr-2" />
                                            Logout
                                        </Button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="pt-3 border-t border-amber-200/50 dark:border-amber-900/30 space-y-2">
                                <Link href={route('login')} className="block" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="outline" className="w-full justify-start">Login</Button>
                                </Link>
                                <Link href={route('register')} className="block" onClick={() => setMobileMenuOpen(false)}>
                                    <Button className="w-full justify-start bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
                                        Get Started
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.nav>

            {/* Main Content */}
            <main className="min-h-[calc(100vh-200px)]">
                {children}
            </main>

            {/* Footer - Matching Landing Page */}
            <footer className="bg-gray-950 text-white py-12 sm:py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
                        <div className="sm:col-span-2 lg:col-span-1">
                            <div className="mb-4">
                                <LivestockLogo size="sm" />
                            </div>
                            <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                                Premium livestock management and marketplace platform for modern farmers and traders.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-4 text-base sm:text-lg">For Buyers</h3>
                            <ul className="space-y-3 text-sm sm:text-base text-gray-400">
                                <li>
                                    <Link href={route('marketplace.index')} className="hover:text-amber-400 transition-colors">
                                        Browse Animals
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('register')} className="hover:text-amber-400 transition-colors">
                                        Create Account
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-4 text-base sm:text-lg">For Sellers</h3>
                            <ul className="space-y-3 text-sm sm:text-base text-gray-400">
                                <li>
                                    <Link href={route('register')} className="hover:text-amber-400 transition-colors">
                                        Become a Seller
                                    </Link>
                                </li>
                                <li>
                                    <Link href={route('register')} className="hover:text-amber-400 transition-colors">
                                        Register
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-4 text-base sm:text-lg">Support</h3>
                            <ul className="space-y-3 text-sm sm:text-base text-gray-400">
                                <li>
                                    <Link href={route('login')} className="hover:text-amber-400 transition-colors">
                                        Login
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 sm:mt-12 pt-8 text-center text-gray-400 text-sm">
                        <p>&copy; {new Date().getFullYear()} Bida Livestock. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

"use client"

import React from "react"
import { Link, usePage, router } from "@inertiajs/react"
import LivestockLogo from "@/components/livestock/LivestockLogo"
import { Button } from "@/components/ui/button"
import { 
    Home, 
    ShoppingBag, 
    User, 
    LogOut, 
    Menu, 
    X,
    Package,
    Heart,
    DollarSign,
    FileText,
    ArrowRight
} from "lucide-react"
import { useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { useEffect } from "react"
import type { BreadcrumbItem } from "@/types"
import { motion } from "framer-motion"

interface LivestockAppLayoutProps {
    children: React.ReactNode
    breadcrumbs?: BreadcrumbItem[]
}

export default function LivestockAppLayout({ children, breadcrumbs = [] }: LivestockAppLayoutProps) {
    const page = usePage()
    const { auth } = page.props as any
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        const success = page.props?.success
        const error = page.props?.error
        if (typeof success === "string" && success.trim() !== "") toast.success(success)
        if (typeof error === "string" && error.trim() !== "") toast.error(error)
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
                        <Link href="/" className="flex-shrink-0">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <LivestockLogo size="md" />
                            </motion.div>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-2 lg:gap-3">
                            <Link href="/">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-sm hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:hover:text-amber-300"
                                >
                                    Home
                                </Button>
                            </Link>
                            <Link href="/marketplace">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-sm hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:hover:text-amber-300"
                                >
                                    Browse Marketplace
                                </Button>
                            </Link>
                            
                            {auth?.user ? (
                                <>
                                    <Link href="/seller/dashboard">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-sm hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:hover:text-amber-300"
                                        >
                                            Dashboard
                                        </Button>
                                    </Link>
                                    <Link href="/animals">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-sm hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:hover:text-amber-300"
                                        >
                                            My Animals
                                        </Button>
                                    </Link>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {auth.user.name}
                                        </span>
                                        <form onSubmit={(e) => { e.preventDefault(); router.post("/logout"); }}>
                                            <Button
                                                type="submit"
                                                variant="outline"
                                                size="sm"
                                                className="border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                            >
                                                <LogOut className="h-4 w-4 mr-2" />
                                                Logout
                                            </Button>
                                        </form>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Link href="/login">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-sm border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                        >
                                            Login
                                        </Button>
                                    </Link>
                                    <Link href="/register">
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
                            href="/"
                            className="block"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Button variant="ghost" className="w-full justify-start">Home</Button>
                        </Link>
                        <Link
                            href="/marketplace"
                            className="block"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Button variant="ghost" className="w-full justify-start">Browse Marketplace</Button>
                        </Link>
                        
                        {auth?.user ? (
                            <>
                                <Link
                                    href="/seller/dashboard"
                                    className="block"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Button variant="ghost" className="w-full justify-start">Dashboard</Button>
                                </Link>
                                <Link
                                    href="/animals"
                                    className="block"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Button variant="ghost" className="w-full justify-start">My Animals</Button>
                                </Link>
                                <div className="pt-3 border-t border-amber-200/50 dark:border-amber-900/30">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 px-2">
                                        {auth.user.name}
                                    </p>
                                    <form onSubmit={(e) => { e.preventDefault(); router.post("/logout"); }}>
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                        >
                                            <LogOut className="h-4 w-4 mr-2" />
                                            Logout
                                        </Button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="pt-3 border-t border-amber-200/50 dark:border-amber-900/30 space-y-2">
                                <Link href="/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="outline" className="w-full justify-start">Login</Button>
                                </Link>
                                <Link href="/register" className="block" onClick={() => setMobileMenuOpen(false)}>
                                    <Button className="w-full justify-start bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
                                        Get Started
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.nav>

            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
                <div className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-b border-amber-200/50 dark:border-amber-900/30">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
                        <nav className="flex items-center space-x-2 text-sm">
                            {breadcrumbs.map((crumb, index) => (
                                <React.Fragment key={index}>
                                    {index > 0 && <span className="text-gray-400">/</span>}
                                    {crumb.href && crumb.href !== '#' ? (
                                        <Link
                                            href={crumb.href}
                                            className="text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                        >
                                            {crumb.title}
                                        </Link>
                                    ) : (
                                        <span className="text-gray-900 dark:text-white font-medium">
                                            {crumb.title}
                                        </span>
                                    )}
                                </React.Fragment>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

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
                                    <Link href="/marketplace" className="hover:text-amber-400 transition-colors">
                                        Browse Animals
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/register" className="hover:text-amber-400 transition-colors">
                                        Create Account
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-4 text-base sm:text-lg">For Sellers</h3>
                            <ul className="space-y-3 text-sm sm:text-base text-gray-400">
                                <li>
                                    <Link href="/register" className="hover:text-amber-400 transition-colors">
                                        Become a Seller
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/register" className="hover:text-amber-400 transition-colors">
                                        Register
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-4 text-base sm:text-lg">Support</h3>
                            <ul className="space-y-3 text-sm sm:text-base text-gray-400">
                                <li>
                                    <Link href="/login" className="hover:text-amber-400 transition-colors">
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

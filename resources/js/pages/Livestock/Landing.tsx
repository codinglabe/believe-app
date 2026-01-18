"use client"

import { Link, Head, usePage, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    Search, 
    Heart, 
    Shield, 
    TrendingUp, 
    Users, 
    Package, 
    DollarSign, 
    ArrowRight, 
    CheckCircle, 
    Menu, 
    X,
    FileText,
    Lock,
    Sparkles,
    Star,
    User,
    LogOut,
    LayoutDashboard,
    Settings,
    ShoppingBag,
    ChevronDown
} from "lucide-react"
import { motion, useScroll, useTransform } from "framer-motion"
import LivestockLogo from "@/components/livestock/LivestockLogo"
import { useState, useRef } from "react"
import { route } from "ziggy-js"

const features = [
    {
        icon: Shield,
        title: "Verified Sellers",
        description: "All sellers undergo strict verification. Buy with complete confidence knowing every animal comes from a trusted, verified source.",
        color: "from-amber-500 to-orange-600",
        bgColor: "bg-amber-50 dark:bg-amber-950/20",
        iconColor: "text-amber-600 dark:text-amber-400"
    },
    {
        icon: Package,
        title: "Premium Quality",
        description: "Browse premium goats, sheep, and cattle with complete health records, breeding history, and detailed documentation.",
        color: "from-amber-500 to-orange-600",
        bgColor: "bg-amber-50 dark:bg-amber-950/20",
        iconColor: "text-amber-600 dark:text-amber-400"
    },
    {
        icon: TrendingUp,
        title: "Breeding Management",
        description: "Complete breeding management system with parentage tracking, health records, and genetic history documentation.",
        color: "from-violet-500 to-purple-600",
        bgColor: "bg-violet-50 dark:bg-violet-950/20",
        iconColor: "text-violet-600 dark:text-violet-400"
    },
    {
        icon: DollarSign,
        title: "Transparent Pricing",
        description: "Fair and transparent pricing with secure transactions, guaranteed ownership transfer, and full payment protection.",
        color: "from-rose-500 to-pink-600",
        bgColor: "bg-rose-50 dark:bg-rose-950/20",
        iconColor: "text-rose-600 dark:text-rose-400"
    },
    {
        icon: FileText,
        title: "Complete Records",
        description: "Every animal comes with comprehensive health records, vaccination history, and complete ownership documentation.",
        color: "from-amber-500 to-orange-600",
        bgColor: "bg-amber-50 dark:bg-amber-950/20",
        iconColor: "text-amber-600 dark:text-amber-400"
    },
    {
        icon: Lock,
        title: "Secure Transactions",
        description: "Bank-level security for all transactions. Your payments and data are protected with industry-leading encryption.",
        color: "from-amber-500 to-orange-600",
        bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
        iconColor: "text-indigo-600 dark:text-indigo-400"
    },
]

const stats = [
    { label: "Active Listings", value: "500+", icon: Package, color: "text-amber-600 dark:text-amber-400" },
    { label: "Verified Sellers", value: "150+", icon: Users, color: "text-amber-600 dark:text-amber-400" },
    { label: "Animals Sold", value: "2,000+", icon: Heart, color: "text-rose-600 dark:text-rose-400" },
    { label: "Total Value", value: "$1.5M+", icon: DollarSign, color: "text-violet-600 dark:text-violet-400" },
]

const steps = [
    {
        number: "01",
        title: "Create Account",
        description: "Sign up as a buyer or seller. Complete your profile and get verified to start trading.",
        icon: UserPlus,
        color: "from-amber-500 to-orange-600"
    },
    {
        number: "02",
        title: "Browse or List",
        description: "Explore available animals with detailed profiles or list your livestock with photos and complete information.",
        icon: Search,
        color: "from-amber-500 to-orange-600"
    },
    {
        number: "03",
        title: "Secure Transaction",
        description: "Complete your purchase securely with guaranteed ownership transfer and full documentation.",
        icon: Lock,
        color: "from-violet-500 to-purple-600"
    },
]

const benefits = [
    "Complete health records for every animal",
    "Verified seller profiles",
    "Secure payment processing",
    "Ownership transfer documentation",
    "Breeding history tracking",
    "24/7 customer support"
]

function UserPlus({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
    )
}

export default function LivestockLanding() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const heroRef = useRef<HTMLDivElement>(null)
    const page = usePage()
    const { auth } = page.props as any
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ["start start", "end start"]
    })
    const opacity = useTransform(scrollYProgress, [0, 1], [1, 0])
    const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95])
    
    // Check if user is seller
    const isSeller = auth?.user?.seller_profile !== null && auth?.user?.seller_profile !== undefined
    
    // Check if user is buyer
    const isBuyer = auth?.user?.buyer_profile !== null && auth?.user?.buyer_profile !== undefined
    
    // Check if user has admin permissions
    const currentPath = page.url
    const hasAdminPermission = auth?.permissions?.includes('admin.livestock.read') || false
    const isAdmin = hasAdminPermission || currentPath.startsWith('/admin')

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            <Head title="Bida Livestock - Premium Livestock Marketplace" />
            
            {/* Navigation */}
            <motion.nav 
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="border-b border-amber-200/50 dark:border-amber-900/30 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl sticky top-0 z-50 shadow-sm"
            >
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
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
                                            <form onSubmit={(e) => { e.preventDefault(); router.post(route('logout.livestock')); }}>
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
                                    <form onSubmit={(e) => { e.preventDefault(); router.post(route('logout.livestock')); }}>
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

            {/* Hero Section */}
            <section ref={heroRef} className="relative overflow-hidden py-16 sm:py-20 md:py-24 lg:py-32">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, 90, 0],
                        }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full blur-3xl"
                    />
                    <motion.div
                        animate={{
                            scale: [1.2, 1, 1.2],
                            rotate: [90, 0, 90],
                        }}
                        transition={{
                            duration: 25,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-200/30 to-amber-200/30 rounded-full blur-3xl"
                    />
                </div>

                <motion.div
                    style={{ opacity, scale }}
                    className="container mx-auto px-4 sm:px-6 lg:px-8 relative"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center max-w-6xl mx-auto"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 text-amber-700 dark:text-amber-300 text-sm font-medium mb-6 sm:mb-8 shadow-lg shadow-amber-500/20"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            <span>Trusted Livestock Marketplace</span>
                            <Star className="w-4 h-4 ml-2 fill-amber-500 text-amber-500" />
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8 leading-tight"
                        >
                            Premium Livestock
                            <br />
                            <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 bg-clip-text text-transparent">
                                Management Platform
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 sm:mb-12 md:mb-16 max-w-3xl mx-auto leading-relaxed"
                        >
                            Buy, sell, and manage livestock with complete transparency. Track breeding, health records, and ownership all in one professional platform.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                        >
                            <Link href={route('marketplace.index')} className="w-full sm:w-auto">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Button 
                                        size="lg" 
                                        className="w-full sm:w-auto text-base sm:text-lg px-8 py-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-xl shadow-amber-500/30"
                                    >
                                        <Search className="w-5 h-5 mr-2" />
                                        Browse Animals
                                    </Button>
                                </motion.div>
                            </Link>
                            <Link href={route('register')} className="w-full sm:w-auto">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Button 
                                        size="lg" 
                                        variant="outline" 
                                        className="w-full sm:w-auto text-base sm:text-lg px-8 py-6 border-2 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                    >
                                        Become a Seller
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </motion.div>
                            </Link>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </section>

            {/* Stats Section */}
            <section className="py-16 sm:py-20 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
                        {stats.map((stat, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                className="text-center p-6 rounded-2xl bg-gradient-to-br from-white to-amber-50/50 dark:from-gray-800 dark:to-amber-950/20 shadow-lg hover:shadow-xl transition-all"
                            >
                                <div className="flex justify-center mb-4">
                                    <div className={`p-3 rounded-full bg-gradient-to-br ${stat.color.includes('amber') ? 'from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30' : stat.color.includes('rose') ? 'from-rose-100 to-pink-100 dark:from-rose-950/30 dark:to-pink-950/30' : stat.color.includes('violet') ? 'from-violet-100 to-purple-100 dark:from-violet-950/30 dark:to-purple-950/30' : 'from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30'}`}>
                                        <stat.icon className={`h-6 w-6 sm:h-7 sm:w-7 ${stat.color}`} />
                                    </div>
                                </div>
                                <div className={`text-3xl sm:text-4xl font-bold ${stat.color} mb-2`}>
                                    {stat.value}
                                </div>
                                <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
                                    {stat.label}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-12 sm:mb-16 md:mb-20"
                    >
                        <Badge className="mb-4 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800">
                            Why Choose Us
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                            Everything You Need
                        </h2>
                        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Comprehensive tools and features for modern livestock management
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                whileHover={{ y: -8, scale: 1.02 }}
                                className="group"
                            >
                                <Card className="h-full border-2 hover:border-amber-300 dark:hover:border-amber-700 transition-all shadow-lg hover:shadow-2xl bg-white dark:bg-gray-800">
                                    <CardHeader>
                                        <div className={`p-4 rounded-xl bg-gradient-to-br ${feature.bgColor} w-fit mb-4 group-hover:scale-110 transition-transform`}>
                                            <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
                                        </div>
                                        <CardTitle className="text-xl sm:text-2xl mb-2">{feature.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription className="text-base leading-relaxed">
                                            {feature.description}
                                        </CardDescription>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-16 sm:py-20 md:py-24 bg-white dark:bg-gray-950 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-12 sm:mb-16 md:mb-20"
                    >
                        <Badge className="mb-4 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800">
                            Simple Process
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                            How It Works
                        </h2>
                        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Get started in three simple steps
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 max-w-6xl mx-auto">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.2 }}
                                whileHover={{ y: -10 }}
                                className="relative text-center"
                            >
                                {index < steps.length - 1 && (
                                    <div className="hidden sm:block absolute top-16 left-[60%] w-full h-0.5 bg-gradient-to-r from-amber-300 to-orange-300 dark:from-amber-700 dark:to-orange-700"></div>
                                )}
                                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br ${step.color} text-white flex items-center justify-center text-2xl sm:text-3xl font-bold mx-auto mb-6 shadow-xl shadow-amber-500/30`}>
                                    <step.icon className="w-10 h-10 sm:w-12 sm:h-12" />
                                </div>
                                <div className="text-amber-600 dark:text-amber-400 font-bold text-sm mb-2">{step.number}</div>
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                    {step.title}
                                </h3>
                                <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {step.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-amber-950/20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-12"
                        >
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                                Why Farmers Trust Us
                            </h2>
                            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400">
                                Everything you need for successful livestock trading
                            </p>
                        </motion.div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            {benefits.map((benefit, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="flex items-center p-4 rounded-xl bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow"
                                >
                                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400 mr-3 sm:mr-4 flex-shrink-0" />
                                    <span className="text-base sm:text-lg text-gray-700 dark:text-gray-300">{benefit}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        scale: [1.1, 1, 1.1],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"
                />
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center max-w-4xl mx-auto"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
                            Ready to Get Started?
                        </h2>
                        <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 sm:mb-12">
                            Join hundreds of farmers and traders building successful livestock businesses
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href={route('register')} className="w-full sm:w-auto">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Button 
                                        size="lg" 
                                        variant="secondary" 
                                        className="w-full sm:w-auto text-base sm:text-lg px-8 py-6 bg-white text-amber-600 hover:bg-gray-50 shadow-xl"
                                    >
                                        Create Account
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </motion.div>
                            </Link>
                            <Link href={route('marketplace.index')} className="w-full sm:w-auto">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Button 
                                        size="lg" 
                                        variant="outline" 
                                        className="w-full sm:w-auto text-base sm:text-lg px-8 py-6 bg-white/10 text-white border-2 border-white/30 hover:bg-white/20 backdrop-blur-sm"
                                    >
                                        Browse Marketplace
                                    </Button>
                                </motion.div>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
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

"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState, useEffect, useRef } from "react"
import { Search, Heart, Globe, ArrowRight, Star, CheckCircle, TrendingUp, Award, Shield, MapPin, Users, Building2, X, Zap, ShoppingCart, ArrowRightLeft, Handshake, Wallet, Copy, Check, RefreshCw, ArrowUpRight, ArrowDownLeft, Plus, Activity, CreditCard, Banknote, Settings } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import { motion } from "framer-motion"
import { Link, router, usePage } from "@inertiajs/react"
import SearchSection from "@/components/frontend/SearchSection"
import { WalletDemoPopup } from "@/components/WalletDemoPopup"

const stats = [
  { label: "Verified Organizations", value: "2,500+", icon: Shield, color: "text-blue-600" },
  { label: "Lives Impacted", value: "1.2M+", icon: Heart, color: "text-red-500" },
  { label: "Countries Reached", value: "85+", icon: Globe, color: "text-green-600" },
  { label: "Funds Raised", value: "$50M+", icon: TrendingUp, color: "text-purple-600" },
]

const features = [
  {
    icon: Shield,
    title: "Verified Organizations",
    description: "Every organization is thoroughly vetted for legitimacy and impact transparency",
  },
  {
    icon: Award,
    title: "Impact Tracking",
    description: "See exactly how your donations are used and the real-world impact they create",
  },
  {
    icon: Heart,
    title: "Secure Donations",
    description: "Bank-level security with 100% of your donation going to your chosen cause",
  },
]

interface PageProps {
    filters: {
      search?: string
      category?: string
      state?: string
      city?: string
      zip?: string
    }
    filterOptions: {
      categories: string[]
      states: string[]
      cities: string[]
    }
  }

export default function HomePage() {
    const { filterOptions, filters, featuredOrganizations = [] } = usePage<PageProps>().props
    const [isLoading, setIsLoading] = useState(false)
    const [hasStartedDemo, setHasStartedDemo] = useState(false)
    const [walletPopupOpen, setWalletPopupOpen] = useState(false)
    const [demoActionView, setDemoActionView] = useState<'main' | 'send' | 'receive' | 'swap' | 'addMoney'>('main')
    const [demoSendAmount, setDemoSendAmount] = useState('')
    const [demoAddMoneyAmount, setDemoAddMoneyAmount] = useState('')
    const [demoSelectedRecipient, setDemoSelectedRecipient] = useState<any>(null)
    const [demoShowSuccess, setDemoShowSuccess] = useState(false)
    const [demoSuccessType, setDemoSuccessType] = useState<'send' | 'receive' | 'swap' | 'addMoney' | null>(null)
    const [demoSuccessMessage, setDemoSuccessMessage] = useState('')
    const [demoClickPoint, setDemoClickPoint] = useState<{ x: number; y: number; visible: boolean } | null>(null)
    const walletRef = useRef<HTMLDivElement>(null)

    // Auto-start demo when wallet section is visible
    useEffect(() => {
        if (hasStartedDemo) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasStartedDemo) {
                        setHasStartedDemo(true)
                        startAutoDemo()
                    }
                })
            },
            { threshold: 0.3 }
        )

        if (walletRef.current) {
            observer.observe(walletRef.current)
        }

        return () => {
            if (walletRef.current) {
                observer.unobserve(walletRef.current)
            }
        }
    }, [hasStartedDemo])

    const startAutoDemo = () => {
        // Start with main view
        setDemoActionView('main')
        setTimeout(() => runDepositDemo(), 3000)
    }

    const runDepositDemo = () => {
        setDemoActionView('addMoney')
        setDemoAddMoneyAmount('')
        setDemoShowSuccess(false)
        setDemoSuccessType(null)
        setDemoSuccessMessage('')
        setDemoClickPoint(null)
        
        // Show click on amount input
        setTimeout(() => {
            setDemoClickPoint({ x: 150, y: 120, visible: true })
        }, 500)
        setTimeout(() => {
            setDemoAddMoneyAmount('100')
            setDemoClickPoint({ x: 150, y: 120, visible: false })
        }, 2000) // Enter amount - slower
        // Show click on deposit button
        setTimeout(() => {
            setDemoClickPoint({ x: 150, y: 280, visible: true })
        }, 3500)
        setTimeout(() => {
            setDemoClickPoint(null)
            setDemoShowSuccess(true)
            setDemoSuccessType('addMoney')
            setDemoSuccessMessage('$100.00 has been added to your wallet')
        }, 5000) // Show success - slower
        setTimeout(() => {
            setDemoShowSuccess(false)
            setDemoSuccessType(null)
            setDemoSuccessMessage('')
            setDemoActionView('main')
            // Move to Send demo
            setTimeout(() => runSendDemo(), 3000)
        }, 10000) // Reset and move to next - longer success display
    }

    const runSendDemo = () => {
        setDemoActionView('send')
        setDemoSendAmount('')
        setDemoSelectedRecipient(null)
        setDemoShowSuccess(false)
        setDemoSuccessType(null)
        setDemoSuccessMessage('')
        setDemoClickPoint(null)
        
        // Show click on amount input
        setTimeout(() => {
            setDemoClickPoint({ x: 150, y: 120, visible: true })
        }, 500)
        setTimeout(() => {
            setDemoSendAmount('50')
            setDemoClickPoint({ x: 150, y: 120, visible: false })
        }, 2000) // Enter amount - slower
        // Show click on recipient input
        setTimeout(() => {
            setDemoClickPoint({ x: 150, y: 200, visible: true })
        }, 3000)
        setTimeout(() => {
            setDemoSelectedRecipient({
                id: 'demo-1',
                type: 'user',
                name: 'John Doe',
                email: 'john@example.com',
                display_name: 'John Doe',
                address: '0x1234567890abcdef1234567890abcdef12345678'
            })
            setDemoClickPoint({ x: 150, y: 200, visible: false })
        }, 4000) // Select recipient - slower
        // Show click on send button
        setTimeout(() => {
            setDemoClickPoint({ x: 150, y: 320, visible: true })
        }, 5500)
        setTimeout(() => {
            setDemoClickPoint(null)
            setDemoShowSuccess(true)
            setDemoSuccessType('send')
            setDemoSuccessMessage('$50.00 sent to John Doe')
        }, 6000) // Show success - slower
        setTimeout(() => {
            setDemoShowSuccess(false)
            setDemoSuccessType(null)
            setDemoSuccessMessage('')
            setDemoActionView('main')
            // Move to Receive demo
            setTimeout(() => runReceiveDemo(), 3000)
        }, 11000) // Reset and move to next - longer success display
    }

    const runReceiveDemo = () => {
        setDemoActionView('receive')
        setDemoShowSuccess(false)
        setDemoSuccessType(null)
        setDemoSuccessMessage('')
        setDemoClickPoint(null)
        
        // Show click on copy button
        setTimeout(() => {
            setDemoClickPoint({ x: 280, y: 200, visible: true })
        }, 1000)
        setTimeout(() => {
            setDemoClickPoint(null)
            setDemoShowSuccess(true)
            setDemoSuccessType('receive')
            setDemoSuccessMessage('Wallet address copied to clipboard')
        }, 2000) // Show success (address copied) - slower
        setTimeout(() => {
            setDemoShowSuccess(false)
            setDemoSuccessType(null)
            setDemoSuccessMessage('')
            setDemoActionView('main')
            // Move to Swap demo
            setTimeout(() => runSwapDemo(), 3000)
        }, 8000) // Reset and move to next - longer success display
    }

    const runSwapDemo = () => {
        setDemoActionView('swap')
        setDemoShowSuccess(false)
        setDemoSuccessType(null)
        setDemoSuccessMessage('')
        setDemoClickPoint(null)
        
        // Show click on swap button/area
        setTimeout(() => {
            setDemoClickPoint({ x: 150, y: 250, visible: true })
        }, 1000)
        setTimeout(() => {
            setDemoClickPoint(null)
            setDemoShowSuccess(true)
            setDemoSuccessType('swap')
            setDemoSuccessMessage('Currency swap completed successfully')
        }, 2000) // Show success - slower
        setTimeout(() => {
            setDemoShowSuccess(false)
            setDemoSuccessType(null)
            setDemoSuccessMessage('')
            setDemoActionView('main')
            // Loop back to Deposit after a pause
            setTimeout(() => runDepositDemo(), 4000)
        }, 8000) // Reset and loop - longer success display
    }

    // Handle search from SearchSection component
    const handleSearch = (params: Record<string, string>) => {
      setIsLoading(true)
      const searchParams = new URLSearchParams()

      // Add all search parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== "All Categories" && value !== "All States" && value !== "All Cities") {
          searchParams.set(key, value)
        }
      })

      // Navigate to organizations page with search parameters
      const url = searchParams.toString() ? `/organizations?${searchParams.toString()}` : "/organizations"

      router.visit(url, {
        preserveState: false, // Don't preserve state when navigating to different page
        preserveScroll: false,
        onFinish: () => setIsLoading(false),
      })
    }

    // Clear all filters and go to organizations page
    const clearFilters = () => {
      router.visit("/organizations", {
        preserveState: false,
        preserveScroll: false,
      })
    }

    // Handle quick navigation to organizations page
    const handleViewAllOrganizations = () => {
      router.visit("/organizations")
    }

    return (
    <FrontendLayout>
    <div className="min-h-screen">
      {/* Professional Hero Section - Inspired by Global Network Theme */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/images/believe-hero.png)'
          }}
        >
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-purple-900/60 dark:bg-purple-900/80"></div>
        </div>

        {/* World Map Overlay */}
        <div className="absolute inset-0 opacity-10 z-10">
          <svg className="w-full h-full" viewBox="0 0 1200 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M200,300 Q300,250 400,300 T600,300" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none"/>
            <path d="M300,200 Q400,150 500,200 T700,200" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none"/>
            <path d="M400,400 Q500,350 600,400 T800,400" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none"/>
            <circle cx="200" cy="300" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="400" cy="300" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="600" cy="300" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="800" cy="300" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="300" cy="200" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="500" cy="200" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="700" cy="200" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="400" cy="400" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="600" cy="400" r="3" fill="rgba(255,255,255,0.5)"/>
            <circle cx="800" cy="400" r="3" fill="rgba(255,255,255,0.5)"/>
            <line x1="200" y1="300" x2="300" y2="200" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <line x1="400" y1="300" x2="500" y2="200" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <line x1="600" y1="300" x2="700" y2="200" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <line x1="300" y1="200" x2="400" y2="300" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <line x1="500" y1="200" x2="600" y2="300" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <line x1="400" y1="300" x2="400" y2="400" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <line x1="600" y1="300" x2="600" y2="400" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
          </svg>
        </div>

        {/* Network Pattern Overlay - Connected Dots */}
        <div className="absolute inset-0 opacity-20 z-10">
          <div className="absolute top-20 right-20 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-32 right-32 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-40 right-40 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-60 right-60 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-80 right-80 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute bottom-40 left-40 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute bottom-60 left-60 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute bottom-80 left-80 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-white rounded-full"></div>
          <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-white rounded-full"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="max-w-7xl mx-auto py-12 sm:py-16 md:py-24 lg:py-32 xl:py-40">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
              {/* Left Column - Text Content */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="text-left"
              >
                {/* Main Headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight"
                >
                  Everything Your Nonprofit Needs
                  <br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent block sm:inline">
                    to Thrive & Grow
                  </span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-6 sm:mb-8 md:mb-10 leading-relaxed"
                >
                  From fundraising and events to AI-powered content and a vibrant global community — 
                  <span className="block mt-1 sm:mt-2">we've got everything you need to make a bigger impact, all beautifully organized in one place.</span>
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4"
                >
                  <Link href="/register" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                    >
                      Start Making Impact
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </Link>
                  <Link href="/organizations" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-white text-gray-900 hover:bg-white/10 hover:text-white border-2 border-white font-bold px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                    >
                      Find Organizations
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>

              {/* Right Column - Visual Elements */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative mt-8 lg:mt-0"
              >
                {/* Stats Grid with Icons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-white/20 hover:bg-white/20 transition-all duration-300"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                          <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                          <div className="text-white/80 text-xs sm:text-sm font-medium leading-tight">{stat.label}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Additional Visual Elements */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.8 }}
                  className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 text-white/80"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-300 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">Verified Organizations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-300 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">Secure Platform</span>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Believe Cash Different Section */}
      <section className="py-20 sm:py-24 md:py-32 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950 dark:via-purple-900 dark:to-blue-950 relative overflow-visible">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-200/30 dark:bg-purple-800/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-200/30 dark:bg-blue-800/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-300/20 to-blue-300/20 dark:from-purple-700/10 dark:to-blue-700/10 rounded-full blur-3xl"></div>
        </div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Part 1: Built for People */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-16 sm:mb-20"
          >
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                <div className="relative z-10">
                  <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-purple-400/20 to-blue-400/20 dark:from-purple-500/30 dark:to-blue-500/30 rounded-full blur-2xl"></div>
                  <h2 className="relative text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                    <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 dark:from-purple-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                      What Makes Believe Cash Different
                    </span>
                  </h2>
                  <p className="text-xl sm:text-2xl md:text-3xl text-gray-700 dark:text-white/90 mb-8 font-medium leading-relaxed">
                    Built for people — <span className="text-purple-600 dark:text-purple-400 font-semibold">not Wall Street.</span>
                  </p>
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-full border border-purple-200/50 dark:border-purple-500/30 shadow-lg">
                    <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg">
                      <Handshake className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm sm:text-base font-semibold text-gray-700 dark:text-white/90">Partnered with Believe in Unity (31813)</span>
                  </div>
                </div>
                <div className="flex justify-center lg:justify-end relative z-10 overflow-visible">
                  <motion.div
                    ref={walletRef}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, type: "spring" }}
                    viewport={{ once: true }}
                    className="relative w-full max-w-md mx-auto lg:mx-0"
                  >
                    {/* Tooltip Cards Around Wallet - Professional Positioning with Overflow Protection */}
                    <div className="absolute inset-0 pointer-events-none overflow-visible">
                      {/* Activity Card - Top Right */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, x: -20, y: -20 }}
                        whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        transition={{ 
                          delay: 0.5,
                          type: "spring",
                          stiffness: 200,
                          damping: 20
                        }}
                        viewport={{ once: true }}
                        className="absolute top-0 right-0 -translate-y-full translate-x-0 sm:-translate-y-2 sm:translate-x-2 z-[60] pointer-events-auto"
                      >
                        <motion.div
                          whileHover={{ 
                            scale: 1.08, 
                            y: -4,
                            boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)"
                          }}
                          whileTap={{ scale: 0.95 }}
                          className="relative bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800 dark:to-blue-900/30 rounded-xl shadow-2xl border-2 border-blue-200/60 dark:border-blue-700/60 p-3 sm:p-4 backdrop-blur-xl cursor-pointer group min-w-[140px] sm:min-w-[160px]"
                        >
                          {/* Glow Effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                          <div className="relative flex items-center gap-2 sm:gap-3">
                            <motion.div 
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.6 }}
                              className="p-2 sm:p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:shadow-blue-500/50 transition-all duration-300 flex-shrink-0"
                            >
                              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </motion.div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-0.5 truncate">Activity</p>
                              <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 line-clamp-1">View transactions</p>
                            </div>
                          </div>
                          {/* Arrow pointing to wallet */}
                          <div className="absolute -bottom-2 right-4 sm:right-6 w-4 h-4 bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800 dark:to-blue-900/30 border-r-2 border-b-2 border-blue-200/60 dark:border-blue-700/60 rotate-45"></div>
                        </motion.div>
                      </motion.div>

                      {/* Card Tooltip - Bottom Left */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
                        whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        transition={{ 
                          delay: 0.6,
                          type: "spring",
                          stiffness: 200,
                          damping: 20
                        }}
                        viewport={{ once: true }}
                        className="absolute bottom-0 left-0 translate-y-full -translate-x-0 sm:translate-y-2 sm:-translate-x-2 z-[60] pointer-events-auto"
                      >
                        <motion.div
                          whileHover={{ 
                            scale: 1.08, 
                            y: -4,
                            boxShadow: "0 20px 40px rgba(34, 197, 94, 0.3)"
                          }}
                          whileTap={{ scale: 0.95 }}
                          className="relative bg-gradient-to-br from-white to-green-50/50 dark:from-gray-800 dark:to-green-900/30 rounded-xl shadow-2xl border-2 border-green-200/60 dark:border-green-700/60 p-3 sm:p-4 backdrop-blur-xl cursor-pointer group min-w-[140px] sm:min-w-[160px]"
                        >
                          {/* Glow Effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                          <div className="relative flex items-center gap-2 sm:gap-3">
                            <motion.div 
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.6 }}
                              className="p-2 sm:p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:shadow-green-500/50 transition-all duration-300 flex-shrink-0"
                            >
                              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </motion.div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-0.5 truncate">Card</p>
                              <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 line-clamp-1">Link payment card</p>
                            </div>
                          </div>
                          {/* Arrow pointing to wallet */}
                          <div className="absolute -top-2 left-4 sm:left-6 w-4 h-4 bg-gradient-to-br from-white to-green-50/50 dark:from-gray-800 dark:to-green-900/30 border-l-2 border-t-2 border-green-200/60 dark:border-green-700/60 rotate-45"></div>
                        </motion.div>
                      </motion.div>

                      {/* Bank Tooltip - Right Side */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, x: 30 }}
                        whileInView={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ 
                          delay: 0.7,
                          type: "spring",
                          stiffness: 200,
                          damping: 20
                        }}
                        viewport={{ once: true }}
                        className="absolute top-1/2 right-0 translate-x-full lg:translate-x-[120%] xl:translate-x-[140%] z-[60] pointer-events-auto hidden md:block"
                      >
                        <motion.div
                          whileHover={{ 
                            scale: 1.08, 
                            x: -4,
                            boxShadow: "0 20px 40px rgba(147, 51, 234, 0.3)"
                          }}
                          whileTap={{ scale: 0.95 }}
                          className="relative bg-gradient-to-br from-white to-purple-50/50 dark:from-gray-800 dark:to-purple-900/30 rounded-xl shadow-2xl border-2 border-purple-200/60 dark:border-purple-700/60 p-3 sm:p-4 backdrop-blur-xl cursor-pointer group min-w-[140px] sm:min-w-[160px]"
                        >
                          {/* Glow Effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                          <div className="relative flex items-center gap-2 sm:gap-3">
                            <motion.div 
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.6 }}
                              className="p-2 sm:p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-purple-500/50 transition-all duration-300 flex-shrink-0"
                            >
                              <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </motion.div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-0.5 truncate">Bank</p>
                              <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 line-clamp-1">Connect account</p>
                            </div>
                          </div>
                          {/* Arrow pointing to wallet */}
                          <div className="absolute top-1/2 -left-2 w-4 h-4 bg-gradient-to-br from-white to-purple-50/50 dark:from-gray-800 dark:to-purple-900/30 border-l-2 border-t-2 border-purple-200/60 dark:border-purple-700/60 rotate-45"></div>
                        </motion.div>
                      </motion.div>

                      {/* Security Tooltip - Top Left */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, x: 20, y: -20 }}
                        whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        transition={{ 
                          delay: 0.8,
                          type: "spring",
                          stiffness: 200,
                          damping: 20
                        }}
                        viewport={{ once: true }}
                        className="absolute top-0 left-0 -translate-y-full -translate-x-0 sm:-translate-y-2 sm:-translate-x-2 z-[60] pointer-events-auto hidden sm:block"
                      >
                        <motion.div
                          whileHover={{ 
                            scale: 1.08, 
                            y: -4,
                            boxShadow: "0 20px 40px rgba(239, 68, 68, 0.3)"
                          }}
                          whileTap={{ scale: 0.95 }}
                          className="relative bg-gradient-to-br from-white to-red-50/50 dark:from-gray-800 dark:to-red-900/30 rounded-xl shadow-2xl border-2 border-red-200/60 dark:border-red-700/60 p-3 sm:p-4 backdrop-blur-xl cursor-pointer group min-w-[140px] sm:min-w-[160px]"
                        >
                          {/* Glow Effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                          <div className="relative flex items-center gap-2 sm:gap-3">
                            <motion.div 
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.6 }}
                              className="p-2 sm:p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg group-hover:shadow-red-500/50 transition-all duration-300 flex-shrink-0"
                            >
                              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </motion.div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-0.5 truncate">Security</p>
                              <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 line-clamp-1">Protected wallet</p>
                            </div>
                          </div>
                          {/* Arrow pointing to wallet */}
                          <div className="absolute -bottom-2 left-4 sm:left-6 w-4 h-4 bg-gradient-to-br from-white to-red-50/50 dark:from-gray-800 dark:to-red-900/30 border-l-2 border-b-2 border-red-200/60 dark:border-red-700/60 rotate-45"></div>
                        </motion.div>
                      </motion.div>

                      {/* Settings Tooltip - Bottom Right */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, x: -20, y: 20 }}
                        whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        transition={{ 
                          delay: 0.9,
                          type: "spring",
                          stiffness: 200,
                          damping: 20
                        }}
                        viewport={{ once: true }}
                        className="absolute bottom-0 right-0 translate-y-full translate-x-0 sm:translate-y-2 sm:translate-x-2 z-[60] pointer-events-auto hidden sm:block"
                      >
                        <motion.div
                          whileHover={{ 
                            scale: 1.08, 
                            y: -4,
                            boxShadow: "0 20px 40px rgba(107, 114, 128, 0.3)"
                          }}
                          whileTap={{ scale: 0.95 }}
                          className="relative bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/30 rounded-xl shadow-2xl border-2 border-gray-200/60 dark:border-gray-700/60 p-3 sm:p-4 backdrop-blur-xl cursor-pointer group min-w-[140px] sm:min-w-[160px]"
                        >
                          {/* Glow Effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-400/20 to-slate-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                          <div className="relative flex items-center gap-2 sm:gap-3">
                            <motion.div 
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.6 }}
                              className="p-2 sm:p-2.5 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg group-hover:shadow-gray-500/50 transition-all duration-300 flex-shrink-0"
                            >
                              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </motion.div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-0.5 truncate">Settings</p>
                              <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 line-clamp-1">Configure wallet</p>
                            </div>
                          </div>
                          {/* Arrow pointing to wallet */}
                          <div className="absolute -top-2 right-4 sm:right-6 w-4 h-4 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/30 border-r-2 border-t-2 border-gray-200/60 dark:border-gray-700/60 rotate-45"></div>
                        </motion.div>
                      </motion.div>
                    </div>

                    {/* Wallet Demo - Inline Component */}
                    <WalletDemoPopup
                      actionView={demoActionView}
                      demoData={{
                          sendAmount: demoSendAmount,
                          addMoneyAmount: demoAddMoneyAmount,
                          selectedRecipient: demoSelectedRecipient,
                          showSuccess: demoShowSuccess,
                          successType: demoSuccessType,
                          successMessage: demoSuccessMessage,
                          clickPoint: demoClickPoint
                      }}
                    />
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>


          {/* Part 2: Three Pillars */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="mb-16 sm:mb-20"
          >
            <div className="max-w-6xl mx-auto">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-center mb-12 sm:mb-16"
              >
                <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 dark:from-purple-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  What Makes Believe Cash Different
              </span>
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-10">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -8, rotateY: 5 }}
                  className="group relative bg-white/90 dark:bg-purple-900/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-5 sm:p-6 border-2 border-purple-200/60 dark:border-purple-500/40 shadow-xl hover:shadow-2xl hover:shadow-purple-500/20 dark:hover:shadow-purple-500/10 transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-800/50 dark:to-blue-800/50 rounded-xl mb-4 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="h-8 w-8 text-purple-600 dark:text-white/70 z-10" />
                    <X className="h-10 w-10 text-red-500 dark:text-red-400 absolute z-20" strokeWidth={3.5} />
                  </div>
                  <p className="text-gray-900 dark:text-white text-lg sm:text-xl font-bold text-center relative z-10">Not owned by banks.</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -8, rotateY: 5 }}
                  className="group relative bg-white/90 dark:bg-purple-900/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-5 sm:p-6 border-2 border-purple-200/60 dark:border-purple-500/40 shadow-xl hover:shadow-2xl hover:shadow-purple-500/20 dark:hover:shadow-purple-500/10 transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-800/50 dark:to-blue-800/50 rounded-xl mb-4 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-8 w-8 text-purple-600 dark:text-white/70 z-10" />
                    <X className="h-10 w-10 text-red-500 dark:text-red-400 absolute z-20" strokeWidth={3.5} />
                  </div>
                  <p className="text-gray-900 dark:text-white text-lg sm:text-xl font-bold text-center relative z-10">Not driven by shareholders.</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -8, rotateY: 5 }}
                  className="group relative bg-white/90 dark:bg-purple-900/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-5 sm:p-6 border-2 border-purple-200/60 dark:border-purple-500/40 shadow-xl hover:shadow-2xl hover:shadow-purple-500/20 dark:hover:shadow-purple-500/10 transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-800/50 dark:to-blue-800/50 rounded-xl mb-4 mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Star className="h-8 w-8 text-purple-600 dark:text-white/70 z-10" />
                    <X className="h-10 w-10 text-red-500 dark:text-red-400 absolute z-20" strokeWidth={3.5} />
                  </div>
                  <p className="text-gray-900 dark:text-white text-lg sm:text-xl font-bold text-center relative z-10">Not built for profit extraction.</p>
                </motion.div>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                viewport={{ once: true }}
                className="text-gray-700 dark:text-white text-xl sm:text-2xl text-center max-w-4xl mx-auto font-semibold leading-relaxed"
              >
                This structure allows <span className="text-purple-600 dark:text-purple-400 font-bold">fees to stay lower</span> and <span className="text-blue-600 dark:text-blue-400 font-bold">impact to stay higher</span>.
              </motion.p>
            </div>
          </motion.div>

          {/* Part 3: Mission Section */}
            <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="mb-16 sm:mb-20"
          >
            <div className="max-w-6xl mx-auto">
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-white/30"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-purple-50 dark:bg-purple-900 px-4 sm:px-6 text-purple-900 dark:text-white text-sm sm:text-base font-semibold">OUR MISSION</span>
                </div>
              </div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-center mb-12 sm:mb-16"
              >
                <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 dark:from-purple-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Combat High Transaction Fees
                </span>
              </motion.h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <ul className="space-y-6">
                    <motion.li
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      viewport={{ once: true }}
                      className="flex items-start gap-4 group"
                    >
                      <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-gray-900 dark:text-white text-xl sm:text-2xl font-semibold pt-1">Reduce unnecessary transaction costs</span>
                    </motion.li>
                    <motion.li
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      viewport={{ once: true }}
                      className="flex items-start gap-4 group"
                    >
                      <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-gray-900 dark:text-white text-xl sm:text-2xl font-semibold pt-1">Support nonprofit fundraising</span>
                    </motion.li>
                    <motion.li
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      viewport={{ once: true }}
                      className="flex items-start gap-4 group"
                    >
                      <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-gray-900 dark:text-white text-xl sm:text-2xl font-semibold pt-1">Keep money within communities</span>
                    </motion.li>
                  </ul>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  viewport={{ once: true }}
                  className="flex justify-center lg:justify-end"
                >
                  <div className="relative w-full max-w-md">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-3xl blur-2xl"></div>
                    <div className="relative flex items-center justify-between gap-6 p-8 bg-white/90 dark:bg-purple-900/40 backdrop-blur-xl rounded-3xl border-2 border-purple-200/60 dark:border-purple-500/40 shadow-2xl">
                      <div className="text-center">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 mx-auto border-2 border-purple-200 dark:border-white/20 shadow-xl"
                        >
                          <div className="text-4xl sm:text-5xl">💰</div>
                        </motion.div>
                        <div className="text-gray-900 dark:text-white font-bold text-base sm:text-lg tracking-wide">COMMUNITY</div>
                      </div>
                      <div className="flex-1 flex flex-col gap-3">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: 1 }}
                          transition={{ delay: 0.6, duration: 0.8 }}
                          viewport={{ once: true }}
                          className="flex items-center"
                        >
                          <ArrowRight className="h-7 w-7 text-green-500 dark:text-green-400" />
                          <div className="flex-1 h-1 bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-400 dark:to-emerald-400 rounded-full shadow-lg"></div>
                        </motion.div>
                        <motion.div
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: 1 }}
                          transition={{ delay: 0.7, duration: 0.8 }}
                          viewport={{ once: true }}
                          className="flex items-center"
                        >
                          <div className="flex-1 h-1 bg-gradient-to-l from-green-500 to-emerald-500 dark:from-green-400 dark:to-emerald-400 rounded-full shadow-lg"></div>
                          <ArrowRight className="h-7 w-7 text-green-500 dark:text-green-400 rotate-180" />
                        </motion.div>
                      </div>
                      <div className="text-center">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: -5 }}
                          className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 mx-auto border-2 border-purple-200 dark:border-white/20 shadow-xl"
                        >
                          <Heart className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 dark:text-red-400" />
                        </motion.div>
                        <div className="text-gray-900 dark:text-white font-bold text-base sm:text-lg tracking-wide">NONPROFITS</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
            </motion.div>

          {/* Part 4: Savings Snapshot */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <p className="text-orange-600 dark:text-orange-400 font-bold text-sm sm:text-base mb-3 tracking-wider">CONSERVATIVE SAVINGS SNAPSHOT</p>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4">
                <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 dark:from-purple-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Where Users Typically Save
                </span>
              </h2>
              <p className="text-gray-600 dark:text-white/80 text-lg sm:text-xl font-medium">
                Compared to common industry fee ranges
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-blue-400/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-white/95 dark:bg-purple-900/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-2 border-purple-200/60 dark:border-purple-500/40 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/50 dark:to-blue-900/50 border-b-2 border-purple-200 dark:border-white/20">
                        <th className="px-6 sm:px-8 py-5 text-left text-gray-900 dark:text-white font-bold text-base sm:text-lg">Transaction Type</th>
                        <th className="px-6 sm:px-8 py-5 text-left text-gray-900 dark:text-white font-bold text-base sm:text-lg">Typical Savings</th>
                      </tr>
                    </thead>
                    <tbody>
                      <motion.tr
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        viewport={{ once: true }}
                        className="border-b border-gray-200/50 dark:border-white/10 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/50 dark:hover:from-purple-900/20 dark:hover:to-blue-900/20 transition-all duration-300 group"
                      >
                        <td className="px-6 sm:px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                              <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <span className="text-gray-900 dark:text-white text-base sm:text-lg font-semibold">Instant Transfers</span>
                          </div>
                        </td>
                        <td className="px-6 sm:px-8 py-5">
                          <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-base sm:text-lg rounded-lg shadow-lg">
                            25%-50%
                          </span>
                        </td>
                      </motion.tr>
                      <motion.tr
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        viewport={{ once: true }}
                        className="border-b border-gray-200/50 dark:border-white/10 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/50 dark:hover:from-purple-900/20 dark:hover:to-blue-900/20 transition-all duration-300 group"
                      >
                        <td className="px-6 sm:px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                              <Heart className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="text-gray-900 dark:text-white text-base sm:text-lg font-semibold">Nonprofit Donations</span>
                          </div>
                        </td>
                        <td className="px-6 sm:px-8 py-5">
                          <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-base sm:text-lg rounded-lg shadow-lg">
                            50%-70%
                          </span>
                        </td>
                      </motion.tr>
                      <motion.tr
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        viewport={{ once: true }}
                        className="border-b border-gray-200/50 dark:border-white/10 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/50 dark:hover:from-purple-900/20 dark:hover:to-blue-900/20 transition-all duration-300 group"
                      >
                        <td className="px-6 sm:px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                              <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-gray-900 dark:text-white text-base sm:text-lg font-semibold">Marketplace & Peer Payments</span>
                          </div>
                        </td>
                        <td className="px-6 sm:px-8 py-5">
                          <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-base sm:text-lg rounded-lg shadow-lg">
                            60%-75%
                          </span>
                        </td>
                      </motion.tr>
                      <motion.tr
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        viewport={{ once: true }}
                        className="hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/50 dark:hover:from-purple-900/20 dark:hover:to-blue-900/20 transition-all duration-300 group"
                      >
                        <td className="px-6 sm:px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                              <ArrowRightLeft className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="text-gray-900 dark:text-white text-base sm:text-lg font-semibold">Add / Withdraw Funds</span>
                  </div>
                        </td>
                        <td className="px-6 sm:px-8 py-5">
                          <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-base sm:text-lg rounded-lg shadow-lg">
                            30%-50%
                          </span>
                        </td>
                      </motion.tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Why Choose {import.meta.env.VITE_APP_NAME}?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              We make charitable giving transparent, secure, and impactful
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="text-center group"
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-900">
                  <CardContent className="pt-8 pb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center text-white max-w-4xl mx-auto"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Make a Difference?</h2>
            <p className="text-xl md:text-2xl mb-12 opacity-90 leading-relaxed">
              Join thousands of supporters creating positive change. Start your impact journey today.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/register">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4 text-lg"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                onClick={handleSearch}
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 bg-transparent font-semibold px-8 py-4 text-lg"
              >
                Explore Organizations
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
            </div>
    </FrontendLayout>
  )
}

"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState, useEffect, useRef } from "react"
import { Search, Heart, Globe, ArrowRight, Star, CheckCircle, TrendingUp, Award, Shield, ShieldCheck, MapPin, Users, Building2, X, Zap, ShoppingCart, Store, ArrowRightLeft, Handshake, Wallet, Copy, Check, RefreshCw, ArrowUpRight, ArrowDownLeft, Plus, Activity, CreditCard, Banknote, Settings, Ticket, Gift, Coins, ChevronRight, UtensilsCrossed, Gamepad2, Plane, Music, PawPrint, GraduationCap, Leaf } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import { Progress } from "@/components/frontend/ui/progress"
import { motion } from "framer-motion"
import { Link, router, usePage } from "@inertiajs/react"
import SearchSection from "@/components/frontend/SearchSection"
import { WalletDemoPopup } from "@/components/WalletDemoPopup"
import { PageHead } from "@/components/frontend/PageHead"

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
    seo?: { title: string; description?: string }
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
    const { seo } = usePage<PageProps>().props
    const [isLoading, setIsLoading] = useState(false)
    const [hasStartedDemo, setHasStartedDemo] = useState(false)
    const [walletPopupOpen, setWalletPopupOpen] = useState(false)
    const [selectedPoints, setSelectedPoints] = useState(50)
    const [activeTab, setActiveTab] = useState<"organizations" | "merchants">("organizations")
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

    // TEMP: show only the hero section on homepage
    const showOnlyHero = false

    const staticOrganizations = [
      {
        name: "Helping Paws Shelter",
        verified: true,
        description: "Providing rescue, care, and adoption for homeless pets.",
        raised: "$4,785",
        Icon: PawPrint,
      },
      {
        name: "Bright Futures Fund",
        verified: true,
        description: "Empowering students through education and scholarships.",
        raised: "$7,320",
        Icon: GraduationCap,
      },
      {
        name: "Green Earth Initiative",
        verified: true,
        description: "Working for a cleaner, greener and sustainable future.",
        raised: "$3,210",
        Icon: Leaf,
      },
    ]

    const staticMerchants = [
      { name: "Smart Watch Series 9", category: "Raffle", impact: "Enter Raffle" },
      { name: "FitWear", category: "Activewear", impact: "Shop Now" },
      { name: "TasteBite", category: "Food & Dining", impact: "Shop Now" },
    ]

    const pointOptions = [
      { amount: 10, bp: 10 },
      { amount: 25, bp: 25, popular: true },
      { amount: 50, bp: 50 },
      { amount: 100, bp: 100 },
      { amount: 250, bp: 250 },
      { amount: 500, bp: 500 },
    ]

    const giftCards = [
      { name: "ShopHub", range: "From $10 - $500", color: "bg-blue-600", Icon: ShoppingCart },
      { name: "Foodie", range: "From $10 - $250", color: "bg-red-600", Icon: UtensilsCrossed },
      { name: "GameZone", range: "From $10 - $100", color: "bg-green-600", Icon: Gamepad2 },
      { name: "QuickMart", range: "From $10 - $500", color: "bg-gray-900", Icon: Store },
      { name: "FlyNext", range: "From $25 - $500", color: "bg-sky-500", Icon: Plane },
      { name: "TuneWave", range: "From $10 - $200", color: "bg-violet-600", Icon: Music },
    ]

    return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Home"} description={seo?.description} />
    <div className="min-h-screen">
      {/* Homepage hero — Believ.Cash style (background: public/images/top-hero.png) */}
      <section className="relative overflow-hidden min-h-[280px] pb-8 sm:min-h-[320px] sm:pb-10 md:min-h-[360px] md:pb-12 lg:min-h-[400px] lg:pb-14">
        <div
          className="absolute inset-0 bg-cover bg-[position:center_right_20%] bg-no-repeat sm:bg-[position:center_20%]"
          style={{ backgroundImage: "url(/images/top-hero.png)" }}
        />
        {/* Readability overlay — stronger on the left where copy sits */}
        <div
          className="absolute inset-0 z-[1] bg-gradient-to-r from-[#0b061a]/95 via-[#13062b]/82 to-[#2d1560]/50"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-40 bg-[radial-gradient(ellipse_80%_60%_at_70%_45%,rgba(147,51,234,0.35),transparent_65%)]"
          aria-hidden
        />

        <div className="relative z-[2] mx-auto max-w-7xl px-4 py-8 sm:py-10 md:py-12 lg:py-16">
          <div className="max-w-full sm:max-w-xl md:max-w-2xl">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.65 }}
                className="text-left"
              >
                <motion.h1
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.08 }}
                  className="text-2xl font-bold text-white sm:text-3xl md:text-4xl lg:text-5xl"
                >
                  Support What Matters.
                </motion.h1>

                <motion.h2
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.14 }}
                  className="mt-1 text-xl font-bold sm:mt-2 sm:text-2xl md:text-3xl lg:text-4xl"
                >
                  <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    Give. Win. Shop. Make Impact.
                  </span>
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.2 }}
                  className="mt-3 text-sm text-gray-300 sm:mt-4 sm:text-base md:text-lg"
                >
                  Support verified organizations and amazing merchants. Your support makes a real difference.
                </motion.p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.28 }}
                className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3 lg:flex-nowrap"
              >
                {[
                  {
                    Icon: Heart,
                    title: "Donate Now",
                    sub: "Support Organizations",
                    iconBg: "bg-violet-600",
                  },
                  {
                    Icon: Ticket,
                    title: "Enter Raffle",
                    sub: "Win Amazing Prizes",
                    iconBg: "bg-blue-600",
                  },
                  {
                    Icon: Gift,
                    title: "Buy Gift Card",
                    sub: "For Yourself or Others",
                    iconBg: "bg-green-600",
                  },
                  {
                    Icon: Coins,
                    title: "Add Points",
                    sub: "1 BP = $1",
                    iconBg: "bg-amber-600",
                  },
                ].map(({ Icon, title, sub, iconBg }) => (
                  <button
                    type="button"
                    key={title}
                    className="flex w-full items-center gap-2 rounded-lg bg-white/10 px-2.5 py-2 text-left backdrop-blur-sm transition-all hover:bg-white/20 sm:w-auto sm:gap-3 sm:rounded-xl sm:px-4 sm:py-3"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg} sm:h-10 sm:w-10`}>
                      <Icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="truncate text-xs font-semibold text-white sm:text-sm">{title}</span>
                      <span className="hidden text-xs text-gray-300 sm:block">{sub}</span>
                    </span>
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-400 sm:ml-2 sm:h-5 sm:w-5" />
                  </button>
                ))}
              </motion.div>
            </div>
          </div>
      </section>

      {!showOnlyHero && (
        <>
          {/* Overlapping Tabs Bar - Only Left Side */}
          <div className="relative z-10 -mt-4 sm:-mt-5 md:-mt-6 lg:-mt-8">
            <div className="mx-auto max-w-7xl px-3 sm:px-4">
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                {/* Left - Tabs */}
                <div className="lg:col-span-2">
                  <div className="rounded-t-lg bg-gray-100 px-3 py-2 sm:px-4 sm:py-2.5 dark:bg-white/5">
                    <div role="tablist" aria-label="Homepage tabs" className="flex w-full gap-1 sm:gap-2">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "organizations"}
                        onClick={() => setActiveTab("organizations")}
                        className={[
                          "relative overflow-hidden flex flex-1 items-center gap-2 rounded-md px-3 py-2 sm:px-4 sm:py-2.5 transition-colors",
                          activeTab === "organizations"
                            ? "text-violet-700"
                            : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10",
                        ].join(" ")}
                      >
                        {activeTab === "organizations" && (
                          <motion.span
                            layoutId="home-tabs-active-pill"
                            className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-white/10"
                            transition={{ type: "spring", stiffness: 420, damping: 36 }}
                          />
                        )}
                        <Building2 className={["relative z-10 h-4 w-4 shrink-0", activeTab === "organizations" ? "text-violet-600" : "text-muted-foreground"].join(" ")} />
                        <div className="relative z-10 min-w-0 text-left">
                          <div className={["text-xs sm:text-sm font-semibold truncate", activeTab === "organizations" ? "text-violet-600" : "text-muted-foreground"].join(" ")}>
                            Organizations
                          </div>
                          <div className="hidden text-[10px] text-muted-foreground sm:block">Make a difference</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "merchants"}
                        onClick={() => setActiveTab("merchants")}
                        className={[
                          "relative overflow-hidden flex flex-1 items-center gap-2 rounded-md px-3 py-2 sm:px-4 sm:py-2.5 transition-colors",
                          activeTab === "merchants"
                            ? "text-violet-700"
                            : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10",
                        ].join(" ")}
                      >
                        {activeTab === "merchants" && (
                          <motion.span
                            layoutId="home-tabs-active-pill"
                            className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-white/10"
                            transition={{ type: "spring", stiffness: 420, damping: 36 }}
                          />
                        )}
                        <Store className={["relative z-10 h-4 w-4 shrink-0", activeTab === "merchants" ? "text-violet-600" : "text-muted-foreground"].join(" ")} />
                        <div className="relative z-10 min-w-0 text-left">
                          <div className={["text-xs sm:text-sm font-semibold truncate", activeTab === "merchants" ? "text-violet-600" : "text-muted-foreground"].join(" ")}>
                            Merchants
                          </div>
                          <div className="hidden text-[10px] text-muted-foreground sm:block">Shop and support</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="relative z-10 mx-auto max-w-7xl px-3 pb-8 sm:px-4 sm:pb-12">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
              {/* Left Column - Organizations & Merchants */}
              <div className="lg:col-span-2">
                <Card className="rounded-t-none border-border bg-card">
                  <CardContent className="p-4 sm:p-6">
                    {activeTab === "organizations" ? (
                      <div role="tabpanel" aria-label="Organizations">
                        <div className="mb-3 flex items-center justify-between sm:mb-4">
                          <h3 className="text-base font-semibold text-foreground sm:text-lg">Featured Organizations</h3>
                      <button type="button" className="text-xs font-medium text-violet-600 hover:underline sm:text-sm">
                            View All
                      </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 auto-rows-fr">
                      {staticOrganizations.map((org) => (
                        <div key={org.name} className="h-full rounded-lg border border-border bg-card p-4 flex flex-col">
                              <div className="mb-3 flex items-start justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600">
                              <org.Icon className="h-5 w-5 text-white" />
                                </div>
                            {org.verified && (
                              <Badge className="bg-green-100 text-xs text-green-700">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Verified
                              </Badge>
                            )}
                              </div>
                          <h4 className="font-semibold text-foreground line-clamp-2">{org.name}</h4>
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {org.description}
                              </p>
                              <div className="mt-3">
                                <div className="text-xs text-muted-foreground">Total Raised</div>
                            <div className="text-lg font-bold text-foreground">{org.raised}</div>
                              </div>
                          <div className="mt-auto">
                                <Button className="mt-4 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700" size="sm">
                                  <Heart className="mr-1 h-3 w-3" fill="white" />
                                  Donate
                                </Button>
                          </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div role="tabpanel" aria-label="Merchants">
                        <div className="mb-3 flex items-center justify-between sm:mb-4">
                          <h3 className="text-base font-semibold text-foreground sm:text-lg">Featured Merchants</h3>
                          <button type="button" className="text-xs font-medium text-violet-600 hover:underline sm:text-sm">
                            View All
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 auto-rows-fr">
                          {[
                            { name: "Urban Style", category: "Fashion & Apparel", impact: "10%" },
                            { name: "Brew House", category: "Coffee & Beverages", impact: "5%" },
                            { name: "Pawfect Pets", category: "Pet Supplies", impact: "5%" },
                            { name: "Fit Life", category: "Health & Fitness", impact: "8%" },
                          ].map((merchant) => (
                            <div key={merchant.name} className="h-full rounded-lg border border-border bg-card p-4 text-center flex flex-col">
                              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-violet-600">
                                <Store className="h-6 w-6 text-white" />
                              </div>
                              <h4 className="font-semibold text-foreground line-clamp-1">{merchant.name}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-1">{merchant.category}</p>
                              <p className="mt-1 text-xs text-violet-600 line-clamp-2">{merchant.impact} of sales go to impact</p>
                              <Button type="button" className="mt-auto w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700" size="sm">
                                Shop Now
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Gift Cards and Add Points - Side by Side */}
                <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 md:grid-cols-2">
                  {/* Gift Cards Section */}
                  <Card className="border-border">
                    <CardContent className="p-4 sm:p-6">
                      <div className="mb-3 flex items-center justify-between sm:mb-4">
                        <h3 className="text-base font-semibold text-foreground sm:text-lg">Gift Cards</h3>
                      <button type="button" className="text-xs font-medium text-violet-600 hover:underline sm:text-sm">
                          View All
                      </button>
                      </div>
                      {/* 3 columns like the mockup */}
                      <div className="grid grid-cols-3 gap-3 sm:gap-4">
                        {giftCards.map((card) => (
                          <div key={card.name} className="text-center">
                            <div
                              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-lg sm:h-16 sm:w-16 ${card.color} ${
                                card.color === "bg-gray-100" ? "text-gray-600" : "text-white"
                              } text-xs font-bold`}
                            >
                              <card.Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                            </div>
                            <div className="mt-1.5 text-xs font-medium text-foreground sm:mt-2 sm:text-sm truncate">{card.name}</div>
                            <div className="text-[10px] text-muted-foreground sm:text-xs line-clamp-2">{card.range}</div>
                          </div>
                        ))}
                      </div>
                      <div className="block">
                        <Button type="button" className="mt-3 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 sm:mt-4">
                          <Gift className="mr-2 h-4 w-4" />
                          Buy Gift Card
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Add Points Section */}
                  <Card className="border-border">
                    <CardContent className="p-4 sm:p-6 overflow-visible">
                      <div className="mb-3 flex items-center justify-between sm:mb-4">
                        <h3 className="text-base font-semibold text-foreground sm:text-lg">Add Points (BP)</h3>
                        <span className="text-xs text-violet-600 sm:text-sm">1 BP = $1</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {pointOptions.slice(0, 3).map((option) => (
                          <button
                            key={option.amount}
                            onClick={() => setSelectedPoints(option.amount)}
                            className={`relative rounded-lg border-2 px-2 py-2.5 sm:px-3 sm:py-3 text-center transition-all min-h-[64px] flex flex-col items-center justify-center ${
                              selectedPoints === option.amount
                                ? "border-transparent bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm"
                                : "border-border bg-white/0 hover:border-violet-300 hover:bg-violet-50/50"
                            }`}
                          >
                            {option.popular && (
                              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-[10px] text-white sm:text-xs shadow-sm">
                                Popular
                              </Badge>
                            )}
                            <div className={`text-base font-bold sm:text-xl leading-none ${selectedPoints === option.amount ? "text-white" : "text-foreground"}`}>
                              ${option.amount}
                            </div>
                            <div className={`mt-1 text-xs sm:text-sm leading-none ${selectedPoints === option.amount ? "text-white/85" : "text-violet-600"}`}>
                              {option.bp} BP
                            </div>
                          </button>
                        ))}
                      </div>
                      {pointOptions.length > 3 && (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                          {pointOptions.slice(3).map((option) => (
                            <button
                              key={option.amount}
                              onClick={() => setSelectedPoints(option.amount)}
                              className={`relative rounded-lg border-2 px-2 py-2.5 sm:px-3 sm:py-3 text-center transition-all min-h-[64px] flex flex-col items-center justify-center ${
                                selectedPoints === option.amount
                                  ? "border-transparent bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm"
                                  : "border-border bg-white/0 hover:border-violet-300 hover:bg-violet-50/50"
                              }`}
                            >
                              <div className={`text-base font-bold sm:text-xl leading-none ${selectedPoints === option.amount ? "text-white" : "text-foreground"}`}>
                                ${option.amount}
                              </div>
                              <div className={`mt-1 text-xs sm:text-sm leading-none ${selectedPoints === option.amount ? "text-white/85" : "text-violet-600"}`}>
                                {option.bp} BP
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="block">
                        <Button type="button" className="mt-3 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 sm:mt-4">
                          <Wallet className="mr-2 h-4 w-4" />
                          Add Points Now
                        </Button>
                      </div>
                      <p className="mt-2 text-center text-xs text-muted-foreground sm:text-sm">
                        Use BP for Donations, Raffles, Gift Cards & Merchants
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Right Column - Raffles & Wallet */}
              <div className="space-y-4 sm:space-y-6 lg:mt-[-5rem]">
                {/* Active Raffles */}
                <Card className="border-border bg-card">
                  <CardContent className="p-4 sm:p-6">
                    <div className="mb-3 flex items-center justify-between sm:mb-4">
                      <h3 className="text-base font-semibold text-foreground sm:text-lg">Active Raffles</h3>
                      <button type="button" className="text-xs font-medium text-violet-600 hover:underline sm:text-sm">
                        View All
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-border">
                      <div className="flex flex-col sm:flex-row">
                        <div className="aspect-video w-full bg-gray-100 sm:aspect-square sm:w-32 md:w-40 dark:bg-white/10" />
                        <div className="flex-1 p-3 sm:p-4">
                          <h4 className="text-sm font-semibold text-foreground sm:text-base line-clamp-2">
                            Smart Watch Series 9
                            <br />
                            Raffle
                          </h4>
                          <div className="mt-1 text-xs text-muted-foreground">Ticket Price</div>
                          <div className="text-lg font-bold text-foreground sm:text-xl">$2.00</div>

                          <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3 sm:grid-cols-4 sm:gap-2">
                            {[
                              { value: "12", label: "DAYS" },
                              { value: "08", label: "HRS" },
                              { value: "34", label: "MINS" },
                              { value: "19", label: "SECS" },
                            ].map((t) => (
                              <div
                                key={t.label}
                                className="min-w-0 w-full aspect-square rounded-md bg-violet-100 p-1.5 sm:rounded-lg sm:p-2 dark:bg-white/10 flex flex-col items-center justify-center text-center"
                              >
                                <div className="text-base font-bold text-violet-600 sm:text-lg leading-none whitespace-nowrap">{t.value}</div>
                                <div className="mt-1 text-[8px] sm:text-[10px] text-violet-500 leading-none whitespace-nowrap">
                                  {t.label}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Progress and Button */}
                      <div className="border-t border-border p-3 sm:p-4">
                        <Progress value={3} className="h-2 bg-red-100" />
                        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground sm:text-xs">
                          <span>148 / 5,000 Tickets Sold</span>
                          <span>3% Sold</span>
                        </div>

                        <div className="block">
                          <Button type="button" className="mt-3 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 sm:mt-4">
                            <Ticket className="mr-2 h-4 w-4" />
                            Enter Raffle
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* My Wallet */}
                <Card className="border-border bg-gradient-to-br from-gray-900 to-gray-800">
                  <CardContent className="p-4 text-white sm:p-6">
                    <div className="mb-3 flex items-center gap-2 sm:mb-4">
                      <span className="text-xl font-bold sm:text-2xl">1 BP = $1</span>
                    </div>

                    <div className="rounded-lg bg-white/10 p-3 backdrop-blur-sm sm:p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 sm:h-8 sm:w-8">
                          <Heart className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" fill="white" />
                        </div>
                        <span className="text-sm font-medium sm:text-base">HappySupporter</span>
                      </div>
                      <div className="mt-3 text-xs text-gray-400 sm:mt-4 sm:text-sm">My Wallet</div>
                      <div className="mt-3 text-xs text-gray-400 sm:mt-4 sm:text-sm">BP Balance</div>
                      <div className="text-2xl font-bold sm:text-3xl">
                        850 <span className="text-base text-violet-400 sm:text-lg">BP</span>
                      </div>
                      <div className="text-xs text-gray-400 sm:text-sm">= $850.00</div>
                    </div>

                    <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
                      {["Use BP to Donate", "Use BP for Raffles", "Use BP for Gift Cards", "Use BP at Merchants"].map((label) => (
                        <div key={label} className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                          <Check className="h-3.5 w-3.5 shrink-0 text-violet-400 sm:h-4 sm:w-4" />
                          <span className="text-gray-300">{label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Stats Section */}
            <div className="mt-8 grid gap-3 grid-cols-2 sm:mt-12 sm:gap-4 md:gap-6 lg:grid-cols-5">
              {[
                { Icon: Heart, value: "$2,541,230", label: "Total Raised", iconColor: "text-violet-600", iconBg: "bg-violet-100" },
                { Icon: Users, value: "18,693", label: "Lives Impacted", iconColor: "text-blue-600", iconBg: "bg-blue-100" },
                { Icon: Building2, value: "152", label: "Organizations Supported", iconColor: "text-orange-600", iconBg: "bg-orange-100" },
                { Icon: Handshake, value: "342", label: "Merchants Partnered", iconColor: "text-amber-600", iconBg: "bg-amber-100" },
                { Icon: ShieldCheck, value: "100% Secure", label: "Your donations are safe with us.", iconColor: "text-green-600", iconBg: "bg-green-100" },
              ].map(({ Icon, value, label, iconColor, iconBg }) => (
                <Card key={label} className="border-border">
                  <CardContent className="flex flex-col items-center gap-2 p-3 text-center sm:flex-row sm:gap-4 sm:p-4 sm:text-left">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${iconBg}`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
                    </div>
                    <div>
                      <div className="text-base font-bold text-foreground sm:text-xl">{value}</div>
                      <div className="text-xs text-muted-foreground sm:text-sm leading-snug line-clamp-2">{label}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </>
      )}

      {false && (
        <>
      {/* What Makes Believe Cash Different Section */}
      <section id="features" className="py-20 sm:py-24 md:py-32 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950 dark:via-purple-900 dark:to-blue-950 relative overflow-visible">
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
        </>
      )}
            </div>
    </FrontendLayout>
  )
}

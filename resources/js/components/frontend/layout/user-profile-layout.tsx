"use client"
import type React from "react"
import { useEffect, useState } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import {
  Heart,
  ShoppingBag,
  TrendingUp,
  Calendar,
  Edit3,
  Plus,
  Minus,
  Award,
  Target,
  Star,
  Activity,
  X,
  Tag,
  MessageCircle,
  UserCheck,
  PieChart,
  User,
  CreditCard,
  GraduationCap,
  UserCheck, // Added MessageCircle icon
  PieChart,
  Clock,
  Gift,
  Menu,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Badge } from "@/components/frontend/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Link, router, usePage } from "@inertiajs/react"
import { LogOut } from "lucide-react"
import { showSuccessToast } from "@/lib/toast"
import ProfileNavigation from "@/components/frontend/profile-navigation"
import ReferralSection from "@/components/frontend/referral-section"

interface ProfileLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
}

interface Topic {
  id: number
  name: string
  color: string
}

interface PageProps {
  auth: {
    user: {
      id: number
      name: string
      email: string
      phone?: string
      image?: string
      joined: string
      total_donated?: number
      favorite_organizations_count?: number
      total_orders?: number
      impact_score?: number
      referral_link?: string
      wallet_balance?: number
      reward_points?: number
    }
  }
  [key: string]: any
}

const navigationItems = [
  {
    name: "Overview",
    href: "/profile",
    icon: User,
    description: "Profile overview",
    color: "from-blue-500 to-blue-600",
  },
  {
    name: "Following",
    href: "/profile/following",
    icon: UserCheck,
    description: "Following organizations",
    color: "from-red-500 to-pink-600",
  },
  {
    name: "Donations",
    href: "/profile/donations",
    icon: CreditCard,
    description: "Donation history",
    color: "from-green-500 to-emerald-600",
  },
  {
    name: "Orders",
    href: "/profile/orders",
    icon: ShoppingBag,
    description: "Purchase history",
    color: "from-orange-500 to-amber-600",
  },
  {
    name: "Course",
    href: "/profile/course",
    icon: GraduationCap,
    description: "Course management",
    color: "from-purple-500 to-indigo-600",
  },
  {
    name: "Enrollments",
    href: "/profile/my-enrollments",
    icon: BookOpen,
    description: "Course enrollments",
    color: "from-purple-500 to-violet-600",
  },
  {
    name: "Events",
    href: "/profile/events",
    icon: Calendar,
    description: "My events",
    color: "from-blue-500 to-cyan-600",
  },
  {
    name: "Raffle Tickets",
    href: "/profile/raffle-tickets",
    icon: Award,
    description: "My raffle tickets",
    color: "from-yellow-500 to-orange-600",
  },
  {
    name: "Time Sheet",
    href: "/profile/timesheet",
    icon: Clock,
    description: "Volunteer timesheet",
    color: "from-teal-500 to-green-600",
  },
  // {
  //   name: "Node Boss",
  //   href: "/nodeboss/shares",
  //   icon: TrendingUp,
  //   description: "Investment shares",
  //   color: "from-indigo-500 to-blue-600",
  // },
  {
    name: "Fractional Ownership",
    href: "/profile/fractional-ownership",
    icon: PieChart,
    description: "My fractional ownership investments",
    color: "from-indigo-500 to-blue-600",
  },
  {
    name: "Transactions",
    href: "/profile/transactions",
    icon: Receipt,
    description: "All transactions",
    color: "from-teal-500 to-cyan-600",
  },
  {
    name: "Billings",
    href: "/profile/billing",
    icon: CreditCard,
    description: "Billing & wallet",
    color: "from-indigo-500 to-purple-600",
  },
  {
    name: "Security",
    href: "/profile/change-password",
    icon: Shield,
    description: "Password & security",
    color: "from-gray-500 to-slate-600",
  },
]

export default function ProfileLayout({ children, title, description }: ProfileLayoutProps) {
  const { auth, isImpersonating } = usePage<PageProps & { isImpersonating?: boolean }>().props
  const user = auth.user
  const [topics, setTopics] = useState<Topic[]>([])
  const [addFundsAmount, setAddFundsAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)

    const [isTopicsModalOpen, setIsTopicsModalOpen] = useState(false)
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch topics on component mount
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await fetch("/chat/user/topics", {
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          setTopics(data || [])
        } else {
          console.error("Failed to fetch topics")
        }
      } catch (error) {
        console.error("Error fetching topics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTopics()
  }, [])

  const handleDeleteTopic = (topicId: number) => {
    if (confirm("Are you sure you want to remove this topic?")) {
      router.delete(`/chat/user/topics/${topicId}`, {
        preserveScroll: true,
        onSuccess: () => {
          setTopics((prevTopics) => prevTopics.filter((topic) => topic.id !== topicId))
        },
      })
    }
  }

  const navigateToChat = (topicId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    router.get(route("chat.index", { topic: topicId }))
  }

  const currentPath = typeof window !== "undefined" ? window.location.pathname : ""

  const handleAddFunds = () => {
    // Implementation for adding funds
  }

  const handleWithdraw = () => {
    // Implementation for withdrawing funds
  }

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-purple-600/90"></div>

          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute top-20 -left-10 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
            <div className="absolute bottom-10 right-20 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          </div>

          <div className="relative container mx-auto px-4 py-12">
            {/* Exit Impersonation Button */}
            {isImpersonating && (
              <div className="absolute top-4 right-4 z-10">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    router.post(route('users.stop-impersonate'), {}, {
                      onSuccess: () => {
                        showSuccessToast('Impersonation stopped. You are now logged in as yourself.');
                      },
                      onError: (errors) => {
                        console.error('Error stopping impersonation:', errors);
                      },
                    });
                  }}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Exit Impersonation</span>
                  <span className="sm:hidden">Exit</span>
                </Button>
              </div>
            )}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col lg:flex-row items-center gap-8"
            >
              {/* Profile Info */}
              <div className="flex flex-col sm:flex-row items-center gap-6 flex-1">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-white/30 to-white/10 rounded-full blur-sm"></div>
                  <Avatar className="relative w-24 h-24 sm:w-28 sm:h-28 border-4 border-white/20 shadow-2xl">
                    <AvatarImage
                      src={user.image ? `${user.image}` : "/placeholder.svg?height=112&width=112"}
                      alt="Profile"
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-white/20 to-white/10 text-white text-2xl font-bold backdrop-blur-sm">
                      {auth.user.name?.split(" ")[0]?.[0] || "J"}
                      {auth.user.name?.split(" ")[1]?.[0] || "D"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white">{user.name}</h1>
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm w-fit mx-auto sm:mx-0">
                      <Star className="w-3 h-3 mr-1" />
                      Premium Member
                    </Badge>
                  </div>
                  <p className="text-white/90 text-lg mb-4">{user.email}</p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-white/80">
                    <Calendar className="w-4 h-4" />
                    <span>Member since {user.joined}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/profile/edit">
                  <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm transition-all duration-300 hover:scale-105">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-8 relative z-10">
          {/* Mobile Menu Button */}
          <div className="lg:hidden mb-4">
            <Button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              variant="outline"
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            >
              <Menu className="h-5 w-5 mr-2" />
              Menu
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}

            {/* Fixed Left Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`lg:w-64 lg:flex-shrink-0 fixed lg:relative top-0 left-0 h-full lg:h-auto z-50 lg:z-auto w-64 ${
                isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
              } transition-transform duration-300 ease-in-out`}
            >
              <Card className="bg-white dark:bg-gray-800 shadow-xl border-0 lg:sticky lg:top-6 h-full lg:h-auto overflow-y-auto">
                <CardContent className="p-4">
                  {/* Close button for mobile */}
                  <div className="flex items-center justify-between mb-4 lg:hidden">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Menu</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    {navigationItems.map((item, index) => {
                      // For Overview, only match exactly /profile
                      // For other items, match exact path or paths starting with the href + '/'
                      const isActive = item.href === '/profile'
                        ? currentPath === item.href
                        : currentPath === item.href || currentPath.startsWith(item.href + '/')
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          preserveScroll={true}
                          preserveState={true}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className={`group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                              isActive
                                ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-l-4 border-blue-500 shadow-sm"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            }`}
                          >
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color} shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold text-sm ${
                                isActive ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"
                              }`}>
                                {item.name}
                              </h3>
                              <p className={`text-xs mt-0.5 truncate ${
                                isActive ? "text-blue-600 dark:text-blue-300" : "text-gray-500 dark:text-gray-400"
                              }`}>
                                {item.description}
                              </p>
                            </div>
                            {isActive && (
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            )}
                          </motion.div>
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              {/* Stats Cards - Only show on overview page */}
              {currentPath === "/profile" && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
                  >
                    <Card className="bg-white dark:bg-gray-800 shadow-xl border-0 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Donated</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                              ${user.total_donated?.toLocaleString() || 0}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              +12% this month
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg">
                            <Heart className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 shadow-xl border-0 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Organizations</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                              {user.favorite_organizations_count || 0}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center">
                              <Activity className="w-3 h-3 mr-1" />
                              Following
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
                            <UserCheck className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 shadow-xl border-0 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Orders</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{user.total_orders || 0}</p>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center">
                              <ShoppingBag className="w-3 h-3 mr-1" />
                              Completed
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-4 rounded-2xl shadow-lg">
                            <ShoppingBag className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-800 shadow-xl border-0 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Impact Score</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{user.impact_score || 8.5}/10</p>
                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center">
                              <Award className="w-3 h-3 mr-1" />
                              Excellent
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-4 rounded-2xl shadow-lg">
                            <Target className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Referral and Topics Section - Only show on overview page */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mb-8"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Referral Section */}
                      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-700 shadow-xl">
                        <CardContent className="p-6">
                          <div className="flex flex-col gap-4">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                                <Award className="w-5 h-5 mr-2 text-indigo-600" />
                                Share Your Referral Link
                              </h3>
                              <p className="text-gray-600 dark:text-gray-300 mb-4">
                                Invite friends and earn rewards when they join our community.
                              </p>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 relative">
                                  <Input
                                    type="text"
                                    value={user?.referral_link || ""}
                                    readOnly
                                    className="pr-12 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 font-mono text-sm"
                                  />
                                </div>
                                <Button
                                  onClick={handleCopy}
                                  className="bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 hover:scale-105"
                                >
                                  {copied ? (
                                    <>
                                      <Check className="w-4 h-4 mr-2" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-4 h-4 mr-2" />
                                      Copy Link
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                    </div>
                  </motion.div>
                </>
              )}

              {/* Page Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="pb-8"
              >
                <Card className="bg-white dark:bg-gray-800 shadow-xl border-0">
                  <CardContent className="p-6">
                    <div className="mb-6">
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{title}</h2>
                      {description && <p className="text-gray-600 dark:text-gray-300 text-lg">{description}</p>}
                    </div>
                    {children}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Add Funds Dialog */}
        <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-600" />
                Add Funds to Wallet
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={addFundsAmount}
                  onChange={(e) => setAddFundsAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleAddFunds} className="flex-1 bg-green-600 hover:bg-green-700">
                  Add Funds
                </Button>
                <Button variant="outline" onClick={() => setIsAddFundsOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Withdraw Dialog */}
        <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Minus className="w-5 h-5 text-red-600" />
                Withdraw from Wallet
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={user.wallet_balance || 0}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Available balance: ${user.wallet_balance || 0}</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleWithdraw} className="flex-1 bg-red-600 hover:bg-red-700">
                  Withdraw
                </Button>
                <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </FrontendLayout>
  )
}

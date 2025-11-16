"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  User,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Shield,
  Calendar,
  Award,
  BookOpen,
  X,
  Text,
  GraduationCap,
  UserCheck,
  Menu,
} from "lucide-react"
import { Link } from "@inertiajs/react"

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  color: string
}

const navigationItems: NavigationItem[] = [
  {
    name: "Overview",
    href: "/profile",
    icon: User,
    description: "Profile overview",
    color: "from-blue-500 to-blue-600",
  },
  {
    name: "Groups Chat",
    href: "/profile/topics/select",
    icon: Text,
    description: "Groups Chat",
    color: "from-green-400 to-blue-600",
  },
  {
    name: "Following",
    href: "/profile/following",
    icon: UserCheck,
    description: "Following orgs",
    color: "from-red-500 to-pink-600",
  },
  {
    name: "Donations",
    href: "/profile/donations",
    icon: CreditCard,
    description: "Donations",
    color: "from-green-500 to-emerald-600",
  },
  {
    name: "Orders",
    href: "/profile/orders",
    icon: ShoppingBag,
    description: "Orders",
    color: "from-orange-500 to-amber-600",
  },
  {
    name: "Course",
    href: "/profile/course",
    icon: GraduationCap,
    description: "Courses",
    color: "from-purple-500 to-indigo-600",
  },
  {
    name: "Enrollments",
    href: "/profile/my-enrollments",
    icon: BookOpen,
    description: "Enrollments",
    color: "from-purple-500 to-violet-600",
  },
  {
    name: "Events",
    href: "/profile/events",
    icon: Calendar,
    description: "Events",
    color: "from-blue-500 to-cyan-600",
  },
  {
    name: "Raffle",
    href: "/profile/raffle-tickets",
    icon: Award,
    description: "Tickets",
    color: "from-yellow-500 to-orange-600",
  },
  {
    name: "Node Boss",
    href: "/nodeboss/shares",
    icon: TrendingUp,
    description: "Shares",
    color: "from-indigo-500 to-blue-600",
  },
  {
    name: "Transactions",
    href: "/profile/transactions",
    icon: Receipt,
    description: "Transactions",
    color: "from-teal-500 to-cyan-600",
  },
  {
    name: "Security",
    href: "/profile/change-password",
    icon: Shield,
    description: "Password",
    color: "from-gray-500 to-slate-600",
  },
]

interface ProfileNavigationProps {
  currentPath: string
  onNavigate?: () => void
}

export default function ProfileNavigation({ currentPath, onNavigate }: ProfileNavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close menu on navigation
  const handleNavigate = () => {
    setIsMobileMenuOpen(false)
    onNavigate?.()
  }

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false)
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [])

  return (
    <>
      {/* Desktop Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="hidden lg:block mb-8"
      >
        <div className="bg-white dark:bg-gray-800 shadow-xl border-0 rounded-2xl p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12 gap-3">
            {navigationItems.map((item, index) => {
              const isActive = currentPath === item.href
              const Icon = item.icon
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link href={item.href} preserveScroll={true} preserveState={true} onClick={handleNavigate}>
                    <div
                      className={`group relative p-3 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${
                        isActive
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div
                          className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${item.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                        >
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="min-w-0 w-full">
                          <h3
                            className={`font-semibold text-xs sm:text-sm truncate ${
                              isActive ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {item.name}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Mobile Menu Button - Sticky */}
      <div className="lg:hidden sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 mb-6 rounded-b-xl shadow-md">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span className="font-semibold">{isMobileMenuOpen ? "Close" : "Menu"}</span>
        </button>
      </div>

      {/* Mobile Sidebar Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40 top-0"
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 z-50 w-80 h-screen bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto"
            >
              {/* Sidebar Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 shadow-lg z-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Menu</h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-white/80 text-sm">Navigate through your profile</p>
              </div>

              {/* Navigation Items */}
              <div className="p-4 space-y-2">
                {navigationItems.map((item, index) => {
                  const isActive = currentPath === item.href
                  const Icon = item.icon
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={item.href} preserveScroll={true} preserveState={true} onClick={handleNavigate}>
                        <div
                          className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer group ${
                            isActive
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg transition-all duration-300 ${
                              isActive
                                ? "bg-white/20"
                                : "bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700"
                            }`}
                          >
                            <Icon
                              className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-600 dark:text-gray-400"}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                            <p
                              className={`text-xs truncate ${
                                isActive ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {item.description}
                            </p>
                          </div>
                          {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

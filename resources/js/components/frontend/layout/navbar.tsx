"use client"

import { useState } from "react"
import { Button } from "@/components/frontend/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/frontend/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Heart, Menu, X, User, Settings, LogOut, Bell, LayoutGrid } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeToggle } from "@/components/frontend/theme-toggle"
import { Link, router, usePage } from "@inertiajs/react"
import { SharedData } from "@/types"
import { useMobileNavigation } from "@/hooks/use-mobile-navigation"

export default function Navbar() {
  const { auth } = usePage<SharedData>().props;
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(!!auth?.user)
  const navItems = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Marketplace", href: "/marketplace" },
    { name: "Donate", href: "/donate" },
    { name: "Contact", href: "/contact" },
  ]

  const cleanup = useMobileNavigation();

  const handleLogout = () => {
    cleanup();
    setIsLoggedIn(false);
    router.flushAll();
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={route("home")} className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl shadow-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CareConnect
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button variant="ghost" className="text-sm font-medium hover:bg-accent">
                  {item.name}
                </Button>
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <ThemeToggle />
            {isLoggedIn ? (
              <>
                <Button variant="ghost" size="sm" className="h-9 w-9 px-0">
                  <Bell className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={auth?.user?.image ? auth?.user?.image : '/placeholder.svg?height=36&width=36'} alt="User" />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                          JD
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{auth?.user?.name ?? "John Doe"}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">{auth?.user?.email ?? "john@example.com"}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={auth?.user?.role === "user" ? route("user.profile.index") : route("profile.edit")}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    {(auth?.user?.role === 'admin' || auth?.user?.role === 'organization') && (
                    <DropdownMenuItem asChild>
                        <Link href={route("dashboard")}>
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                        </Link>
                    </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link method="post" className="w-full" href={route('logout')} onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href={route("login")}>
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href={route("register")}>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t"
            >
              <div className="py-4 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block px-3 py-2 text-base font-medium text-foreground hover:bg-accent rounded-md"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="pt-4 border-t space-y-2">
                  {isLoggedIn ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 px-3 py-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                            JD
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">John Doe</p>
                          <p className="text-xs text-muted-foreground">john@example.com</p>
                        </div>
                      </div>
                      <Link href={route("profile")}>
                        <Button variant="ghost" className="w-full justify-start">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Button>
                      </Link>
                      <Button variant="ghost" className="w-full justify-start">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => setIsLoggedIn(false)}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Link href={route("login")} className="block px-3">
                        <Button variant="ghost" className="w-full">
                          Sign In
                        </Button>
                      </Link>
                      <Link href={route("register")} className="block px-3">
                        <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                          Get Started
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

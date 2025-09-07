// "use client"

// import type React from "react"

// import { useState } from "react"
// import { Button } from "@/components/frontend/ui/button"
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/frontend/ui/dropdown-menu"
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
// import {
//   Heart,
//   Menu,
//   X,
//   User,
//   Settings,
//   LogOut,
//   Bell,
//   LayoutGrid,
//   Wallet,
//   Plus,
//   Minus,
//   Eye,
//   EyeOff,
//   Text,
// } from "lucide-react"
// import { motion, AnimatePresence } from "framer-motion"
// import { ThemeToggle } from "@/components/frontend/theme-toggle"
// import { Link, router, usePage, useForm } from "@inertiajs/react" // Added useForm
// import { useMobileNavigation } from "@/hooks/use-mobile-navigation"
// import { Input } from "@/components/frontend/ui/input"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/frontend/ui/dialog"
// import { showSuccessToast, showErrorToast } from "@/lib/toast" // Import toast utilities

// // Extending SharedData interface to include wallet_balance
// interface SharedData {
//   auth: {
//     user: {
//       id: number
//       name: string
//       email: string
//       phone?: string
//       image?: string
//       joined: string
//       total_donated?: number
//       favorite_organizations_count?: number
//       total_orders?: number
//       impact_score?: number
//       referral_link?: string
//       balance?: string // Added wallet_balance
//       role?: string // Ensure role is also present
//     }
//   }
// }

// export default function Navbar() {
//   const { auth } = usePage<SharedData>().props
//   const [isOpen, setIsOpen] = useState(false)
//   const [isLoggedIn, setIsLoggedIn] = useState(!!auth?.user)

//   // Wallet specific states
//   const [showBalance, setShowBalance] = useState(false)
//   const [isAddFundsOpen, setIsAddFundsOpen] = useState(false)
//   const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)

//   // Form state for withdrawal using Inertia's useForm
//   const {
//     data: withdrawFormData,
//     setData: setWithdrawFormData,
//     post: postWithdrawal,
//     processing: isWithdrawProcessing,
//     errors: withdrawErrors,
//     reset: resetWithdrawForm,
//   } = useForm({
//     amount: "",
//     paypal_email: "",
//   })

//   // Form state for deposit (if needed, currently not integrated with backend)
//   const [addFundsAmount, setAddFundsAmount] = useState("")

//   const navItems = [
//     { name: "Home", href: "/" },
//     { name: "About", href: "/about" },
//     { name: "Marketplace", href: "/marketplace" },
//     { name: "Events", href: "/all-events" },
//     { name: "Jobs", href: "/jobs" },
//     { name: "Donate", href: "/donate" },
//     { name: "Courses", href: route('course.index') },
//     ...(isLoggedIn ? [{ name: "Chat", href: route('chat.index') }] : []),
//     { name: "Node Boss", href: "/nodeboss" },
//     { name: "Contact", href: "/contact" },
//   ]

//   const cleanup = useMobileNavigation()

//   const handleLogout = () => {
//     cleanup()
//     setIsLoggedIn(false)
//     router.flushAll()
//   }

//   const handleDeposit = () => {
//     // This is a client-side simulation. For a real application,
//     // you would integrate with a payment gateway here.
//     console.log("Depositing:", addFundsAmount)
//     showSuccessToast(`Successfully deposited $${addFundsAmount}`)
//     setAddFundsAmount("")
//     setIsAddFundsOpen(false)
//   }

//   const handleWithdraw = (e: React.FormEvent) => {
//     e.preventDefault() // Prevent default form submission
//     postWithdrawal(route("withdrawl.request"), {
//       onSuccess: () => {
//         showSuccessToast("Withdrawal request submitted successfully!")
//         resetWithdrawForm() // Reset form fields
//         setIsWithdrawOpen(false) // Close the modal
//         router.reload({ only: ["auth"] }) // Reload auth prop to update balance
//       },
//       onError: (errors) => {
//         showErrorToast("Failed to submit withdrawal request. Please check the form.")
//         console.error("Withdrawal errors:", errors)
//       },
//     })
//   }

//   const userBalance = auth?.user?.balance

//   return (
//     <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
//       <div className="container mx-auto px-4">
//         <div className="flex justify-between items-center h-16">
//           {/* Logo */}
//           <Link href={route("home")} className="flex items-center space-x-2">
//             <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl shadow-lg">
//               <Heart className="h-6 w-6 text-white" />
//             </div>
//             <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
//               CareConnect
//             </span>
//           </Link>

//           {/* Desktop Navigation */}
//           <div className="hidden xl:flex items-center space-x-1">
//             {navItems.map((item) => (
//               <Link key={item.name} href={item.href}>
//                 <Button variant="ghost" className="text-sm font-medium hover:bg-accent cursor-pointer">
//                   {item.name}
//                 </Button>
//               </Link>
//             ))}
//           </div>

//           {/* Desktop Actions */}
//           <div className="hidden xl:flex items-center space-x-2">
//             <ThemeToggle />
//             {isLoggedIn ? (
//               <>
//                 <Button variant="ghost" size="sm" className="h-9 w-9 px-0">
//                   <Bell className="h-4 w-4" />
//                 </Button>

//                 {/* Wallet Dropdown */}
//                 <DropdownMenu>
//                   <DropdownMenuTrigger asChild>
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       className="h-9 px-3 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full"
//                     >
//                       <Wallet className="h-4 w-4 text-green-600" />
//                       <span className="font-medium text-sm">
//                         {showBalance ? `$${userBalance.toLocaleString()}` : "••••••"}
//                       </span>
//                       <Button
//                         variant="ghost"
//                         size="sm"
//                         onClick={(e) => {
//                           e.stopPropagation() // Prevent dropdown from closing
//                           setShowBalance(!showBalance)
//                         }}
//                         className="p-0 h-auto"
//                       >
//                         {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                       </Button>
//                     </Button>
//                   </DropdownMenuTrigger>
//                   <DropdownMenuContent className="w-64" align="end" forceMount>
//                     <div className="p-2">
//                       <div className="flex items-center justify-between">
//                         <p className="font-medium">Wallet Balance</p>
//                         <Button variant="ghost" size="sm" onClick={() => setShowBalance(!showBalance)} className="p-1">
//                           {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                         </Button>
//                       </div>
//                       <div className="flex items-center text-center gap-2">
//                         <Wallet className="h-6 w-6 text-green-600" />
//                         <p className="text-xl font-bold text-green-600 dark:text-green-400">
//                           {showBalance ? `$${userBalance}` : "••••••"}
//                         </p>
//                       </div>
//                     </div>
//                     <DropdownMenuSeparator />
//                     {/* Deposit Funds Dialog Trigger */}
//                     {/* <DropdownMenuItem asChild>
//                       <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
//                         <DialogTrigger asChild>
//                           <Button variant="default" className="w-full text-center">
//                             <Plus className="h-4 w-4 mr-2" />
//                             <span>Deposit Funds</span>
//                           </Button>
//                         </DialogTrigger>
//                         <DialogContent>
//                           <DialogHeader>
//                             <DialogTitle>Deposit Funds</DialogTitle>
//                           </DialogHeader>
//                           <div className="space-y-4">
//                             <div>
//                               <label className="text-sm font-medium">Amount</label>
//                               <Input
//                                 type="number"
//                                 placeholder="Enter amount"
//                                 value={addFundsAmount}
//                                 onChange={(e) => setAddFundsAmount(e.target.value)}
//                               />
//                             </div>
//                             <div className="flex gap-2">
//                               <Button onClick={handleDeposit} className="flex-1">
//                                 Deposit
//                               </Button>
//                               <Button variant="outline" onClick={() => setIsAddFundsOpen(false)}>
//                                 Cancel
//                               </Button>
//                             </div>
//                           </div>
//                         </DialogContent>
//                       </Dialog>
//                     </DropdownMenuItem> */}

//                     {/* Withdraw Funds Dialog Trigger */}
//                     <DropdownMenuItem asChild>
//                       <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
//                         <DialogTrigger asChild>
//                           <Button variant="destructive" className="w-full text-white text-center">
//                             <Minus className="h-4 w-4 mr-2" />
//                             <span>Withdraw</span>
//                           </Button>
//                         </DialogTrigger>
//                         <DialogContent>
//                           <DialogHeader>
//                             <DialogTitle>Withdraw Funds (PayPal Only)</DialogTitle>
//                           </DialogHeader>
//                           <form onSubmit={handleWithdraw} className="space-y-4">
//                             <div>
//                               <label className="text-sm font-medium">Amount</label>
//                               <Input
//                                 type="number"
//                                 placeholder="Enter amount"
//                                 value={withdrawFormData.amount}
//                                 onChange={(e) => setWithdrawFormData("amount", e.target.value)}
//                                 max={userBalance}
//                                 step="0.01"
//                                 min="1"
//                               />
//                               {withdrawErrors.amount && (
//                                 <p className="text-red-500 text-xs mt-1">{withdrawErrors.amount}</p>
//                               )}
//                               <p className="text-xs text-gray-500 mt-1">
//                                 Available balance: ${userBalance.toLocaleString()}
//                               </p>
//                             </div>
//                             <div>
//                               <label className="text-sm font-medium">PayPal Email</label>
//                               <Input
//                                 type="email"
//                                 placeholder="Enter PayPal email"
//                                 value={withdrawFormData.paypal_email}
//                                 onChange={(e) => setWithdrawFormData("paypal_email", e.target.value)}
//                               />
//                               {withdrawErrors.paypal_email && (
//                                 <p className="text-red-500 text-xs mt-1">{withdrawErrors.paypal_email}</p>
//                               )}
//                             </div>
//                             <div className="flex gap-2">
//                               <Button
//                                 type="submit"
//                                 variant="destructive"
//                                 className="flex-1 text-white"
//                                 disabled={isWithdrawProcessing}
//                               >
//                                 {isWithdrawProcessing ? "Submitting..." : "Withdraw"}
//                               </Button>
//                               <Button
//                                 variant="outline"
//                                 onClick={() => setIsWithdrawOpen(false)}
//                                 disabled={isWithdrawProcessing}
//                               >
//                                 Cancel
//                               </Button>
//                             </div>
//                           </form>
//                         </DialogContent>
//                       </Dialog>
//                     </DropdownMenuItem>
//                   </DropdownMenuContent>
//                 </DropdownMenu>

//                 <DropdownMenu>
//                   <DropdownMenuTrigger asChild>
//                     <Button variant="ghost" className="relative h-9 w-9 rounded-full">
//                       <Avatar className="h-9 w-9">
//                         <AvatarImage
//                           src={auth?.user?.image ? auth?.user?.image : "/placeholder.svg?height=36&width=36"}
//                           alt="User"
//                         />
//                         <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
//                           JD
//                         </AvatarFallback>
//                       </Avatar>
//                     </Button>
//                   </DropdownMenuTrigger>
//                   <DropdownMenuContent className="w-56" align="end" forceMount>
//                     <div className="flex items-center justify-start gap-2 p-2">
//                       <div className="flex flex-col space-y-1 leading-none">
//                         <p className="font-medium">{auth?.user?.name ?? "John Doe"}</p>
//                         <p className="w-[200px] truncate text-sm text-muted-foreground">
//                           {auth?.user?.email ?? "john@example.com"}
//                         </p>
//                       </div>
//                     </div>
//                     <DropdownMenuSeparator />
//                     <DropdownMenuItem asChild>
//                       <Link href={auth?.user?.role === "user" ? route("user.profile.index") : route("profile.edit")}>
//                         <User className="mr-2 h-4 w-4" />
//                         <span>Profile</span>
//                       </Link>
//                                       </DropdownMenuItem>
//                     {(auth?.user?.role === "user") && (
//                       <DropdownMenuItem asChild>
//                         <Link href={route("chat.index")}>
//                           <Text className="mr-2 h-4 w-4" />
//                           <span>Chat</span>
//                         </Link>
//                       </DropdownMenuItem>
//                     )}
//                     {(auth?.user?.role === "admin" || auth?.user?.role === "organization") && (
//                       <DropdownMenuItem asChild>
//                         <Link href={route("dashboard")}>
//                           <LayoutGrid className="mr-2 h-4 w-4" />
//                           <span>Dashboard</span>
//                         </Link>
//                       </DropdownMenuItem>
//                     )}
//                     <DropdownMenuSeparator />
//                     <DropdownMenuItem asChild>
//                       <Link method="post" className="w-full" href={route("logout")} onClick={handleLogout}>
//                         <LogOut className="mr-2 h-4 w-4" />
//                         <span>Log out</span>
//                       </Link>
//                     </DropdownMenuItem>
//                   </DropdownMenuContent>
//                 </DropdownMenu>
//               </>
//             ) : (
//               <>
//                 <Link href={route("login")}>
//                   <Button variant="ghost" size="sm">
//                     Sign In
//                   </Button>
//                 </Link>
//                 <Link href={route("register")}>
//                   <Button
//                     size="sm"
//                     className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
//                   >
//                     Get Started
//                   </Button>
//                 </Link>
//               </>
//             )}
//           </div>

//           {/* Mobile menu button */}
//           <div className="xl:hidden flex items-center space-x-2">
//             <ThemeToggle />
//             <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
//               {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
//             </Button>
//           </div>
//         </div>

//         {/* Mobile Navigation */}
//         <AnimatePresence>
//           {isOpen && (
//             <motion.div
//               initial={{ opacity: 0, height: 0 }}
//               animate={{ opacity: 1, height: "auto" }}
//               exit={{ opacity: 0, height: 0 }}
//               transition={{ duration: 0.2 }}
//               className="xl:hidden border-t"
//             >
//               <div className="py-4 space-y-2">
//                 {navItems.map((item) => (
//                   <Link
//                     key={item.name}
//                     href={item.href}
//                     className="block px-3 py-2 text-base font-medium text-foreground hover:bg-accent rounded-md cursor-pointer"
//                     onClick={() => setIsOpen(false)}
//                   >
//                     {item.name}
//                   </Link>
//                 ))}
//                 <div className="pt-4 border-t space-y-2">
//                   {isLoggedIn ? (
//                     <div className="space-y-2">
//                       <div className="flex items-center space-x-3 px-3 py-2">
//                         <Avatar className="h-8 w-8">
//                           <AvatarImage src={auth?.user?.image || "/placeholder.svg?height=32&width=32"} alt="User" />
//                           <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
//                             JD
//                           </AvatarFallback>
//                         </Avatar>
//                         <div>
//                           <p className="font-medium text-sm">{auth?.user?.name ?? "John Doe"}</p>
//                           <p className="text-xs text-muted-foreground">{auth?.user?.email ?? "john@example.com"}</p>
//                         </div>
//                       </div>
//                       {/* Wallet section for mobile */}
//                       <div className="px-3 py-2 space-y-2 bg-gray-50 dark:bg-gray-800 rounded-md">
//                         <div className="flex items-center justify-between">
//                           <div className="flex items-center gap-2">
//                             <Wallet className="h-4 w-4 text-green-600" />
//                             <span className="font-medium text-sm">Wallet Balance</span>
//                           </div>
//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             onClick={() => setShowBalance(!showBalance)}
//                             className="p-1"
//                           >
//                             {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                           </Button>
//                         </div>
//                         <div className="text-xl font-bold text-green-600 dark:text-green-400">
//                           {showBalance ? `$${userBalance.toLocaleString()}` : "••••••"}
//                         </div>
//                         <div className="flex gap-2 mt-2">
//                           {/* Deposit Funds Dialog Trigger (Mobile) */}
//                           <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
//                             <DialogTrigger asChild>
//                               <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
//                                 <Plus className="h-4 w-4 mr-1" />
//                                 Deposit
//                               </Button>
//                             </DialogTrigger>
//                             <DialogContent>
//                               <DialogHeader>
//                                 <DialogTitle>Deposit Funds</DialogTitle>
//                               </DialogHeader>
//                               <div className="space-y-4">
//                                 <div>
//                                   <label className="text-sm font-medium">Amount</label>
//                                   <Input
//                                     type="number"
//                                     placeholder="Enter amount"
//                                     value={addFundsAmount}
//                                     onChange={(e) => setAddFundsAmount(e.target.value)}
//                                   />
//                                 </div>
//                                 <div className="flex gap-2">
//                                   <Button onClick={handleDeposit} className="flex-1">
//                                     Deposit
//                                   </Button>
//                                   <Button variant="outline" onClick={() => setIsAddFundsOpen(false)}>
//                                     Cancel
//                                   </Button>
//                                 </div>
//                               </div>
//                             </DialogContent>
//                           </Dialog>

//                           {/* Withdraw Funds Dialog Trigger (Mobile) */}
//                           <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
//                             <DialogTrigger asChild>
//                               <Button size="sm" variant="outline" className="flex-1 bg-transparent">
//                                 <Minus className="h-4 w-4 mr-1" />
//                                 Withdraw
//                               </Button>
//                             </DialogTrigger>
//                             <DialogContent>
//                               <DialogHeader>
//                                 <DialogTitle>Withdraw Funds (PayPal Only)</DialogTitle>
//                               </DialogHeader>
//                               <form onSubmit={handleWithdraw} className="space-y-4">
//                                 <div>
//                                   <label className="text-sm font-medium">Amount</label>
//                                   <Input
//                                     type="number"
//                                     placeholder="Enter amount"
//                                     value={withdrawFormData.amount}
//                                     onChange={(e) => setWithdrawFormData("amount", e.target.value)}
//                                     max={userBalance}
//                                     step="0.01"
//                                     min="1"
//                                   />
//                                   {withdrawErrors.amount && (
//                                     <p className="text-red-500 text-xs mt-1">{withdrawErrors.amount}</p>
//                                   )}
//                                   <p className="text-xs text-gray-500 mt-1">
//                                     Available balance: ${userBalance.toLocaleString()}
//                                   </p>
//                                 </div>
//                                 <div>
//                                   <label className="text-sm font-medium">PayPal Email</label>
//                                   <Input
//                                     type="email"
//                                     placeholder="Enter PayPal email"
//                                     value={withdrawFormData.paypal_email}
//                                     onChange={(e) => setWithdrawFormData("paypal_email", e.target.value)}
//                                   />
//                                   {withdrawErrors.paypal_email && (
//                                     <p className="text-red-500 text-xs mt-1">{withdrawErrors.paypal_email}</p>
//                                   )}
//                                 </div>
//                                 <div className="flex gap-2">
//                                   <Button type="submit" className="flex-1" disabled={isWithdrawProcessing}>
//                                     {isWithdrawProcessing ? "Submitting..." : "Withdraw"}
//                                   </Button>
//                                   <Button
//                                     variant="outline"
//                                     onClick={() => setIsWithdrawOpen(false)}
//                                     disabled={isWithdrawProcessing}
//                                   >
//                                     Cancel
//                                   </Button>
//                                 </div>
//                               </form>
//                             </DialogContent>
//                           </Dialog>
//                         </div>
//                       </div>
//                       <Link href={route("user.profile.index")}>
//                         <Button variant="ghost" className="w-full justify-start">
//                           <User className="mr-2 h-4 w-4" />
//                           Profile
//                         </Button>
//                       </Link>
//                     {(auth?.user?.role === "user") && (
//                         <Link href={route("chat.index")}>
//                         <Button variant="ghost" className="w-full justify-start">
//                           <Text className="mr-2 h-4 w-4" />
//                           Chat
//                         </Button>
//                       </Link>
//                     )}
//                       <Button variant="ghost" className="w-full justify-start">
//                         <Settings className="mr-2 h-4 w-4" />
//                         Settings
//                       </Button>
//                       <Button
//                         variant="ghost"
//                         className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
//                         onClick={handleLogout}
//                       >
//                         <LogOut className="mr-2 h-4 w-4" />
//                         Log out
//                       </Button>
//                     </div>
//                   ) : (
//                     <>
//                       <Link href={route("login")} className="block px-3">
//                         <Button variant="ghost" className="w-full">
//                           Sign In
//                         </Button>
//                       </Link>
//                       <Link href={route("register")} className="block px-3">
//                         <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
//                           Get Started
//                         </Button>
//                       </Link>
//                     </>
//                   )}
//                 </div>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//     </nav>
//   )
// }


"use client"

import type React from "react"

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
import {
  Heart,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  Bell,
  LayoutGrid,
  Wallet,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Text,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ThemeToggle } from "@/components/frontend/theme-toggle"
import { Link, router, usePage, useForm } from "@inertiajs/react" // Added useForm
import { useMobileNavigation } from "@/hooks/use-mobile-navigation"
import { Input } from "@/components/frontend/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/frontend/ui/dialog"
import { showSuccessToast, showErrorToast } from "@/lib/toast" // Import toast utilities

// Extending SharedData interface to include wallet_balance
interface SharedData {
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
      balance?: string // Added wallet_balance
      role?: string // Ensure role is also present
    }
  }
}

export default function Navbar() {
  const { auth } = usePage<SharedData>().props
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(!!auth?.user)

  // Wallet specific states
  const [showBalance, setShowBalance] = useState(false)
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)

  // Form state for withdrawal using Inertia's useForm
  const {
    data: withdrawFormData,
    setData: setWithdrawFormData,
    post: postWithdrawal,
    processing: isWithdrawProcessing,
    errors: withdrawErrors,
    reset: resetWithdrawForm,
  } = useForm({
    amount: "",
    paypal_email: "",
  })

  // Form state for deposit (if needed, currently not integrated with backend)
  const [addFundsAmount, setAddFundsAmount] = useState("")

  const navItems = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "News", href: "/nonprofit-news" },
    { name: "Marketplace", href: "/marketplace" },
    { name: "Events", href: "/all-events" },
    { name: "Jobs", href: "/jobs" },
    { name: "Donate", href: "/donate" },
    { name: "Courses", href: route("course.index") },
    ...(isLoggedIn ? [{ name: "Chat", href: route("chat.index") }] : []),
    { name: "Node Boss", href: "/nodeboss" },
    { name: "Contact", href: "/contact" },
  ]

  const cleanup = useMobileNavigation()

  const handleLogout = () => {
    cleanup()
    setIsLoggedIn(false)
    router.flushAll()
  }

  const handleDeposit = () => {
    // This is a client-side simulation. For a real application,
    // you would integrate with a payment gateway here.
    console.log("Depositing:", addFundsAmount)
    showSuccessToast(`Successfully deposited $${addFundsAmount}`)
    setAddFundsAmount("")
    setIsAddFundsOpen(false)
  }

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission
    postWithdrawal(route("withdrawl.request"), {
      onSuccess: () => {
        showSuccessToast("Withdrawal request submitted successfully!")
        resetWithdrawForm() // Reset form fields
        setIsWithdrawOpen(false) // Close the modal
        router.reload({ only: ["auth"] }) // Reload auth prop to update balance
      },
      onError: (errors) => {
        showErrorToast("Failed to submit withdrawal request. Please check the form.")
        console.error("Withdrawal errors:", errors)
      },
    })
  }

  const userBalance = auth?.user?.balance

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
          <div className="hidden xl:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button variant="ghost" className="text-sm font-medium hover:bg-accent cursor-pointer">
                  {item.name}
                </Button>
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden xl:flex items-center space-x-2">
            <ThemeToggle />
            {isLoggedIn ? (
              <>
                <Button variant="ghost" size="sm" className="h-9 w-9 px-0">
                  <Bell className="h-4 w-4" />
                </Button>

                {/* Wallet Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full"
                    >
                      <Wallet className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">
                        {showBalance ? `$${userBalance.toLocaleString()}` : "••••••"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation() // Prevent dropdown from closing
                          setShowBalance(!showBalance)
                        }}
                        className="p-0 h-auto"
                      >
                        {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="end" forceMount>
                    <div className="p-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Wallet Balance</p>
                        <Button variant="ghost" size="sm" onClick={() => setShowBalance(!showBalance)} className="p-1">
                          {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="flex items-center text-center gap-2">
                        <Wallet className="h-6 w-6 text-green-600" />
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">
                          {showBalance ? `$${userBalance}` : "••••••"}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    {/* Deposit Funds Dialog Trigger */}
                    {/* <DropdownMenuItem asChild>
                      <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
                        <DialogTrigger asChild>
                          <Button variant="default" className="w-full text-center">
                            <Plus className="h-4 w-4 mr-2" />
                            <span>Deposit Funds</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Deposit Funds</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Amount</label>
                              <Input
                                type="number"
                                placeholder="Enter amount"
                                value={addFundsAmount}
                                onChange={(e) => setAddFundsAmount(e.target.value)}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleDeposit} className="flex-1">
                                Deposit
                              </Button>
                              <Button variant="outline" onClick={() => setIsAddFundsOpen(false)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </DropdownMenuItem> */}

                    {/* Withdraw Funds Dialog Trigger */}
                    <DropdownMenuItem asChild>
                      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                        <DialogTrigger asChild>
                          <Button variant="destructive" className="w-full text-white text-center">
                            <Minus className="h-4 w-4 mr-2" />
                            <span>Withdraw</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Withdraw Funds (PayPal Only)</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleWithdraw} className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Amount</label>
                              <Input
                                type="number"
                                placeholder="Enter amount"
                                value={withdrawFormData.amount}
                                onChange={(e) => setWithdrawFormData("amount", e.target.value)}
                                max={userBalance}
                                step="0.01"
                                min="1"
                              />
                              {withdrawErrors.amount && (
                                <p className="text-red-500 text-xs mt-1">{withdrawErrors.amount}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Available balance: ${userBalance.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">PayPal Email</label>
                              <Input
                                type="email"
                                placeholder="Enter PayPal email"
                                value={withdrawFormData.paypal_email}
                                onChange={(e) => setWithdrawFormData("paypal_email", e.target.value)}
                              />
                              {withdrawErrors.paypal_email && (
                                <p className="text-red-500 text-xs mt-1">{withdrawErrors.paypal_email}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="submit"
                                variant="destructive"
                                className="flex-1 text-white"
                                disabled={isWithdrawProcessing}
                              >
                                {isWithdrawProcessing ? "Submitting..." : "Withdraw"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setIsWithdrawOpen(false)}
                                disabled={isWithdrawProcessing}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={auth?.user?.image ? auth?.user?.image : "/placeholder.svg?height=36&width=36"}
                          alt="User"
                        />
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
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {auth?.user?.email ?? "john@example.com"}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={auth?.user?.role === "user" ? route("user.profile.index") : route("profile.edit")}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    {auth?.user?.role === "user" && (
                      <DropdownMenuItem asChild>
                        <Link href={route("chat.index")}>
                          <Text className="mr-2 h-4 w-4" />
                          <span>Chat</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {(auth?.user?.role === "admin" || auth?.user?.role === "organization") && (
                      <DropdownMenuItem asChild>
                        <Link href={route("dashboard")}>
                          <LayoutGrid className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link method="post" className="w-full" href={route("logout")} onClick={handleLogout}>
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
          <div className="xl:hidden flex items-center space-x-2">
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
              className="xl:hidden border-t"
            >
              <div className="py-4 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block px-3 py-2 text-base font-medium text-foreground hover:bg-accent rounded-md cursor-pointer"
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
                          <AvatarImage src={auth?.user?.image || "/placeholder.svg?height=32&width=32"} alt="User" />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                            JD
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{auth?.user?.name ?? "John Doe"}</p>
                          <p className="text-xs text-muted-foreground">{auth?.user?.email ?? "john@example.com"}</p>
                        </div>
                      </div>
                      {/* Wallet section for mobile */}
                      <div className="px-3 py-2 space-y-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-sm">Wallet Balance</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowBalance(!showBalance)}
                            className="p-1"
                          >
                            {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">
                          {showBalance ? `$${userBalance.toLocaleString()}` : "••••••"}
                        </div>
                        <div className="flex gap-2 mt-2">
                          {/* Deposit Funds Dialog Trigger (Mobile) */}
                          <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                                <Plus className="h-4 w-4 mr-1" />
                                Deposit
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Deposit Funds</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Amount</label>
                                  <Input
                                    type="number"
                                    placeholder="Enter amount"
                                    value={addFundsAmount}
                                    onChange={(e) => setAddFundsAmount(e.target.value)}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={handleDeposit} className="flex-1">
                                    Deposit
                                  </Button>
                                  <Button variant="outline" onClick={() => setIsAddFundsOpen(false)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Withdraw Funds Dialog Trigger (Mobile) */}
                          <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                                <Minus className="h-4 w-4 mr-1" />
                                Withdraw
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Withdraw Funds (PayPal Only)</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleWithdraw} className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Amount</label>
                                  <Input
                                    type="number"
                                    placeholder="Enter amount"
                                    value={withdrawFormData.amount}
                                    onChange={(e) => setWithdrawFormData("amount", e.target.value)}
                                    max={userBalance}
                                    step="0.01"
                                    min="1"
                                  />
                                  {withdrawErrors.amount && (
                                    <p className="text-red-500 text-xs mt-1">{withdrawErrors.amount}</p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">
                                    Available balance: ${userBalance.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">PayPal Email</label>
                                  <Input
                                    type="email"
                                    placeholder="Enter PayPal email"
                                    value={withdrawFormData.paypal_email}
                                    onChange={(e) => setWithdrawFormData("paypal_email", e.target.value)}
                                  />
                                  {withdrawErrors.paypal_email && (
                                    <p className="text-red-500 text-xs mt-1">{withdrawErrors.paypal_email}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button type="submit" className="flex-1" disabled={isWithdrawProcessing}>
                                    {isWithdrawProcessing ? "Submitting..." : "Withdraw"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setIsWithdrawOpen(false)}
                                    disabled={isWithdrawProcessing}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <Link href={route("user.profile.index")}>
                        <Button variant="ghost" className="w-full justify-start">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Button>
                      </Link>
                      {auth?.user?.role === "user" && (
                        <Link href={route("chat.index")}>
                          <Button variant="ghost" className="w-full justify-start">
                            <Text className="mr-2 h-4 w-4" />
                            Chat
                          </Button>
                        </Link>
                      )}
                      <Button variant="ghost" className="w-full justify-start">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={handleLogout}
                                          >
                        <Link method="post" className="w-full flex justify-start align-items-center cursor-pointer" href={route("logout")} onClick={handleLogout}>
                            <LogOut className="mr-3 mt-0.5 h-3 w-3 d-flex justify-center align-middle align-items-center" />
                            Log out
                        </Link>
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

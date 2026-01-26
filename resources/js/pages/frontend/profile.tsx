"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState } from "react"
import { motion } from "framer-motion"
import { usePage, router, Link } from "@inertiajs/react"
import { route } from "ziggy-js"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Settings,
  Bell,
  CreditCard,
  Download,
  Edit3,
  Camera,
  Save,
  X,
  Plus,
  Star,
  Trash2,
  Search,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Eye,
  RotateCcw,
  ExternalLink,
  Globe,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Switch } from "@/components/frontend/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Badge } from "@/components/frontend/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/frontend/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select"
import DonationModal from "@/components/frontend/donation-modal"

const donationHistory = [
  {
    id: 1,
    organization: "Global Water Foundation",
    amount: 100,
    date: "2024-01-15",
    status: "Completed",
    impact: "Provided clean water for 5 families",
  },
  {
    id: 2,
    organization: "Education Without Borders",
    amount: 50,
    date: "2024-01-10",
    status: "Completed",
    impact: "Funded school supplies for 10 children",
  },
  {
    id: 3,
    organization: "Hunger Relief Network",
    amount: 75,
    date: "2024-01-05",
    status: "Completed",
    impact: "Provided 150 meals to families in need",
  },
]

const orderHistory = [
  {
    id: "ORD-001",
    date: "2024-01-20",
    status: "delivered",
    total: 85,
    items: [
      {
        name: "Water Filter Kit",
        quantity: 1,
        price: 45,
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      },
      {
        name: "Clean Water T-Shirt",
        quantity: 1,
        price: 25,
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      },
    ],
    organization: "Clean Water Initiative",
    trackingNumber: "TRK123456789",
    deliveryDate: "2024-01-25",
    shippingCost: 15,
  },
  {
    id: "ORD-002",
    date: "2024-01-18",
    status: "shipped",
    total: 120,
    items: [
      {
        name: "Solar Water Purifier",
        quantity: 1,
        price: 120,
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      },
    ],
    organization: "Clean Water Initiative",
    trackingNumber: "TRK987654321",
    estimatedDelivery: "2024-01-28",
    shippingCost: 0,
  },
  {
    id: "ORD-003",
    date: "2024-01-15",
    status: "processing",
    total: 95,
    items: [
      {
        name: "Water Testing Kit",
        quantity: 1,
        price: 65,
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      },
      {
        name: "Water Conservation Guide",
        quantity: 2,
        price: 15,
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      },
    ],
    organization: "Clean Water Initiative",
    shippingCost: 0,
  },
  {
    id: "ORD-004",
    date: "2024-01-10",
    status: "cancelled",
    total: 40,
    items: [
      {
        name: "Clean Water Hoodie",
        quantity: 1,
        price: 40,
        image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      },
    ],
    organization: "Clean Water Initiative",
    refundAmount: 40,
    refundDate: "2024-01-12",
    shippingCost: 0,
  },
]

const availableOrganizations = [
  {
    id: 1,
    name: "Global Water Foundation",
    image: "/placeholder.svg?height=100&width=100",
    category: "Environment",
    rating: 4.9,
    description: "Providing clean water access to communities worldwide",
  },
  {
    id: 2,
    name: "Education Without Borders",
    image: "/placeholder.svg?height=100&width=100",
    category: "Education",
    rating: 4.8,
    description: "Building schools and providing educational resources",
  },
  {
    id: 3,
    name: "Hunger Relief Network",
    image: "/placeholder.svg?height=100&width=100",
    category: "Health",
    rating: 4.7,
    description: "Fighting hunger and food insecurity worldwide",
  },
  {
    id: 4,
    name: "Wildlife Conservation Alliance",
    image: "/placeholder.svg?height=100&width=100",
    category: "Environment",
    rating: 4.6,
    description: "Protecting endangered species and their habitats",
  },
  {
    id: 5,
    name: "Mental Health Support Network",
    image: "/placeholder.svg?height=100&width=100",
    category: "Health",
    rating: 4.5,
    description: "Providing mental health resources and support",
  },
  {
    id: 6,
    name: "Tech for Good Initiative",
    image: "/placeholder.svg?height=100&width=100",
    category: "Technology",
    rating: 4.4,
    description: "Bridging the digital divide through technology access",
  },
  {
    id: 7,
    name: "Climate Action Alliance",
    image: "/placeholder.svg?height=100&width=100",
    category: "Environment",
    rating: 4.3,
    description: "Fighting climate change through community action",
  },
  {
    id: 8,
    name: "Youth Development Center",
    image: "/placeholder.svg?height=100&width=100",
    category: "Education",
    rating: 4.2,
    description: "Empowering youth through education and mentorship",
  },
]

export default function ProfilePage() {
  const page = usePage()
  const auth = (page.props as any)?.auth
  const user = auth?.user
  
  const [isEditing, setIsEditing] = useState(false)
  const [isAddingFavorite, setIsAddingFavorite] = useState(false)
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false)
  const [selectedOrganization, setSelectedOrganization] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [profileData, setProfileData] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    location: "New York, NY",
    bio: "Passionate about making a difference in the world through charitable giving and community support.",
    joinDate: "January 2023",
  })
  
  // Get user slug for public view - always use id as fallback
  // Try multiple ways to get user data
  const currentUser = user || auth?.user || (page.props as any)?.user
  const userSlug = currentUser?.slug || currentUser?.id

  const [favoriteOrganizations, setFavoriteOrganizations] = useState([
    {
      id: 1,
      name: "Global Water Foundation",
      image: "/placeholder.svg?height=100&width=100",
      totalDonated: 250,
      lastDonation: "2024-01-15",
      category: "Environment",
      rating: 4.9,
      description: "Providing clean water access to communities worldwide",
    },
    {
      id: 2,
      name: "Education Without Borders",
      image: "/placeholder.svg?height=100&width=100",
      totalDonated: 150,
      lastDonation: "2024-01-10",
      category: "Education",
      rating: 4.8,
      description: "Building schools and providing educational resources",
    },
  ])

  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    donationReceipts: true,
    organizationNews: false,
    monthlyReports: true,
  })

  const handleSave = () => {
    setIsEditing(false)
    // Here you would typically save to your backend
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form data if needed
  }

  const addFavoriteOrganization = (org: any) => {
    if (!favoriteOrganizations.find((fav) => fav.id === org.id)) {
      setFavoriteOrganizations([
        ...favoriteOrganizations,
        {
          ...org,
          totalDonated: 0,
          lastDonation: "Never",
        },
      ])
    }
    setIsAddingFavorite(false)
    setSearchQuery("")
    setSelectedCategory("all")
  }

  const removeFavoriteOrganization = (orgId: number) => {
    setFavoriteOrganizations(favoriteOrganizations.filter((org) => org.id !== orgId))
  }

  const handleDonateToFavorite = (org: any) => {
    setSelectedOrganization(org)
    setIsDonationModalOpen(true)
  }

  // Filter available organizations based on search and category
  const filteredAvailableOrganizations = availableOrganizations
    .filter((org) => !favoriteOrganizations.find((fav) => fav.id === org.id))
    .filter((org) => {
      const matchesSearch =
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || org.category === selectedCategory
      return matchesSearch && matchesCategory
    })

  // Get unique categories for filter
  const categories = ["all", ...Array.from(new Set(availableOrganizations.map((org) => org.category)))]

  const totalDonated = donationHistory.reduce((sum, donation) => sum + donation.amount, 0)
  const organizationsSupported = favoriteOrganizations.length
  const totalOrders = orderHistory.length

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "shipped":
        return <Truck className="h-4 w-4 text-blue-600" />
      case "processing":
        return <Package className="h-4 w-4 text-yellow-600" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "shipped":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "processing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

    return (
    <FrontendLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
        <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/* Profile Header */}
            <Card className="mb-6 sm:mb-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                    <div className="relative mx-auto sm:mx-0">
                    <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                        <AvatarImage src="/placeholder.svg?height=96&width=96" alt="Profile" />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xl sm:text-2xl">
                        {profileData.firstName[0]}
                        {profileData.lastName[0]}
                        </AvatarFallback>
                    </Avatar>
                    <Button
                        size="sm"
                        variant="outline"
                        className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-white dark:bg-gray-800"
                    >
                        <Camera className="h-4 w-4" />
                    </Button>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {profileData.firstName} {profileData.lastName}
                        </h1>
                        <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 mx-auto sm:mx-0 w-fit"
                        >
                        Verified Supporter
                        </Badge>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 text-sm sm:text-base">
                        {profileData.bio}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center justify-center sm:justify-start gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined {profileData.joinDate}
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-1">
                        <MapPin className="h-4 w-4" />
                        {profileData.location}
                        </div>
                    </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                    {!isEditing ? (
                        <>
                        <Button onClick={() => setIsEditing(true)} variant="outline" className="flex-1 sm:flex-none">
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Profile
                        </Button>
                        {userSlug && (
                          <Link href={route('users.show', userSlug)}>
                            <Button variant="outline" className="flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0">
                              <Globe className="h-4 w-4 mr-2" />
                              Public View
                            </Button>
                          </Link>
                        )}
                        </>
                    ) : (
                        <div className="flex gap-2 w-full sm:w-auto">
                        <Button onClick={handleSave} size="sm" className="flex-1 sm:flex-none">
                            <Save className="h-4 w-4 mr-2" />
                            Save
                        </Button>
                        <Button
                            onClick={handleCancel}
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none bg-transparent"
                        >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                        </Button>
                        </div>
                    )}
                    </div>
                </div>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-4 sm:pt-6">
                    <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total Donated</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">${totalDonated}</p>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900 p-2 sm:p-3 rounded-full">
                        <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                    </div>
                </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-4 sm:pt-6">
                    <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Favorite Organizations</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {organizationsSupported}
                        </p>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 sm:p-3 rounded-full">
                        <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    </div>
                </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-4 sm:pt-6">
                    <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total Orders</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{totalOrders}</p>
                    </div>
                    <div className="bg-orange-100 dark:bg-orange-900 p-2 sm:p-3 rounded-full">
                        <Package className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                    </div>
                    </div>
                </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-4 sm:pt-6">
                    <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Impact Score</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">8.5/10</p>
                    </div>
                    <div className="bg-purple-100 dark:bg-purple-900 p-2 sm:p-3 rounded-full">
                        <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                    </div>
                    </div>
                </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
                {/* Mobile-Responsive Tabs */}
                <div className="w-full overflow-hidden">
                <TabsList className="w-full h-auto p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 grid grid-cols-6 sm:grid-cols-6 gap-0">
                    <TabsTrigger
                    value="overview"
                    className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900 text-xs sm:text-sm px-1 sm:px-3 py-2 sm:py-2.5 whitespace-nowrap"
                    >
                    <span className="hidden sm:inline">Overview</span>
                    <span className="sm:hidden">Info</span>
                    </TabsTrigger>
                    <TabsTrigger
                    value="favorites"
                    className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900 text-xs sm:text-sm px-1 sm:px-3 py-2 sm:py-2.5 whitespace-nowrap"
                    >
                    <span className="hidden sm:inline">Favorites</span>
                    <span className="sm:hidden">Favs</span>
                    </TabsTrigger>
                    <TabsTrigger
                    value="donations"
                    className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900 text-xs sm:text-sm px-1 sm:px-3 py-2 sm:py-2.5 whitespace-nowrap"
                    >
                    <span className="hidden sm:inline">Donations</span>
                    <span className="sm:hidden">Donate</span>
                    </TabsTrigger>
                    <TabsTrigger
                    value="orders"
                    className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900 text-xs sm:text-sm px-1 sm:px-3 py-2 sm:py-2.5 whitespace-nowrap"
                    >
                    <span className="hidden sm:inline">Orders</span>
                    <span className="sm:hidden">Orders</span>
                    </TabsTrigger>
                    <TabsTrigger
                    value="settings"
                    className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900 text-xs sm:text-sm px-1 sm:px-3 py-2 sm:py-2.5 whitespace-nowrap"
                    >
                    <span className="hidden sm:inline">Settings</span>
                    <span className="sm:hidden">Set</span>
                    </TabsTrigger>
                    <TabsTrigger
                    value="security"
                    className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900 text-xs sm:text-sm px-1 sm:px-3 py-2 sm:py-2.5 whitespace-nowrap"
                    >
                    <span className="hidden sm:inline">Security</span>
                    <span className="sm:hidden">Sec</span>
                    </TabsTrigger>
                </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Personal Information */}
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl">
                        Personal Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isEditing ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="firstName" className="text-gray-900 dark:text-white">
                                First Name
                                </Label>
                                <Input
                                id="firstName"
                                value={profileData.firstName}
                                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <Label htmlFor="lastName" className="text-gray-900 dark:text-white">
                                Last Name
                                </Label>
                                <Input
                                id="lastName"
                                value={profileData.lastName}
                                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                />
                            </div>
                            </div>
                            <div>
                            <Label htmlFor="email" className="text-gray-900 dark:text-white">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={profileData.email}
                                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                            />
                            </div>
                            <div>
                            <Label htmlFor="phone" className="text-gray-900 dark:text-white">
                                Phone
                            </Label>
                            <Input
                                id="phone"
                                value={profileData.phone}
                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                            />
                            </div>
                            <div>
                            <Label htmlFor="bio" className="text-gray-900 dark:text-white">
                                Bio
                            </Label>
                            <Textarea
                                id="bio"
                                value={profileData.bio}
                                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                            />
                            </div>
                        </>
                        ) : (
                        <>
                            <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900 dark:text-white text-sm sm:text-base">
                                {profileData.email}
                            </span>
                            </div>
                            <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900 dark:text-white text-sm sm:text-base">
                                {profileData.phone}
                            </span>
                            </div>
                            <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-900 dark:text-white text-sm sm:text-base">
                                {profileData.location}
                            </span>
                            </div>
                        </>
                        )}
                    </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                        {donationHistory.slice(0, 3).map((donation) => (
                            <div
                            key={donation.id}
                            className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                            >
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                {donation.organization}
                                </h4>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                Donated ${donation.amount} on {donation.date}
                                </p>
                            </div>
                            </div>
                        ))}
                        </div>
                    </CardContent>
                    </Card>
                </div>
                </TabsContent>

                <TabsContent value="favorites" className="space-y-4 sm:space-y-6">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                        <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl">
                            Favorite Organizations
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-300 text-sm">
                            Organizations you follow and support regularly
                        </CardDescription>
                        </div>
                        <Dialog open={isAddingFavorite} onOpenChange={setIsAddingFavorite}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Favorite
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-w-2xl mx-4 sm:mx-auto">
                            <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-white">Add Favorite Organization</DialogTitle>
                            <DialogDescription className="text-gray-600 dark:text-gray-300">
                                Search and choose an organization to add to your favorites
                            </DialogDescription>
                            </DialogHeader>
                            {/* Search and Filter Controls */}
                            <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Search organizations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                />
                                </div>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category === "all" ? "All Categories" : category}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            </div>
                            </div>
                            {/* Organizations List */}
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                            {filteredAvailableOrganizations.length > 0 ? (
                                filteredAvailableOrganizations.map((org) => (
                                <div
                                    key={org.id}
                                    className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <img
                                    src={org.image || "/placeholder.svg"}
                                    alt={org.name}
                                    width={48}
                                    height={48}
                                    className="rounded-full flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 dark:text-white truncate">{org.name}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
                                        {org.description}
                                    </p>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                        <Badge variant="secondary" className="text-xs">
                                        {org.category}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                        <span>{org.rating}</span>
                                        </div>
                                    </div>
                                    </div>
                                    <Button
                                    size="sm"
                                    onClick={() => addFavoriteOrganization(org)}
                                    className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                                    >
                                    Add
                                    </Button>
                                </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    No organizations found
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Try adjusting your search terms or category filter
                                </p>
                                </div>
                            )}
                            </div>
                        </DialogContent>
                        </Dialog>
                    </div>
                    </CardHeader>
                    <CardContent>
                    <div className="grid grid-cols-1 gap-4">
                        {favoriteOrganizations.map((org) => (
                        <div
                            key={org.id}
                            className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start gap-4">
                            <img
                                src={org.image || "/placeholder.svg"}
                                alt={org.name}
                                width={64}
                                height={64}
                                className="rounded-full flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                                    {org.name}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2">
                                    <span>{org.category}</span>
                                    <div className="flex items-center gap-1">
                                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                        <span>{org.rating}</span>
                                    </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <Button
                                    size="sm"
                                    onClick={() => handleDonateToFavorite(org)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                    >
                                    <Heart className="h-4 w-4 mr-1" />
                                    Donate
                                    </Button>
                                    <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeFavoriteOrganization(org.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                    >
                                    <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                </div>
                                <div className="space-y-1 text-xs sm:text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-300">Total donated:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">${org.totalDonated}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-300">Last donation:</span>
                                    <span className="text-gray-900 dark:text-white">{org.lastDonation}</span>
                                </div>
                                </div>
                            </div>
                            </div>
                        </div>
                        ))}
                    </div>
                    {favoriteOrganizations.length === 0 && (
                        <div className="text-center py-8">
                        <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No favorites yet</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm sm:text-base">
                            Add organizations you care about to keep track of them easily
                        </p>
                        <Button onClick={() => setIsAddingFavorite(true)} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Favorite
                        </Button>
                        </div>
                    )}
                    </CardContent>
                </Card>
                </TabsContent>

                <TabsContent value="donations" className="space-y-4 sm:space-y-6">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                        <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl">
                            Donation History
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-300 text-sm">
                            Track all your donations and their impact
                        </CardDescription>
                        </div>
                        <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                        </Button>
                    </div>
                    </CardHeader>
                    <CardContent>
                    <div className="space-y-4">
                        {donationHistory.map((donation) => (
                        <div key={donation.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                                {donation.organization}
                            </h4>
                            <Badge variant="outline" className="text-green-600 border-green-600 w-fit">
                                {donation.status}
                            </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div>
                                <span className="text-gray-600 dark:text-gray-300">Amount: </span>
                                <span className="font-medium text-gray-900 dark:text-white">${donation.amount}</span>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-300">Date: </span>
                                <span className="text-gray-900 dark:text-white">{donation.date}</span>
                            </div>
                            <div className="sm:col-span-1">
                                <span className="text-gray-600 dark:text-gray-300">Impact: </span>
                                <span className="text-gray-900 dark:text-white">{donation.impact}</span>
                            </div>
                            </div>
                        </div>
                        ))}
                    </div>
                    </CardContent>
                </Card>
                </TabsContent>

                <TabsContent value="orders" className="space-y-4 sm:space-y-6">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                        <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl">Order History</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-300 text-sm">
                            Track your product orders and deliveries
                        </CardDescription>
                        </div>
                        <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                        <Download className="h-4 w-4 mr-2" />
                        Export Orders
                        </Button>
                    </div>
                    </CardHeader>
                    <CardContent>
                    <div className="space-y-6">
                        {orderHistory.map((order) => (
                        <div key={order.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 sm:p-6">
                            {/* Order Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                {getStatusIcon(order.status)}
                                <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">Order {order.id}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Placed on {order.date} • {order.organization}
                                </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className={getStatusColor(order.status)}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </Badge>
                                <span className="font-bold text-lg text-gray-900 dark:text-white">${order.total}</span>
                            </div>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-3 mb-4">
                            {order.items.map((item, index) => (
                                <div
                                key={index}
                                className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                <img
                                    src={item.image || "/placeholder.svg"}
                                    alt={item.name}
                                    width={48}
                                    height={48}
                                    className="rounded object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                    {item.name}
                                    </h5>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                    Quantity: {item.quantity} × ${item.price}
                                    </p>
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white text-sm">
                                    ${item.quantity * item.price}
                                </span>
                                </div>
                            ))}
                            </div>

                            {/* Order Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                            {order.trackingNumber && (
                                <div>
                                <span className="text-gray-600 dark:text-gray-300">Tracking:</span>
                                <div className="font-mono text-gray-900 dark:text-white">{order.trackingNumber}</div>
                                </div>
                            )}
                            {order.deliveryDate && (
                                <div>
                                <span className="text-gray-600 dark:text-gray-300">Delivered:</span>
                                <div className="text-gray-900 dark:text-white">{order.deliveryDate}</div>
                                </div>
                            )}
                            {order.estimatedDelivery && (
                                <div>
                                <span className="text-gray-600 dark:text-gray-300">Est. Delivery:</span>
                                <div className="text-gray-900 dark:text-white">{order.estimatedDelivery}</div>
                                </div>
                            )}
                            {order.refundAmount && (
                                <div>
                                <span className="text-gray-600 dark:text-gray-300">Refund:</span>
                                <div className="text-green-600 font-medium">${order.refundAmount}</div>
                                </div>
                            )}
                            </div>

                            {/* Order Actions */}
                            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-600">
                            <Button size="sm" variant="outline" className="bg-transparent">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                            </Button>
                            {order.status === "delivered" && (
                                <Button size="sm" variant="outline" className="bg-transparent">
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reorder
                                </Button>
                            )}
                            {order.trackingNumber && (
                                <Button size="sm" variant="outline" className="bg-transparent">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Track Package
                                </Button>
                            )}
                            </div>
                        </div>
                        ))}
                    </div>
                    </CardContent>
                </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 sm:space-y-6">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-4">
                    <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl">
                        Notification Preferences
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300 text-sm">
                        Manage how you receive updates and notifications
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-4">
                        <Label className="text-gray-900 dark:text-white text-sm sm:text-base">Email Updates</Label>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                            Receive general updates via email
                        </p>
                        </div>
                        <Switch
                        checked={notifications.emailUpdates}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, emailUpdates: checked })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-4">
                        <Label className="text-gray-900 dark:text-white text-sm sm:text-base">Donation Receipts</Label>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                            Get receipts for tax purposes
                        </p>
                        </div>
                        <Switch
                        checked={notifications.donationReceipts}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, donationReceipts: checked })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-4">
                        <Label className="text-gray-900 dark:text-white text-sm sm:text-base">Organization News</Label>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                            Updates from organizations you support
                        </p>
                        </div>
                        <Switch
                        checked={notifications.organizationNews}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, organizationNews: checked })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-4">
                        <Label className="text-gray-900 dark:text-white text-sm sm:text-base">Monthly Reports</Label>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Monthly impact summaries</p>
                        </div>
                        <Switch
                        checked={notifications.monthlyReports}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, monthlyReports: checked })}
                        />
                    </div>
                    </CardContent>
                </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4 sm:space-y-6">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-4">
                    <CardTitle className="text-gray-900 dark:text-white text-lg sm:text-xl">Security Settings</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300 text-sm">
                        Manage your account security and privacy
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6">
                    <div className="space-y-3 sm:space-y-4">
                        <Button variant="outline" className="w-full justify-start bg-transparent">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Change Password
                        </Button>
                        <Button variant="outline" className="w-full justify-start bg-transparent">
                        <Bell className="h-4 w-4 mr-2" />
                        Two-Factor Authentication
                        </Button>
                        <Button variant="outline" className="w-full justify-start bg-transparent">
                        <Download className="h-4 w-4 mr-2" />
                        Download My Data
                        </Button>
                        <Button variant="destructive" className="w-full justify-start">
                        <X className="h-4 w-4 mr-2" />
                        Delete Account
                        </Button>
                    </div>
                    </CardContent>
                </Card>
                </TabsContent>
            </Tabs>
            </motion.div>
        </div>

        {/* Donation Modal */}
        {selectedOrganization && (
            <DonationModal
            isOpen={isDonationModalOpen}
            onClose={() => {
                setIsDonationModalOpen(false)
                setSelectedOrganization(null)
            }}
            organization={selectedOrganization}
            />
        )}
        </div>
    </FrontendLayout>
  )
}

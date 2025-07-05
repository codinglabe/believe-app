"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Heart,
  MapPin,
  Globe,
  Phone,
  Mail,
  Calendar,
  Award,
  Share2,
  DollarSign,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Check,
  FileText,
  Building,
  Plus,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import DonationModal from "@/components/frontend/donation-modal"
import { Link } from "@inertiajs/react"

// Mock data - in a real app, this would come from an API
const organizationData = {
  id: 1,
  name: "Clean Water Initiative Foundation",
  description: "Empowering communities through clean water access and sustainable development programs worldwide.",
  longDescription:
    "Clean Water Initiative has been working tirelessly since 2015 to bring clean, safe drinking water to communities that need it most. Our comprehensive approach includes building sustainable water infrastructure, training local communities in maintenance, and educating about water conservation and hygiene practices.",
  mission: "To ensure every person has access to clean, safe drinking water and proper sanitation facilities.",
  image: "/placeholder.svg?height=400&width=600",
  logo: "/placeholder.svg?height=100&width=100",
  category: "Environment",
  location: "New York, NY",
  website: "https://cleanwaterinitiative.org",
  phone: "+1 (555) 123-4567",
  email: "info@cleanwaterinitiative.org",
  founded: "2015",
  employees: "150-200",
  rating: 4.8,
  reviews: 234,
  verified: true,
  ein: "12-3456789",
  legalName: "Clean Water Initiative Foundation",
  inCareOf: "John Smith, Executive Director",
  address: "123 Charity Lane",
  fullAddress: "123 Charity Lane, New York, NY 10001",
  classification: "501(c)(3)",
  rulingYear: "2015",
  taxDeductible: true,
  organizationType: "Corporation",
  status: "Active",
  nteeCode: "C30",
  filingRequirement: "990",
  primaryContact: "Sarah Johnson",
  contactTitle: "Program Director",
  totalDonations: 2500000,
  activeProjects: 15,
  beneficiaries: 250000,
  projectsCompleted: 150,
  countriesActive: 25,
  officeHours: {
    weekdays: "Monday - Friday: 9:00 AM - 5:00 PM EST",
    saturday: "Saturday: 10:00 AM - 2:00 PM EST",
    sunday: "Sunday: Closed",
  },
  recentProjects: [
    {
      id: 1,
      name: "Water Well Construction in Kenya",
      completion: "Completed March 2024",
      beneficiaries: "Serving 2,500 people",
      color: "blue",
    },
    {
      id: 2,
      name: "Community Training Program in Bangladesh",
      completion: "Completed February 2024",
      beneficiaries: "150 families trained",
      color: "green",
    },
    {
      id: 3,
      name: "School Water System in Guatemala",
      completion: "Completed January 2024",
      beneficiaries: "800 students benefited",
      color: "purple",
    },
  ],
  financials: {
    programExpenses: 85,
    administrativeExpenses: 10,
    fundraisingExpenses: 5,
    totalRevenue: 1200000,
    totalExpenses: 1100000,
  },
  products: [
    {
      id: 1,
      name: "Water Filter Kit",
      description: "Portable water filtration system for families",
      price: 45,
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      category: "Equipment",
      inStock: true,
      rating: 4.8,
      reviews: 124,
    },
    {
      id: 2,
      name: "Clean Water T-Shirt",
      description: "Support clean water with our organic cotton tee",
      price: 25,
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      category: "Apparel",
      inStock: true,
      rating: 4.6,
      reviews: 89,
    },
    {
      id: 3,
      name: "Water Bottle",
      description: "Reusable stainless steel water bottle",
      price: 20,
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      category: "Equipment",
      inStock: true,
      rating: 4.9,
      reviews: 156,
    },
    {
      id: 4,
      name: "Educational Kit",
      description: "Water conservation education materials",
      price: 35,
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      category: "Education",
      inStock: true,
      rating: 4.7,
      reviews: 67,
    },
    {
      id: 5,
      name: "Solar Water Purifier",
      description: "Solar-powered water purification device",
      price: 120,
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      category: "Equipment",
      inStock: false,
      rating: 4.9,
      reviews: 43,
    },
    {
      id: 6,
      name: "Water Testing Kit",
      description: "Complete water quality testing kit",
      price: 65,
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      category: "Equipment",
      inStock: true,
      rating: 4.5,
      reviews: 78,
    },
    {
      id: 7,
      name: "Clean Water Hoodie",
      description: "Comfortable hoodie supporting clean water initiatives",
      price: 40,
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      category: "Apparel",
      inStock: true,
      rating: 4.4,
      reviews: 92,
    },
    {
      id: 8,
      name: "Water Conservation Guide",
      description: "Comprehensive guide to water conservation practices",
      price: 15,
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vYYPOXFczeax7tugiiZmYLsfSmTr9f.png",
      category: "Education",
      inStock: true,
      rating: 4.8,
      reviews: 134,
    },
  ],
}

export default function OrganizationPage({ params }: { params: { id: string } }) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [currentProductPage, setCurrentProductPage] = useState(1)
  const [cart, setCart] = useState<any[]>([])
  const [showCartModal, setShowCartModal] = useState(false)
  const productsPerPage = 4
  const organization = organizationData // In real app, fetch based on params.id

  // Calculate pagination for products
  const totalProducts = organization.products.length
  const totalProductPages = Math.ceil(totalProducts / productsPerPage)
  const startProductIndex = (currentProductPage - 1) * productsPerPage
  const endProductIndex = Math.min(startProductIndex + productsPerPage, totalProducts)
  const currentProducts = organization.products.slice(startProductIndex, endProductIndex)

  const handleProductPageChange = (page: number) => {
    setCurrentProductPage(page)
  }

  const addToCart = (product: any) => {
    const existingItem = cart.find((item) => item.id === product.id)
    if (existingItem) {
      setCart(cart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
  }

  const buyNow = (product: any) => {
    setCart([{ ...product, quantity: 1 }])
    setShowCartModal(true)
  }

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.id !== productId))
  }

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(productId)
    } else {
      setCart(cart.map((item) => (item.id === productId ? { ...item, quantity } : item)))
    }
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  useEffect(() => {
    // Check if organization is in user's favorites
    const favorites = JSON.parse(localStorage.getItem("favoriteOrganizations") || "[]")
    setIsFavorite(favorites.includes(organization.id))
  }, [organization.id])

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem("favoriteOrganizations") || "[]")
    let updatedFavorites

    if (isFavorite) {
      updatedFavorites = favorites.filter((id: number) => id !== organization.id)
    } else {
      updatedFavorites = [...favorites, organization.id]
    }

    localStorage.setItem("favoriteOrganizations", JSON.stringify(updatedFavorites))
    setIsFavorite(!isFavorite)
  }

    return (
    <FrontendLayout>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="relative h-96 overflow-hidden">
        <img src={organization.image || "/placeholder.svg"} alt={organization.name} fill className="object-cover" />
        <div className="absolute inset-0 bg-black bg-opacity-50" />
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-4 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center md:flex-row md:items-end gap-6"
            >
              {/* Organization Logo - Centered on mobile, left-aligned on desktop */}
              <div className="relative flex-shrink-0">
                <div className="relative">
                  <img
                    src={organization.logo || "/placeholder.svg"}
                    alt={`${organization.name} logo`}
                    width={120}
                    height={120}
                    className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full border-4 border-white shadow-lg bg-white object-cover"
                    priority
                  />
                  {organization.verified && (
                    <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-blue-600 rounded-full p-1">
                      <Award className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Organization Info - Centered on mobile */}
              <div className="flex-1 text-white text-center md:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 leading-tight">{organization.name}</h1>
                <p className="text-base sm:text-lg opacity-90 mb-4 max-w-2xl mx-auto md:mx-0">
                  {organization.description}
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{organization.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Founded {organization.founded}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm">
                      {organization.rating} ({organization.reviews} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Full width on mobile */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <Button
                  onClick={() => setShowDonationModal(true)}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 w-full sm:w-auto"
                >
                  <Heart className="mr-2 h-5 w-5" />
                  Donate Now
                </Button>
                <Button
                  onClick={toggleFavorite}
                  variant="outline"
                  size="lg"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full sm:w-auto"
                >
                  <Heart className={`mr-2 h-5 w-5 ${isFavorite ? "fill-current text-red-500" : ""}`} />
                  <span className="hidden sm:inline">{isFavorite ? "Favorited" : "Add to Favorites"}</span>
                  <span className="sm:hidden">{isFavorite ? "Favorited" : "Favorite"}</span>
                </Button>
                {getCartItemCount() > 0 && (
                  <Button
                    onClick={() => setShowCartModal(true)}
                    variant="outline"
                    size="lg"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 relative w-full sm:w-auto"
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Cart ({getCartItemCount()})
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-8">
                <TabsTrigger value="about" className="text-xs sm:text-sm">
                  About
                </TabsTrigger>
                <TabsTrigger value="impact" className="text-xs sm:text-sm">
                  Impact
                </TabsTrigger>
                <TabsTrigger value="details" className="text-xs sm:text-sm">
                  Details
                </TabsTrigger>
                <TabsTrigger value="products" className="text-xs sm:text-sm">
                  Products
                </TabsTrigger>
                <TabsTrigger value="contact" className="text-xs sm:text-sm">
                  Contact
                </TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="space-y-6">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white text-xl">About Our Mission</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                      {organization.longDescription}
                    </p>

                    <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-r-lg">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Our Mission</h3>
                      <p className="text-gray-700 dark:text-gray-300">{organization.mission}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="impact" className="space-y-6">
                {/* Impact Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-center">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {organization.beneficiaries.toLocaleString()}+
                      </div>
                      <div className="text-gray-600 dark:text-gray-300">People Served</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-center">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-green-600 mb-2">{organization.projectsCompleted}+</div>
                      <div className="text-gray-600 dark:text-gray-300">Projects Completed</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-center">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-purple-600 mb-2">{organization.countriesActive}+</div>
                      <div className="text-gray-600 dark:text-gray-300">Countries Active</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Projects */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white text-xl">Recent Projects</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {organization.recentProjects.map((project) => (
                      <div key={project.id} className="flex items-start gap-4">
                        <div
                          className={`w-1 h-16 rounded-full ${
                            project.color === "blue"
                              ? "bg-blue-500"
                              : project.color === "green"
                                ? "bg-green-500"
                                : "bg-purple-500"
                          }`}
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{project.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {project.completion} • {project.beneficiaries}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* IRS Information */}
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-gray-900 dark:text-white flex items-center">
                        <FileText className="mr-2 h-5 w-5" />
                        IRS Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">EIN</span>
                          <div className="font-mono text-gray-900 dark:text-white">{organization.ein}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Classification</span>
                          <div className="text-gray-900 dark:text-white">{organization.classification}</div>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Legal Name</span>
                        <div className="text-gray-900 dark:text-white">{organization.legalName}</div>
                      </div>

                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">In Care Of</span>
                        <div className="text-gray-900 dark:text-white">{organization.inCareOf}</div>
                      </div>

                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Address</span>
                        <div className="text-gray-900 dark:text-white">{organization.address}</div>
                        <div className="text-gray-900 dark:text-white">{organization.location} 10001</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Ruling Year</span>
                          <div className="text-gray-900 dark:text-white">{organization.rulingYear}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Tax Deductible</span>
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          >
                            Yes
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Organization Type</span>
                          <div className="text-gray-900 dark:text-white">{organization.organizationType}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Status</span>
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {organization.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">NTEE Code</span>
                          <div className="text-gray-900 dark:text-white">{organization.nteeCode}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Filing Requirement</span>
                          <div className="text-gray-900 dark:text-white">{organization.filingRequirement}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Organization Details */}
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-gray-900 dark:text-white flex items-center">
                        <Building className="mr-2 h-5 w-5" />
                        Organization Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Primary Contact</span>
                        <div className="text-gray-900 dark:text-white">{organization.primaryContact}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{organization.contactTitle}</div>
                      </div>

                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Email</span>
                        <div className="text-blue-600 hover:underline">
                          <a href={`mailto:${organization.email}`}>{organization.email}</a>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Phone</span>
                        <div className="text-gray-900 dark:text-white">{organization.phone}</div>
                      </div>

                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Website</span>
                        <div className="text-blue-600 hover:underline">
                          <a href={organization.website} target="_blank" className="flex items-center gap-1">
                            {organization.website}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Founded</span>
                        <div className="text-gray-900 dark:text-white">{organization.founded}</div>
                      </div>

                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Category</span>
                        <Badge
                          variant="secondary"
                          className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                        >
                          {organization.category}
                        </Badge>
                      </div>

                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Verification Status</span>
                        <div className="flex items-center gap-2 text-green-600">
                          <Check className="h-4 w-4" />
                          <span>Verified Organization</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="products" className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Support Our Cause</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Purchase products that support our mission and help us continue our work.
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {totalProducts} products
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {currentProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group"
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          width={400}
                          height={200}
                          className="w-full h-40 sm:h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {!product.inStock && (
                          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                            Out of Stock
                          </div>
                        )}
                        <Badge variant="secondary" className="absolute top-2 left-2 bg-white/90 text-gray-800 text-xs">
                          {product.category}
                        </Badge>
                      </div>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {product.name}
                          </h4>
                          <span className="text-xl sm:text-2xl font-bold text-blue-600">${product.price}</span>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 text-sm leading-relaxed">
                          {product.description}
                        </p>

                        <div className="flex items-center gap-2 mb-3 sm:mb-4">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 sm:h-4 sm:w-4 ${
                                  i < Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            {product.rating} ({product.reviews} reviews)
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={() => addToCart(product)}
                            disabled={!product.inStock}
                            variant="outline"
                            className="flex-1 bg-transparent disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add to Cart
                          </Button>
                          <Button
                            onClick={() => buyNow(product)}
                            disabled={!product.inStock}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Buy Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalProductPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-2 pt-6">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleProductPageChange(currentProductPage - 1)}
                        disabled={currentProductPage === 1}
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </Button>

                      <div className="flex gap-1">
                        {Array.from({ length: totalProductPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentProductPage === page ? "default" : "outline"}
                            onClick={() => handleProductPageChange(page)}
                            className={
                              currentProductPage === page
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                            }
                          >
                            {page}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => handleProductPageChange(currentProductPage + 1)}
                        disabled={currentProductPage === totalProductPages}
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <span className="sm:hidden">Next</span>
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-0 sm:ml-4">
                      Showing {startProductIndex + 1}-{endProductIndex} of {totalProducts} products
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contact" className="space-y-6">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white text-xl">Get in Touch</CardTitle>
                    <p className="text-gray-600 dark:text-gray-300">
                      Have questions or want to get involved? We'd love to hear from you.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Contact Information */}
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Contact Information
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <a href={`mailto:${organization.email}`} className="text-blue-600 hover:underline">
                                {organization.email}
                              </a>
                            </div>
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600 dark:text-gray-300">{organization.phone}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Globe className="h-4 w-4 text-gray-500" />
                              <a
                                href={organization.website}
                                target="_blank"
                                className="text-blue-600 hover:underline"
                              >
                                {organization.website}
                              </a>
                            </div>
                            <div className="flex items-start gap-3">
                              <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                              <div>
                                <div className="text-gray-600 dark:text-gray-300">{organization.address}</div>
                                <div className="text-gray-600 dark:text-gray-300">{organization.location} 10001</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Primary Contact</h4>
                          <div className="text-gray-600 dark:text-gray-300">{organization.primaryContact}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{organization.contactTitle}</div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Office Hours</h4>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                            <div>{organization.officeHours.weekdays}</div>
                            <div>{organization.officeHours.saturday}</div>
                            <div>{organization.officeHours.sunday}</div>
                          </div>
                        </div>
                      </div>

                      {/* Send Message */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Send us a message</h3>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3">Contact Us</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Donate */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-green-600" />
                  Quick Donate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {[25, 50, 100, 250].map((amount) => (
                    <Button key={amount} variant="outline" onClick={() => setShowDonationModal(true)} className="h-12">
                      ${amount}
                    </Button>
                  ))}
                </div>
                <Button onClick={() => setShowDonationModal(true)} className="w-full bg-blue-600 hover:bg-blue-700">
                  Custom Amount
                </Button>
              </CardContent>
            </Card>

            {/* Share */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Share This Organization</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cart/Checkout Modal */}
      {showCartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Shopping Cart</h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowCartModal(false)}
                  className="text-gray-500 hover:text-gray-700 h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Your cart is empty</h3>
                  <p className="text-gray-600 dark:text-gray-300">Add some products to get started!</p>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                      >
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          width={64}
                          height={64}
                          className="rounded object-cover flex-shrink-0 w-16 h-16"
                        />
                        <div className="flex-1 w-full sm:w-auto">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                            {item.name}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">${item.price} each</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-7 w-7 p-0 text-xs"
                            >
                              -
                            </Button>
                            <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-7 w-7 p-0 text-xs"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div className="text-right w-full sm:w-auto flex justify-between sm:block">
                          <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:text-red-700 text-xs sm:text-sm mt-0 sm:mt-1 h-auto p-1"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Summary */}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3 sm:pt-4 mb-4 sm:mb-6">
                    <div className="flex justify-between items-center text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      <span>Total:</span>
                      <span>${getCartTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Checkout Form */}
                  <form className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter your email"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Shipping Address
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Street address"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="ZIP"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Phone number"
                      />
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-600 pt-3 sm:pt-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-sm sm:text-base">
                        Payment Information
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Card Number
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="1234 5678 9012 3456"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Expiry Date
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                              placeholder="MM/YY"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              CVV
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                              placeholder="123"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCartModal(false)}
                        className="w-full sm:flex-1 text-sm sm:text-base"
                      >
                        Continue Shopping
                      </Button>
                      <Button
                        type="submit"
                        className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-sm sm:text-base"
                      >
                        Complete Purchase (${getCartTotal().toFixed(2)})
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Donation Modal */}
      <DonationModal
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
        organization={organization}
      />
            </div>
    </FrontendLayout>
  )
}

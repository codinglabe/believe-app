"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
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
  Plus,
  Clock,
  Users,
  Info,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import DonationModal from "@/components/frontend/donation-modal"
import { Link, router, useForm } from "@inertiajs/react"
import { route } from "ziggy-js" // Import route function from ziggy-js
import axios from "axios"
import { showErrorToast } from "@/lib/toast"
import { JobStatusBadge, JobTypeBadge, LocationTypeBadge } from "@/components/frontend/jobs/badge"
import type React from "react"
import { useEffect, useState } from "react"

// Helper to extract channel ID from a YouTube URL
function extractYouTubeChannelId(url: string): string | null {
  // Handles URLs like https://www.youtube.com/channel/UCxxxx, /user/xxxx, /@xxxx
  if (!url) return null
  const channelMatch = url.match(/youtube\.com\/(channel|user|@)([\w-]+)/)
  if (channelMatch) {
    if (channelMatch[1] === "channel") return channelMatch[2]
    if (channelMatch[1] === "user" || channelMatch[1] === "@") return channelMatch[2]
  }
  // Try to extract from full URL
  const idMatch = url.match(/(?:channel\/|user\/|@)([\w-]+)/)
  return idMatch ? idMatch[1] : null
}

function YouTubeChannelVideos({ channelUrl }: { channelUrl: string }) {
  const [videos, setVideos] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Get API key from environment variable
  // Set VITE_YOUTUBE_API_KEY in your .env file
  const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY

  useEffect(() => {
    if (!channelUrl) return
    setLoading(true)
    setError(null)
    // First, get the channel ID if it's a username or handle
    let channelId = null
    let username = null
    if (channelUrl.includes("/channel/")) {
      channelId = extractYouTubeChannelId(channelUrl)
    } else if (channelUrl.includes("/user/")) {
      username = extractYouTubeChannelId(channelUrl)
    } else if (channelUrl.includes("/@")) {
      username = extractYouTubeChannelId(channelUrl)
    }
    // If username, resolve to channelId
    const fetchVideos = async (cid: string) => {
      // Get uploads playlist ID
      const channelResp = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${cid}&key=${API_KEY}`,
      )
      const channelData = await channelResp.json()
      if (!channelData.items || !channelData.items[0]) {
        setError("Channel not found.")
        setLoading(false)
        return
      }
      const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads
      // Fetch videos from uploads playlist
      const playlistResp = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=8&playlistId=${uploadsPlaylistId}&key=${API_KEY}`,
      )
      const playlistData = await playlistResp.json()
      setVideos(playlistData.items || [])
      setLoading(false)
    }
    const fetchChannelIdFromUsername = async (uname: string) => {
      // Try to resolve username or handle to channelId
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${uname}&key=${API_KEY}`,
      )
      const data = await resp.json()
      if (data.items && data.items[0]) {
        await fetchVideos(data.items[0].id)
      } else {
        // Try handle (for @username)
        const searchResp = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${uname}&type=channel&key=${API_KEY}`,
        )
        const searchData = await searchResp.json()
        if (searchData.items && searchData.items[0]) {
          await fetchVideos(searchData.items[0].id.channelId)
        } else {
          setError("Channel not found.")
          setLoading(false)
        }
      }
    }
    if (channelId) {
      fetchVideos(channelId)
    } else if (username) {
      fetchChannelIdFromUsername(username)
    } else {
      setError("Invalid YouTube channel URL.")
      setLoading(false)
    }
  }, [channelUrl])

  if (!channelUrl) return null
  if (loading) return <div>Loading YouTube videos...</div>
  if (error) return <div className="text-red-500">{error}</div>
  if (!videos.length) return <div>No videos found.</div>
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {videos.map((item) => (
        <div key={item.snippet.resourceId.videoId} className="aspect-w-16 aspect-h-9">
          <iframe
            width="100%"
            height="315"
            src={`https://www.youtube.com/embed/${item.snippet.resourceId.videoId}`}
            title={item.snippet.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
          <div className="mt-2 text-sm">{item.snippet.title}</div>
        </div>
      ))}
    </div>
  )
}

export default function OrganizationPage({ auth, organization, isFav }: { organization: any; isFav: boolean }) {
  const [isFavorite, setIsFavorite] = useState(isFav || false)
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [currentProductPage, setCurrentProductPage] = useState(1)
  const [currentjobPostsPage, setCurrentjobPostsPage] = useState(1)
  const [cart, setCart] = useState<any[]>([])
  const [showCartModal, setShowCartModal] = useState(false)
  const productsPerPage = 4
  const jobPostsPerPage = 4

  // Calculate pagination for products
  const totalProducts = Array.isArray(organization.products) ? organization.products?.length : 0
  const totalProductPages = Math.ceil(totalProducts / productsPerPage)
  const startProductIndex = (currentProductPage - 1) * productsPerPage
  const endProductIndex = Math.min(startProductIndex + productsPerPage, totalProducts)
  const currentProducts = organization.products?.slice(startProductIndex, endProductIndex) || []

  console.log("Current Products:", organization.job_posts)

  const totaljobPosts = organization.job_posts?.length || 0
  const totaljobPostsPages = Math.ceil(totaljobPosts / jobPostsPerPage)
  const startjobPostsIndex = (currentjobPostsPage - 1) * jobPostsPerPage
  const endjobPostsIndex = Math.min(startjobPostsIndex + jobPostsPerPage, totaljobPosts)
  const currentjobPosts = organization.job_posts?.slice(startjobPostsIndex, endjobPostsIndex) || []

  const { post, processing } = useForm()

  const toggleFavorite = () => {
    post(route("user.organizations.toggle-favorite", { id: organization.id }), {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => setIsFavorite(!isFavorite),
      onError: (errors) => {
        console.error("Error toggling favorite:", errors)
      },
    })
  }

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
    return cart.reduce((total, item) => total + item.unit_price * item.quantity, 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const handleDonateNow = () => {
    if (!organization.is_registered) {
      return // Don't allow donations for unregistered organizations
    }

    if (!auth?.user) {
      router.visit(route("login", { redirect: route("organizations.show", { slug: organization?.user?.slug }) }), {
        replace: true,
      })
    } else {
      setShowDonationModal(true)
    }
  }

  //   useEffect(() => {
  //     Inertia.get(route(route().current()), query, {
  //         preserveState: true,
  //         replace: true,
  //     });
  // }, [query]);

  //   useEffect(() => {
  //     // Check if organization is in user's favorites
  //     const favorites = JSON.parse(localStorage.getItem("favoriteOrganizations") || "[]")
  //     setIsFavorite(favorites.includes(organization.id))
  //   }, [organization.id])

  //   const toggleFavorite = () => {
  //     const favorites = JSON.parse(localStorage.getItem("favoriteOrganizations") || "[]")
  //     let updatedFavorites

  //     if (isFavorite) {
  //       updatedFavorites = favorites.filter((id: number) => id !== organization.id)
  //     } else {
  //       updatedFavorites = [...favorites, organization.id]
  //     }

  //     localStorage.setItem("favoriteOrganizations", JSON.stringify(updatedFavorites))
  //     setIsFavorite(!isFavorite)
  //   }

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCompletePurchase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    const orderData = {
      first_name: firstName,
      last_name: lastName,
      email,
      shipping_address: shippingAddress,
      city,
      zip,
      phone,
      products: cart.map((item) => ({
        id: item.id,
        quantity: item.quantity,
      })),
      // Add payment info as needed
    }
    try {
      const response = await axios.post(route("purchase.order"), orderData)
      if (response.data.url) {
        window.location.href = response.data.url
      } else {
        setIsSubmitting(false)
        showErrorToast("Stripe URL not received.")
      }
    } catch (error: any) {
      setIsSubmitting(false)
      if (error.response && error.response.data && error.response.data.errors) {
        setErrors(error.response.data.errors)
      } else {
        showErrorToast("Order failed. Please try again.")
      }
    }
  }

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (!amount || !currency) return "Not specified"

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No deadline"

    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Format address
  const fullAddress = `${organization.street}, ${organization.city}, ${organization.state} ${organization.zip}`

  // Form state for checkout
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [shippingAddress, setShippingAddress] = useState("")
  const [city, setCity] = useState("")
  const [zip, setZip] = useState("")
  const [phone, setPhone] = useState("")

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <div className="relative h-96 overflow-hidden">
          <img
            src={organization.user?.cover_img ? "/storage/" + organization.user.cover_img : "/placeholder.svg"}
            alt={organization.name}
            className="object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50" />
          <div
            className="absolute inset-0 flex items-end"
            style={{
              backgroundImage: `url(${organization.user?.cover_img ? "/storage/" + organization.user.cover_img : "/placeholder.svg"})`,
              backgroundColor: "#101828",
              backgroundBlendMode: "soft-light",
            }}
          >
            <div className="container mx-auto px-4 pb-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col items-center md:flex-row md:items-end gap-6"
              >
                {/* Organization Logo */}
                <div className="relative flex-shrink-0">
                  <div className="relative">
                    <img
                      src={organization.user?.image ? "/storage/" + organization.user.image : "/placeholder.svg"}
                      alt={`${organization.name} logo`}
                      width={120}
                      height={120}
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full border-4 border-white shadow-lg bg-white object-cover"
                      priority
                    />
                    {organization.is_registered && organization.registration_status === "approved" && (
                      <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-blue-600 rounded-full p-1">
                        <Award className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Organization Info */}
                <div className="flex-1 text-white text-center md:text-left">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 leading-tight">{organization.name}</h1>
                  <p className="text-base sm:text-lg opacity-90 mb-4 max-w-2xl mx-auto md:mx-0">
                    {organization.description}
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">
                        {organization.city}, {organization.state}
                      </span>
                    </div>
                    {/* <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Founded {organization.ruling}</span>
                    </div> */}
                    {organization.is_registered && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm">4.8 (234 reviews)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {organization.is_registered && (
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Button
                      onClick={handleDonateNow}
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
                )}
              </motion.div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="about" className="w-full">
                <TabsList className={`grid w-full mb-8 ${organization.is_registered ? "grid-cols-8" : "grid-cols-3"}`}>
                  <TabsTrigger value="about" className="text-xs sm:text-sm">
                    About
                  </TabsTrigger>
                  <TabsTrigger value="impact" className="text-xs sm:text-sm">
                    Impact
                  </TabsTrigger>
                  <TabsTrigger value="details" className="text-xs sm:text-sm">
                    Details
                  </TabsTrigger>
                  {organization.is_registered && (
                    <>
                      <TabsTrigger value="products" className="text-xs sm:text-sm">
                        Products
                      </TabsTrigger>
                      <TabsTrigger value="jobs" className="text-xs sm:text-sm">
                        Jobs
                      </TabsTrigger>
                      <TabsTrigger value="events" className="text-xs sm:text-sm">
                        Events
                      </TabsTrigger>
                      <TabsTrigger value="social" className="text-xs sm:text-sm">
                        Social Media
                      </TabsTrigger>
                      <TabsTrigger value="contact" className="text-xs sm:text-sm">
                        Contact
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>

                <TabsContent value="about" className="space-y-6">
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-gray-900 dark:text-white text-xl">About Our Mission</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                        {organization.description}
                      </p>

                      <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-r-lg">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Our Mission</h3>
                        <p className="text-gray-700 dark:text-gray-300">{organization.mission}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="impact" className="space-y-6">
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-gray-900 dark:text-white text-xl">Our Impact</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {organization.is_registered ? (
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                          Detailed impact information is available for registered organizations.
                        </p>
                      ) : (
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                          This organization is listed in our database. For detailed impact information, the organization
                          needs to register and verify their profile.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="details" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-white">Organization Details</CardTitle>
                      </CardHeader>
                        <CardContent className="space-y-4">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Ntee Code</span>
                          <div className="text-gray-900 dark:text-white">{organization.ntee_code}</div>
                        </div>
                        {/* <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">EIN</span>
                          <div className="text-gray-900 dark:text-white">{organization.ein}</div>
                        </div> */}

                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Address</span>
                          <div className="text-gray-900 dark:text-white">
                            {organization.street}
                            <br />
                            {organization.city}, {organization.state} {organization.zip}
                          </div>
                        </div>

                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Classification</span>
                          <div className="text-gray-900 dark:text-white">{organization.classification}</div>
                        </div>

                        {organization.is_registered && organization.website && (
                          <div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Website</span>
                            <div className="text-blue-600 hover:text-blue-800">
                              <a
                                href={organization.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                              >
                                {organization.website}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        )}

                        {/* <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Founded</span>
                          <div className="text-gray-900 dark:text-white">{organization.ruling}</div>
                        </div> */}

                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">Status</span>
                          <div className="flex items-center gap-2 text-green-600">
                            <Check className="h-4 w-4" />
                            <span>
                              {organization.is_registered ? "Registered Organization" : "Listed Organization"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {organization.is_registered && (
                  <>
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

                      {totalProducts > 0 ? (
                        <>
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
                                  {product.quantity_available <= 0 && (
                                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                                      Out of Stock
                                    </div>
                                  )}
                                  <Badge
                                    variant="secondary"
                                    className="absolute top-2 left-2 bg-white/90 text-gray-800 text-xs"
                                  >
                                    {product.category}
                                  </Badge>
                                </div>
                                <CardContent className="p-4 sm:p-6">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                      {product.name}
                                    </h4>
                                    <span className="text-xl sm:text-2xl font-bold text-blue-600">
                                      ${product.unit_price}
                                    </span>
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
                                            i < Math.floor(product.rating)
                                              ? "text-yellow-400 fill-current"
                                              : "text-gray-300"
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
                                      disabled={product.quantity_available <= 0}
                                      variant="outline"
                                      className="flex-1 bg-transparent disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Add to Cart
                                    </Button>
                                    <Button
                                      onClick={() => buyNow(product)}
                                      disabled={product.quantity_available <= 0}
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
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-gray-500">No products available at this time.</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="jobs" className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Join Our Mission</h3>
                          <p className="text-gray-600 dark:text-gray-300">
                            Explore current job openings and become a part of our team. Your skills can help us make a
                            greater impact.
                          </p>
                        </div>

                        <Badge variant="secondary" className="text-sm">
                          {totaljobPosts} Jobs
                        </Badge>
                      </div>

                      {totaljobPosts > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {currentjobPosts.map((job) => (
                              <Card
                                key={job.id}
                                className="hover:shadow-lg transition-shadow duration-300 h-full flex flex-col"
                              >
                                <CardHeader>
                                  <div className="flex flex-wrap gap-4 md:gap-2 justify-between items-start">
                                    <div>
                                      <CardTitle className="text-xl">{job.title}</CardTitle>
                                      <CardDescription className="mt-1">{organization.name}</CardDescription>
                                    </div>
                                    <div className="flex space-x-2">
                                      <JobTypeBadge type={job.type} />
                                      <LocationTypeBadge type={job.location_type} />
                                      <JobStatusBadge status={job.status} className="ml-auto" />
                                    </div>
                                  </div>
                                </CardHeader>

                                <CardContent className="flex-grow">
                                  <p className="line-clamp-3 text-muted-foreground mb-4">{job.description}</p>
                                  <div className="space-y-2">
                                    <div className="flex items-center text-sm">
                                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                      <span>
                                        {[job.city, job.state, job.country].filter(Boolean).join(", ") ||
                                          "Location not specified"}
                                      </span>
                                    </div>

                                    <div className="flex items-center text-sm">
                                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                                      <span>{formatCurrency(job.pay_rate, job.currency)}</span>
                                    </div>

                                    <div className="flex items-center text-sm">
                                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                      <span>Apply by: {formatDate(job.application_deadline)}</span>
                                    </div>
                                  </div>
                                </CardContent>

                                <CardFooter className="flex justify-between items-center">
                                  <Link
                                    href={route("jobs.show", job.id)}
                                    className="text-primary hover:underline text-sm font-medium"
                                  >
                                    View details
                                  </Link>

                                  {auth?.user?.role === "user" &&
                                    job.status === "open" &&
                                    (job.has_applied ? (
                                      <Badge variant="success" className="px-3 py-1">
                                        Already Applied
                                      </Badge>
                                    ) : (
                                      <Link href={route("jobs.apply.show", job.id)}>
                                        <Button size="sm">Apply Now</Button>
                                      </Link>
                                    ))}

                                  {!auth?.user && job.status === "open" && (
                                    <Link href="/login">
                                      <Button size="sm">Login to Apply</Button>
                                    </Link>
                                  )}

                                  {auth?.user && auth.user.role !== "user" && job.status === "open" && (
                                    <span className="text-xs text-muted-foreground italic">Applicants only</span>
                                  )}

                                  {auth?.user && auth?.user?.role === "user" && job.status !== "open" && (
                                    <span className="text-xs text-muted-foreground italic">
                                      Not Accepting Applications
                                    </span>
                                  )}
                                </CardFooter>
                              </Card>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-gray-500">No job posts available at this time.</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="events" className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Events</h3>
                          <p className="text-gray-600 dark:text-gray-300">
                            Join us at our upcoming events and be part of our mission to make a difference.
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-sm">
                          {organization.events?.length || 0} Events
                        </Badge>
                      </div>

                      {organization.events && organization.events.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {organization.events.map((event: any) => (
                            <Card
                              key={event.id}
                              className="hover:shadow-lg transition-shadow duration-300 h-full flex flex-col"
                            >
                              <div className="relative overflow-hidden">
                                <img
                                  src={event.poster_image ? "/storage/" + event.poster_image : "/placeholder.svg"}
                                  alt={event.name}
                                  width={400}
                                  height={200}
                                  className="w-full h-48 object-cover"
                                />
                                <Badge
                                  variant="secondary"
                                  className={`absolute top-2 right-2 ${
                                    event.status === "upcoming"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                      : event.status === "ongoing"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        : event.status === "completed"
                                          ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  }`}
                                >
                                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                </Badge>
                              </div>

                              <CardHeader>
                                <CardTitle className="text-xl">{event.name}</CardTitle>
                                <CardDescription className="mt-1">
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                      {new Date(event.start_date).toLocaleDateString("en-US", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                </CardDescription>
                              </CardHeader>

                              <CardContent className="flex-grow">
                                <p className="line-clamp-3 text-muted-foreground mb-4">{event.description}</p>
                                <div className="space-y-2">
                                  <div className="flex items-center text-sm">
                                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span>{event.location || event.full_address || "Location TBD"}</span>
                                  </div>

                                  {event.registration_fee > 0 && (
                                    <div className="flex items-center text-sm">
                                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                                      <span>Registration Fee: ${event.registration_fee}</span>
                                    </div>
                                  )}

                                  {event.max_participants && (
                                    <div className="flex items-center text-sm">
                                      <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                                      <span>Max Participants: {event.max_participants}</span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>

                              <CardFooter className="flex justify-between items-center">
                                <Link
                                  href={route("viewEvent", event.id)}
                                  className="text-primary hover:underline text-sm font-medium"
                                >
                                  View details
                                </Link>

                                {event.status === "upcoming" && (
                                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                    Register Now
                                  </Button>
                                )}

                                {event.status === "ongoing" && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  >
                                    Happening Now
                                  </Badge>
                                )}

                                {event.status === "completed" && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                  >
                                    Completed
                                  </Badge>
                                )}

                                {event.status === "cancelled" && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  >
                                    Cancelled
                                  </Badge>
                                )}
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-gray-500">No events available at this time.</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="social" className="space-y-6">
                      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-gray-900 dark:text-white text-xl">Social Media</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Tabs defaultValue="links" className="w-full">
                            <TabsList className="mb-6">
                              <TabsTrigger value="links">Social Media Links</TabsTrigger>
                              <TabsTrigger value="videos">Video Media</TabsTrigger>
                            </TabsList>
                            <TabsContent value="links">
                              {organization.social_accounts && (
                                <div className="flex flex-col gap-4">
                                  {organization.social_accounts.facebook && (
                                    <a
                                      href={organization.social_accounts.facebook}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-blue-600 hover:underline text-base"
                                    >
                                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.326 24H12.82v-9.294H9.692v-3.622h3.127V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0" />
                                      </svg>
                                      Facebook
                                    </a>
                                  )}
                                  {organization.social_accounts.twitter && (
                                    <a
                                      href={organization.social_accounts.twitter}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-blue-400 hover:underline text-base"
                                    >
                                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 4.557a9.93 9.93 0 0 1-2.828.775 4.932 4.932 0 0 0 2.165-2.724c-.951.564-2.005.974-3.127 1.195a4.92 4.92 0 0 0-8.384 4.482C7.691 8.095 4.066 6.13 1.64 3.161c-.542.929-.856 2.01-.857 3.17 0 2.188 1.115 4.116 2.823 5.247a4.904 4.904 0 0 1-2.229-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.936 4.936 0 0 1-2.224.084c.627 1.956 2.444 3.377 4.6 3.417A9.867 9.867 0 0 1 0 21.543a13.94 13.94 0 0 0 7.548 2.209c9.057 0 14.009-7.496 14.009-13.986 0-.21-.005-.423-.015-.634A9.936 9.936 0 0 0 24 4.557z" />
                                      </svg>
                                      Twitter
                                    </a>
                                  )}
                                  {organization.social_accounts.instagram && (
                                    <a
                                      href={organization.social_accounts.instagram}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-pink-500 hover:underline text-base"
                                    >
                                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.241 1.308 3.608.058 1.266.069 1.646.069 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.241 1.246-3.608 1.308-1.266.058-1.646.069-4.85.069s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.241-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608C4.515 2.497 5.782 2.225 7.148 2.163 8.414 2.105 8.794 2.163 12 2.163zm0-2.163C8.741 0 8.332.012 7.052.07 5.771.128 4.659.334 3.678 1.315c-.98.98-1.187 2.092-1.245 3.373C2.012 5.668 2 6.077 2 12c0 5.923.012 6.332.07 7.612.058 1.281.265 2.393 1.245 3.373.98.98 2.092 1.187 3.373 1.245C8.332 23.988 8.741 24 12 24s3.668-.012 4.948-.07c1.281-.058 2.393-.265 3.373-1.245.98-.98 1.187-2.092-3.373-1.245C15.668.012 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                                      </svg>
                                      Instagram
                                    </a>
                                  )}
                                  {organization.social_accounts.youtube && (
                                    <a
                                      href={organization.social_accounts.youtube}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-red-600 hover:underline text-base"
                                    >
                                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M23.498 6.186a2.994 2.994 0 0 0-2.112-2.112C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.386.574A2.994 2.994 0 0 0 .502 6.186C0 8.072 0 12 0 12s0 3.928.502 5.814a2.994 2.994 0 0 0 2.112 2.112C4.5 20.5 12 20.5 12 20.5s7.5 0 9.386-.574a2.994 2.994 0 0 0 2.112-2.112C24 15.928 24 12 24 12s0-3.928-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                      </svg>
                                      YouTube
                                    </a>
                                  )}
                                  {organization.social_accounts.linkedin && (
                                    <a
                                      href={organization.social_accounts.linkedin}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-blue-700 hover:underline text-base"
                                    >
                                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.327-.027-3.037-1.849-3.037-1.851 0-2.132 1.445-2.132 2.939v5.667H9.358V9h3.414v1.561h.049c.476-.899 1.637-1.849 3.37-1.849 3.602 0 4.267 2.368 4.267 5.455v6.285zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.554V9h3.565v11.452zM22.225 0H1.771C.792 0 0 .771 0 1.723v20.549C0 23.229.792 24 1.771 24h20.451C23.2 24 24 23.229 24 22.271V1.723C24 .771 23.2 0 22.225 0z" />
                                      </svg>
                                      LinkedIn
                                    </a>
                                  )}
                                  {organization.social_accounts.tiktok && (
                                    <a
                                      href={organization.social_accounts.tiktok}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-black dark:text-white hover:underline text-base"
                                    >
                                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12.75 0h3.375a.375.375 0 0 1 .375.375v3.375a.375.375 0 0 0 .375.375h2.25a.375.375 0 0 1 .375.375v2.25a.375.375 0 0 1-.375.375h-2.25a.375.375 0 0 0-.375.375v9.375a5.25 5.25 0 1 1-5.25-5.25.375.375 0 0 1 .375.375v2.25a.375.375 0 0 1-.375.375 2.625 2.625 0 1 0 2.625 2.625V0z" />
                                      </svg>
                                      TikTok
                                    </a>
                                  )}
                                  {/* If no social accounts, show a message */}
                                  {!organization.social_accounts.facebook &&
                                    !organization.social_accounts.twitter &&
                                    !organization.social_accounts.instagram &&
                                    !organization.social_accounts.youtube &&
                                    !organization.social_accounts.linkedin &&
                                    !organization.social_accounts.tiktok && (
                                      <span className="text-gray-500">No social media accounts available.</span>
                                    )}
                                </div>
                              )}
                            </TabsContent>
                            <TabsContent value="videos">
                              {organization.social_accounts && organization.social_accounts.youtube ? (
                                <YouTubeChannelVideos channelUrl={organization.social_accounts.youtube} />
                              ) : (
                                <span className="text-gray-500">No YouTube channel set for this organization.</span>
                              )}
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </Card>
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
                                      rel="noreferrer"
                                    >
                                      {organization.website}
                                    </a>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                                    <div>
                                      <div className="text-gray-600 dark:text-gray-300">{organization.street}</div>
                                      <div className="text-gray-600 dark:text-gray-300">
                                        {organization.city}, {organization.state} {organization.zip}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Primary Contact</h4>
                                <div className="text-gray-600 dark:text-gray-300">{organization.contact_name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {organization.contact_title}
                                </div>
                              </div>
                            </div>

                            {/* Send Message */}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Send us a message
                              </h3>
                              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3">
                                Contact Us
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {organization.is_registered && (
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
                        <Button
                          key={amount}
                          variant="outline"
                          onClick={() => setShowDonationModal(true)}
                          className="h-12"
                        >
                          ${amount}
                        </Button>
                      ))}
                    </div>
                    <Button onClick={() => setShowDonationModal(true)} className="w-full bg-blue-600 hover:bg-blue-700">
                      Custom Amount
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!organization.is_registered && (
                <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                  <CardHeader>
                    <CardTitle className="text-yellow-800 dark:text-yellow-200 flex items-center">
                      <Info className="mr-2 h-5 w-5" />
                      Organization Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                      This organization is listed in our database but has not yet registered for additional features
                      like donations, detailed profiles, and community engagement.
                    </p>
                  </CardContent>
                </Card>
              )}

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

        {organization.is_registered && (
          <DonationModal
            isOpen={showDonationModal}
            onClose={() => setShowDonationModal(false)}
            organization={organization}
          />
        )}
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
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">${item.unit_price} each</p>
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
                            ${(item.unit_price * item.quantity).toFixed(2)}
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
                  <form className="space-y-3 sm:space-y-4" onSubmit={handleCompletePurchase}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Enter your first name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                        {errors.first_name && <p className="text-sm text-red-500">{errors.first_name}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Enter your last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                        {errors.last_name && <p className="text-sm text-red-500">{errors.last_name}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Shipping Address
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Street address"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                      />
                      {errors.shipping_address && <p className="text-sm text-red-500">{errors.shipping_address}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="City"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                        {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="ZIP"
                          value={zip}
                          onChange={(e) => setZip(e.target.value)}
                        />
                        {errors.zip && <p className="text-sm text-red-500">{errors.zip}</p>}
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
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                    </div>

                    {/* <div className="border-t border-gray-200 dark:border-gray-600 pt-3 sm:pt-4">
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
                      </div> */}

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
    </FrontendLayout>
  )
}

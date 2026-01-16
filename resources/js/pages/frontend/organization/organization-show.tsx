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
  UserCheck,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import DonationModal from "@/components/frontend/donation-modal"
import { Link, router, useForm } from "@inertiajs/react"
import { route } from "ziggy-js" // Import route function from ziggy-js
import axios from "axios"
import { showErrorToast, showSuccessToast } from "@/lib/toast"
import { Loader2, Sparkles } from "lucide-react"
import { JobStatusBadge, JobTypeBadge, LocationTypeBadge } from "@/components/frontend/jobs/badge"
import type React from "react"
import { useEffect, useState } from "react"
import OrgFollowButton from "@/components/ui/OrgFollowButtonProps"
import InviteOrganizationPopup from "@/components/frontend/InviteOrganizationPopup"

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
  const [isFavorite, setIsFavorite] = useState(organization.is_favorited || false)
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [cart, setCart] = useState<any[]>([])
  const [description, setDescription] = useState(organization.description || '')
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [showCartModal, setShowCartModal] = useState(false)
  const [showInvitePopup, setShowInvitePopup] = useState(false)

  const { post, processing } = useForm()

  const toggleFavorite = () => {
    post(route("user.organizations.toggle-favorite", organization.id), {
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

  const handleGenerateDescription = async () => {
    setIsGeneratingDescription(true)
    try {
      // Use the organization.id (ExcelData ID) - works for both registered and unregistered
      const response = await axios.post(`/organizations/${organization.id}/generate-mission`)

      if (response.data.success && response.data.description) {
        setDescription(response.data.description)
        showSuccessToast('Organization description generated successfully!')
        // Reload the page to get updated organization data
        router.reload()
      } else {
        showErrorToast(response.data.error || 'Failed to generate organization description')
      }
    } catch (error: any) {
      console.error('Error generating description:', error)
      const errorMessage = error.response?.data?.error || 'Failed to generate organization description. Please try again.'
      showErrorToast(errorMessage)
    } finally {
      setIsGeneratingDescription(false)
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
                    {organization.registered_organization?.user?.slug && (
                      <Link
                        href={route('organizations.enrollments', { slug: organization.registered_organization.user.slug })}
                      >
                        <Button
                          size="lg"
                          variant="outline"
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20 px-6 sm:px-8 w-full sm:w-auto"
                        >
                          <UserCheck className="mr-2 h-5 w-5" />
                          Enrolled
                        </Button>
                      </Link>
                    )}
                                      <OrgFollowButton
  organization={organization}
  auth={auth}
  initialIsFollowing={organization.is_favorited || false}
  initialNotifications={organization.notifications_enabled || false}
/>
                    {/* <Button
  onClick={toggleFavorite}
  variant="outline"
  size="lg"
  className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full sm:w-auto"
>
  {isFavorite ? (
    <UserCheck className="mr-2 h-5 w-5" />
  ) : (
    <UserPlus className="mr-2 h-5 w-5" />
  )}
  <span className="hidden sm:inline">{isFavorite ? "Following" : "Follow"}</span>
  <span className="sm:hidden">{isFavorite ? "Following" : "Follow"}</span>
</Button> */}
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
              {/* Modern Navigation Menu */}
              <div className="mb-8">
                <div className={`grid gap-3 ${organization.is_registered ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-4" : "grid-cols-2"}`}>
                  <Link
                    href={route('organizations.about', organization.id)}
                    className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <Info className="h-4 w-4" />
                    <span className="text-sm">About</span>
                  </Link>

                  <Link
                    href={route('organizations.details', organization.id)}
                    className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium hover:from-teal-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <Info className="h-4 w-4" />
                    <span className="text-sm">Details</span>
                  </Link>

                  {organization.is_registered && (
                    <>
                      <Link
                        href={route('organizations.products', organization.id)}
                        className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span className="text-sm">Products</span>
                      </Link>

                      <Link
                        href={route('organizations.jobs', organization.id)}
                        className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span className="text-sm">Jobs</span>
                      </Link>

                      <Link
                        href={route('organizations.events', organization.id)}
                        className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                      >
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Events</span>
                      </Link>

                      <Link
                        href={route('organizations.social-media', organization.id)}
                        className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                      >
                        <Globe className="h-4 w-4" />
                        <span className="text-sm">Social</span>
                      </Link>

                      <Link
                        href={route('organizations.contact', organization.id)}
                        className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium hover:from-violet-600 hover:to-fuchsia-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                      >
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">Contact</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Default About Content (simplified) */}
              <div className="space-y-6">

                {/* Simplified About Preview - Full content on separate page */}
                <div className="space-y-6">
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                      <div className="flex items-center justify-end">
                        {(!description ||
                          description === 'This organization is listed in our database but has not yet registered for additional features.' ||
                          description.trim() === '') && (
                          <Button
                            onClick={handleGenerateDescription}
                            disabled={isGeneratingDescription}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            {isGeneratingDescription ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                Bring About
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Organization Name, City, and State */}
                      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                              {organization.name}
                            </h3>
                            {(organization.city || organization.state) && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <MapPin className="h-4 w-4" />
                                <span>
                                  {[organization.city, organization.state].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* About Description */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About Us</h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                          {description || organization.description || 'No description available.'}
                        </p>
                      </div>

                      {/* Mission Statement */}
                      {organization.mission && organization.mission !== 'Mission statement not available for unregistered organizations.' && (
                        <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-r-lg">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Our Mission</h3>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                            {organization.mission}
                          </p>
                        </div>
                      )}

                      {/* Website Link */}
                      {organization.website && organization.website.trim() !== '' && organization.website !== 'null' && (
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Website: </span>
                              <a
                                href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                              >
                                {organization.website.replace(/^https?:\/\//, '')}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Links to Other Sections */}
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Explore more about this organization:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={route('organizations.about', organization.id)}
                      className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Full About Page →
                    </Link>
                    {organization.is_registered && (
                      <>
                        <Link
                          href={route('organizations.products', organization.id)}
                          className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          View Products →
                        </Link>
                        <Link
                          href={route('organizations.jobs', organization.id)}
                          className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          View Jobs →
                        </Link>
                        <Link
                          href={route('organizations.events', organization.id)}
                          className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          View Events →
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* All tab content moved to separate pages for better performance */}
              </div>
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
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center justify-between">
                      <span className="flex items-center">
                        <Info className="mr-2 h-5 w-5" />
                        Organization Status
                      </span>
                      {auth?.user && (
                        <Button
                          onClick={() => setShowInvitePopup(true)}
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Invite Them
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-blue-800 dark:text-blue-200 text-sm mb-3">
                      The organization <span className="font-semibold">"{organization.name}"</span> isn't part of our community yet.
                    </p>
                    {auth?.user ? (
                      <p className="text-blue-700 dark:text-blue-300 text-sm">
                        If you know this organization, you can invite them to join. Once they sign up, you'll receive 100 points to spend in the Merchant Hub! 🎉
                      </p>
                    ) : (
                      <p className="text-blue-700 dark:text-blue-300 text-sm">
                        This organization is listed in our database but has not yet registered for additional features like donations, detailed profiles, and community engagement.
                      </p>
                    )}
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

        {/* Invite Organization Popup - Show for unregistered organizations */}
        {!organization.is_registered && auth?.user && (
          <InviteOrganizationPopup
            isOpen={showInvitePopup}
            onClose={() => setShowInvitePopup(false)}
            organization={{
              id: organization.id,
              name: organization.name,
              ein: organization.ein,
            }}
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
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Your cart is empty</p>
                  </div>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{item.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">${item.unit_price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        Total: ${getCartTotal().toFixed(2)}
                      </span>
                      <Button className="bg-blue-600 hover:bg-blue-700">Checkout</Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </FrontendLayout>
  )
}

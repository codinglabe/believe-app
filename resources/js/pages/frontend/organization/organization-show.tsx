"use client"

import { useState, useEffect, useMemo } from "react"
import { Link, router, usePage, useForm } from "@inertiajs/react"
import { route } from "ziggy-js"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import {
  ChevronDown,
  MapPin,
  Zap,
  Users,
  Mail,
  Heart,
  MoreHorizontal,
  ThumbsUp,
  Share2,
  CheckCircle,
  FileText,
  User,
  UserPlus,
  Clock,
  Calendar,
  MessageCircle,
  Building2,
  Globe,
  ShieldCheck,
  BadgeCheck,
  ShoppingBag,
  Briefcase,
  Phone,
  Bell,
  ArrowLeft,
  Send,
  Smile,
  Laugh,
  Angry,
  DollarSign,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Badge } from "@/components/frontend/ui/badge"
import { Textarea } from "@/components/frontend/ui/textarea"
import DonationModal from "@/components/frontend/donation-modal"
import OrgFollowButton from "@/components/ui/OrgFollowButtonProps"
import InviteOrganizationPopup from "@/components/frontend/InviteOrganizationPopup"
import { motion, AnimatePresence } from "framer-motion"

interface OrganizationPageProps {
  auth?: any
  organization: any
  isFav?: boolean
  posts?: any[]
  postsCount?: number
  supportersCount?: number
  supporters?: any[]
  peopleYouMayKnow?: any[]
  trendingOrganizations?: any[]
  products?: any[]
  jobs?: any[]
  events?: any[]
  currentPage?: string
  believePointsEarned?: number
  believePointsSpent?: number
  believePointsBalance?: number
}

export default function OrganizationPage({
  auth,
  organization,
  isFav = false,
  posts = [],
  postsCount = 0,
  supportersCount = 0,
  supporters = [],
  peopleYouMayKnow = [],
  trendingOrganizations = [],
  products = [],
  jobs = [],
  events = [],
  currentPage,
  believePointsEarned = 0,
  believePointsSpent = 0,
  believePointsBalance = 0,
}: OrganizationPageProps) {
  const { url } = usePage()
  const [isFavorite, setIsFavorite] = useState(organization.is_favorited || isFav)
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [showInvitePopup, setShowInvitePopup] = useState(false)
  const [followingStates, setFollowingStates] = useState<Record<number, boolean>>({})
  const [loadingFollow, setLoadingFollow] = useState<Record<number, boolean>>({})
  
  // Detect which page we're on based on currentPage prop or route - memoize to prevent infinite loops
  const currentPath = useMemo(() => {
    return typeof window !== 'undefined' ? window.location.pathname : url
  }, [url])
  
  const pageType = useMemo(() => {
    return currentPage || (currentPath.includes('/products') ? 'products' :
                    currentPath.includes('/jobs') ? 'jobs' :
                    currentPath.includes('/events') ? 'events' :
                    currentPath.includes('/about') ? 'about' :
                    currentPath.includes('/contact') ? 'contact' :
                    currentPath.includes('/supporters') ? 'supporters' : null)
  }, [currentPage, currentPath])
  
  const isSubPage = pageType !== null
  
  // Determine active tab based on current page - memoize to prevent infinite loops
  const initialTab = useMemo(() => {
    // For unregistered organizations, default to "About" instead of "Community Feed"
    let tab = organization.is_registered ? "Community Feed" : "About"
    if (pageType === 'products') tab = "Products"
    else if (pageType === 'jobs') tab = "Opportunities"
    else if (pageType === 'events') tab = "Events"
    else if (pageType === 'about') tab = "About"
    else if (pageType === 'contact') tab = "Contact"
    else if (pageType === 'supporters') tab = "Supporters"
    
    // Ensure the initial tab is valid for unregistered organizations
    if (!organization.is_registered && tab !== "About" && tab !== "Contact") {
      tab = "About"
    }
    
    return tab
  }, [pageType, organization.is_registered])
  
  const [activeTab, setActiveTab] = useState(initialTab)
  const [postsState, setPostsState] = useState<any[]>(posts)
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(null)
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({})
  const [showComments, setShowComments] = useState<Record<number, boolean>>({})
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isGeneratingAbout, setIsGeneratingAbout] = useState(false)

  // Update posts state when posts prop changes
  useEffect(() => {
    setPostsState(posts)
  }, [posts])

  // Set loading to false once component is mounted and data is ready
  useEffect(() => {
    // Set loading to false when component mounts with data
    setIsPageLoading(false)
  }, [organization?.id, currentPage])

  // Navigate to sub-page when tab is clicked
  const handleTabChange = (tabName: string) => {
    // For unregistered organizations, only allow About and Contact tabs
    if (!organization.is_registered && tabName !== "About" && tabName !== "Contact") {
      return
    }
    
    setActiveTab(tabName)
    setIsPageLoading(true) // Set loading immediately when navigation starts
    const slug = organization.registered_organization?.user?.slug || organization.id
    
    let routePath = ''
    switch(tabName) {
      case "Products":
        routePath = route('organizations.products', slug)
        break
      case "Opportunities":
        routePath = route('organizations.jobs', slug)
        break
      case "Events":
        routePath = route('organizations.events', slug)
        break
      case "About":
        routePath = route('organizations.about', slug)
        break
      case "Contact":
        routePath = route('organizations.contact', slug)
        break
      case "Supporters":
        routePath = route('organizations.supporters', slug)
        break
      default:
        routePath = route('organizations.show', slug)
    }
    
    router.visit(routePath, {
      preserveState: false,
      preserveScroll: false,
      onStart: () => {
        setIsPageLoading(true)
      },
      onFinish: () => {
        setIsPageLoading(false)
      },
      onError: () => {
        setIsPageLoading(false)
      },
    })
  }

  // Sync activeTab with route on mount - use initialTab directly to avoid infinite loops
  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  const handleDonateNow = () => {
    if (!organization.is_registered) {
      return
    }

    if (!auth?.user) {
      router.visit(route("login", { redirect: route("organizations.show", { slug: organization?.registered_organization?.user?.slug || organization.id }) }), {
        replace: true,
      })
    } else {
      setShowDonationModal(true)
    }
  }

  // Reaction configuration
  const reactionConfig = {
    like: { emoji: '👍', icon: ThumbsUp, color: 'text-blue-600' },
    love: { emoji: '❤️', icon: Heart, color: 'text-red-500' },
    care: { emoji: '🤗', icon: Heart, color: 'text-yellow-500' },
    angry: { emoji: '😠', icon: Angry, color: 'text-orange-500' },
    haha: { emoji: '😂', icon: Laugh, color: 'text-yellow-500' },
  }

  // Get CSRF token
  const getCsrfToken = () => {
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    return metaToken || ''
  }

  // Handle reaction (like, love, etc.)
  const handleReaction = async (postId: number, type: 'like' | 'love' | 'care' | 'angry' | 'haha') => {
    if (!auth?.user) {
      router.visit(route("login"))
      return
    }

    const post = postsState.find(p => p.id === postId)
    const currentReaction = post?.user_reaction

    if (currentReaction?.type === type) {
      // Remove reaction if clicking the same one
      try {
        const token = getCsrfToken()
        const response = await fetch(`/posts/${postId}/reaction`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-TOKEN': token,
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        })

        if (response.ok) {
          setPostsState(prev => prev.map(p => {
            if (p.id === postId) {
              // Remove user's reaction from reactions array
              const updatedReactions = (p.reactions || []).filter((r: any) => r.user_id !== auth?.user?.id)
              return {
                ...p,
                reactions_count: Math.max(0, (p.reactions_count || 0) - 1),
                user_reaction: null,
                reactions: updatedReactions,
              }
            }
            return p
          }))
        }
      } catch (error) {
        console.error('Error removing reaction:', error)
      }
    } else {
      // Add or update reaction
      try {
        const token = getCsrfToken()
        const response = await fetch(`/posts/${postId}/react`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': token,
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
          body: JSON.stringify({ type }),
        })

        if (response.ok) {
          const data = await response.json()
          setPostsState(prev => prev.map(p => {
            if (p.id === postId) {
              // Update reactions array
              const currentReactions = p.reactions || []
              const existingReactionIndex = currentReactions.findIndex((r: any) => r.user_id === auth?.user?.id)
              
              let updatedReactions = [...currentReactions]
              if (data.reaction) {
                // Add or update reaction with user data from backend
                const reactionWithUser = {
                  id: data.reaction.id,
                  type: data.reaction.type,
                  user_id: data.reaction.user_id,
                  user: data.reaction.user || (auth?.user ? {
                    id: auth.user.id,
                    name: auth.user.name,
                    image: auth.user.image,
                  } : null),
                }
                
                if (existingReactionIndex >= 0) {
                  updatedReactions[existingReactionIndex] = reactionWithUser
                } else {
                  updatedReactions.push(reactionWithUser)
                }
              }
              
              return {
                ...p,
                reactions_count: data.reactions_count || p.reactions_count || 0,
                user_reaction: data.reaction ? {
                  id: data.reaction.id,
                  type: data.reaction.type,
                  user_id: data.reaction.user_id,
                } : null,
                reactions: updatedReactions,
              }
            }
            return p
          }))
        }
      } catch (error) {
        console.error('Error adding reaction:', error)
      }
    }
    setShowReactionPicker(null)
  }

  // Handle comment
  const handleComment = async (postId: number) => {
    if (!auth?.user) {
      router.visit(route("login"))
      return
    }

    const comment = commentInputs[postId]?.trim()
    if (!comment) return

    try {
      const token = getCsrfToken()
      const response = await fetch(`/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': token,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify({ content: comment }),
      })

      if (response.ok) {
        const data = await response.json()
        setPostsState(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: [...(p.comments || []), data.comment],
              comments_count: (p.comments_count || 0) + 1,
            }
          }
          return p
        }))
        setCommentInputs(prev => ({ ...prev, [postId]: '' }))
        setShowComments(prev => ({ ...prev, [postId]: true }))
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  // Handle share
  const handleShare = async (postId: number) => {
    const post = postsState.find(p => p.id === postId)
    if (!post) return

    const shareUrl = `${window.location.origin}/organizations/${organization.registered_organization?.user?.slug || organization.id}?post=${postId}`
    const shareText = post.content || post.title || 'Check out this post'

    if (navigator.share) {
      try {
        await navigator.share({
          title: organization.name,
          text: shareText,
          url: shareUrl,
        })
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed')
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copied to clipboard!')
      } catch (error) {
        console.error('Failed to copy link:', error)
      }
    }
  }

  // Format date for "Member since"
  const memberSince = organization.created_at
    ? new Date(organization.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'N/A'

  // Get organization handle/slug
  const organizationHandle = organization.registered_organization?.user?.slug
    ? `@${organization.registered_organization.user.slug}`
    : `@${organization.name.toLowerCase().replace(/\s+/g, '')}`

  // Get organization image
  const orgImage = organization.registered_organization?.user?.image
    ? `/storage/${organization.registered_organization.user.image}`
    : "/placeholder.svg"

  // Get cover image
  const coverImage = organization.registered_organization?.user?.cover_img
    ? `/storage/${organization.registered_organization.user.cover_img}`
    : null

  // Get location
  const location = [organization.city, organization.state].filter(Boolean).join(', ') || 'Location not specified'

  // Profile tabs - only show About and Contact for unregistered organizations
  const allTabs = [
    { name: "Community Feed", count: postsCount || 0 },
    { name: "About", count: null },
    { name: "Events", count: null },
    { name: "Opportunities", count: jobs?.length || 0 },
    { name: "Supporters", count: supportersCount || 0 },
    { name: "Products", count: products?.length || 0 },
    { name: "Contact", count: null },
  ]
  
  const profileTabs = organization.is_registered 
    ? allTabs 
    : allTabs.filter(tab => tab.name === "About" || tab.name === "Contact")

  // Use only dynamic data from backend - no static defaults - memoize to prevent infinite loops
  const peopleToShow = useMemo(() => {
    return peopleYouMayKnow.length > 0 ? peopleYouMayKnow : []
  }, [peopleYouMayKnow])
  
  const trendingOrgsToShow = useMemo(() => {
    return trendingOrganizations.length > 0 ? trendingOrganizations : []
  }, [trendingOrganizations])

  const navItems = ["Home", "About", "Donate", "Community", "Services", "More"]

  // Initialize following states for people you may know
  useEffect(() => {
    const initialStates: Record<number, boolean> = {}
    peopleToShow.forEach((person) => {
      if (person.id && typeof person.id === 'number') {
        initialStates[person.id] = false // Default to not following
      }
    })
    setFollowingStates(initialStates)
  }, [peopleToShow])

  // Handle follow/unfollow for people you may know
  const handleFollowPerson = (person: any) => {
    if (!auth?.user) {
      router.visit(route("login"))
      return
    }

    // Use excel_data_id if available, otherwise fall back to id
    const excelDataId = person.excel_data_id || person.id
    if (!excelDataId) return

    const personId = person.id
    setLoadingFollow(prev => ({ ...prev, [personId]: true }))
    
    // Use the correct route name with ExcelData ID
    // Try 'organizations.toggle-favorite' first, fallback to direct URL if route not found
    let routePath
    try {
      routePath = route("organizations.toggle-favorite", excelDataId)
    } catch (error) {
      // Fallback to direct URL if route not found in Ziggy
      routePath = `/organizations/${excelDataId}/toggle-favorite`
    }
    
    router.post(routePath, {}, {
      preserveScroll: true,
      preserveState: true,
      only: [],
      onSuccess: () => {
        setFollowingStates(prev => ({
          ...prev,
          [personId]: !prev[personId]
        }))
        setLoadingFollow(prev => ({ ...prev, [personId]: false }))
      },
      onError: () => {
        setLoadingFollow(prev => ({ ...prev, [personId]: false }))
      },
    })
  }

  return (
    <FrontendLayout>
        <div className="min-h-screen bg-[#0a0f1a] text-white">

          {/* Profile Banner */}
          <div className="relative">
            <div
              className="h-32 sm:h-40 bg-gradient-to-r from-purple-900 via-blue-800 to-purple-900"
              style={
                coverImage
                  ? {
                      backgroundImage: `url(${coverImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : {}
              }
            />
            <div className="max-w-[95rem] mx-auto px-3 sm:px-4">
              <div className="relative -mt-12 sm:-mt-16 md:-mt-20 pb-3 sm:pb-4 flex flex-col gap-3 sm:gap-4">
                {/* Top Row: Avatar and Name */}
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4">
                  <div className="relative">
                    <Avatar className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-[#0a0f1a] ring-2 ring-green-500/50">
                      <AvatarImage src={orgImage} alt={organization.name} />
                      <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-3xl">
                        {organization.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {organization.is_registered && (
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full border-3 border-[#0a0f1a] flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="text-center sm:text-left flex-1 w-full sm:w-auto">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <h1 className="text-2xl sm:text-3xl font-bold break-words">{organization.name}</h1>
                      <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-1">{organizationHandle}</p>
                    {organization.is_registered && (
                      <p className="text-gray-300 text-sm mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-none">
                        {organization.description || organization.mission || 'A community of faith-based initiatives. That believes in unity.'}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      {organization.is_registered && (
                        <>
                          <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs px-2 py-0.5 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Registered
                          </Badge>
                          {organization.registered_organization?.user?.email && (
                            <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs px-2 py-0.5 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Verified
                            </Badge>
                          )}
                        </>
                      )}
                      {!organization.is_registered && (
                        <Badge className="bg-yellow-600 hover:bg-yellow-600 text-white text-xs px-2 py-0.5">
                          <span className="mr-1">▶</span> Not Registered
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                  {organization.is_registered && (
                    <OrgFollowButton
                      organization={organization}
                      auth={auth}
                      initialIsFollowing={isFavorite}
                      initialNotifications={organization.notifications_enabled || false}
                    />
                  )}
                  {organization.is_registered && (
                    <>
                      <Button
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                        onClick={handleDonateNow}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Donate
                      </Button>
                      <Button
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                        onClick={handleDonateNow}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </>
                  )}
                  {!organization.is_registered && auth?.user && (
                    <Button
                      variant="outline"
                      className="bg-white/10 hover:bg-white/20 border-white/20"
                      onClick={() => setShowInvitePopup(true)}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Invite
                    </Button>
                  )}
                </div>
              </div>

              {/* Profile Stats */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 md:gap-6 py-3 px-3 sm:px-0 text-sm text-gray-400 border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span className="whitespace-nowrap">Member since {memberSince}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate max-w-[150px] sm:max-w-none">{location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-white font-medium">
                    {believePointsBalance >= 1000 
                      ? `${(believePointsBalance / 1000).toFixed(1)}K` 
                      : believePointsBalance.toLocaleString()}
                  </span>
                  <span>Believer Points</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{supportersCount || 0} supporters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Organized</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="max-w-[95rem] mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Sidebar - Public Profile Info */}
              <aside className="lg:col-span-3 space-y-4">
                <div className="bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-left-4 duration-500">
                  <nav className="space-y-1">
                    {profileTabs.map((tab) => (
                      <button
                        key={tab.name}
                        onClick={() => handleTabChange(tab.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                          activeTab === tab.name
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {tab.name === "Community Feed" && <FileText className="w-5 h-5" />}
                        {tab.name === "About" && <User className="w-5 h-5" />}
                        {tab.name === "Events" && <Calendar className="w-5 h-5" />}
                        {tab.name === "Opportunities" && <Briefcase className="w-5 h-5" />}
                        {tab.name === "Supporters" && <UserPlus className="w-5 h-5" />}
                        {tab.name === "Products" && <ShoppingBag className="w-5 h-5" />}
                        {tab.name === "Contact" && <Phone className="w-5 h-5" />}
                        <span className="text-sm">{tab.name}</span>
                        {tab.count !== null && (
                          <span className="ml-auto text-xs text-gray-500">({tab.count})</span>
                        )}
                      </button>
                    ))}
                  </nav>
                </div>

                {organization.is_registered && (
                  <div className="bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-left-4 duration-500 delay-100">
                    <p className="text-xs text-gray-500 mb-3">Organization Info</p>
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={orgImage} />
                        <AvatarFallback className="bg-emerald-600 text-sm">
                          {organization.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {organization.name}
                          {organization.classification && (
                            <span className="text-gray-400 font-normal"> - {organization.classification}</span>
                          )}
                        </p>
                        {organization.ntee_code && (
                          <Badge className="bg-emerald-600/20 text-emerald-400 text-[10px] px-1.5 py-0">
                            {organization.ntee_code}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-white/10">
                      <div className="text-center">
                        <p className="text-lg font-bold">
                          {believePointsBalance >= 1000 
                            ? `${(believePointsBalance / 1000).toFixed(1)}k` 
                            : believePointsBalance.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-500">Believer Points</p>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-[9px] text-green-400">+{believePointsEarned.toLocaleString()} earned</p>
                          {believePointsSpent > 0 && (
                            <p className="text-[9px] text-red-400">-{believePointsSpent.toLocaleString()} spent</p>
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{supportersCount || 0}</p>
                        <p className="text-[10px] text-gray-500">Supporters</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{postsCount || 0}</p>
                        <p className="text-[10px] text-gray-500">Community Feed</p>
                      </div>
                    </div>
                  </div>
                )}

                {organization.mission && organization.mission !== 'Mission statement not available for unregistered organizations.' && (
                  <div className="bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-left-4 duration-500 delay-200">
                    <h3 className="font-semibold mb-3">Mission</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{organization.mission}</p>
                  </div>
                )}
              </aside>

              {/* Main Feed */}
              <section className="lg:col-span-6 space-y-4">
                {isPageLoading ? (
                  <div className="bg-[#111827] rounded-xl p-8 flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-400">Loading content...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Community Feed - Only for registered organizations */}
                    {activeTab === "Community Feed" && organization.is_registered && (
                  <div className="space-y-4">
                    {postsState.length > 0 ? (
                      postsState.map((postItem) => {
                        const postId = postItem.id
                        const currentReaction = postItem.user_reaction
                        const reactionsCount = postItem.reactions_count || postItem.likes_count || 0
                        const commentsCount = postItem.comments_count || 0
                        const postComments = postItem.comments || []

                        return (
                          <article
                            key={postId}
                            className="bg-[#111827] rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100"
                          >
                            <div className="p-5">
                              {/* Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-12 h-12">
                                    <AvatarImage src={orgImage} />
                                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-500 text-lg">
                                      {organization.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold text-base">{organization.name}</h4>
                                      {organization.is_registered && (
                                        <CheckCircle className="w-4 h-4 text-blue-400" />
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-400">
                                      {organizationHandle}
                                    </p>
                                  </div>
                                </div>
                                <MoreHorizontal className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-300" />
                              </div>

                              {/* Title */}
                              {postItem.title && (
                                <h3 className="text-xl font-bold mb-4">{postItem.title}</h3>
                              )}

                              {/* Content Text - Now on top */}
                              {postItem.content && (
                                <p className="text-gray-300 text-base mb-5 leading-relaxed whitespace-pre-wrap">
                                  {postItem.content}
                                </p>
                              )}

                              {/* Main Image */}
                              {(postItem.image || (postItem.images && postItem.images.length > 0)) && (
                                <div className="mb-5 rounded-lg overflow-hidden">
                                  {(() => {
                                    // Handle both single image and array of images
                                    const imageUrl = postItem.image || (postItem.images && postItem.images[0]);
                                    if (!imageUrl) return null;
                                    
                                    // Check if it's already a full URL or needs /storage/ prefix
                                    const src = imageUrl.startsWith('http') || imageUrl.startsWith('/storage/') || imageUrl.startsWith('/')
                                      ? imageUrl
                                      : `/storage/${imageUrl}`;
                                    
                                    return (
                                      <img
                                        src={src}
                                        alt={postItem.title || 'Post image'}
                                        className="w-full h-auto object-cover"
                                        onError={(e) => {
                                          // Fallback if image fails to load
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    );
                                  })()}
                                </div>
                              )}
                              
                              {/* Show multiple images if available */}
                              {postItem.images && postItem.images.length > 1 && (
                                <div className="grid grid-cols-2 gap-3 mb-5">
                                  {postItem.images.slice(1, 5).map((img: string, idx: number) => {
                                    const src = img.startsWith('http') || img.startsWith('/storage/') || img.startsWith('/')
                                      ? img
                                      : `/storage/${img}`;
                                    return (
                                      <div key={idx} className="rounded-lg overflow-hidden">
                                        <img
                                          src={src}
                                          alt={`${postItem.title || 'Post'} image ${idx + 2}`}
                                          className="w-full h-56 object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Event Card Style for Posts with Event Info */}
                              {postItem.event_date && (
                                <div className="bg-gradient-to-br from-[#1a2744] to-[#0f1a2e] rounded-lg overflow-hidden border border-white/10 mb-5 p-4">
                                  <div className="flex flex-wrap gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                      <span>{postItem.event_date}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-cyan-400" />
                                      <span>{postItem.event_time || '2:00 PM'}</span>
                                    </div>
                                    {postItem.event_location && (
                                      <div className="flex items-center gap-2 text-green-400">
                                        <MapPin className="w-4 h-4" />
                                        <span>{postItem.event_location}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Engagement */}
                            {reactionsCount > 0 || commentsCount > 0 ? (
                              <div className="px-5 py-3 border-t border-white/10">
                                <div className="flex items-center justify-between text-sm text-gray-400">
                                  {reactionsCount > 0 && (
                                    <div className="flex items-center gap-2">
                                      {/* Show user avatars with their reaction emojis */}
                                      {(() => {
                                        const reactions = postItem.reactions || []
                                        
                                        if (reactions.length > 0) {
                                          return (
                                            <div className="flex items-center gap-1.5">
                                              {/* Show user avatars with reaction emojis */}
                                              <div className="flex items-center -space-x-1">
                                                {reactions.slice(0, 6).map((reaction: any, idx: number) => (
                                                  <div
                                                    key={reaction.id || idx}
                                                    className="relative group"
                                                    title={reaction.user?.name ? `${reaction.user.name} reacted with ${reaction.type}` : 'User'}
                                                  >
                                                    <Avatar className="w-6 h-6 border-2 border-[#111827] hover:z-10 transition-all hover:scale-110">
                                                      <AvatarImage
                                                        src={reaction.user?.image ? (reaction.user.image.startsWith('http') || reaction.user.image.startsWith('/storage/') || reaction.user.image.startsWith('/')
                                                          ? reaction.user.image
                                                          : `/storage/${reaction.user.image}`) : undefined}
                                                      />
                                                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-xs">
                                                        {reaction.user?.name?.charAt(0).toUpperCase() || 'U'}
                                                      </AvatarFallback>
                                                    </Avatar>
                                                    {/* Show reaction emoji on hover or as overlay */}
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#111827] rounded-full border border-white/20 flex items-center justify-center text-xs">
                                                      {reactionConfig[reaction.type as keyof typeof reactionConfig]?.emoji || '👍'}
                                                    </div>
                                                  </div>
                                                ))}
                                                {reactions.length > 6 && (
                                                  <div className="w-6 h-6 rounded-full border-2 border-[#111827] bg-white/10 flex items-center justify-center text-xs font-semibold">
                                                    +{reactions.length - 6}
                                                  </div>
                                                )}
                                              </div>
                                              {/* Show reaction type emojis (grouped) */}
                                              <div className="flex items-center gap-0.5">
                                                {(() => {
                                                  // Group reactions by type to show unique emojis
                                                  const reactionGroups = reactions.reduce((acc: any, r: any) => {
                                                    if (r && r.type) {
                                                      if (!acc[r.type]) {
                                                        acc[r.type] = true
                                                      }
                                                    }
                                                    return acc
                                                  }, {})
                                                  
                                                  return Object.keys(reactionGroups).slice(0, 4).map((type) => (
                                                    <span
                                                      key={type}
                                                      className="text-base"
                                                      title={type}
                                                    >
                                                      {reactionConfig[type as keyof typeof reactionConfig]?.emoji || '👍'}
                                                    </span>
                                                  ))
                                                })()}
                                              </div>
                                            </div>
                                          )
                                        }

                                        // Fallback: if no reactions data but count > 0, show reaction emojis only
                                        return (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-base">👍</span>
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  )}
                                  {commentsCount > 0 && (
                                    <button
                                      onClick={() => setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }))}
                                      className="flex items-center gap-1 hover:text-white transition-colors"
                                    >
                                      <MessageCircle className="w-4 h-4" /> {commentsCount} {commentsCount === 1 ? 'Comment' : 'Comments'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : null}

                            {/* Action Buttons */}
                            <div className="grid grid-cols-3 border-t border-white/10">
                              <div
                                className="relative flex-1"
                                onMouseEnter={() => setShowReactionPicker(postId)}
                                onMouseLeave={() => setShowReactionPicker(null)}
                              >
                                <button
                                  onClick={() => {
                                    if (currentReaction) {
                                      handleReaction(postId, currentReaction.type)
                                    } else {
                                      handleReaction(postId, 'like')
                                    }
                                  }}
                                  className={`w-full flex items-center justify-center gap-2 py-3 transition-all hover:bg-white/5 ${
                                    currentReaction ? reactionConfig[currentReaction.type as keyof typeof reactionConfig]?.color || 'text-blue-500' : 'text-gray-400'
                                  }`}
                                >
                                  {currentReaction ? (
                                    <>
                                      <span className="text-lg">{reactionConfig[currentReaction.type as keyof typeof reactionConfig]?.emoji}</span>
                                      <span className="text-sm font-medium capitalize">{currentReaction.type}</span>
                                    </>
                                  ) : (
                                    <>
                                      <ThumbsUp className="w-5 h-5" />
                                      <span className="text-sm font-medium">Like</span>
                                    </>
                                  )}
                                </button>
                                <AnimatePresence>
                                  {showReactionPicker === postId && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 10 }}
                                      className="absolute bottom-full left-0 mb-2 bg-[#1a1a2e] rounded-full p-1 flex items-center gap-1 shadow-lg border border-white/10 z-10"
                                    >
                                      {Object.entries(reactionConfig).map(([type, config]) => (
                                        <motion.button
                                          key={type}
                                          whileHover={{ scale: 1.2 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => handleReaction(postId, type as any)}
                                          className="text-2xl transition-all p-2 rounded-full hover:bg-white/10 cursor-pointer"
                                          title={type.charAt(0).toUpperCase() + type.slice(1)}
                                        >
                                          {config.emoji}
                                        </motion.button>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              <button
                                onClick={() => setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }))}
                                className="flex items-center justify-center gap-2 py-3 text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                              >
                                <MessageCircle className="w-5 h-5" />
                                <span className="text-sm font-medium">Comment</span>
                              </button>
                              <button
                                onClick={() => handleShare(postId)}
                                className="flex items-center justify-center gap-2 py-3 text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                              >
                                <Share2 className="w-5 h-5" />
                                <span className="text-sm font-medium">Share</span>
                              </button>
                            </div>

                            {/* Comments Section */}
                            {showComments[postId] && (
                              <div className="border-t border-white/10 p-4 space-y-4">
                                {/* Comments List */}
                                {postComments.length > 0 && (
                                  <div className="space-y-3">
                                    {postComments.map((comment: any) => (
                                      <div key={comment.id} className="flex gap-3">
                                        <Avatar className="w-8 h-8">
                                          <AvatarImage src={comment.user?.image ? `/storage/${comment.user.image}` : undefined} />
                                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-xs">
                                            {comment.user?.name?.charAt(0).toUpperCase() || 'U'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                          <div className="bg-white/5 rounded-lg p-3">
                                            <p className="text-sm font-semibold mb-1">{comment.user?.name || 'Anonymous'}</p>
                                            <p className="text-sm text-gray-300">{comment.content}</p>
                                          </div>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {new Date(comment.created_at).toLocaleDateString()}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Comment Input */}
                                {auth?.user && (
                                  <div className="relative">
                                    <Textarea
                                      placeholder="Write a comment..."
                                      value={commentInputs[postId] || ''}
                                      onChange={(e) => setCommentInputs(prev => ({ ...prev, [postId]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault()
                                          handleComment(postId)
                                        }
                                      }}
                                      className="pr-12 rounded-lg bg-white/5 border-white/10 focus-visible:ring-2 focus-visible:ring-purple-500 resize-none"
                                      rows={2}
                                    />
                                    {commentInputs[postId]?.trim() && (
                                      <Button
                                        onClick={() => handleComment(postId)}
                                        size="sm"
                                        className="absolute right-2 bottom-2 h-8 w-8 p-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                      >
                                        <Send className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {!auth?.user && (
                                  <p className="text-sm text-gray-400 text-center py-2">
                                    <Link href={route("login")} className="text-purple-400 hover:text-purple-300">
                                      Log in
                                    </Link> to comment
                                  </p>
                                )}
                              </div>
                            )}
                          </article>
                        )
                      })
                    ) : (
                      <article className="bg-[#111827] rounded-xl p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <p className="text-gray-400">No posts available yet.</p>
                      </article>
                    )}
                  </div>
                )}

                {/* About Tab Content */}
                {activeTab === "About" && (
                  <div className="bg-[#111827] rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">About</h2>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">{organization.name}</h3>
                      </div>
                      {(!organization.description || organization.description.trim() === '' || organization.description === 'This organization is listed in our database but has not yet registered for additional features.') && (
                        <Button
                          onClick={async () => {
                            if (isGeneratingAbout) return;
                            
                            setIsGeneratingAbout(true);
                            try {
                              const response = await fetch(route('organizations.generate-mission', organization.id), {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                  'X-Requested-With': 'XMLHttpRequest',
                                },
                              });
                              
                              const data = await response.json();
                              
                              if (data.success) {
                                // Reload the page to show the generated about content
                                router.reload();
                              } else {
                                setIsGeneratingAbout(false);
                                alert(data.error || 'Failed to generate about content');
                              }
                            } catch (error) {
                              console.error('Error generating about:', error);
                              setIsGeneratingAbout(false);
                              alert('Failed to generate about content. Please try again.');
                            }
                          }}
                          size="sm"
                          disabled={isGeneratingAbout}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingAbout ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Bring About
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {organization.description && (
                      <div className="text-gray-300 mb-4 leading-relaxed">
                        {organization.description.split('\n').map((paragraph, index) => {
                          const trimmedParagraph = paragraph.trim();
                          if (!trimmedParagraph) return null;
                          return (
                            <p key={index} className="mb-4 last:mb-0">
                              {trimmedParagraph}
                            </p>
                          );
                        })}
                      </div>
                    )}
                    {organization.mission && organization.mission !== 'Mission statement not available for unregistered organizations.' && (
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-2">Mission</h3>
                        <p className="text-gray-300 leading-relaxed">{organization.mission}</p>
                      </div>
                    )}
                    {organization.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-gray-400" />
                          <a
                            href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline"
                          >
                            {organization.website.replace(/^https?:\/\//, '')}
                          </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Products Tab Content - Only for registered organizations */}
                {activeTab === "Products" && organization.is_registered && (
                  <div className="bg-[#111827] rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6" />
                        Products
                      </h2>
                      <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                        {products?.length || 0} Products
                      </Badge>
                    </div>
                    {products && products.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {products.map((product: any) => (
                          <div
                            key={product.id}
                            className="bg-[#0a0f1a] rounded-lg p-4 border border-white/10 hover:border-purple-500/50 transition-all"
                          >
                            {product.image && (
                              <div className="mb-3 rounded-lg overflow-hidden">
                                <img
                                  src={product.image.startsWith('http') ? product.image : `/storage/${product.image}`}
                                  alt={product.name}
                                  className="w-full h-48 object-cover"
                                />
                              </div>
                            )}
                            <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                            {product.description && (
                              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
                            )}
                            {product.price && (
                              <div className="flex items-center justify-between">
                                <span className="text-xl font-bold text-purple-400">${product.price}</span>
                                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm">
                                  View Details
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No products available yet.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Opportunities Tab Content */}
                {activeTab === "Opportunities" && (
                  <div className="bg-[#111827] rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Briefcase className="w-6 h-6" />
                        Opportunities
                      </h2>
                      <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                        {jobs?.length || 0} Openings
                      </Badge>
                    </div>
                    {jobs && jobs.length > 0 ? (
                      <div className="space-y-4">
                        {jobs.map((job: any) => (
                          <div
                            key={job.id}
                            className="bg-[#0a0f1a] rounded-lg p-5 border border-white/10 hover:border-purple-500/50 transition-all"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
                                  {job.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-4 h-4" />
                                      <span>{job.location}</span>
                                    </div>
                                  )}
                                  {job.type && (
                                    <Badge className="bg-purple-600/20 text-purple-400 text-xs">
                                      {job.type}
                                    </Badge>
                                  )}
                                  {job.salary && (
                                    <span className="text-green-400 font-medium">${job.salary}</span>
                                  )}
                                </div>
                                {job.description && (
                                  <p className="text-gray-300 text-sm mb-4 line-clamp-3">{job.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                                Apply Now
                              </Button>
                              <Button variant="outline" className="bg-transparent border-white/20 hover:bg-white/10">
                                View Details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No job openings available at the moment.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Events Tab Content - Only for registered organizations */}
                {activeTab === "Events" && organization.is_registered && (
                  <div className="bg-[#111827] rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Calendar className="w-6 h-6" />
                        Events
                      </h2>
                      <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                        {events?.length || 0} Events
                      </Badge>
                    </div>
                    {events && events.length > 0 ? (
                      <div className="space-y-4">
                        {events.map((event: any) => (
                          <div
                            key={event.id}
                            className="bg-[#0a0f1a] rounded-lg p-5 border border-white/10 hover:border-purple-500/50 transition-all"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="text-xl font-semibold mb-2">{event.title || event.name}</h3>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
                                  {event.start_date && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      <span>{new Date(event.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                    </div>
                                  )}
                                  {event.start_time && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-4 h-4" />
                                      <span>{event.start_time}</span>
                                    </div>
                                  )}
                                  {event.location && (
                                    <div className="flex items-center gap-1 text-green-400">
                                      <MapPin className="w-4 h-4" />
                                      <span>{event.location}</span>
                                    </div>
                                  )}
                                  {event.event_type && (
                                    <Badge className="bg-purple-600/20 text-purple-400 text-xs">
                                      {event.event_type?.name || event.event_type}
                                    </Badge>
                                  )}
                                </div>
                                {event.description && (
                                  <p className="text-gray-300 text-sm mb-4 line-clamp-3">{event.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                                View Details
                              </Button>
                              <Button variant="outline" className="bg-transparent border-white/20 hover:bg-white/10">
                                Register
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No events scheduled at the moment.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Tab Content */}
                {activeTab === "Contact" && (
                  <div className="bg-[#111827] rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                      <Phone className="w-6 h-6" />
                      Contact Information
                    </h2>
                    <div className="space-y-4">
                      {organization.phone && (
                        <div className="flex items-center gap-3 p-4 bg-[#0a0f1a] rounded-lg border border-white/10">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                            <Phone className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Phone</p>
                            <a href={`tel:${organization.phone}`} className="text-white hover:text-purple-400 transition-colors">
                              {organization.phone}
                            </a>
                          </div>
                        </div>
                      )}
                      {organization.email && (
                        <div className="flex items-center gap-3 p-4 bg-[#0a0f1a] rounded-lg border border-white/10">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                            <Mail className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Email</p>
                            <a href={`mailto:${organization.email}`} className="text-white hover:text-purple-400 transition-colors">
                              {organization.email}
                            </a>
                          </div>
                        </div>
                      )}
                      {organization.website && (
                        <div className="flex items-center gap-3 p-4 bg-[#0a0f1a] rounded-lg border border-white/10">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                            <Globe className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Website</p>
                            <a
                              href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white hover:text-purple-400 transition-colors"
                            >
                              {organization.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        </div>
                      )}
                      {location && location !== 'Location not specified' && (
                        <div className="flex items-center gap-3 p-4 bg-[#0a0f1a] rounded-lg border border-white/10">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Address</p>
                            <p className="text-white">{location}</p>
                            {organization.address && (
                              <p className="text-gray-300 text-sm mt-1">{organization.address}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {(!organization.phone && !organization.email && !organization.website && (!location || location === 'Location not specified')) && (
                        <div className="text-center py-12">
                          <Phone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400">Contact information not available.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Supporters Tab Content - Only for registered organizations */}
                {activeTab === "Supporters" && organization.is_registered && (
                  <div className="bg-[#111827] rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        Supporters
                      </h2>
                      <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                        {supporters?.length || supportersCount || 0} Supporters
                      </Badge>
                    </div>
                    {Array.isArray(supporters) && supporters.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {supporters.map((supporter: any, index: number) => (
                          <div
                            key={supporter.id || supporter.user_id || `supporter-${index}`}
                            className="bg-[#0a0f1a] rounded-lg p-4 border border-white/10 hover:border-purple-500/50 transition-all"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="w-12 h-12 flex-shrink-0">
                                <AvatarImage 
                                  src={supporter.user?.image ? `/storage/${supporter.user.image}` : supporter.avatar || "/placeholder.svg"} 
                                />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-sm">
                                  {supporter.user?.name 
                                    ? supporter.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                                    : supporter.name 
                                    ? supporter.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                                    : 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate text-white">
                                  {supporter.user?.name || supporter.name || 'Anonymous'}
                                </h3>
                                {supporter.user?.email && (
                                  <p className="text-xs text-gray-400 truncate">{supporter.user.email}</p>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {supporter.joined_at && (
                                <p className="text-xs text-gray-500">
                                  Joined {new Date(supporter.joined_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </p>
                              )}
                              {supporter.notifications && (
                                <Badge className="bg-green-600/20 text-green-400 text-xs inline-flex items-center gap-1">
                                  <Bell className="w-3 h-3" />
                                  Notifications On
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No supporters yet.</p>
                        <p className="text-gray-500 text-sm mt-2">Be the first to support this organization!</p>
                      </div>
                    )}
                  </div>
                )}
                  </>
                )}
              </section>

              {/* Right Sidebar */}
              <aside className="lg:col-span-3 space-y-4">
                {/* People You May Know */}
                {peopleToShow.length > 0 && (
                  <div className="bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    <h3 className="font-semibold mb-4">People You May Know</h3>
                    <div className="space-y-3">
                      {peopleToShow.map((person, index) => (
                      <div
                        key={person.id || index}
                        className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-300"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <Link
                          href={person.excel_data_id 
                            ? route('organizations.show', person.excel_data_id)
                            : person.slug 
                              ? route('organizations.show', person.slug)
                              : '#'}
                          onClick={(e) => {
                            if (!person.excel_data_id && !person.slug) {
                              e.preventDefault()
                            }
                          }}
                          className="flex-shrink-0"
                        >
                          <Avatar className="w-10 h-10 hover:ring-2 hover:ring-purple-500 transition-all cursor-pointer">
                            <AvatarImage src={person.avatar || "/placeholder.svg"} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-xs">
                              {typeof person.avatar === 'string' && person.avatar.length === 2
                                ? person.avatar
                                : person.name
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')
                                    .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <Link 
                            href={person.excel_data_id 
                              ? route('organizations.show', person.excel_data_id)
                              : person.slug 
                                ? route('organizations.show', person.slug)
                                : '#'}
                            className="text-sm font-medium truncate hover:text-purple-400 transition-colors cursor-pointer block"
                            onClick={(e) => {
                              if (!person.excel_data_id && !person.slug) {
                                e.preventDefault()
                              }
                            }}
                          >
                            {person.name}
                          </Link>
                          <p className="text-xs text-gray-500 truncate">{person.org || person.description}</p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleFollowPerson(person)}
                          disabled={loadingFollow[person.id as number] || !person.id}
                          className={`text-xs px-3 py-1.5 h-auto flex-shrink-0 whitespace-nowrap ${
                            followingStates[person.id as number]
                              ? "bg-white/10 border border-white/20 hover:bg-white/20 text-white"
                              : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                          }`}
                        >
                          {loadingFollow[person.id as number] 
                            ? "Loading..." 
                            : followingStates[person.id as number] 
                              ? "Following" 
                              : "Follow"}
                        </Button>
                      </div>
                    ))}
                    </div>
                  </div>
                )}

                {/* Trending Organizations */}
                {trendingOrgsToShow.length > 0 && (
                  <div className="bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Trending Organizations</h3>
                      <button className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                        View All <ChevronDown className="w-3 h-3 -rotate-90" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {trendingOrgsToShow.map((org, index) => {
                      // Determine the route parameter (slug or excel_data_id)
                      const orgRouteParam = org.slug || org.excel_data_id || org.id
                      
                      return (
                        <Link
                          key={org.id || index}
                          href={route('organizations.show', orgRouteParam)}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors animate-in fade-in slide-in-from-right-2 duration-300"
                          style={{ animationDelay: `${index * 100 + 200}ms` }}
                        >
                          <div className={`w-10 h-10 ${org.color || 'bg-emerald-500'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Heart className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium hover:text-purple-400 transition-colors">
                              {org.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{org.desc || org.description}</p>
                          </div>
                        </Link>
                      )
                      })}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </main>


          {/* Modals */}
          {organization.is_registered && (
            <DonationModal
              isOpen={showDonationModal}
              onClose={() => setShowDonationModal(false)}
              organization={organization}
            />
          )}

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
      </FrontendLayout>
  )
}

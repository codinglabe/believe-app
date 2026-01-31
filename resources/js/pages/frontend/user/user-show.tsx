"use client"

import { useState, useEffect, useMemo } from "react"
import { Link, router, usePage } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import useAxios from "@/hooks/useAxios"
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
  Eye,
  Star,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Badge } from "@/components/frontend/ui/badge"
import { Textarea } from "@/components/frontend/ui/textarea"
import { PageHead } from "@/components/frontend/PageHead"
import { motion, AnimatePresence } from "framer-motion"

interface UserPageProps {
  seo?: { title: string; description?: string }
  auth?: any
  user: any
  posts?: any[]
  postsCount?: number
  donationsCount?: number
  totalDonated?: number
  followersCount?: number
  followingCount?: number
  groupsCount?: number
  favoriteOrganizations?: any[]
  peopleYouMayKnow?: any[]
  trendingOrganizations?: any[]
  believePointsEarned?: number
  believePointsSpent?: number
  believePointsBalance?: number
  rewardPointsEarned?: number
  rewardPointsSpent?: number
  rewardPointsBalance?: number
  recentDonations?: any[]
  jobApplications?: any[]
  enrollments?: any[]
  currentPage?: string
  chatGroups?: any[]
  activities?: any[]
  activityPagination?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number
    to: number
  }
  postFilter?: string
}

export default function UserPage({
  seo,
  auth,
  user,
  posts = [],
  postsCount = 0,
  donationsCount = 0,
  totalDonated = 0,
  followersCount = 0,
  followingCount = 0,
  groupsCount = 0,
  favoriteOrganizations = [],
  peopleYouMayKnow = [],
  trendingOrganizations = [],
  believePointsEarned = 0,
  believePointsSpent = 0,
  believePointsBalance = 0,
  rewardPointsEarned = 0,
  rewardPointsSpent = 0,
  rewardPointsBalance = 0,
  recentDonations = [],
  jobApplications = [],
  enrollments = [],
  currentPage = 'show',
  chatGroups = [],
  activities = [],
  activityPagination,
  postFilter = 'user',
}: UserPageProps) {
  const page = usePage()
  const currentPath = (page.url as string) || ''

  // Determine page type from URL
  const pageType = useMemo(() => {
    if (currentPath.includes('/posts')) return 'posts'
    if (currentPath.includes('/about')) return 'about'
    if (currentPath.includes('/activity')) return 'activity'
    if (currentPath.includes('/following')) return 'following'
    if (currentPath.includes('/groups')) return 'groups'
    return 'show'
  }, [currentPath])

  // Determine active tab based on current page
  const initialTab = useMemo(() => {
    if (pageType === 'posts') return "Posts"
    if (pageType === 'about') return "About"
    if (pageType === 'activity') return "Activity"
    if (pageType === 'following') return "Following"
    if (pageType === 'groups') return "Groups"
    return "Posts"
  }, [pageType])

  const [activeTab, setActiveTab] = useState(initialTab)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const [postsState, setPostsState] = useState(posts)
  const [followingStates, setFollowingStates] = useState<Record<number, boolean>>({})
  const [loadingFollow, setLoadingFollow] = useState<Record<number, boolean>>({})
  const [isFollowingUser, setIsFollowingUser] = useState<boolean>(user?.is_following || false)
  const [loadingFollowUser, setLoadingFollowUser] = useState<boolean>(false)
  const axios = useAxios()
  const [showComments, setShowComments] = useState<Record<number, boolean>>({})
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(null)
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({})

  // Update active tab when page type changes
  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  // Sync postsState when posts prop changes (e.g., when switching tabs)
  useEffect(() => {
    setPostsState(posts || [])
  }, [posts])

  // Get postFilter from page props
  const currentPostFilter = postFilter || (page.props as any).postFilter || 'user'

  // Get cover image
  const coverImage = user.cover_img
    ? `/storage/${user.cover_img}`
    : null

  const userImage = user.image
  const orgImage = user.image // Fallback, will be replaced by creator_image if available
    ? `/storage/${user.image}`
    : null

  // Format dates
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently'

  // Build location from city, state, zipcode or use location field
  const locationParts = [user.city, user.state].filter(Boolean)
  const location = locationParts.length > 0
    ? locationParts.join(', ') + (user.zipcode ? ` ${user.zipcode}` : '')
    : (user.location || 'Location not set')

  // Tabs configuration
  const profileTabs = [
    { name: "Posts", count: postsCount },
    { name: "About", count: null },
    { name: "Activity", count: null },
    { name: "Following", count: followingCount },
    { name: "Groups", count: groupsCount },
  ]

  // Get route for tab
  const getTabRoute = (tabName: string) => {
    const slug = user.slug || user.id
    switch (tabName) {
      case "Posts":
        return route('users.posts', slug)
      case "About":
        return route('users.about', slug)
      case "Activity":
        return route('users.activity', slug)
      case "Following":
        return route('users.following', slug)
      case "Groups":
        return route('users.groups', slug)
      default:
        return route('users.show', slug)
    }
  }

  const handleMessageClick = () => {
    const profileUserId = user?.id
    const profileUserName = user?.name ?? "User"
    if (!profileUserId) return

    // Same as service-hub contact: store in sessionStorage so chat page opens direct chat
    sessionStorage.setItem(
      "chat_initiation",
      JSON.stringify({
        seller_id: profileUserId,
        seller_name: profileUserName,
        gig_slug: "",
        gig_title: "",
        initiated_at: new Date().toISOString(),
      }),
    )

    if (!auth?.user) {
      router.visit(route("login", { redirect: "/chat" }), { replace: true })
      return
    }

    router.visit("/chat")
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
              const currentReactions = p.reactions || []
              const existingReactionIndex = currentReactions.findIndex((r: any) => r.user_id === auth?.user?.id)

              let updatedReactions = [...currentReactions]
              if (data.reaction) {
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
              comments_count: (p.comments_count || 0) + 1,
              comments: [...(p.comments || []), data.comment],
            }
          }
          return p
        }))
        setCommentInputs(prev => ({ ...prev, [postId]: '' }))
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  // Handle share
  const handleShare = async (postId: number) => {
    const post = postsState.find(p => p.id === postId)
    if (!post) return

    const shareUrl = `${window.location.origin}/users/${user.slug || user.id}?post=${postId}`
    const shareText = post.content || 'Check out this post'

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user.name}'s Post`,
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

  // Memoize sidebar data
  const peopleToShow = useMemo(() => peopleYouMayKnow || [], [peopleYouMayKnow])
  const trendingOrgsToShow = useMemo(() => trendingOrganizations || [], [trendingOrganizations])

  const handleFollowPerson = async (person: any) => {
    if (!auth?.user) {
      router.visit(route("login"))
      return
    }

    if (!person.id) return

    setLoadingFollow(prev => ({ ...prev, [person.id]: true }))

    try {
      await axios.post(route('organizations.toggle-favorite', person.id))
      setFollowingStates(prev => ({
        ...prev,
        [person.id]: !prev[person.id]
      }))
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setLoadingFollow(prev => ({ ...prev, [person.id]: false }))
    }
  }

  const handleFollowUser = async () => {
    if (!auth?.user) {
      router.visit(route("login"))
      return
    }

    if (!user?.id || user?.is_own_profile) return

    setLoadingFollowUser(true)

    try {
      await axios.post(route('users.toggle-follow', user.id))
      setIsFollowingUser(prev => !prev)
      // Update followers count optimistically
      if (isFollowingUser) {
        // Unfollowed - decrease count
        // Note: We'd need to pass followersCount as a prop and update it, but for now just toggle the state
      } else {
        // Followed - increase count
      }
    } catch (error) {
      console.error('Error following user:', error)
    } finally {
      setLoadingFollowUser(false)
    }
  }

  // Update isFollowingUser when user prop changes
  useEffect(() => {
    if (user?.is_following !== undefined) {
      setIsFollowingUser(user.is_following)
    }
  }, [user?.is_following])

  const displayName = user?.name ?? "Profile"

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? displayName} description={seo?.description} />
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1a] text-gray-900 dark:text-white">
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
                  <Avatar className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-white dark:border-[#0a0f1a] ring-2 ring-green-500/50">
                    <AvatarImage src={userImage} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-3xl">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full border-3 border-white dark:border-[#0a0f1a] flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="text-center sm:text-left flex-1 w-full sm:w-auto">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold break-words">{user.name}</h1>
                    <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">@{user.slug || user.id}</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs px-2 py-0.5 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </Badge>
                    {user.positions && user.positions.length > 0 && (
                      user.positions.map((position: string, index: number) => (
                        <Badge key={index} className="bg-purple-600 hover:bg-purple-600 text-white text-xs px-2 py-0.5">
                          {position}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                {!user?.is_own_profile && auth?.user && (
                  <Button
                    onClick={handleFollowUser}
                    disabled={loadingFollowUser}
                    className={`${
                      isFollowingUser
                        ? "bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-white/20 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white"
                        : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    }`}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {loadingFollowUser ? "Loading..." : isFollowingUser ? "Following" : "Follow"}
                  </Button>
                )}
                <Button
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  onClick={handleMessageClick}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>

            {/* Profile Stats */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 md:gap-6 py-3 px-3 sm:px-0 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-white/10">
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
                <span className="text-gray-900 dark:text-white font-medium">
                  {believePointsBalance >= 1000
                    ? `${(believePointsBalance / 1000).toFixed(1)}K`
                    : believePointsBalance.toLocaleString()}
                </span>
                <span>Believer Points</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{followersCount || 0} followers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4" />
                <span>{donationsCount || 0} donations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-[95rem] mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar */}
            <aside className="lg:col-span-3 space-y-4">
              <div className="bg-white dark:bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-left-4 duration-500">
                <nav className="space-y-1">
                  {profileTabs.map((tab) => {
                    const tabRoute = getTabRoute(tab.name)
                    const isActive = activeTab === tab.name
                    return (
                      <Link
                        key={tab.name}
                        href={tabRoute}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                          isActive
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        {tab.name === "Posts" && <FileText className="w-5 h-5" />}
                        {tab.name === "About" && <User className="w-5 h-5" />}
                        {tab.name === "Activity" && <Clock className="w-5 h-5" />}
                        {tab.name === "Following" && <UserPlus className="w-5 h-5" />}
                        {tab.name === "Groups" && <Users className="w-5 h-5" />}
                        <span className="text-sm">{tab.name}</span>
                        {tab.count !== null && (
                          <span className="ml-auto text-xs text-gray-500">({tab.count})</span>
                        )}
                      </Link>
                    )
                  })}
                </nav>
              </div>

              <div className="bg-white dark:bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-left-4 duration-500 delay-100">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">User Info</p>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={userImage} />
                    <AvatarFallback className="bg-emerald-600 text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                    {user.email && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-end justify-between py-3 border-t border-gray-200 dark:border-white/10">
                  <div className="text-center flex flex-col">
                    <p className="text-lg font-bold">
                      {believePointsBalance >= 1000
                        ? `${(believePointsBalance / 1000).toFixed(1)}k`
                        : believePointsBalance.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-500">Believer Points</p>
                    <div className="mt-1">
                      <p className="text-[9px] text-green-400">+{believePointsEarned.toLocaleString()} earned</p>
                    </div>
                  </div>
                  <div className="text-center flex flex-col">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {rewardPointsBalance >= 1000
                        ? `${(rewardPointsBalance / 1000).toFixed(1)}k`
                        : rewardPointsBalance.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-500">Reward Points</p>
                    <div className="mt-1">
                      <p className="text-[9px] text-green-400">+{rewardPointsEarned.toLocaleString()} earned</p>
                    </div>
                  </div>
                  <div className="text-center flex flex-col">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{followersCount || 0}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-500">Followers</p>
                    <div className="mt-1 h-[13px]"></div>
                  </div>
                  <div className="text-center flex flex-col">
                    <p className="text-lg font-bold">{postsCount || 0}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-500">Posts</p>
                    <div className="mt-1 h-[13px]"></div>
                  </div>
                </div>
              </div>

              {user.bio && (
                <div className="bg-white dark:bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-left-4 duration-500 delay-200">
                  <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">About</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{user.bio}</p>
                </div>
              )}
            </aside>

            {/* Main Feed */}
            <section className="lg:col-span-6 space-y-4">
              {isPageLoading ? (
                <div className="bg-white dark:bg-[#111827] rounded-xl p-8 flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading content...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Posts Tab */}
                  {activeTab === "Posts" && (
                    <div className="space-y-4">
                      {/* Post Filter Tabs */}
                      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2 mb-4">
                        <button
                          onClick={() => {
                            const slug = user.slug || user.id;
                            router.get(route('users.posts', slug), { filter: 'user' }, {
                              preserveState: true,
                              preserveScroll: true,
                              only: ['posts', 'postFilter'],
                            });
                          }}
                          className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                            currentPostFilter === 'user'
                              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          User Posts
                        </button>
                        <button
                          onClick={() => {
                            const slug = user.slug || user.id;
                            router.get(route('users.posts', slug), { filter: 'all' }, {
                              preserveState: true,
                              preserveScroll: true,
                              only: ['posts', 'postFilter'],
                            });
                          }}
                          className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                            currentPostFilter === 'all'
                              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          All Posts
                        </button>
                      </div>
                      {postsState.length > 0 ? (
                        postsState.map((postItem, index) => {
                          const postId = postItem.id
                          const currentReaction = postItem.user_reaction
                          const reactionsCount = postItem.reactions_count || 0
                          const commentsCount = postItem.comments_count || 0
                          const postComments = postItem.comments || []
                          // Use a unique key that combines post ID with creator info to ensure uniqueness
                          const creatorId = postItem.creator?.id || postItem.user?.id || 'unknown'
                          const uniqueKey = postId?.toString().startsWith('fb_')
                            ? postId
                            : `post_${postId}_${creatorId}_${index}`

                          return (
                            <article
                              key={uniqueKey}
                              className="bg-white dark:bg-[#111827] rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100"
                            >
                              <div className="p-5">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-12 h-12">
                                      <AvatarImage src={postItem.creator_image || (postItem.creator_type === 'organization' ? orgImage : userImage)} />
                                      <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-500 text-lg">
                                        {(postItem.creator_name || user.name).charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        {postItem.creator_slug ? (
                                          <Link
                                            href={postItem.creator_type === 'organization'
                                              ? route('organizations.show', postItem.creator_slug)
                                              : route('users.show', postItem.creator_slug)}
                                            className="font-semibold text-base text-gray-900 dark:text-white hover:underline"
                                          >
                                            {postItem.creator_name || user.name}
                                          </Link>
                                        ) : (
                                          <h4 className="font-semibold text-base text-gray-900 dark:text-white">
                                            {postItem.creator_name || user.name}
                                          </h4>
                                        )}
                                        {postItem.creator_type === 'user' && (
                                          <CheckCircle className="w-4 h-4 text-blue-400" />
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {postItem.creator_type === 'organization'
                                          ? `@${postItem.creator_slug || ''}`
                                          : `@${postItem.creator_slug || user.slug || user.id}`}
                                      </p>
                                    </div>
                                  </div>
                                  <MoreHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" />
                                </div>

                                {/* Title */}
                                {postItem.title && (
                                  <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{postItem.title}</h3>
                                )}

                                {/* Content Text */}
                                {postItem.content && (
                                  <p className="text-gray-700 dark:text-gray-300 text-base mb-5 leading-relaxed whitespace-pre-wrap">
                                    {postItem.content}
                                  </p>
                                )}

                                {/* Main Image */}
                                {(postItem.image || (postItem.images && postItem.images.length > 0)) && (
                                  <div className="mb-5 rounded-lg overflow-hidden">
                                    {(() => {
                                      const imageUrl = postItem.image || (postItem.images && postItem.images[0])
                                      if (!imageUrl) return null

                                      const src = imageUrl.startsWith('http') || imageUrl.startsWith('/storage/') || imageUrl.startsWith('/')
                                        ? imageUrl
                                        : `/storage/${imageUrl}`

                                      return (
                                        <img
                                          src={src}
                                          alt={postItem.title || 'Post image'}
                                          className="w-full h-auto object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                          }}
                                        />
                                      )
                                    })()}
                                  </div>
                                )}

                                {/* Show multiple images if available */}
                                {postItem.images && postItem.images.length > 1 && (
                                  <div className="grid grid-cols-2 gap-3 mb-5">
                                    {postItem.images.slice(1, 5).map((img: string, idx: number) => {
                                      const src = img.startsWith('http') || img.startsWith('/storage/') || img.startsWith('/')
                                        ? img
                                        : `/storage/${img}`
                                      return (
                                        <div key={idx} className="rounded-lg overflow-hidden">
                                          <img
                                            src={src}
                                            alt={`${postItem.title || 'Post'} image ${idx + 2}`}
                                            className="w-full h-56 object-cover"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none'
                                            }}
                                          />
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Engagement */}
                              {reactionsCount > 0 || commentsCount > 0 ? (
                                <div className="px-5 py-3 border-t border-gray-200 dark:border-white/10">
                                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                    {reactionsCount > 0 && (
                                      <div className="flex items-center gap-2">
                                        {(() => {
                                          const reactions = postItem.reactions || []

                                          if (reactions.length > 0) {
                                            return (
                                              <div className="flex items-center gap-1.5">
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
                                                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white dark:bg-[#111827] rounded-full border border-gray-200 dark:border-white/20 flex items-center justify-center text-xs">
                                                        {reactionConfig[reaction.type as keyof typeof reactionConfig]?.emoji || '👍'}
                                                      </div>
                                                    </div>
                                                  ))}
                                                  {reactions.length > 6 && (
                                                    <div className="w-6 h-6 rounded-full border-2 border-white dark:border-[#111827] bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-semibold">
                                                      +{reactions.length - 6}
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-0.5">
                                                  {(() => {
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
                                        className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors"
                                      >
                                        <MessageCircle className="w-4 h-4" /> {commentsCount} {commentsCount === 1 ? 'Comment' : 'Comments'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : null}

                              {/* Action Buttons */}
                              <div className="grid grid-cols-3 border-t border-gray-200 dark:border-white/10">
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
                                    className={`w-full flex items-center justify-center gap-2 py-3 transition-all hover:bg-gray-100 dark:hover:bg-white/5 ${
                                      currentReaction ? reactionConfig[currentReaction.type as keyof typeof reactionConfig]?.color || 'text-blue-500' : 'text-gray-600 dark:text-gray-400'
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
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">Like</span>
                                      </>
                                    )}
                                  </button>
                                  <AnimatePresence>
                                    {showReactionPicker === postId && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute bottom-full left-0 mb-2 bg-white dark:bg-[#1a1a2e] rounded-full p-1 flex items-center gap-1 shadow-lg border border-gray-200 dark:border-white/10 z-10"
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
                                  className="flex items-center justify-center gap-2 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all"
                                >
                                  <MessageCircle className="w-5 h-5" />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">Comment</span>
                                </button>
                                <button
                                  onClick={() => handleShare(postId)}
                                  className="flex items-center justify-center gap-2 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all"
                                >
                                  <Share2 className="w-5 h-5" />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">Share</span>
                                </button>
                              </div>

                              {/* Comments Section */}
                              {showComments[postId] && (
                                <div className="border-t border-gray-200 dark:border-white/10 p-4 space-y-4">
                                  {/* Comments List */}
                                  {postComments.length > 0 && (
                                    <div className="space-y-3">
                                      {postComments.map((comment: any) => (
                                        <div key={comment.id} className="flex gap-3">
                                          <Avatar className="w-8 h-8">
                                            <AvatarImage src={comment.user?.image ? (comment.user.image.startsWith('/storage/') || comment.user.image.startsWith('/') ? comment.user.image : `/storage/${comment.user.image}`) : undefined} />
                                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-xs">
                                              {comment.user?.name?.charAt(0).toUpperCase() || 'U'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1">
                                            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                                              <p className="text-sm font-medium mb-1 text-gray-900 dark:text-white">{comment.user?.name || 'User'}</p>
                                              <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                              {new Date(comment.created_at).toLocaleDateString()}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Comment Input */}
                                  {auth?.user && (
                                    <div className="flex gap-2">
                                      <Avatar className="w-8 h-8">
                                        <AvatarImage src={auth.user.image ? (auth.user.image.startsWith('/storage/') || auth.user.image.startsWith('/') ? auth.user.image : `/storage/${auth.user.image}`) : undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-xs">
                                          {auth.user.name?.charAt(0).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 flex gap-2">
                                        <Textarea
                                          placeholder="Write a comment..."
                                          value={commentInputs[postId] || ''}
                                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [postId]: e.target.value }))}
                                          className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-500 min-h-[60px] resize-none"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault()
                                              handleComment(postId)
                                            }
                                          }}
                                        />
                                        <Button
                                          onClick={() => handleComment(postId)}
                                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                        >
                                          <Send className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </article>
                          )
                        })
                      ) : (
                        <div className="bg-white dark:bg-[#111827] rounded-xl p-8 text-center">
                          <p className="text-gray-600 dark:text-gray-400">No posts yet</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* About Tab */}
                  {activeTab === "About" && (
                    <div className="bg-white dark:bg-[#111827] rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">About</h2>
                          <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">{user.name}</h3>
                        </div>
                      </div>

                      {user.bio ? (
                        <div className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                          {user.bio.split('\n').map((paragraph: string, index: number) => {
                            const trimmedParagraph = paragraph.trim()
                            if (!trimmedParagraph) return null
                            return (
                              <p key={index} className="mb-4 last:mb-0">
                                {trimmedParagraph}
                              </p>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-600 dark:text-gray-400 mb-6">No bio available</p>
                      )}

                      {user.positions && user.positions.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Positions</h3>
                          <div className="flex flex-wrap gap-2">
                            {user.positions.map((position: string, index: number) => (
                              <Badge key={index} className="bg-purple-600/20 text-purple-300 border border-purple-500/30">
                                {position}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* User Details */}
                      <div className="space-y-4 border-t border-gray-200 dark:border-white/10 pt-6">
                        {user.email && (
                          <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">{user.email}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">{user.phone}</span>
                          </div>
                        )}
                        {location && location !== 'Location not set' && (
                          <div className="flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">{location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">Member since {memberSince}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Following Tab */}
                  {activeTab === "Following" && (
                    <div className="bg-white dark:bg-[#111827] rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Following</h2>
                        <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                          {followingCount} Organizations
                        </Badge>
                      </div>
                      {favoriteOrganizations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {favoriteOrganizations.map((org) => {
                            const orgRouteParam = org.slug || org.id
                            return (
                              <Link
                                key={org.id}
                                href={orgRouteParam ? route('organizations.show', orgRouteParam) : '#'}
                                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 hover:border-purple-500/50 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                              >
                                <Avatar className="w-14 h-14">
                                  <AvatarImage src={org.image ? (org.image.startsWith('/storage/') || org.image.startsWith('/') ? org.image : `/storage/${org.image}`) : undefined} />
                                  <AvatarFallback className="bg-emerald-600 text-lg">
                                    {org.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold truncate text-gray-900 dark:text-white">{org.name}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Organization</p>
                                </div>
                                <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 -rotate-90" />
                              </Link>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <UserPlus className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">Not following any organizations yet</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Start following organizations to see them here</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Activity Tab */}
                  {activeTab === "Activity" && (
                    <div className="bg-white dark:bg-[#111827] rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Activity</h2>

                      {/* Summary Stats */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10">
                          <div className="flex items-center gap-3 mb-2">
                            <Heart className="w-5 h-5 text-red-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Donations</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{donationsCount}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">${totalDonated.toLocaleString()} total</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Posts</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{postsCount}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">In community feed</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10">
                          <div className="flex items-center gap-3 mb-2">
                            <UserPlus className="w-5 h-5 text-purple-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Following</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{followingCount}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">Organizations</p>
                        </div>
                      </div>

                      {/* Recent Activity Timeline */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Activity</h3>

                        {activities && activities.length > 0 ? (
                          <>
                            <div className="space-y-3">
                              {activities.map((activity: any) => {
                                // Get icon and color based on activity type
                                let Icon = FileText
                                let iconBg = 'bg-blue-500/20'
                                let iconColor = 'text-blue-400'

                                if (activity.type === 'donation') {
                                  Icon = Heart
                                  iconBg = 'bg-red-500/20'
                                  iconColor = 'text-red-400'
                                } else if (activity.type === 'job_application') {
                                  Icon = Briefcase
                                  iconBg = 'bg-green-500/20'
                                  iconColor = 'text-green-400'
                                } else if (activity.type === 'enrollment') {
                                  Icon = Calendar
                                  iconBg = 'bg-purple-500/20'
                                  iconColor = 'text-purple-400'
                                } else if (activity.type === 'post') {
                                  Icon = FileText
                                  iconBg = 'bg-blue-500/20'
                                  iconColor = 'text-blue-400'
                                }

                                return (
                                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                                    <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
                                      <Icon className={`w-5 h-5 ${iconColor}`} />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
                                      {activity.description && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{activity.description}</p>
                                      )}
                                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                        {new Date(activity.date).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* Pagination */}
                            {activityPagination && activityPagination.last_page > 1 && (
                              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  Showing {activityPagination.from} to {activityPagination.to} of {activityPagination.total} activities
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const slug = user.slug || user.id
                                      router.visit(route('users.activity', slug) + `?page=${activityPagination.current_page - 1}`, {
                                        preserveState: false,
                                      })
                                    }}
                                    disabled={activityPagination.current_page === 1}
                                    className="rounded-full bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white disabled:opacity-50 w-10 h-10 p-0"
                                  >
                                    <ChevronDown className="w-4 h-4 rotate-90" />
                                  </Button>

                                  {Array.from({ length: activityPagination.last_page }, (_, i) => i + 1)
                                    .filter(page => {
                                      const current = activityPagination.current_page
                                      const total = activityPagination.last_page
                                      return page === 1 || page === total || (page >= current - 1 && page <= current + 1)
                                    })
                                    .map((page, index, array) => {
                                      const prevPage = array[index - 1]
                                      const showEllipsis = prevPage && page - prevPage > 1

                                      return (
                                        <div key={page} className="flex items-center gap-1">
                                          {showEllipsis && (
                                            <span className="px-2 text-gray-500 dark:text-gray-500">...</span>
                                          )}
                                          <Button
                                            variant={activityPagination.current_page === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                              const slug = user.slug || user.id
                                              router.visit(route('users.activity', slug) + `?page=${page}`, {
                                                preserveState: false,
                                              })
                                            }}
                                            className={`rounded-full w-10 h-10 p-0 ${
                                              activityPagination.current_page === page
                                                ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                                                : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white"
                                            }`}
                                          >
                                            {page}
                                          </Button>
                                        </div>
                                      )
                                    })}

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const slug = user.slug || user.id
                                      router.visit(route('users.activity', slug) + `?page=${activityPagination.current_page + 1}`, {
                                        preserveState: false,
                                      })
                                    }}
                                    disabled={activityPagination.current_page === activityPagination.last_page}
                                    className="rounded-full bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white disabled:opacity-50 w-10 h-10 p-0"
                                  >
                                    <ChevronDown className="w-4 h-4 -rotate-90" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-600 dark:text-gray-400">No recent activity</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Groups Tab */}
                  {activeTab === "Groups" && (
                    <div className="bg-white dark:bg-[#111827] rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Groups</h2>
                        {chatGroups && chatGroups.length > 0 && (
                          <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                            {chatGroups.length} Groups
                          </Badge>
                        )}
                      </div>
                      {chatGroups && chatGroups.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {chatGroups.map((group: any) => (
                            <Link
                              key={group.id}
                              href={`/chat?room=${group.id}`}
                              className="bg-gray-50 dark:bg-[#0a0f1a] rounded-lg p-4 border border-gray-200 dark:border-white/10 hover:border-purple-500/50 hover:bg-gray-100 dark:hover:bg-white/5 transition-all block"
                            >
                              <div className="flex items-start gap-3 mb-3">
                                {group.image ? (
                                  <img
                                    src={group.image}
                                    alt={group.name}
                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                                    <Users className="w-6 h-6 text-white" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
                                    {group.name?.replace(/^Direct\s+/i, '').trim() || group.name}
                                  </h3>
                                  {group.description && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{group.description}</p>
                                  )}
                                </div>
                              </div>

                              {group.topics && group.topics.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {group.topics.slice(0, 3).map((topic: any) => (
                                    <Badge key={topic.id} className="bg-purple-600/20 text-purple-300 text-xs border border-purple-500/30">
                                      {topic.name}
                                    </Badge>
                                  ))}
                                  {group.topics.length > 3 && (
                                    <Badge className="bg-gray-600/20 text-gray-400 text-xs border border-gray-500/30">
                                      +{group.topics.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>{group.members_count || 0} members</span>
                                </div>
                                {group.latest_message && (
                                  <span className="truncate max-w-[150px]">
                                    {new Date(group.latest_message.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                )}
                              </div>

                              {group.latest_message && (
                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-white/10">
                                  <div className="flex items-center gap-2">
                                    {group.latest_message.user?.image ? (
                                      <Avatar className="w-5 h-5">
                                        <AvatarImage src={group.latest_message.user.image} />
                                        <AvatarFallback className="bg-gray-600 text-xs">
                                          {group.latest_message.user.name?.charAt(0).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                      </Avatar>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center">
                                        <span className="text-[8px] text-white">
                                          {group.latest_message.user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </span>
                                      </div>
                                    )}
                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                                      <span className="font-medium text-gray-700 dark:text-gray-300">{group.latest_message.user?.name || 'User'}: </span>
                                      {group.latest_message.content}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400 mb-2">No groups yet</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500">Join groups from the chat page to see them here</p>
                          <Link
                            href="/chat"
                            className="mt-4 inline-block"
                          >
                            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                              Go to Chat
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Right Sidebar */}
            <aside className="lg:col-span-3 space-y-4">
              {/* Organizations You May Know */}
              {peopleToShow.length > 0 && (
                <div className="bg-white dark:bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Organizations You May Know</h3>
                    <button className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1">
                      View All <ChevronDown className="w-3 h-3 -rotate-90" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {peopleToShow.map((person, index) => {
                      const orgRouteParam = person.slug || person.excel_data_id || person.id
                      return (
                        <div
                          key={person.id || index}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors animate-in fade-in slide-in-from-right-2 duration-300"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <Link
                            href={orgRouteParam ? route('organizations.show', orgRouteParam) : '#'}
                            className="flex items-center gap-3 flex-1 min-w-0"
                            onClick={(e) => {
                              if (!orgRouteParam) {
                                e.preventDefault()
                              }
                            }}
                          >
                            <Avatar className="w-10 h-10 flex-shrink-0">
                              <AvatarImage src={person.avatar} />
                              <AvatarFallback className="bg-emerald-600 text-xs">
                                {person.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{person.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{person.org || person.description}</p>
                            </div>
                          </Link>
                          <Button
                            size="sm"
                            onClick={() => handleFollowPerson(person)}
                            disabled={loadingFollow[person.id as number] || !person.id}
                            className={`text-xs px-3 py-1.5 h-auto flex-shrink-0 whitespace-nowrap ${
                              followingStates[person.id as number]
                                ? "bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-white/20 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white"
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
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Trending Organizations */}
              {trendingOrgsToShow.length > 0 && (
                <div className="bg-white dark:bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Trending Organizations</h3>
                    <button className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1">
                      View All <ChevronDown className="w-3 h-3 -rotate-90" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {trendingOrgsToShow.map((org, index) => {
                      const orgRouteParam = org.slug || org.excel_data_id || org.id
                      return (
                        <Link
                          key={org.id || index}
                          href={orgRouteParam ? route('organizations.show', orgRouteParam) : '#'}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors animate-in fade-in slide-in-from-right-2 duration-300"
                          style={{ animationDelay: `${index * 100 + 200}ms` }}
                        >
                          <div className={`w-10 h-10 ${org.color || 'bg-emerald-500'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Heart className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                              {org.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{org.desc || org.description}</p>
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
      </div>
    </FrontendLayout>
  )
}

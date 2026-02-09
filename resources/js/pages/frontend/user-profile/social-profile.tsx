"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { usePage, router, Link } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Heart,
  MessageCircle,
  Share2,
  ThumbsUp,
  MapPin,
  Calendar,
  Check,
  Crown,
  Users,
  Leaf,
  MoreVertical,
  Edit3,
  UserPlus,
  MessageSquare,
  Clock,
  TrendingUp,
  Eye,
  Moon,
  Bell,
} from "lucide-react"
import { format } from "date-fns"

interface User {
  id: number
  name: string
  email: string
  image?: string
  created_at: string
  believe_points?: number
  reward_points?: number
  location?: string
  is_premium?: boolean
  is_volunteer?: boolean
  is_donor?: boolean
  organizations_count?: number
  following_count?: number
  posts_count?: number
}

interface Post {
  id: number
  content?: string
  images?: string[]
  user: {
    id: number
    name: string
    image?: string
    slug?: string
  }
  organization?: {
    id: number
    name: string
    image?: string
    slug?: string
  }
  event?: {
    id: number
    name: string
    description?: string
    start_date: string
    location?: string
    poster_image?: string
  }
  hashtags?: string[]
  reactions_count: number
  comments_count: number
  user_reaction?: {
    type: string
  }
  created_at: string
}

interface SuggestedUser {
  id: number
  name: string
  image?: string
  description?: string
  is_following?: boolean
}

interface TrendingOrganization {
  id: number
  name: string
  description?: string
  image?: string
  slug?: string
}

interface PageProps {
  auth: {
    user: User
  }
  posts: Post[]
  suggestedUsers: SuggestedUser[]
  trendingOrganizations: TrendingOrganization[]
  isOwnProfile: boolean
  viewingUserId?: number
  viewingUser?: User
}

export default function SocialProfile() {
  const { auth, posts, suggestedUsers, trendingOrganizations, isOwnProfile, viewingUser } = usePage<PageProps>().props
  // Use viewingUser if available (when viewing someone else's profile), otherwise use auth.user
  const user = viewingUser || auth.user
  const [activeTab, setActiveTab] = useState("posts")
  const [localPosts, setLocalPosts] = useState(posts)

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "EEEE, MMMM do 'at' h:mm a")
  }

  const formatEventDate = (dateString: string) => {
    return format(new Date(dateString), "EEEE, MMMM do h:mm a")
  }

  const handleReaction = async (postId: number) => {
    try {
      const response = await fetch(`/posts/${postId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
        body: JSON.stringify({ type: "like" }),
      })

      if (response.ok) {
        const data = await response.json()
        setLocalPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  user_reaction: data.reaction ? { type: data.reaction.type } : null,
                  reactions_count: data.reaction ? (post.reactions_count + 1) : Math.max(0, post.reactions_count - 1),
                }
              : post
          )
        )
      }
    } catch (error) {
      console.error("Error reacting to post:", error)
    }
  }

  const handleFollow = async (userId: number) => {
    try {
      const response = await fetch(`/organizations/${userId}/toggle-favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json().catch(() => ({}))
        if (data.success !== false) router.reload()
      } else if (response.status === 403) {
        const data = await response.json().catch(() => ({}))
        const msg = data.message || "Following is for supporter accounts only. Please log in with your personal (supporter) account to follow organizations."
        toast.error(msg)
      }
    } catch (error) {
      console.error("Error following user:", error)
    }
  }

  // Calculate user badges
  const badges = []
  if (user.is_premium) {
    badges.push({ name: "Premium Member", icon: Crown, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" })
  }
  if (user.is_volunteer) {
    badges.push({ name: "Volunteer", icon: Users, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" })
  }
  if (user.is_donor) {
    badges.push({ name: "Donor", icon: Heart, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" })
  }

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Top Navigation Bar */}
        <div className="bg-gradient-to-r from-slate-800 via-purple-800 to-slate-800 border-b border-purple-700/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-white text-xl font-bold">
                  Believe In Unity
                </Link>
                <nav className="hidden md:flex items-center gap-6">
                  <Link href="/" className="text-white/80 hover:text-white">Home</Link>
                  <Link href="/about" className="text-white/80 hover:text-white">About</Link>
                  <Link href="/donate" className="text-white/80 hover:text-white">Donate</Link>
                  <div className="relative group">
                    <Link href="/community" className="text-white/80 hover:text-white flex items-center gap-1">
                      Community
                      <span className="text-xs">▼</span>
                    </Link>
                  </div>
                  <div className="relative group">
                    <Link href="/services" className="text-white/80 hover:text-white flex items-center gap-1">
                      Services
                      <span className="text-xs">▼</span>
                    </Link>
                  </div>
                  <div className="relative group">
                    <Link href="/more" className="text-white/80 hover:text-white flex items-center gap-1">
                      More
                      <span className="text-xs">▼</span>
                    </Link>
                  </div>
                </nav>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="text-white/80 hover:text-white">
                  <Moon className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-white/80 hover:text-white relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                    1
                  </span>
                </Button>
                <Button variant="outline" size="sm" className="text-white border-white/30 hover:bg-white/10">
                  Join In.
                </Button>
                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                  Log In
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Header Section */}
        <div className="bg-gradient-to-r from-slate-800 via-purple-800 to-slate-800 border-b border-purple-700/50">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Left: User Info */}
              <div className="flex items-start gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-purple-500/50">
                    <AvatarImage src={user.image || "/placeholder-user.jpg"} alt={user.name} />
                    <AvatarFallback className="bg-purple-600 text-white text-2xl">
                      {user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-slate-800">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white">{user.name}</h1>
                    <Edit3 className="h-5 w-5 text-purple-400 cursor-pointer hover:text-purple-300" />
                  </div>
                  <p className="text-white/70 mb-4">{user.email}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {badges.map((badge, idx) => {
                      const Icon = badge.icon
                      return (
                        <Badge key={idx} className={`${badge.color} border flex items-center gap-1`}>
                          <Icon className="h-3 w-3" />
                          {badge.name}
                        </Badge>
                      )
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-6 text-sm text-white/70">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Member since {format(new Date(user.created_at), "MMMM yyyy")}</span>
                    </div>
                    {user.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{user.location}</span>
                      </div>
                    )}
                    {user.believe_points !== undefined && (
                      <div className="flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-green-400" />
                        <span className="text-green-400 font-semibold">
                          {user.believe_points.toLocaleString()} Believer Points
                        </span>
                      </div>
                    )}
                    {user.organizations_count !== undefined && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{user.organizations_count} organizations</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Action Buttons */}
              <div className="flex gap-3">
                {isOwnProfile ? (
                  <Link href="/profile/edit">
                    <Button className="bg-green-500 hover:bg-green-600 text-white">
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Heart className="h-4 w-4 mr-2" />
                      Follow
                    </Button>
                    <Button className="bg-green-500 hover:bg-green-600 text-white">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar */}
            <div className="lg:col-span-3">
              <Card className="bg-slate-800/50 border-purple-700/30">
                <CardContent className="p-4">
                  {/* Profile Navigation Tabs */}
                  <div className="space-y-1 mb-6">
                    {[
                      { name: "Posts", count: user.posts_count || 0, id: "posts" },
                      { name: "About", id: "about" },
                      { name: "Following", count: user.following_count || 0, id: "following" },
                      { name: "Groups", id: "groups" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? "bg-purple-600/30 border-l-4 border-purple-500 text-white"
                            : "text-white/70 hover:bg-slate-700/50 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{tab.name}</span>
                          {tab.count !== undefined && <span className="text-sm">({tab.count})</span>}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Interests Section */}
                  <div className="mb-6">
                    <h3 className="text-white font-semibold mb-3">Interests</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white/70">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="text-sm">Mental Health Advocacy</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm">Youth Engagement</span>
                      </div>
                    </div>
                  </div>

                  {/* Engagement Stats */}
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between text-white/70">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span>Believer Views</span>
                      </div>
                      <span className="text-white">4.3k</span>
                    </div>
                    <div className="flex items-center justify-between text-white/70">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Following</span>
                      </div>
                      <span className="text-white">{user.following_count || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center Column - Posts Feed */}
            <div className="lg:col-span-6">
              {/* Share Something Input */}
              {isOwnProfile && (
                <Card className="bg-slate-800/50 border-purple-700/30 mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.image || "/placeholder-user.jpg"} alt={user.name} />
                        <AvatarFallback className="bg-purple-600 text-white">
                          {user.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        type="text"
                        placeholder="Share something with your community..."
                        className="flex-1 bg-slate-700/50 border border-purple-700/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                        Photo/video
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Posts Feed */}
              <div className="space-y-6">
                {localPosts.map((post) => (
                  <Card key={post.id} className="bg-slate-800/50 border-purple-700/30">
                    <CardContent className="p-6">
                      {/* Post Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage
                              src={post.organization?.image || post.user?.image || "/placeholder-user.jpg"}
                              alt={post.organization?.name || post.user?.name}
                            />
                            <AvatarFallback className="bg-purple-600 text-white">
                              {(post.organization?.name || post.user?.name)?.charAt(0) || "O"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold">
                                {post.organization?.name || post.user?.name}
                              </span>
                              {post.organization && (
                                <span className="text-white/50 text-sm">
                                  @{post.organization.slug || post.organization.name.toLowerCase().replace(/\s+/g, "")}
                                </span>
                              )}
                              <div className="bg-green-500 rounded-full p-0.5">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </div>

                      {/* Hashtags */}
                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.hashtags.map((tag, idx) => (
                            <span key={idx} className="text-blue-400 text-sm">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Post Content */}
                      {post.content && <p className="text-white/80 mb-4">{post.content}</p>}

                      {/* Event Card */}
                      {post.event && (
                        <Card className="bg-slate-700/50 border-purple-600/30 mb-4">
                          <CardContent className="p-4">
                            <h3 className="text-xl font-bold text-white mb-2">{post.event.name}</h3>
                            {post.event.description && (
                              <p className="text-white/70 text-sm mb-4">{post.event.description}</p>
                            )}
                            {post.event.poster_image && (
                              <img
                                src={post.event.poster_image}
                                alt={post.event.name}
                                className="w-full rounded-lg mb-4"
                              />
                            )}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-white/80">
                                <Calendar className="h-4 w-4 text-green-400" />
                                <span className="text-sm">{formatEventDate(post.event.start_date)}</span>
                              </div>
                              {post.event.location && (
                                <div className="flex items-center gap-2 text-white/80">
                                  <MapPin className="h-4 w-4 text-green-400" />
                                  <span className="text-sm">{post.event.location}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Post Images */}
                      {post.images && post.images.length > 0 && (
                        <div className="mb-4">
                          <img
                            src={post.images[0]}
                            alt="Post"
                            className="w-full rounded-lg"
                          />
                        </div>
                      )}

                      {/* Engagement Metrics */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <ThumbsUp className="h-4 w-4 text-blue-400" />
                            <Heart className="h-4 w-4 text-red-400" />
                            <span className="text-white/70 text-sm">{post.reactions_count}</span>
                          </div>
                          <span className="text-white/70 text-sm">{post.comments_count} Comments</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-4 border-t border-purple-700/30 pt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReaction(post.id)}
                          className={`flex items-center gap-2 ${
                            post.user_reaction ? "text-blue-400" : "text-white/70 hover:text-white"
                          }`}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Like
                        </Button>
                        <Button variant="ghost" size="sm" className="text-white/70 hover:text-white flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          Comment
                        </Button>
                        <Button variant="ghost" size="sm" className="text-white/70 hover:text-white flex items-center gap-2">
                          <Share2 className="h-4 w-4" />
                          Share
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {localPosts.length === 0 && (
                  <Card className="bg-slate-800/50 border-purple-700/30">
                    <CardContent className="p-12 text-center">
                      <p className="text-white/70">No posts yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-3">
              <div className="space-y-6">
                {/* Organizations You May Know */}
                <Card className="bg-slate-800/50 border-purple-700/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold">Organizations You May Know</h3>
                      <Link href="/organizations" className="text-purple-400 text-sm hover:text-purple-300">
                        View All &gt;
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {suggestedUsers.map((suggestedUser) => (
                        <div key={suggestedUser.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={suggestedUser.image || "/placeholder-user.jpg"} alt={suggestedUser.name} />
                              <AvatarFallback className="bg-purple-600 text-white">
                                {suggestedUser.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-white text-sm font-medium">{suggestedUser.name}</p>
                              {suggestedUser.description && (
                                <p className="text-white/50 text-xs">{suggestedUser.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Trending Organizations */}
                <Card className="bg-slate-800/50 border-purple-700/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold">Trending Organizations</h3>
                      <Link href="/organizations" className="text-purple-400 text-sm hover:text-purple-300">
                        View All &gt;
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {trendingOrganizations.map((org) => (
                        <Link
                          key={org.id}
                          href={`/organizations/${org.slug || org.id}`}
                          className="flex items-start gap-3 hover:bg-slate-700/30 p-2 rounded-lg transition-colors"
                        >
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={org.image || "/placeholder-user.jpg"} alt={org.name} />
                            <AvatarFallback className="bg-purple-600 text-white">
                              {org.name?.charAt(0) || "O"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{org.name}</p>
                            {org.description && (
                              <p className="text-white/50 text-xs line-clamp-2">{org.description}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}

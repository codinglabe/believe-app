"use client"

import React, { useState } from "react"
import toast from "react-hot-toast"
import { Link, router } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { usePage } from "@inertiajs/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Button } from "@/components/frontend/ui/button"
import { Heart, ChevronDown, Home, Search } from "lucide-react"
import useAxios from "@/hooks/useAxios"

interface SocialFeedLayoutProps {
  children: React.ReactNode
  activeNavItem?: 'feed' | 'home' | 'profile' | 'following' | 'groups' | 'search'
  userStats?: {
    postsCount?: number
    believePointsBalance?: number
    believePointsEarned?: number
    rewardPointsBalance?: number
    rewardPointsEarned?: number
    followersCount?: number
  }
  peopleYouMayKnow?: any[]
  trendingOrganizations?: any[]
}

export default function SocialFeedLayout({
  children,
  activeNavItem = 'feed',
  userStats = {},
  peopleYouMayKnow = [],
  trendingOrganizations = [],
}: SocialFeedLayoutProps) {
  const { auth } = usePage<{ auth?: { user?: any } }>().props
  const axios = useAxios()
  const currentUser = auth?.user
  const [followingStates, setFollowingStates] = useState<Record<number | string, boolean>>({})
  const [loadingFollow, setLoadingFollow] = useState<Record<number | string, boolean>>({})

  const handleFollowPerson = async (person: any) => {
    if (!currentUser) {
      router.visit(route("login"))
      return
    }

    if (!person.id) return

    setLoadingFollow(prev => ({ ...prev, [person.id]: true }))

    try {
      const res = await axios.post(route('organizations.toggle-favorite', person.id))
      if (res.data?.success !== false) {
        setFollowingStates(prev => ({ ...prev, [person.id]: !prev[person.id] }))
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || (error.response?.status === 403
        ? 'Following is for supporter accounts only. Please log in with your personal (supporter) account to follow organizations.'
        : 'Could not update follow. Try again.')
      toast.error(msg)
    } finally {
      setLoadingFollow(prev => ({ ...prev, [person.id]: false }))
    }
  }

  const getNavItemClass = (item: string) => {
    const baseClass = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left"
    if (activeNavItem === item) {
      return `${baseClass} bg-gradient-to-r from-purple-600 to-blue-600 text-white`
    }
    return `${baseClass} text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white`
  }

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1a] text-gray-900 dark:text-white">
        <main className="max-w-[95rem] mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar */}
            <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              {currentUser && (
                <>
                  {/* Navigation Menu */}
                  <div className="bg-white dark:bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-left-4 duration-500">
                    <nav className="space-y-1">
                      <Link
                        href={route("social-feed.index")}
                        className={getNavItemClass('feed')}
                      >
                        <Home className="w-5 h-5" />
                        <span className="text-sm">Social Feed</span>
                      </Link>
                      <Link
                        href={route("search.index")}
                        className={getNavItemClass('search')}
                      >
                        <Search className="w-5 h-5" />
                        <span className="text-sm">Search</span>
                      </Link>
                    </nav>
                  </div>

                  {/* User Info Card */}
                  <div className="bg-white dark:bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-left-4 duration-500 delay-100">
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">User Info</p>
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={currentUser.image} />
                        <AvatarFallback className="bg-emerald-600 text-sm">
                          {currentUser.name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{currentUser.name}</p>
                        {currentUser.email && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{currentUser.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end justify-between py-3 border-t border-gray-200 dark:border-white/10">
                      <div className="text-center flex flex-col">
                        <p className="text-lg font-bold">
                          {userStats.rewardPointsBalance && userStats.rewardPointsBalance >= 1000 
                            ? `${(userStats.rewardPointsBalance / 1000).toFixed(1)}k` 
                            : (userStats.rewardPointsBalance || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-500">Reward Points</p>
                        <div className="mt-1">
                          <p className="text-[9px] text-green-400">+{(userStats.rewardPointsEarned || 0).toLocaleString()} earned</p>
                        </div>
                      </div>
                      <div className="text-center flex flex-col">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{userStats.followersCount || 0}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-500">Followers</p>
                        <div className="mt-1 h-[13px]"></div>
                      </div>
                      <div className="text-center flex flex-col">
                        <p className="text-lg font-bold">{userStats.postsCount || 0}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-500">Posts</p>
                        <div className="mt-1 h-[13px]"></div>
                      </div>
                    </div>
                  </div>

                  {currentUser.bio && (
                    <div className="bg-white dark:bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-left-4 duration-500 delay-200">
                      <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">About</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{currentUser.bio}</p>
                    </div>
                  )}
                </>
              )}
            </aside>

            {/* Main Content - Dynamic */}
            <section className="lg:col-span-6 space-y-4">
              {children}
            </section>

            {/* Right Sidebar */}
            <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              {/* Organizations You May Know */}
              {peopleYouMayKnow.length > 0 && (
                <div className="bg-white dark:bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Organizations You May Know</h3>
                    <Link href={route('organizations')} className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1">
                      View All <ChevronDown className="w-3 h-3 -rotate-90" />
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {peopleYouMayKnow.map((person, index) => {
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
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Trending Organizations */}
              {trendingOrganizations.length > 0 && (
                <div className="bg-white dark:bg-[#111827] rounded-xl p-4 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Trending Organizations</h3>
                    <Link href={route('organizations')} className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1">
                      View All <ChevronDown className="w-3 h-3 -rotate-90" />
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {trendingOrganizations.map((org, index) => {
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

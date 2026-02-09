"use client"

import React, { useState, useCallback } from "react"
import toast from "react-hot-toast"
import { Link, router } from "@inertiajs/react"
import SocialFeedLayout from "@/components/frontend/SocialFeedLayout"
import { PageHead } from "@/components/frontend/PageHead"
import { usePage } from "@inertiajs/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Search, X, Building2, Loader2 } from "lucide-react"
import OrgFollowButton from "@/components/ui/OrgFollowButtonProps"

interface SearchPageProps {
  seo?: { title: string; description?: string }
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
  auth?: { user?: any }
}

export default function SearchPage() {
  const page = usePage<SearchPageProps>()
  const { 
    seo,
    userStats = {},
    peopleYouMayKnow = [],
    trendingOrganizations = [],
    auth,
    searchResults: initialSearchResults = { users: [], organizations: [] },
    searchQuery: initialSearchQuery = '',
    searchType: initialSearchType = 'all'
  } = page.props

  const currentUser = auth?.user
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [searchResults, setSearchResults] = useState<{ users: any[], organizations: any[] }>(initialSearchResults)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchType, setSearchType] = useState<'all' | 'users' | 'organizations'>(initialSearchType as 'all' | 'users' | 'organizations')
  const [followingStates, setFollowingStates] = useState<Record<number | string, boolean>>({})
  const [loadingFollow, setLoadingFollow] = useState<Record<number | string, boolean>>({})

  // Removed handleFollowPerson - now using OrgFollowButton component

  const handleFollowUser = (user: any) => {
    if (!currentUser) {
      router.visit(route("login"))
      return
    }

    if (!user.id || user.id === currentUser.id) return

    setLoadingFollow(prev => ({ ...prev, [`user_${user.id}`]: true }))
    
    // Optimistically update state
    const newFollowingState = !followingStates[`user_${user.id}`]
    setFollowingStates(prev => ({
      ...prev,
      [`user_${user.id}`]: newFollowingState
    }))
    
    // Update search results optimistically
    setSearchResults(prev => ({
      ...prev,
      users: prev.users.map(u => 
        u.id === user.id ? { ...u, is_following: newFollowingState } : u
      )
    }))

    // Use Inertia router.post (raw Inertia code)
    router.post(route('users.toggle-follow', user.id), {}, {
      preserveScroll: true,
      preserveState: false,
      onSuccess: () => {
        // Reload search results to get updated following status
        if (searchQuery && searchQuery.length >= 2) {
          router.reload({ 
            only: ['searchResults'],
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => {
              const results = (page.props as any).searchResults
              if (results) {
                setSearchResults(results)
                // Update following states from server
                const newStates: Record<number | string, boolean> = {}
                if (Array.isArray(results.users)) {
                  results.users.forEach((u: any) => {
                    if (u?.id) {
                      newStates[`user_${u.id}`] = u.is_following || false
                    }
                  })
                }
                setFollowingStates(prev => ({ ...prev, ...newStates }))
              }
            }
          })
        }
        setLoadingFollow(prev => ({ ...prev, [`user_${user.id}`]: false }))
      },
      onError: () => {
        toast.error('Following is for supporter accounts only. Please log in with your personal (supporter) account to follow people.')
        // Revert optimistic update on error
        setFollowingStates(prev => ({
          ...prev,
          [`user_${user.id}`]: !newFollowingState
        }))
        setSearchResults(prev => ({
          ...prev,
          users: prev.users.map(u => 
            u.id === user.id ? { ...u, is_following: !newFollowingState } : u
          )
        }))
        setLoadingFollow(prev => ({ ...prev, [`user_${user.id}`]: false }))
      },
      onFinish: () => {
        setLoadingFollow(prev => ({ ...prev, [`user_${user.id}`]: false }))
      }
    })
  }

  // Use useRef to store the latest search function to avoid dependency issues
  const handleSearchRef = React.useRef<(query: string) => void>()
  
  const handleSearch = React.useCallback((query: string) => {
    if (!query.trim() || query.length < 1) {
      setSearchResults({ users: [], organizations: [] })
      setSearchLoading(false)
      return
    }

    // Use Inertia router.get to navigate to search page with query params (raw Inertia)
    router.get(route('search.index'), {
      q: query.trim(),
      type: searchType
    }, {
      preserveState: false,
      preserveScroll: false,
      only: ['searchResults', 'searchQuery', 'searchType'], // Only update these props
      onSuccess: (page) => {
        // Update local state from Inertia response (raw Inertia)
        const results = (page.props as any).searchResults || { users: [], organizations: [] }
        setSearchResults(results)
        
        // Initialize following states
        const newFollowingStates: Record<number | string, boolean> = {}
        if (Array.isArray(results.users)) {
          results.users.forEach((user: any) => {
            if (user?.id) {
              newFollowingStates[`user_${user.id}`] = user.is_following || false
            }
          })
        }
        if (Array.isArray(results.organizations)) {
          results.organizations.forEach((org: any) => {
            if (org?.id) {
              newFollowingStates[org.id] = org.is_following || false
            }
          })
        }
        setFollowingStates(newFollowingStates)
        setSearchLoading(false)
      },
      onError: (errors) => {
        console.error('Error searching:', errors)
        setSearchResults({ users: [], organizations: [] })
        setSearchLoading(false)
      },
      onFinish: () => {
        setSearchLoading(false)
      }
    })
  }, [searchType])
  
  // Update ref when handleSearch changes
  React.useEffect(() => {
    handleSearchRef.current = handleSearch
  }, [handleSearch])

  // Initialize following states from initial search results
  React.useEffect(() => {
    if (initialSearchResults && (initialSearchResults.users?.length > 0 || initialSearchResults.organizations?.length > 0)) {
      // Initialize following states from props
      const newFollowingStates: Record<number | string, boolean> = {}
      if (Array.isArray(initialSearchResults.users)) {
        initialSearchResults.users.forEach((user: any) => {
          if (user?.id) {
            newFollowingStates[`user_${user.id}`] = user.is_following || false
          }
        })
      }
      if (Array.isArray(initialSearchResults.organizations)) {
        initialSearchResults.organizations.forEach((org: any) => {
          if (org?.id) {
            newFollowingStates[org.id] = org.is_following || false
          }
        })
      }
      setFollowingStates(newFollowingStates)
    }
  }, [initialSearchResults])
  
  // Sync search results when props change (from Inertia updates after search)
  const prevResultsRef = React.useRef<string>('')
  React.useEffect(() => {
    // Create a string representation of results to detect changes
    const resultsKey = JSON.stringify(initialSearchResults)
    
    // Only update if results actually changed
    if (resultsKey !== prevResultsRef.current && initialSearchResults) {
      prevResultsRef.current = resultsKey
      setSearchResults(initialSearchResults)
      
      // Update following states from props
      const newFollowingStates: Record<number | string, boolean> = {}
      if (Array.isArray(initialSearchResults.users)) {
        initialSearchResults.users.forEach((user: any) => {
          if (user?.id) {
            newFollowingStates[`user_${user.id}`] = user.is_following || false
          }
        })
      }
      if (Array.isArray(initialSearchResults.organizations)) {
        initialSearchResults.organizations.forEach((org: any) => {
          if (org?.id) {
            newFollowingStates[org.id] = org.is_following || false
          }
        })
      }
      setFollowingStates(newFollowingStates)
      setSearchLoading(false) // Make sure loading is false when results update
    }
  }, [initialSearchResults])

  // Track if this is initial mount (to prevent search on load with URL params)
  const isMountedRef = React.useRef(false)
  const prevQueryRef = React.useRef<string>(initialSearchQuery)
  const prevTypeRef = React.useRef<string>(initialSearchType)
  
  // Debounce search - only trigger when searchQuery or searchType changes from USER INPUT
  React.useEffect(() => {
    // On initial mount, just set the refs and don't search (results already in props)
    if (!isMountedRef.current) {
      isMountedRef.current = true
      prevQueryRef.current = searchQuery
      prevTypeRef.current = searchType
      setSearchLoading(false)
      // If no initial query, clear results
      if (!searchQuery || searchQuery.trim().length === 0) {
        setSearchResults({ users: [], organizations: [] })
      }
      return
    }
    
    // Skip if query and type haven't actually changed (prevent loops)
    if (searchQuery === prevQueryRef.current && searchType === prevTypeRef.current) {
      return
    }
    
    prevQueryRef.current = searchQuery
    prevTypeRef.current = searchType
    
    // Don't search if query is empty - clear results
    if (!searchQuery || searchQuery.trim().length === 0) {
      setSearchResults({ users: [], organizations: [] })
      setSearchLoading(false)
      setFollowingStates({})
      return
    }

    // Set loading state
    setSearchLoading(true)
    
    // Debounce the search request
    const timer = setTimeout(() => {
      // Double check query hasn't changed during debounce
      if (handleSearchRef.current && searchQuery === prevQueryRef.current) {
        handleSearchRef.current(searchQuery)
      } else {
        setSearchLoading(false)
      }
    }, 500) // Increased debounce time to 500ms

    return () => {
      clearTimeout(timer)
    }
  }, [searchQuery, searchType]) // Removed initialSearchQuery to prevent re-triggering

  return (
    <SocialFeedLayout
      activeNavItem="search"
      userStats={userStats}
      peopleYouMayKnow={peopleYouMayKnow}
      trendingOrganizations={trendingOrganizations}
    >
      <PageHead title={seo?.title ?? "Search"} description={seo?.description} />
      <div className="space-y-4">
                {/* Search Header */}
                <Card className="bg-white dark:bg-[#111827] border-0 shadow-sm rounded-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Search for organizations or supporters..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-10 rounded-full bg-gray-100 dark:bg-gray-700 border-0"
                          autoFocus
                        />
                        {searchQuery && (
                          <button
                            onClick={() => {
                              setSearchQuery('')
                              setSearchResults({ users: [], organizations: [] })
                              setSearchLoading(false)
                              setFollowingStates({})
                              // Clear URL params by navigating to search page without query
                              router.get(route('search.index'), {}, {
                                preserveState: false,
                                preserveScroll: false,
                                only: ['searchResults', 'searchQuery', 'searchType']
                              })
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Search Type Tabs */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSearchType('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          searchType === 'all'
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setSearchType('users')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          searchType === 'users'
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Supporters
                      </button>
                      <button
                        onClick={() => setSearchType('organizations')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          searchType === 'organizations'
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Organizations
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {/* Search Results */}
                {searchLoading ? (
                  <Card className="bg-white dark:bg-[#111827] border-0 shadow-sm rounded-lg">
                    <CardContent className="p-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
                      <p className="text-gray-500 dark:text-gray-400">Searching...</p>
                    </CardContent>
                  </Card>
                ) : searchQuery.length >= 2 ? (
                  <div className="space-y-4">
                    {/* Users Results */}
                    {(searchType === 'all' || searchType === 'users') && searchResults.users.length > 0 && (
                      <Card className="bg-white dark:bg-[#111827] border-0 shadow-sm rounded-lg">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Supporters ({searchResults.users.length})</h3>
                          <div className="space-y-3">
                            {searchResults.users.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                              >
                                <Link
                                  href={`/users/${user.slug || user.id}`}
                                  className="flex items-center gap-3 flex-1 min-w-0"
                                >
                                  <Avatar className="w-12 h-12 flex-shrink-0">
                                    <AvatarImage src={user.image} />
                                    <AvatarFallback className="bg-blue-500 text-white">
                                      {user.name?.charAt(0)?.toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                  </div>
                                </Link>
                                {user.id !== currentUser?.id && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleFollowUser(user)}
                                    disabled={loadingFollow[`user_${user.id}` as any]}
                                    className={`text-xs px-4 py-2 h-auto flex-shrink-0 whitespace-nowrap ${
                                      followingStates[`user_${user.id}`]
                                        ? "bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-white/20 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white"
                                        : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                                    }`}
                                  >
                                    {loadingFollow[`user_${user.id}` as any]
                                      ? "Loading..."
                                      : followingStates[`user_${user.id}`]
                                        ? "Following"
                                        : "Follow"}
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Organizations Results */}
                    {(searchType === 'all' || searchType === 'organizations') && searchResults.organizations.length > 0 && (
                      <Card className="bg-white dark:bg-[#111827] border-0 shadow-sm rounded-lg">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Organizations ({searchResults.organizations.length})
                          </h3>
                          <div className="space-y-3">
                            {searchResults.organizations.map((org) => {
                              const orgRouteParam = org.slug || org.id
                              return (
                                <div
                                  key={org.id}
                                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                >
                                  <Link
                                    href={orgRouteParam ? route('organizations.show', orgRouteParam) : '#'}
                                    className="flex items-center gap-3 flex-1 min-w-0"
                                  >
                                    <Avatar className="w-12 h-12 flex-shrink-0">
                                      <AvatarImage src={org.image} />
                                      <AvatarFallback className="bg-emerald-500 text-white">
                                        {org.name?.charAt(0)?.toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{org.name}</p>
                                      {org.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{org.description}</p>
                                      )}
                                    </div>
                                  </Link>
                                  <div className="flex-shrink-0">
                                    <OrgFollowButton
                                      key={`follow-${org.excel_data_id || org.id}-${org.is_following}`}
                                      organization={{
                                        id: org.excel_data_id || org.id, // Use excel_data_id for toggleFavorite, fallback to org.id
                                        slug: org.slug,
                                        name: org.name,
                                        is_favorited: org.is_following || false,
                                        notifications_enabled: false
                                      }}
                                      auth={auth}
                                      initialIsFollowing={org.is_following || false}
                                      initialNotifications={false}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* No Results */}
                    {searchQuery.length >= 2 && 
                     !searchLoading && 
                     (searchType === 'all' ? (searchResults.users.length === 0 && searchResults.organizations.length === 0) :
                      searchType === 'users' ? searchResults.users.length === 0 :
                      searchResults.organizations.length === 0) && (
                      <Card className="bg-white dark:bg-[#111827] border-0 shadow-sm rounded-lg">
                        <CardContent className="p-8 text-center">
                          <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-500 dark:text-gray-400">No results found for "{searchQuery}"</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card className="bg-white dark:bg-[#111827] border-0 shadow-sm rounded-lg">
                    <CardContent className="p-8 text-center">
                      <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500 dark:text-gray-400">Search for registered organizations or supporters</p>
                    </CardContent>
                  </Card>
                )}
              </div>
    </SocialFeedLayout>
  )
}

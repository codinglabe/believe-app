"use client"

import SocialFeed from "@/components/frontend/SocialFeed"
import SocialFeedLayout from "@/components/frontend/SocialFeedLayout"
import { usePage } from "@inertiajs/react"

interface SocialFeedPageProps {
  posts?: any[]
  next_page_url?: string | null
  has_more?: boolean
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

export default function SocialFeedPage() {
  const { 
    posts = [], 
    next_page_url, 
    has_more = false,
    userStats = {},
    peopleYouMayKnow = [],
    trendingOrganizations = [],
  } = usePage<SocialFeedPageProps>().props

  return (
    <SocialFeedLayout
      activeNavItem="feed"
      userStats={userStats}
      peopleYouMayKnow={peopleYouMayKnow}
      trendingOrganizations={trendingOrganizations}
    >
      <SocialFeed posts={posts} next_page_url={next_page_url} has_more={has_more} />
    </SocialFeedLayout>
  )
}

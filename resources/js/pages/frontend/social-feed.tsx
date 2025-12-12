"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import SocialFeed from "@/components/frontend/SocialFeed"
import { usePage } from "@inertiajs/react"

interface SocialFeedPageProps {
  posts?: any[]
  next_page_url?: string | null
  has_more?: boolean
}

export default function SocialFeedPage() {
  const { posts = [], next_page_url, has_more = false } = usePage<SocialFeedPageProps>().props

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto">
          <SocialFeed posts={posts} next_page_url={next_page_url} has_more={has_more} />
        </div>
      </div>
    </FrontendLayout>
  )
}

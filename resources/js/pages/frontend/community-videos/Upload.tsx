"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Link } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"
import { Button } from "@/components/frontend/ui/button"
import { Upload, ArrowLeft } from "lucide-react"

interface Props {
  seo?: { title?: string; description?: string }
}

export default function CommunityVideosUpload({ seo }: Props) {
  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Upload Video"} description={seo?.description} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/community-videos"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Community Videos
          </Link>
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Upload Video
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Share your community story or event video. Full upload with title, description, and thumbnail will be available soon.
            </p>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white border-0" asChild>
              <Link href="/community-videos">Browse Community Videos</Link>
            </Button>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}

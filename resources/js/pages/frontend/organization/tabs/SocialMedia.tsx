"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Facebook, Link as LinkIcon, ExternalLink } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardHeader } from "@/components/frontend/ui/card"
import { router } from "@inertiajs/react"
import { Head } from "@inertiajs/react"
import { format } from "date-fns"
import OrganizationProfileLayout from "@/components/frontend/organization/OrganizationProfileLayout"

interface FacebookPost {
  id: number
  message: string
  image?: string
  link?: string
  published_at?: string
  facebook_post_id?: string
  facebookAccount?: {
    facebook_page_name: string
  }
}

interface Props {
  organization: any
  auth: any
  facebookPosts: {
    data: FacebookPost[]
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export default function OrganizationSocialMedia({ organization, auth, facebookPosts }: Props) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <FrontendLayout>
      <Head title={`${organization.name} - Social Media`} />
      <OrganizationProfileLayout organization={organization} auth={auth}>
        {/* Posts Feed */}
        <div className="max-w-3xl">
          {facebookPosts.data.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="inline-flex p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                <Facebook className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                No Posts Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                This organization hasn't posted anything on social media yet.
              </p>
            </motion.div>
          ) : (
            <>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                {facebookPosts.data.map((post) => (
                  <motion.div key={post.id} variants={itemVariants}>
                    <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white dark:bg-gray-800">
                      <CardHeader>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                              <Facebook className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {post.facebookAccount?.facebook_page_name || organization.name}
                              </p>
                              {post.published_at && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {format(new Date(post.published_at), 'MMM d, yyyy h:mm a')}
                                </p>
                              )}
                            </div>
                          </div>
                          {post.facebook_post_id && (
                            <a
                              href={`https://facebook.com/${post.facebook_post_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
                          {post.message}
                        </p>

                        {post.image && (
                          <div className="rounded-lg overflow-hidden">
                            <img
                              src={post.image.startsWith('http') ? post.image : `/storage/${post.image}`}
                              alt="Post image"
                              className="w-full h-auto object-cover"
                            />
                          </div>
                        )}

                        {post.link && (
                          <a
                            href={post.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            <LinkIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                              {post.link}
                            </span>
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {facebookPosts.last_page > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                  {Array.from({ length: facebookPosts.last_page }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={facebookPosts.current_page === page ? "default" : "outline"}
                      onClick={() => router.get(route('organizations.social-media', organization.id), { page })}
                      className="min-w-[40px]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </OrganizationProfileLayout>
    </FrontendLayout>
  )
}


"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import AppLayout from '@/layouts/app-layout'
import { usePage, router, useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Image as ImageIcon,
  Smile,
  Send,
  Heart,
  MessageCircle,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface User {
  id: number
  name: string
  email: string
  image?: string
  organization_role?: string
}

interface Reaction {
  id: number
  user_id: number
  type: 'like' | 'love' | 'celebrate' | 'support'
  emoji: string
}

interface Comment {
  id: number
  user_id: number
  user: User
  content: string
  created_at: string
}

interface Post {
  id: number
  user_id: number
  user: User
  content: string
  images?: string[]
  reactions: Reaction[]
  comments: Comment[]
  comments_count: number
  reactions_count: number
  created_at: string
  updated_at: string
  is_edited: boolean
  user_reaction?: Reaction
}

interface FeedProps {
  posts: Post[]
  next_page_url?: string | null
  has_more: boolean
}

const reactionEmojis = {
  like: '👍',
  love: '❤️',
  celebrate: '🎉',
  support: '🙌'
}

const reactionTypes = ['like', 'love', 'celebrate', 'support'] as const

export default function FeedIndex({ posts: initialPosts, next_page_url, has_more: initialHasMore }: FeedProps) {
  const { auth } = usePage().props as any
  const currentUser = auth?.user as User

  const [posts, setPosts] = useState<Post[]>(initialPosts || [])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextPageUrl, setNextPageUrl] = useState(next_page_url)
  const [isPosting, setIsPosting] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(null)
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({})
  const [showComments, setShowComments] = useState<Record<number, boolean>>({})
  const observerTarget = useRef<HTMLDivElement>(null)

  const { data: postData, setData: setPostData, post, reset, processing } = useForm({
    content: '',
    images: [] as File[]
  })

  const { data: editData, setData: setEditData, put, reset: resetEdit } = useForm({
    content: '',
    images: [] as File[]
  })

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && nextPageUrl) {
          loadMorePosts()
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [hasMore, loading, nextPageUrl])

  const loadMorePosts = useCallback(() => {
    if (!nextPageUrl || loading) return

    setLoading(true)
    router.get(nextPageUrl, {}, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: (page) => {
        const newPosts = page.props.posts as Post[]
        const newHasMore = page.props.has_more as boolean
        const newNextPageUrl = page.props.next_page_url as string | null

        setPosts(prev => [...prev, ...newPosts])
        setHasMore(newHasMore)
        setNextPageUrl(newNextPageUrl)
        setLoading(false)
      },
      onError: () => {
        setLoading(false)
      }
    })
  }, [nextPageUrl, loading])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const files = Array.from(e.target.files || [])
    if (isEdit) {
      setEditData('images', files)
    } else {
      setPostData('images', files)
    }
  }

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!postData.content.trim() && postData.images.length === 0) return

    setIsPosting(true)
    post(route('feed.store'), {
      forceFormData: true,
      onSuccess: () => {
        reset()
        setIsPosting(false)
        router.reload({ only: ['posts', 'next_page_url', 'has_more'] })
      },
      onError: () => {
        setIsPosting(false)
      }
    })
  }

  const handleEditSubmit = (postId: number) => {
    if (!editData.content.trim() && editData.images.length === 0) return

    put(route('feed.update', postId), {
      forceFormData: true,
      onSuccess: () => {
        resetEdit()
        setEditingPost(null)
        router.reload({ only: ['posts', 'next_page_url', 'has_more'] })
      }
    })
  }

  const handleDelete = (postId: number) => {
    if (confirm('Are you sure you want to delete this post?')) {
      router.delete(route('feed.destroy', postId), {
        onSuccess: () => {
          router.reload({ only: ['posts', 'next_page_url', 'has_more'] })
        }
      })
    }
  }

  const handleReaction = (postId: number, type: typeof reactionTypes[number]) => {
    router.post(route('feed.react', postId), { type }, {
      preserveState: true,
      onSuccess: () => {
        router.reload({ only: ['posts'] })
      }
    })
    setShowReactionPicker(null)
  }

  const handleComment = (postId: number) => {
    const comment = commentInputs[postId]?.trim()
    if (!comment) return

    router.post(route('feed.comment', postId), { content: comment }, {
      preserveState: true,
      onSuccess: () => {
        setCommentInputs(prev => ({ ...prev, [postId]: '' }))
        setShowComments(prev => ({ ...prev, [postId]: true }))
        router.reload({ only: ['posts'] })
      }
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const PostSkeleton = () => (
    <Card className="mb-4">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
            <div className="flex gap-4 pt-2">
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse" />
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Check if user is authenticated
  if (!currentUser) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Please login to view the feed.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Create Post Card - LinkedIn Style */}
        <Card className="mb-6 shadow-sm border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <form onSubmit={handlePostSubmit} className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={currentUser?.image} />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {currentUser?.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Textarea
                    placeholder="What do you want to talk about?"
                    value={postData.content}
                    onChange={(e) => setPostData('content', e.target.value)}
                    className="min-h-[80px] resize-none border-gray-200 dark:border-gray-700 focus-visible:ring-1 focus-visible:ring-blue-600 text-base rounded-lg"
                    disabled={processing}
                  />
                  {postData.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {Array.from(postData.images).map((file, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-32 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = Array.from(postData.images)
                              newImages.splice(idx, 1)
                              setPostData('images', newImages)
                            }}
                            className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageSelect(e)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg"
                    >
                      <ImageIcon className="w-5 h-5 mr-2" />
                      Photo
                    </Button>
                  </label>
                </div>
                <Button
                  type="submit"
                  disabled={processing || (!postData.content.trim() && postData.images.length === 0)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Posts Feed */}
        {posts.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
            </CardContent>
          </Card>
        )}

        {posts.map((post) => (
          <Card key={post.id} className="mb-4 shadow-sm border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              {/* Post Header - LinkedIn Style */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarImage src={post.user.image} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {post.user.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base hover:underline cursor-pointer text-gray-900 dark:text-gray-100">
                        {post.user.name}
                      </h3>
                      {post.user.organization_role && (
                        <Badge variant="secondary" className="text-xs">
                          {post.user.organization_role}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(post.created_at)}
                      {post.is_edited && <span className="ml-1">· Edited</span>}
                    </p>
                  </div>
                </div>
                {post.user_id === currentUser?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingPost(post)
                        setEditData('content', post.content)
                        setEditData('images', [])
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(post.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Post Content */}
              {editingPost?.id === post.id ? (
                <div className="space-y-4 mb-4">
                  <Textarea
                    value={editData.content}
                    onChange={(e) => setEditData('content', e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                  {editData.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from(editData.images).map((file, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = Array.from(editData.images)
                              newImages.splice(idx, 1)
                              setEditData('images', newImages)
                            }}
                            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleImageSelect(e, true)}
                        className="hidden"
                      />
                      <Button type="button" variant="outline" size="sm">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Add Photo
                      </Button>
                    </label>
                    <Button
                      onClick={() => handleEditSubmit(post.id)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingPost(null)
                        resetEdit()
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-base mb-3 whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-relaxed">
                    {post.content}
                  </p>
                  {post.images && post.images.length > 0 && (
                    <div className={`grid gap-2 mb-3 rounded-lg overflow-hidden ${
                      post.images.length === 1 ? 'grid-cols-1' :
                      post.images.length === 2 ? 'grid-cols-2' :
                      'grid-cols-2'
                    }`}>
                      {post.images.map((image, idx) => (
                        <img
                          key={idx}
                          src={image}
                          alt={`Post image ${idx + 1}`}
                          className="w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          style={{
                            maxHeight: post.images.length === 1 ? '500px' : '300px',
                            minHeight: post.images.length === 1 ? '300px' : '200px'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Reactions - LinkedIn Style */}
              {(post.reactions_count > 0 || post.comments_count > 0) && (
                <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground pt-2 border-t">
                  {post.reactions_count > 0 && (
                    <div className="flex items-center gap-2 cursor-pointer hover:underline">
                      <div className="flex items-center -space-x-1">
                        {Object.entries(
                          post.reactions.reduce((acc, r) => {
                            acc[r.type] = (acc[r.type] || 0) + 1
                            return acc
                          }, {} as Record<string, number>)
                        )
                          .slice(0, 3)
                          .map(([type, count]) => (
                            <span key={type} className="text-base bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 p-0.5">
                              {reactionEmojis[type as keyof typeof reactionEmojis]}
                            </span>
                          ))}
                      </div>
                      <span>{post.reactions_count}</span>
                    </div>
                  )}
                  {post.comments_count > 0 && (
                    <button
                      onClick={() => setShowComments(prev => ({ ...prev, [post.id]: true }))}
                      className="hover:underline"
                    >
                      {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
                    </button>
                  )}
                </div>
              )}

              {/* Actions - LinkedIn Style */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-1 flex-1">
                  <div className="relative flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 ${
                        post.user_reaction ? 'text-blue-600' : ''
                      }`}
                      onMouseEnter={() => setShowReactionPicker(post.id)}
                      onMouseLeave={() => setTimeout(() => setShowReactionPicker(null), 300)}
                    >
                      {post.user_reaction ? (
                        <>
                          <span className="text-lg mr-2">{reactionEmojis[post.user_reaction.type]}</span>
                          <span className="capitalize">{post.user_reaction.type}</span>
                        </>
                      ) : (
                        <>
                          <Heart className="w-5 h-5 mr-2" />
                          <span>Like</span>
                        </>
                      )}
                    </Button>
                    {showReactionPicker === post.id && (
                      <div
                        className="absolute bottom-full left-0 mb-2 flex gap-1 bg-white dark:bg-gray-800 p-1 rounded-full shadow-xl border z-50"
                        onMouseEnter={() => setShowReactionPicker(post.id)}
                        onMouseLeave={() => setShowReactionPicker(null)}
                      >
                        {reactionTypes.map((type) => (
                          <button
                            key={type}
                            onClick={() => handleReaction(post.id, type)}
                            className="text-3xl hover:scale-150 transition-transform p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                            title={type.charAt(0).toUpperCase() + type.slice(1)}
                          >
                            {reactionEmojis[type]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                    onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Comment
                  </Button>
                </div>
              </div>

              {/* Comments Section - LinkedIn Style */}
              {showComments[post.id] && (
                <div className="mt-4 space-y-3 pt-3 border-t">
                  {post.comments.length > 0 && (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="flex items-start gap-3">
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={comment.user.image} />
                            <AvatarFallback className="text-xs">
                              {comment.user.name?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="bg-muted rounded-2xl rounded-tl-sm p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm hover:underline cursor-pointer">
                                  {comment.user.name}
                                </span>
                                {comment.user.organization_role && (
                                  <Badge variant="secondary" className="text-xs">
                                    {comment.user.organization_role}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                              <span className="text-xs text-muted-foreground mt-1 block">
                                {formatTime(comment.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-start gap-3 pt-2">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={currentUser?.image} />
                      <AvatarFallback className="text-xs">
                        {currentUser?.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          placeholder="Add a comment..."
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && commentInputs[post.id]?.trim()) {
                              e.preventDefault()
                              handleComment(post.id)
                            }
                          }}
                          className="pr-10 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-blue-600"
                        />
                        {commentInputs[post.id]?.trim() && (
                          <Button
                            onClick={() => handleComment(post.id)}
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 rounded-full bg-blue-600 hover:bg-blue-700"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Loading Skeleton */}
        {loading && (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        )}

        {/* Observer Target for Infinite Scroll */}
        <div ref={observerTarget} className="h-10" />

        {/* No More Posts Message */}
        {!hasMore && posts.length > 0 && (
          <Card className="mt-4">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No more posts to show</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}


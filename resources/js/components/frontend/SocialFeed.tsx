"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { usePage } from '@inertiajs/react'
import { Button } from '@/components/frontend/ui/button'
import { Textarea } from '@/components/frontend/ui/textarea'
import { Card, CardContent } from '@/components/frontend/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/frontend/ui/avatar'
import {
  Image as ImageIcon,
  ThumbsUp,
  MessageCircle,
  Send,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Loader2,
  Globe,
  Smile,
  Heart,
  Laugh,
  Angry,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/frontend/ui/dropdown-menu'
import { Input } from '@/components/frontend/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import EmojiPicker from '@/components/meeting/EmojiPicker'
import {
  Dialog,
  DialogContent,
} from '@/components/frontend/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/frontend/ui/alert-dialog'
import toast from 'react-hot-toast'

interface User {
  id: number
  name: string
  email: string
  image?: string
}

interface Reaction {
  id: number
  user_id: number
  type: 'like' | 'love' | 'care' | 'angry' | 'haha'
  user?: User
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
  comments_loaded?: number
  has_more_comments?: boolean
}

interface SocialFeedProps {
  posts?: Post[]
  next_page_url?: string | null
  has_more?: boolean
}

const reactionConfig = {
  like: { emoji: '👍', icon: ThumbsUp, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/20' },
  love: { emoji: '❤️', icon: Heart, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-950/20' },
  care: { emoji: '🤗', icon: Heart, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950/20' },
  angry: { emoji: '😠', icon: Angry, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950/20' },
  haha: { emoji: '😂', icon: Laugh, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950/20' },
}

export default function SocialFeed({ posts: initialPosts = [], next_page_url, has_more: initialHasMore = false }: SocialFeedProps) {
  const pageProps = usePage<{ auth: { user: User }, csrf_token?: string }>().props
  const { auth, csrf_token } = pageProps
  const currentUser = auth?.user

  // Get CSRF token from props or meta tag
  const [csrfToken, setCsrfToken] = useState<string>(() => {
    if (csrf_token) return csrf_token
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    return metaToken || ''
  })

  useEffect(() => {
    if (csrf_token && !csrfToken) {
      setCsrfToken(csrf_token)
    } else if (!csrfToken) {
      const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      if (metaToken) {
        setCsrfToken(metaToken)
      }
    }
  }, [csrf_token, csrfToken])

  const [posts, setPosts] = useState<Post[]>(initialPosts || [])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextPageUrl, setNextPageUrl] = useState(next_page_url)
  const [isPosting, setIsPosting] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(null)
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({})
  const [showComments, setShowComments] = useState<Record<number, boolean>>({})
  const [showEmojiPicker, setShowEmojiPicker] = useState<number | null>(null)
  const [showPostForm, setShowPostForm] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [postImages, setPostImages] = useState<File[]>([])
  const [editingPostImages, setEditingPostImages] = useState<Record<number, { existing: string[], new: File[] }>>({})
  const [loadingComments, setLoadingComments] = useState<Record<number, boolean>>({})
  const [seenPosts, setSeenPosts] = useState<Set<number>>(new Set())
  const [imageViewer, setImageViewer] = useState<{ images: string[], currentIndex: number } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const observerTarget = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRefExpanded = useRef<HTMLInputElement>(null)
  const editFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const postRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const loadMorePosts = useCallback(async () => {
    if (!nextPageUrl || loading) return

    setLoading(true)
    try {
      // Get fresh CSRF token
      const token = csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''

      // Extract path from full URL if needed
      const url = nextPageUrl.startsWith('http') ? new URL(nextPageUrl).pathname + new URL(nextPageUrl).search : nextPageUrl

      // Use fetch instead of router.get to avoid CSRF issues
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': token,
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const newPosts = data.posts as Post[]
        const newHasMore = data.has_more as boolean
        const newNextPageUrl = data.next_page_url as string | null

        setPosts(prev => [...prev, ...newPosts])
        setHasMore(newHasMore)
        setNextPageUrl(newNextPageUrl)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to load more posts:', response.statusText, errorData)
      }
    } catch (error) {
      console.error('Error loading more posts:', error)
    } finally {
      setLoading(false)
    }
  }, [nextPageUrl, loading, csrfToken])

  // Track seen posts when they come into view
  useEffect(() => {
    const observers: IntersectionObserver[] = []

    posts.forEach((post) => {
      const element = postRefs.current[post.id]
      if (element && !seenPosts.has(post.id)) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              const token = csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
              fetch(`/posts/${post.id}/seen`, {
                method: 'POST',
                headers: {
                  'X-CSRF-TOKEN': token,
                  'Accept': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
              }).catch(() => {})
              setSeenPosts(prev => new Set(prev).add(post.id))
              observer.disconnect()
            }
          },
          { threshold: 0.5 }
        )
        observer.observe(element)
        observers.push(observer)
      }
    })

    return () => {
      observers.forEach(obs => obs.disconnect())
    }
  }, [posts, seenPosts, csrfToken])

  // Infinite scroll for posts
  useEffect(() => {
    const target = observerTarget.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && nextPageUrl) {
          loadMorePosts()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(target)

    return () => {
      observer.unobserve(target)
    }
  }, [hasMore, loading, nextPageUrl, loadMorePosts])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false, postId?: number) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    // Validate image size (max 2MB per image to avoid nginx 413 error)
    // Total max: 10 images × 2MB = 20MB (within typical nginx limits)
    const MAX_SIZE = 2 * 1024 * 1024 // 2MB in bytes
    const invalidFiles = files.filter(file => file.size > MAX_SIZE)

    if (invalidFiles.length > 0) {
      const fileSizes = invalidFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join(', ')
      toast.error(
        `The following images are too large (max 2MB per image):\n${fileSizes}\n\nPlease compress or resize your images before uploading.`,
        {
          duration: 6000,
        }
      )
      e.target.value = ''
      return
    }

    // Check total size if adding multiple images
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const MAX_TOTAL_SIZE = 20 * 1024 * 1024 // 20MB total for all images
    if (isEdit && postId) {
      const currentImages = editingPostImages[postId] || { existing: [], new: [] }
      const currentTotalSize = currentImages.new.reduce((sum: number, file: File) => sum + file.size, 0)
      if (currentTotalSize + totalSize > MAX_TOTAL_SIZE) {
        toast.error('Total size of all images exceeds 20MB. Please reduce the number or size of images.', {
          duration: 5000,
        })
        e.target.value = ''
        return
      }
    } else {
      const currentTotalSize = postImages.reduce((sum, file) => sum + file.size, 0)
      if (currentTotalSize + totalSize > MAX_TOTAL_SIZE) {
        toast.error('Total size of all images exceeds 20MB. Please reduce the number or size of images.', {
          duration: 5000,
        })
        e.target.value = ''
        return
      }
    }

    // Validate file types (only images)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const invalidTypes = files.filter(file => !validTypes.includes(file.type))

    if (invalidTypes.length > 0) {
      const fileNames = invalidTypes.map(f => f.name).join(', ')
      toast.error(`The following files are not valid images: ${fileNames}`, {
        duration: 5000,
      })
      e.target.value = ''
      return
    }

    if (isEdit && postId) {
      const currentImages = editingPostImages[postId] || { existing: [], new: [] }
      const totalImages = currentImages.existing.length + currentImages.new.length + files.length

      if (totalImages > 10) {
        toast.error(`Maximum 10 images allowed. You can add ${10 - (currentImages.existing.length + currentImages.new.length)} more.`, {
          duration: 4000,
        })
        return
      }

      setEditingPostImages(prev => ({
        ...prev,
        [postId]: {
          existing: currentImages.existing,
          new: [...currentImages.new, ...files]
        }
      }))
    } else {
      const totalImages = postImages.length + files.length
      if (totalImages > 10) {
        toast.error(`Maximum 10 images allowed. You can add ${10 - postImages.length} more.`, {
          duration: 4000,
        })
        return
      }
      setPostImages(prev => [...prev, ...files])
    }

    // Reset input to allow selecting same file again
    e.target.value = ''
  }

  const removeImage = (index: number, isEdit = false, postId?: number) => {
    if (isEdit && postId) {
      const currentImages = editingPostImages[postId] || { existing: [], new: [] }
      // Check if removing from existing or new
      if (index < currentImages.existing.length) {
        // Remove from existing
        setEditingPostImages(prev => ({
          ...prev,
          [postId]: {
            existing: currentImages.existing.filter((_, i) => i !== index),
            new: currentImages.new
          }
        }))
      } else {
        // Remove from new
        const newIndex = index - currentImages.existing.length
        setEditingPostImages(prev => ({
          ...prev,
          [postId]: {
            existing: currentImages.existing,
            new: currentImages.new.filter((_, i) => i !== newIndex)
          }
        }))
      }
    } else {
      setPostImages(prev => prev.filter((_, i) => i !== index))
    }
  }


  const loadMoreComments = async (postId: number) => {
    const post = posts.find(p => p.id === postId)
    if (!post || loadingComments[postId]) return

    setLoadingComments(prev => ({ ...prev, [postId]: true }))
    const offset = post.comments?.length || 0

    try {
      const token = csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
      const response = await fetch(`/posts/${postId}/comments?offset=${offset}&limit=10`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': token,
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: [...(p.comments || []), ...data.comments],
              has_more_comments: data.has_more,
            }
          }
          return p
        }))
      }
    } catch (error) {
      console.error('Error loading more comments:', error)
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!postContent.trim() && postImages.length === 0) return

    setIsPosting(true)
    const formData = new FormData()
    formData.append('content', postContent)
    postImages.forEach((image) => {
      formData.append('images[]', image)
    })

    try {
      const token = csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
      const response = await fetch('/posts', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': token,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setPosts(prev => [data.post, ...prev])
        setPostContent('')
        setPostImages([])
        setShowPostForm(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        if (fileInputRefExpanded.current) {
          fileInputRefExpanded.current.value = ''
        }
      } else {
        // Handle 413 error specifically
        if (response.status === 413) {
          toast.error('File size too large. Please reduce image sizes (max 2MB per image) or contact your administrator to increase server upload limits.', {
            duration: 6000,
          })
        } else {
          const errorData = await response.json().catch(() => ({}))
          toast.error(errorData.message || 'Failed to create post. Please try again.', {
            duration: 5000,
          })
        }
      }
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('An error occurred while creating the post. Please check your connection and try again.', {
        duration: 5000,
      })
    } finally {
      setIsPosting(false)
    }
  }

  const handleEditSubmit = async (postId: number) => {
    if (!editingPost) return

    const imageData = editingPostImages[postId] || { existing: [], new: [] }
    const hasImages = imageData.existing.length > 0 || imageData.new.length > 0
    const hasContent = editingPost.content?.trim().length > 0

    // Validate: must have either content or images
    if (!hasContent && !hasImages) {
      toast.error('Post must have either text content or at least one image.', {
        duration: 5000,
      })
      return
    }

    const formData = new FormData()
    // Only append content if it's not empty, otherwise send empty string (not null)
    formData.append('content', editingPost.content?.trim() || '')
    formData.append('_method', 'PUT')

    // Add existing images that should be kept
    imageData.existing.forEach((imageUrl) => {
      formData.append('existing_images[]', imageUrl)
    })

    // Add new images
    imageData.new.forEach((file) => {
      formData.append('images[]', file)
    })

    // Add images to remove (images that were in original but not in existing)
    const originalPost = posts.find(p => p.id === postId)
    if (originalPost?.images) {
      const imagesToRemove = originalPost.images.filter(
        img => !imageData.existing.includes(img)
      )
      imagesToRemove.forEach((imageUrl) => {
        formData.append('images_to_remove[]', imageUrl)
      })
    }

    try {
      const token = csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
      const response = await fetch(`/posts/${postId}`, {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': token,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setPosts(prev => prev.map(p => p.id === postId ? data.post : p))
        setEditingPost(null)
        setEditingPostImages(prev => {
          const newState = { ...prev }
          delete newState[postId]
          return newState
        })
        toast.success('Post updated successfully', {
          duration: 3000,
        })
      } else {
        // Handle 413 error specifically
        if (response.status === 413) {
          toast.error('File size too large. Please reduce image sizes (max 2MB per image) or contact your administrator to increase server upload limits.', {
            duration: 6000,
          })
        } else {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.message || 'Failed to update post. Please try again.'
          toast.error(errorMessage, {
            duration: 5000,
          })
        }
      }
    } catch (error) {
      console.error('Error updating post:', error)
      toast.error('An error occurred while updating the post. Please try again.', {
        duration: 5000,
      })
    }
  }

  const handleDelete = async (postId: number) => {
    setDeleteConfirm(postId)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      const token = csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
      const response = await fetch(`/posts/${deleteConfirm}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': token,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      })

      if (response.ok) {
        setPosts(prev => prev.filter(p => p.id !== deleteConfirm))
        toast.success('Post deleted successfully', {
          duration: 3000,
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.message || 'Failed to delete post. Please try again.', {
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('An error occurred while deleting the post. Please try again.', {
        duration: 5000,
      })
    } finally {
      setDeleteConfirm(null)
    }
  }

  const handleReaction = async (postId: number, type: 'like' | 'love' | 'care' | 'angry' | 'haha') => {
    const post = posts.find(p => p.id === postId)
    const currentReaction = post?.user_reaction

    if (currentReaction?.type === type) {
      try {
        const token = csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
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
          setPosts(prev => prev.map(p => {
            if (p.id === postId) {
              const updatedReactions = p.reactions.filter(r => r.id !== currentReaction.id)
              return {
                ...p,
                reactions: updatedReactions,
                reactions_count: updatedReactions.length,
                user_reaction: undefined,
              }
            }
            return p
          }))
        }
      } catch (error) {
        console.error('Error removing reaction:', error)
      }
    } else {
      try {
        const token = csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
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
          setPosts(prev => prev.map(p => {
            if (p.id === postId) {
              const existingReaction = p.reactions.find(r => r.user_id === currentUser.id)
              const updatedReactions = existingReaction
                ? p.reactions.map(r => r.user_id === currentUser.id ? data.reaction : r)
                : [...p.reactions, data.reaction]
              return {
                ...p,
                reactions: updatedReactions,
                reactions_count: updatedReactions.length,
                user_reaction: data.reaction,
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

  const handleComment = async (postId: number) => {
    const comment = commentInputs[postId]?.trim()
    if (!comment) return

    try {
      const token = csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
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
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: [...p.comments, data.comment],
              comments_count: p.comments_count + 1,
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString()
  }

  const onEmojiSelect = (emoji: { native?: string }, postId: number) => {
    const currentComment = commentInputs[postId] || ''
    setCommentInputs(prev => ({ ...prev, [postId]: currentComment + (emoji.native || '') }))
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Start a post - Modern Design */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-shadow duration-200">
        <CardContent className="p-5">
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="w-12 h-12 flex-shrink-0 ring-2 ring-primary/20 shadow-md">
              <AvatarImage src={currentUser?.image} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-semibold">
                {currentUser?.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Input
                placeholder="What's on your mind?"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                onClick={() => setShowPostForm(true)}
                className="rounded-xl bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 hover:border-primary/30 hover:bg-white dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 py-6 text-base font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500"
                readOnly
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-xl flex-1 px-4 py-2.5 transition-all duration-200 font-medium"
              onClick={() => {
                setShowPostForm(true)
                fileInputRef.current?.click()
              }}
            >
              <ImageIcon className="w-5 h-5 mr-2" />
              Photo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expanded Post Form */}
      <AnimatePresence>
        {(showPostForm || postContent || postImages.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
              <CardContent className="p-6">
                <form onSubmit={handlePostSubmit} className="space-y-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12 flex-shrink-0 ring-2 ring-primary/20 shadow-md">
                      <AvatarImage src={currentUser?.image} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-semibold">
                        {currentUser?.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <Textarea
                        ref={textareaRef}
                        placeholder="What's on your mind?"
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        className="min-h-[140px] resize-none border-2 border-gray-200 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary text-base rounded-xl bg-gray-50 dark:bg-gray-700/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        autoFocus
                      />
                      {postImages.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4"
                        >
                          <div className={`grid gap-3 ${
                            postImages.length === 1 ? 'grid-cols-1' :
                            postImages.length === 2 ? 'grid-cols-2' :
                            postImages.length >= 3 ? 'grid-cols-2' : 'grid-cols-2'
                          }`}>
                            {postImages.map((file, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="relative group rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200"
                              >
                                <div className="aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={`Preview ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeImage(idx)}
                                  className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 hover:scale-110"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="text-white text-xs font-medium truncate">{file.name}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center justify-between px-1">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              <span className="text-primary font-semibold">{postImages.length}</span> photo{postImages.length > 1 ? 's' : ''} selected
                            </p>
                            {postImages.length < 10 && (
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                {10 - postImages.length} more can be added
                              </p>
                            )}
                            {postImages.length >= 10 && (
                              <p className="text-xs text-red-500 font-medium">
                                Maximum reached
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRefExpanded}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleImageSelect(e, false)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-xl px-4 py-2 transition-all duration-200 font-medium"
                        onClick={() => {
                          if (postImages.length < 10) {
                            fileInputRefExpanded.current?.click()
                          } else {
                            toast.error('Maximum 10 images allowed', {
                              duration: 4000,
                            })
                          }
                        }}
                        disabled={postImages.length >= 10}
                      >
                        <ImageIcon className="w-5 h-5 mr-2" />
                        {postImages.length > 0 ? 'Add More' : 'Add Photo'}
                        {postImages.length > 0 && postImages.length < 10 && (
                          <span className="ml-1 text-xs">({10 - postImages.length})</span>
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPostContent('')
                          setPostImages([])
                          setShowPostForm(false)
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                          if (fileInputRefExpanded.current) {
                            fileInputRefExpanded.current.value = ''
                          }
                        }}
                        className="rounded-xl px-4 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isPosting || (!postContent.trim() && postImages.length === 0)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-6 py-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                      >
                        {isPosting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Posting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Post
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts Feed */}
      {posts.length === 0 && !loading && (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No posts yet. Be the first to share something!</p>
          </CardContent>
        </Card>
      )}

      {posts.map((post) => (
        <motion.div
          key={post.id}
          ref={(el) => { postRefs.current[post.id] = el }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-200">
            <CardContent className="p-6">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <Avatar className="w-12 h-12 flex-shrink-0 ring-2 ring-primary/20 shadow-md">
                    <AvatarImage src={post.user.image} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-semibold">
                      {post.user.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base hover:underline cursor-pointer text-gray-900 dark:text-gray-100 mb-1 transition-colors">
                      {post.user.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatTime(post.created_at)}</span>
                      {post.is_edited && (
                        <>
                          <span>·</span>
                          <span className="text-primary font-medium">Edited</span>
                        </>
                      )}
                      <span>·</span>
                      <Globe className="w-3 h-3" />
                    </div>
                  </div>
                </div>
                {post.user_id === currentUser?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingPost({ ...post, content: post.content })
                        setEditingPostImages(prev => ({
                          ...prev,
                          [post.id]: {
                            existing: post.images || [],
                            new: []
                          }
                        }))
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
                    value={editingPost.content}
                    onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                    className="min-h-[100px] resize-none"
                  />

                  {/* Existing Images */}
                  {(() => {
                    const imageData = editingPostImages[post.id] || {
                      existing: post.images || [],
                      new: []
                    }
                    const allImages = [...imageData.existing, ...imageData.new.map(f => URL.createObjectURL(f))]
                    const totalImages = imageData.existing.length + imageData.new.length

                    return (
                      <>
                        {allImages.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {imageData.existing.map((imageUrl, idx) => (
                              <div key={`existing-${idx}`} className="relative group rounded-lg overflow-hidden">
                                <img
                                  src={imageUrl}
                                  alt={`Existing ${idx + 1}`}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(idx, true, post.id)}
                                  className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1.5 opacity-100 z-10"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {imageData.new.map((file, idx) => (
                              <div key={`new-${idx}`} className="relative group rounded-lg overflow-hidden">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`New ${idx + 1}`}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(imageData.existing.length + idx, true, post.id)}
                                  className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1.5 opacity-100 z-10"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {totalImages < 10 && (
                          <div className="flex items-center gap-2">
                            <input
                              ref={(el) => { editFileInputRefs.current[post.id] = el }}
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => {
                                handleImageSelect(e, true, post.id)
                                e.target.value = '' // Reset to allow selecting same files again
                              }}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (totalImages < 10) {
                                  editFileInputRefs.current[post.id]?.click()
                                } else {
                                  toast.error('Maximum 10 images allowed', {
                              duration: 4000,
                            })
                                }
                              }}
                              className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                            >
                              <ImageIcon className="w-4 h-4 mr-2" />
                              {allImages.length > 0 ? 'Add More Photos' : 'Add Photos'} ({10 - totalImages} remaining)
                            </Button>
                          </div>
                        )}
                        {totalImages >= 10 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Maximum 10 photos reached. Remove some to add more.
                          </p>
                        )}
                      </>
                    )
                  })()}

                  <div className="flex items-center gap-2">
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
                        setEditingPostImages(prev => {
                          const newState = { ...prev }
                          delete newState[post.id]
                          return newState
                        })
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
                  {post.content && (
                    <p className="text-base mb-4 whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-relaxed">
                      {post.content}
                    </p>
                  )}
                  {post.images && post.images.length > 0 && (
                    <div className={`grid gap-3 mb-4 rounded-xl overflow-hidden ${
                      post.images.length === 1 ? 'grid-cols-1' :
                      post.images.length === 2 ? 'grid-cols-2' :
                      'grid-cols-2'
                    }`}>
                      {post.images.map((image, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer"
                          onClick={() => setImageViewer({ images: post.images || [], currentIndex: idx })}
                        >
                          <img
                            src={image}
                            alt={`Post image ${idx + 1}`}
                            className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            style={{
                              maxHeight: (post.images?.length || 0) === 1 ? '500px' : '300px',
                              minHeight: (post.images?.length || 0) === 1 ? '300px' : '200px'
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-black/50 text-white px-2 py-1 rounded-lg text-xs font-medium">
                              Click to view
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Reactions Summary */}
              {(post.reactions_count > 0 || post.comments_count > 0) && (
                <div className="flex items-center justify-between mb-3 text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
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
                          .map(([type]) => (
                            <span key={type} className="text-base bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 p-0.5">
                              {reactionConfig[type as keyof typeof reactionConfig].emoji}
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

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div
                  className="relative flex-1"
                  onMouseEnter={() => setShowReactionPicker(post.id)}
                  onMouseLeave={() => setShowReactionPicker(null)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-center text-gray-600 dark:text-gray-400 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-xl transition-all duration-200 font-medium ${
                      post.user_reaction ? reactionConfig[post.user_reaction.type].color : ''
                    }`}
                    onClick={() => {
                      if (post.user_reaction) {
                        handleReaction(post.id, post.user_reaction.type)
                      } else {
                        handleReaction(post.id, 'like')
                      }
                    }}
                  >
                    {post.user_reaction ? (
                      <>
                        <span className="text-lg mr-2">{reactionConfig[post.user_reaction.type].emoji}</span>
                        <span className="capitalize font-semibold">{post.user_reaction.type}</span>
                      </>
                    ) : (
                      <>
                        <ThumbsUp className="w-5 h-5 mr-2" />
                        <span>Like</span>
                      </>
                    )}
                  </Button>
                  <AnimatePresence>
                    {showReactionPicker === post.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute bottom-full left-0 mb-3 flex gap-0.5 bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-2xl border border-gray-200 dark:border-gray-700 z-50"
                      >
                        {(['like', 'love', 'care', 'angry', 'haha'] as const).map((type, index) => {
                          const config = reactionConfig[type]
                          return (
                            <motion.button
                              key={type}
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: index * 0.05, type: "spring", stiffness: 500, damping: 30 }}
                              whileHover={{ scale: 1.3, y: -5 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleReaction(post.id, type)}
                              className={`text-3xl transition-all p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${config.color} cursor-pointer`}
                              title={type.charAt(0).toUpperCase() + type.slice(1)}
                            >
                              {config.emoji}
                            </motion.button>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-center text-gray-600 dark:text-gray-400 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-xl transition-all duration-200 font-medium"
                  onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Comment
                </Button>
              </div>

              {/* Comments Section */}
              <AnimatePresence>
                {showComments[post.id] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700"
                  >
                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-3">
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
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl rounded-tl-sm p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm hover:underline cursor-pointer text-gray-900 dark:text-gray-100">
                                      {comment.user.name}
                                    </span>
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">{comment.content}</p>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                                    {formatTime(comment.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {post.has_more_comments && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                            onClick={() => loadMoreComments(post.id)}
                            disabled={loadingComments[post.id]}
                          >
                            {loadingComments[post.id] ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              `Load more comments (${post.comments_count - (post.comments?.length || 0)} more)`
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="flex items-start gap-3 pt-2 relative">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={currentUser?.image} />
                        <AvatarFallback className="text-xs">
                          {currentUser?.name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2 relative">
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
                          className="pr-20 rounded-full bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-full"
                            onClick={() => setShowEmojiPicker(prev => prev === post.id ? null : post.id)}
                          >
                            <Smile className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </Button>
                          {commentInputs[post.id]?.trim() && (
                            <Button
                              onClick={() => handleComment(post.id)}
                              size="sm"
                              className="h-7 w-7 p-0 rounded-full bg-blue-600 hover:bg-blue-700"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        {showEmojiPicker === post.id && (
                          <div className="absolute bottom-full right-0 mb-2 z-50">
                            <EmojiPicker
                              onEmojiSelect={(emoji) => onEmojiSelect(emoji, post.id)}
                              theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Loading */}
      {loading && (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div ref={observerTarget} className="h-10" />

      {!hasMore && posts.length > 0 && (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">No more posts to show</p>
          </CardContent>
        </Card>
      )}

      {/* Image Viewer Modal */}
      <Dialog open={!!imageViewer} onOpenChange={() => setImageViewer(null)}>
        <DialogContent className="max-w-6xl w-full p-0 bg-black/95 border-none">
          {imageViewer && (
            <div className="relative w-full h-[90vh] flex items-center justify-center">
              {/* Close Button */}
              <button
                onClick={() => setImageViewer(null)}
                className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Previous Button */}
              {imageViewer.images.length > 1 && imageViewer.currentIndex > 0 && (
                <button
                  onClick={() => setImageViewer({
                    ...imageViewer,
                    currentIndex: imageViewer.currentIndex - 1
                  })}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Image */}
              <img
                src={imageViewer.images[imageViewer.currentIndex]}
                alt={`Image ${imageViewer.currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />

              {/* Next Button */}
              {imageViewer.images.length > 1 && imageViewer.currentIndex < imageViewer.images.length - 1 && (
                <button
                  onClick={() => setImageViewer({
                    ...imageViewer,
                    currentIndex: imageViewer.currentIndex + 1
                  })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Image Counter */}
              {imageViewer.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                  {imageViewer.currentIndex + 1} / {imageViewer.images.length}
                </div>
              )}

              {/* Keyboard Navigation */}
              {imageViewer.images.length > 1 && (
                <div
                  className="absolute inset-0"
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' && imageViewer.currentIndex > 0) {
                      setImageViewer({
                        ...imageViewer,
                        currentIndex: imageViewer.currentIndex - 1
                      })
                    } else if (e.key === 'ArrowRight' && imageViewer.currentIndex < imageViewer.images.length - 1) {
                      setImageViewer({
                        ...imageViewer,
                        currentIndex: imageViewer.currentIndex + 1
                      })
                    } else if (e.key === 'Escape') {
                      setImageViewer(null)
                    }
                  }}
                  tabIndex={0}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

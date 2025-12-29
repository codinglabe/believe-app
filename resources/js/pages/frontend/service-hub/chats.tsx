"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Badge } from "@/components/frontend/ui/badge"
import {
  ArrowLeft,
  MessageCircle,
  Search,
  Inbox,
} from "lucide-react"
import { Link, router, usePage } from "@inertiajs/react"
import { useState, useEffect } from "react"
import { Head } from "@inertiajs/react"

interface Chat {
  id: number
  other_user: {
    id: number
    name: string
    avatar: string | null
  }
  last_message: {
    message: string
    created_at: string
    user: {
      id: number
      name: string
    }
  } | null
  unread_count: number
  updated_at: string
}

interface PageProps extends Record<string, unknown> {
  chats: Chat[]
  total_unread: number
}

export default function ServiceChats() {
  const { chats: initialChats, total_unread: initialTotalUnread } = usePage<PageProps>().props
  const [chats, setChats] = useState<Chat[]>(initialChats || [])
  const [totalUnread, setTotalUnread] = useState(initialTotalUnread || 0)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const loadChats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/service-hub/chats")
      const data = await response.json()
      setChats(data.chats || [])
      setTotalUnread(data.total_unread || 0)
    } catch (error) {
      console.error("Error loading chats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Refresh chats every 5 seconds
    const interval = setInterval(() => {
      loadChats()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      chat.other_user.name.toLowerCase().includes(query) ||
      chat.last_message?.message.toLowerCase().includes(query)
    )
  })

  return (
    <FrontendLayout>
      <Head title="Service Chats - Service Hub" />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/service-hub">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">Service Chats</h1>
                  {totalUnread > 0 && (
                    <Badge variant="default" className="bg-blue-600">
                      {totalUnread} unread
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Manage your service conversations</p>
              </div>
              <Link href="/service-hub">
                <Button variant="outline">
                  Browse Services
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search chats by service, user, or message..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Chats List */}
          {isLoading && chats.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="text-muted-foreground">Loading chats...</div>
              </CardContent>
            </Card>
          ) : filteredChats.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="p-12 text-center">
                <Inbox className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No chats yet</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "No chats match your search."
                    : "Start a conversation by contacting a service seller."}
                </p>
                {!searchQuery && (
                  <Link href="/service-hub">
                    <Button>Browse Services</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredChats.map((chat) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={`border shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                      chat.unread_count > 0 ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : ''
                    }`}
                    onClick={() => router.visit(`/service-hub/chat/${chat.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={chat.other_user.avatar || undefined} />
                          <AvatarFallback>{chat.other_user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold truncate">{chat.other_user.name}</h3>
                            <div className="flex items-center gap-2">
                              {chat.unread_count > 0 && (
                                <Badge variant="default" className="bg-blue-600 text-white font-semibold min-w-[20px] justify-center">
                                  {chat.unread_count > 99 ? '99+' : chat.unread_count}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {chat.last_message ? formatTime(chat.last_message.created_at) : formatTime(chat.updated_at)}
                              </span>
                            </div>
                          </div>
                          {chat.last_message && (
                            <p className="text-sm truncate">
                              <span className={chat.unread_count > 0 ? "font-semibold" : "text-muted-foreground"}>
                                {chat.last_message.user.name}: {chat.last_message.message}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}


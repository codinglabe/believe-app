"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import {
  ArrowLeft,
  Send,
  MessageCircle,
  Paperclip,
  X,
  Handshake,
  Check,
  XCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/frontend/ui/dialog"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { Link, router, usePage } from "@inertiajs/react"
import { useState, useEffect, useRef } from "react"
import { Head } from "@inertiajs/react"

interface Chat {
  id: number
  other_user: {
    id: number
    name: string
    avatar: string | null
  }
  buyer_id?: number
  seller_id?: number
}

interface SellerGig {
  id: number
  slug: string
  title: string
  description: string
  price: number
  image: string | null
}

interface Offer {
  id: number
  gig_id: number
  title: string
  description: string
  price: number
  delivery_time: string
  requirements: string | null
  status: string
  created_at: string
}

interface Message {
  id: number
  user_id: number
  user: {
    id: number
    name: string
    avatar: string | null
  } | null
  message: string
  attachments: Array<{
    name: string
    url: string
    type: string
    size: number
  }>
  created_at: string
  is_mine: boolean
}

interface PageProps extends Record<string, unknown> {
  chat: Chat
  sellerGigs?: SellerGig[]
  isSeller?: boolean
  offers?: Offer[]
}

export default function ServiceChat() {
  const { chat, sellerGigs = [], isSeller = false, offers: initialOffers = [] } = usePage<PageProps>().props
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [selectedGigForOffer, setSelectedGigForOffer] = useState<SellerGig | null>(null)
  const [offerForm, setOfferForm] = useState({
    title: "",
    description: "",
    price: "",
    delivery_time: "3 days",
    requirements: "",
  })
  const [isCreatingOffer, setIsCreatingOffer] = useState(false)
  const [offers, setOffers] = useState<Offer[]>(initialOffers)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastMessageIdRef = useRef<number | null>(null)
  const shouldScrollToBottomRef = useRef(true)

  const isNearBottom = () => {
    // if (!messagesContainerRef.current) return true
    // const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    // const threshold = 150 // pixels from bottom
    // return scrollHeight - scrollTop - clientHeight < threshold
  }

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" })
    }
  }

  const loadMessages = async (preserveScroll = false) => {
    try {
     const wasNearBottom = preserveScroll ? isNearBottom() : false
    //   const previousScrollHeight = messagesContainerRef.current?.scrollHeight || 0
    //   const previousScrollTop = messagesContainerRef.current?.scrollTop || 0

      const response = await fetch(`/service-hub/chat/${chat.id}/messagesget`)
      if (!response.ok) {
        console.error("Failed to load messages:", response.status)
        return
      }

      const data = await response.json()



    //   console.log("API Response:", data.messages.length);
    //   return
      console.log("API Response - Total messages:", data.messages?.length || 0)
      console.log("API Response - All messages:", JSON.stringify(data.messages, null, 2))

      // Display backend data directly - no filtering
      const validMessages = (data.messages || []).map((msg: any) => {
        const processed = {
          id: msg.id,
          user_id: msg.user_id,
          user: msg.user,
          message: msg.message,
          attachments: msg.attachments || [],
          created_at: msg.created_at,
          is_mine: Boolean(msg.is_mine)
        }
        console.log(`Processed message ${processed.id}:`, { id: processed.id, is_mine: processed.is_mine, hasUser: !!processed.user })
        return processed
      })

      console.log("Valid messages count:", validMessages.length)
      console.log("Valid messages array:", validMessages)

      // Check if there are new messages
      const hasNewMessages = lastMessageIdRef.current === null ||
        validMessages.some((msg: Message) => msg.id > (lastMessageIdRef.current || 0))

      if (validMessages.length > 0) {
        lastMessageIdRef.current = validMessages[validMessages.length - 1].id
      }

      setMessages(validMessages)

      // Preserve scroll position if user was scrolling up
      if (preserveScroll) {
        if (wasNearBottom) {
          // User was near bottom, scroll to bottom after new messages
        //   setTimeout(() => scrollToBottom(true), 100)
        } else {
          // User was scrolling up, maintain exact scroll position
        //   setTimeout(() => {
        //     if (messagesContainerRef.current) {
        //       const newScrollHeight = messagesContainerRef.current.scrollHeight
        //       const scrollDiff = newScrollHeight - previousScrollHeight
        //       // Maintain relative position
        //       messagesContainerRef.current.scrollTop = previousScrollTop + scrollDiff
        //     }
        //   }, 0)
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    shouldScrollToBottomRef.current = true
    lastMessageIdRef.current = null
    loadMessages(false)


    const interval = setInterval(() => {
      loadMessages(true) // Preserve scroll position during polling
    }, 10000)

    // return () => clearInterval(interval)
  }, [chat.id])

  // Log messages state changes
  useEffect(() => {
    console.log("Messages state changed - Count:", messages.length)
    console.log("Messages state - All messages:", messages)
    messages.forEach((msg, idx) => {
      console.log(`State message ${idx + 1}:`, { id: msg.id, is_mine: msg.is_mine, user_id: msg.user_id, hasUser: !!msg.user })
    })
  }, [messages])

  // Scroll to bottom only on initial load or when user sends a message
  useEffect(() => {
    // if (shouldScrollToBottomRef.current && messages.length > 0) {
    //   setTimeout(() => scrollToBottom(true), 100)
    //   shouldScrollToBottomRef.current = false
    // }
  }, [messages.length])

  // Track scroll position
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
    //   shouldScrollToBottomRef.current = isNearBottom()
    }

    // container.addEventListener('scroll', handleScroll)
    // return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || isSending) return

    setIsSending(true)
    try {
      const formData = new FormData()
      formData.append("message", message)
      attachments.forEach((file) => {
        formData.append("attachments[]", file)
      })

      const response = await fetch(`/service-hub/chat/${chat.id}/messages`, {
        method: "POST",
        headers: {
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
        credentials: "same-origin",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Message sent response:", data)

        // Validate the message data
        if (!data.message || !data.message.user || !data.message.user_id) {
          console.error("Invalid message response:", data)
        } else {
          // Ensure is_mine is boolean
          const messageToAdd = {
            ...data.message,
            is_mine: Boolean(data.message.is_mine)
          }

          // Optimistically add the message
          setMessages((prev) => {
            // Check if message already exists (avoid duplicates)
            if (prev.some(m => m.id === messageToAdd.id)) {
              return prev
            }
            return [...prev, messageToAdd]
          })
          // Update last message ID
          if (messageToAdd.id) {
            lastMessageIdRef.current = messageToAdd.id
          }
        }

        setMessage("")
        setAttachments([])
        // Scroll to bottom after sending (only if user is near bottom)
        // if (shouldScrollToBottomRef.current) {
        //   setTimeout(() => scrollToBottom(true), 100)
        // }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to send message:", response.status, errorData)
      }
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files))
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

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

  return (
    <FrontendLayout>
      <Head title={`Chat - ${chat.other_user.name}`} />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/service-hub/chats/list">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={chat.other_user.avatar || undefined} />
                    <AvatarFallback>{chat.other_user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">{chat.other_user.name}</h2>
                  </div>
                </div>
              </div>
              {/* {isSeller && sellerGigs.length > 0 && (
                <Button
                  onClick={() => setShowOfferModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Handshake className="mr-2 h-4 w-4" />
                  Create Offer
                </Button>
              )} */}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Card className="border shadow-sm h-[calc(100vh-200px)] flex flex-col">
            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {/* Display Offers */}
                {offers.map((offer) => (
                  <motion.div
                    key={`offer-${offer.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                  >
                    <Card className="max-w-md w-full border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Handshake className="h-5 w-5 text-green-600" />
                          <h4 className="font-semibold">Custom Offer</h4>
                          <Badge variant={offer.status === 'pending' ? 'default' : offer.status === 'accepted' ? 'default' : 'destructive'} className="ml-auto">
                            {offer.status}
                          </Badge>
                        </div>
                        <h5 className="font-medium mb-1">{offer.title}</h5>
                        <p className="text-sm text-muted-foreground mb-2">{offer.description}</p>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-semibold text-lg">${offer.price}</span>
                          <span className="text-muted-foreground">Delivery: {offer.delivery_time}</span>
                        </div>
                        {offer.requirements && (
                          <p className="text-xs text-muted-foreground mb-2">Requirements: {offer.requirements}</p>
                        )}
                        {!isSeller && offer.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/service-hub/offers/${offer.id}/accept`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                      'Accept': 'application/json',
                                    },
                                    credentials: 'same-origin',
                                    redirect: 'follow',
                                  })
                                  if (response.redirected) {
                                    showSuccessToast("Offer accepted! Order created.")
                                    window.location.href = response.url
                                  } else if (response.ok) {
                                    showSuccessToast("Offer accepted! Order created.")
                                    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: 'accepted' } : o))
                                    router.visit('/service-hub/my-orders')
                                  } else {
                                    const data = await response.json()
                                    showErrorToast(data.error || "Failed to accept offer")
                                  }
                                } catch (error) {
                                  showErrorToast("Failed to accept offer")
                                }
                              }}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Accept Offer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/service-hub/offers/${offer.id}/reject`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                    },
                                    credentials: 'same-origin',
                                  })
                                  if (response.ok) {
                                    showSuccessToast("Offer rejected")
                                    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: 'rejected' } : o))
                                  } else {
                                    showErrorToast("Failed to reject offer")
                                  }
                                } catch (error) {
                                  showErrorToast("Failed to reject offer")
                                }
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">{formatTime(offer.created_at)}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-muted-foreground">Loading messages...</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    // Ensure is_mine is boolean
                    const isMine = Boolean(msg.is_mine)
                    const displayUser = msg.user || { id: msg.user_id, name: 'Unknown User', avatar: null }

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex gap-2 max-w-[70%] ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                          {!isMine && (
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage src={displayUser.avatar || undefined} />
                              <AvatarFallback>{displayUser.name?.[0] || "U"}</AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`rounded-lg px-4 py-2 ${isMine ? "bg-blue-600 text-white" : "bg-muted"}`}>
                            {!isMine && (
                              <div className="text-xs font-semibold mb-1 opacity-80">{displayUser.name}</div>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.attachments.map((attachment, idx) => (
                                  <a
                                    key={idx}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-xs underline opacity-80 hover:opacity-100"
                                  >
                                    {attachment.name}
                                  </a>
                                ))}
                              </div>
                            )}
                            <div className="text-xs mt-1 opacity-70">{formatTime(msg.created_at)}</div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="px-4 py-2 border-t bg-muted/50">
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2 text-sm"
                      >
                        <Paperclip className="h-4 w-4" />
                        <span className="max-w-[200px] truncate">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex items-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-5 w-5" />
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      multiple
                      onChange={handleAttachmentChange}
                    />
                  </Button>
                  <Textarea
                    placeholder="Type your message..."
                    className="flex-1 min-h-[44px] max-h-[120px] resize-none"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!message.trim() && attachments.length === 0) || isSending}
                    size="icon"
                    className="h-9 w-9"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Custom Offer Modal */}
      <Dialog open={showOfferModal} onOpenChange={(open) => {
        setShowOfferModal(open)
        if (!open) {
          setSelectedGigForOffer(null)
          setOfferForm({
            title: "",
            description: "",
            price: "",
            delivery_time: "3 days",
            requirements: "",
          })
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5" />
              Create Custom Offer
            </DialogTitle>
            <DialogDescription>
              {!selectedGigForOffer
                ? "Select a service to create an offer for"
                : "Fill in the offer details"}
            </DialogDescription>
          </DialogHeader>

          {!selectedGigForOffer ? (
            // Step 1: Select Gig
            <div className="space-y-4 py-4">
              {sellerGigs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>You don't have any active services yet.</p>
                  <Link href="/service-hub/create" className="text-primary hover:underline mt-2 inline-block">
                    Create your first service
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
                  {sellerGigs.map((sellerGig) => (
                    <button
                      key={sellerGig.id}
                      type="button"
                      onClick={() => {
                        setSelectedGigForOffer(sellerGig)
                        setOfferForm({
                          title: sellerGig.title,
                          description: sellerGig.description,
                          price: sellerGig.price.toString(),
                          delivery_time: "3 days",
                          requirements: "",
                        })
                      }}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      {sellerGig.image && (
                        <img
                          src={sellerGig.image}
                          alt={sellerGig.title}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{sellerGig.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{sellerGig.description}</p>
                        <p className="text-sm font-medium mt-1">${sellerGig.price}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Step 2: Offer Form
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                {selectedGigForOffer.image && (
                  <img
                    src={selectedGigForOffer.image}
                    alt={selectedGigForOffer.title}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedGigForOffer.title}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedGigForOffer(null)}
                    className="text-xs text-primary hover:underline"
                  >
                    Change service
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="offer_title">Offer Title *</Label>
                <Input
                  id="offer_title"
                  placeholder="e.g., Custom Logo Design Package"
                  value={offerForm.title}
                  onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="offer_description">Description *</Label>
                <Textarea
                  id="offer_description"
                  placeholder="Describe what you'll deliver..."
                  value={offerForm.description}
                  onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="offer_price">Price ($) *</Label>
                  <Input
                    id="offer_price"
                    type="number"
                    min="5"
                    step="0.01"
                    placeholder="0.00"
                    value={offerForm.price}
                    onChange={(e) => setOfferForm({ ...offerForm, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="offer_delivery">Delivery Time *</Label>
                  <Input
                    id="offer_delivery"
                    placeholder="e.g., 3 days, 1 week"
                    value={offerForm.delivery_time}
                    onChange={(e) => setOfferForm({ ...offerForm, delivery_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="offer_requirements">Requirements (Optional)</Label>
                <Textarea
                  id="offer_requirements"
                  placeholder="Any specific requirements or instructions..."
                  value={offerForm.requirements}
                  onChange={(e) => setOfferForm({ ...offerForm, requirements: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedGigForOffer) {
                  setSelectedGigForOffer(null)
                } else {
                  setShowOfferModal(false)
                }
              }}
              disabled={isCreatingOffer}
            >
              {selectedGigForOffer ? "Back" : "Cancel"}
            </Button>
            {selectedGigForOffer && (
              <Button
                onClick={async () => {
                  if (!offerForm.title || !offerForm.description || !offerForm.price || !offerForm.delivery_time) {
                    showErrorToast("Please fill in all required fields")
                    return
                  }

                  setIsCreatingOffer(true)
                  try {
                    const response = await fetch(`/service-hub/${selectedGigForOffer.slug}/create-offer`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                      },
                      credentials: 'same-origin',
                      body: JSON.stringify({
                        chat_id: chat.id,
                        title: offerForm.title,
                        description: offerForm.description,
                        price: parseFloat(offerForm.price),
                        delivery_time: offerForm.delivery_time,
                        requirements: offerForm.requirements || null,
                      }),
                    })

                    const data = await response.json()

                    if (response.ok) {
                      showSuccessToast(data.message || "Custom offer created successfully!")
                      setShowOfferModal(false)
                      setSelectedGigForOffer(null)
                      setOfferForm({
                        title: "",
                        description: "",
                        price: "",
                        delivery_time: "3 days",
                        requirements: "",
                      })
                      // Add the new offer to the list
                      setOffers(prev => [{
                        id: data.offer.id,
                        gig_id: selectedGigForOffer.id,
                        title: offerForm.title,
                        description: offerForm.description,
                        price: parseFloat(offerForm.price),
                        delivery_time: offerForm.delivery_time,
                        requirements: offerForm.requirements || null,
                        status: 'pending',
                        created_at: new Date().toISOString(),
                      }, ...prev])
                    } else {
                      showErrorToast(data.error || "Failed to create offer")
                    }
                  } catch (error) {
                    console.error('Error creating offer:', error)
                    showErrorToast("Failed to create offer. Please try again.")
                  } finally {
                    setIsCreatingOffer(false)
                  }
                }}
                disabled={isCreatingOffer}
                className="bg-green-600 hover:bg-green-700"
              >
                {isCreatingOffer ? "Creating..." : "Create Offer"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FrontendLayout>
  )
}


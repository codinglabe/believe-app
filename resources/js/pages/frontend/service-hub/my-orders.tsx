"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Label } from "@/components/frontend/ui/label"
import { Textarea } from "@/components/frontend/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/frontend/ui/dialog"
import {
  ArrowLeft,
  Package,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  MessageCircle,
  Download,
  Star,
  Eye,
  Sparkles,
  Filter,
  Search,
  AlertCircle,
  Timer,
} from "lucide-react"
import { Link, router, usePage } from "@inertiajs/react"
import { useState, useEffect } from "react"
import { Head } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { ContactSellerButton } from "@/components/frontend/service-hub/contact-seller-button"

interface Order {
  id: number
  orderNumber: string
  service: {
    id: number
    slug: string
    title: string
    image: string | null
  }
  seller: {
    id: number
    name: string
    avatar: string | null
  }
  package: string
  amount: number
  platformFee: number
  total: number
  status: string
  paymentStatus: string
  orderDate: string
  deliveryDate: string
  cancelledAt: string | null
  cancellationReason: string | null
  requirements: string
  deliverables: Array<{ name: string; url: string; type: string }>
  canReview: boolean
  canCancel: boolean
  canCancelByBuyer?: boolean
  remainingCancellationHours?: number
  remainingAutoApprovalHours?: number
  isWithinCancellationWindow?: boolean
}

interface PageProps extends Record<string, unknown> {
  orders: {
    data: Order[]
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  filters: {
    status: string
    search: string
  }
}

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    icon: Clock,
    description: "Order is pending seller confirmation",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    icon: Package,
    description: "Seller is working on your order",
  },
  delivered: {
    label: "Delivered",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    icon: CheckCircle2,
    description: "Order has been delivered, please review",
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    icon: CheckCircle2,
    description: "Order completed successfully",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    icon: XCircle,
    description: "Order has been cancelled",
  },
}

export default function MyOrders() {
  const { orders, filters: initialFilters } = usePage<PageProps>().props
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilters.status || "all")
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "")
  const [showCancelModal, setShowCancelModal] = useState<number | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusInfoMap, setStatusInfoMap] = useState<Record<number, any>>({})
  const [csrfToken, setCsrfToken] = useState<string>("")

  // Fetch CSRF token on page load
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        // Method 1: Check if token exists in meta tag
        const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')

        if (metaToken) {
          setCsrfToken(metaToken)
        } else {
          // Method 2: Fetch fresh token from server
          const response = await fetch('/sanctum/csrf-cookie', {
            method: 'GET',
            credentials: 'same-origin'
          })

          if (response.ok) {
            // Get the token from cookies
            const cookies = document.cookie.split(';')
            const xsrfToken = cookies.find(cookie => cookie.trim().startsWith('XSRF-TOKEN='))

            if (xsrfToken) {
              const token = decodeURIComponent(xsrfToken.split('=')[1])
              setCsrfToken(token)

              // Update meta tag
              let meta = document.querySelector('meta[name="csrf-token"]')
              if (!meta) {
                meta = document.createElement('meta')
                meta.setAttribute('name', 'csrf-token')
                document.head.appendChild(meta)
              }
              meta.setAttribute('content', token)
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch CSRF token:", error)
      }
    }

    fetchCsrfToken()

    // Also fetch on page focus/visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchCsrfToken()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Helper function to get CSRF token
  const getCsrfToken = (): string => {
    // Priority: 1. State token, 2. Meta tag, 3. Cookie
    if (csrfToken) return csrfToken

    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (metaToken) return metaToken

    // Fallback to cookie
    const cookies = document.cookie.split(';')
    const xsrfToken = cookies.find(cookie => cookie.trim().startsWith('XSRF-TOKEN='))
    if (xsrfToken) {
      return decodeURIComponent(xsrfToken.split('=')[1])
    }

    return ''
  }

  const applyFilters = () => {
    const params: any = {
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      search: searchQuery || undefined,
    }

    router.get('/service-hub/my-orders', params, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  useEffect(() => {
    if (
      selectedStatus === initialFilters.status &&
      searchQuery === initialFilters.search
    ) return
    applyFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus])

  // Fetch real-time status info for orders
  useEffect(() => {
    const fetchStatusInfo = async () => {
      const newStatusInfoMap: Record<number, any> = {}

      for (const order of orders.data) {
        try {
          const response = await fetch(`/service-hub/orders/${order.id}/status-info`)
          if (response.ok) {
            const data = await response.json()
            newStatusInfoMap[order.id] = data
          }
        } catch (error) {
          console.error(`Failed to fetch status info for order ${order.id}:`, error)
        }
      }

      setStatusInfoMap(newStatusInfoMap)
    }

    fetchStatusInfo()
    const interval = setInterval(fetchStatusInfo, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [orders.data])

  const handleSearch = () => {
    applyFilters()
  }

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleCancelOrder = async (orderId: number) => {
    if (!cancelReason.trim()) {
      showErrorToast("Please provide a reason for cancellation")
      return
    }

    const token = getCsrfToken()
    if (!token) {
      showErrorToast("CSRF token not found. Please refresh the page.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/service-hub/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': token,
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          cancellation_reason: cancelReason,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showSuccessToast("Order cancelled successfully!")
        setShowCancelModal(null)
        setCancelReason("")
        router.reload()
      } else {
        showErrorToast(data.error || "Failed to cancel order")
      }
    } catch (error) {
      showErrorToast("Failed to cancel order")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReview = (orderId: number) => {
    const order = orders.data.find((o) => o.id === orderId)
    if (order) {
      router.visit(`/service-hub/${order.service.slug}/reviews`)
    }
  }

  const handleAcceptDelivery = async (orderId: number) => {
    const token = getCsrfToken()
    if (!token) {
      showErrorToast("CSRF token not found. Please refresh the page.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/service-hub/orders/${orderId}/accept-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': token,
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      })

      if (response.ok) {
        showSuccessToast("Order completed! You can now leave a review.")
        router.reload()
      } else {
        const data = await response.json()
        showErrorToast(data.error || "Failed to accept delivery")
      }
    } catch (error) {
      showErrorToast("Failed to accept delivery")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getOrderStatusInfo = (orderId: number) => {
    return statusInfoMap[orderId] || {}
  }

  return (
    <FrontendLayout>
      <Head title="My Orders - Service Hub" />
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
                <h1 className="text-2xl font-bold">My Orders</h1>
                <p className="text-sm text-muted-foreground">Track and manage your service orders</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Filters and Search */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="border shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search orders by number, service, or seller..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-10 pr-4 py-2 rounded-md border bg-background text-foreground dark:text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-3 py-2 rounded-md border bg-background text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="delivered">Delivered</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Orders List */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {orders.data.length > 0 ? (
                  orders.data.map((order, index) => {
                    const statusInfo = getStatusConfig(order.status)
                    const StatusIcon = statusInfo.icon
                    const orderStatusInfo = getOrderStatusInfo(order.id)
                    const canCancelByBuyer = orderStatusInfo.can_cancel_by_buyer ?? order.canCancelByBuyer
                    const remainingCancellationHours = orderStatusInfo.remaining_cancellation_hours ?? order.remainingCancellationHours
                    const remainingAutoApprovalHours = orderStatusInfo.remaining_auto_approval_hours ?? order.remainingAutoApprovalHours
                    const isWithinCancellationWindow = orderStatusInfo.is_within_cancellation_window ?? order.isWithinCancellationWindow

                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="border shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-600 to-purple-600" />
                          <CardContent className="p-6">
                            {/* Order Header */}
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                              <div className="flex gap-4 flex-1">
                                {/* Service Image */}
                                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                  <img
                                    src={order.service.image || '/placeholder-image.jpg'}
                                    alt={order.service.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                {/* Order Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                      <h3 className="font-bold text-lg mb-1">{order.service.title}</h3>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="secondary" className={statusInfo.color}>
                                          <StatusIcon className="h-3 w-3 mr-1" />
                                          {statusInfo.label}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className={
                                            order.paymentStatus === "paid"
                                              ? "border-green-500 text-green-700 dark:text-green-400"
                                              : "border-yellow-500 text-yellow-700 dark:text-yellow-400"
                                          }
                                        >
                                          {order.paymentStatus === "paid" ? "Paid" : "Payment Pending"}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                                    <div className="flex items-center gap-1">
                                      <Package className="h-3.5 w-3.5" />
                                      <span>{order.orderNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span>Ordered {formatDate(order.orderDate)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span>Due {formatDate(order.deliveryDate)}</span>
                                    </div>
                                  </div>

                                  {/* Seller Info */}
                                  <div className="flex items-center gap-2 mt-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={order.seller.avatar || undefined} />
                                      <AvatarFallback>{order.seller.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm text-muted-foreground">by {order.seller.name}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {order.package}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {/* Price */}
                              <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                  ${order.total.toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Service: ${order.amount.toFixed(2)}
                                </div>
                              </div>
                            </div>

                            {/* Cancellation Notice */}
                            {order.status === 'in_progress' && !isWithinCancellationWindow && (
                              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                  <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                                    Cancellation Period Expired
                                  </span>
                                </div>
                                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                  You cannot cancel this order anymore. The 24-hour cancellation period has expired since the seller approved it.
                                </p>
                              </div>
                            )}

                            {/* Auto-approval Notice */}
                            {order.status === 'delivered' && remainingAutoApprovalHours && remainingAutoApprovalHours > 0 && (
                              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-1">
                                  <Timer className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                    Auto-Completion Timer
                                  </span>
                                </div>
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                  This order will be automatically completed in {remainingAutoApprovalHours} hours if not accepted.
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 mt-2">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full"
                                    style={{ width: `${Math.max(0, 100 - (remainingAutoApprovalHours / 48 * 100))}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            {/* Approval/Rejection Status */}
                            {order.status === 'cancelled' && order.cancellationReason && (
                              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                                <div className="flex items-center gap-2 mb-2">
                                  <XCircle className="h-4 w-4 text-red-600" />
                                  <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                                    Order Rejected by Seller
                                  </span>
                                </div>
                                {order.cancelledAt && (
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Rejected on {new Date(order.cancelledAt).toLocaleString()}
                                  </p>
                                )}
                                <div className="p-2 bg-white dark:bg-gray-900 rounded border border-red-200 dark:border-red-800">
                                  <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">
                                    Rejection Reason:
                                  </p>
                                  <p className="text-sm text-red-600 dark:text-red-400">
                                    {order.cancellationReason}
                                  </p>
                                </div>
                              </div>
                            )}
                            {order.status === 'in_progress' && (
                              <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                                    Order Approved by Seller - Seller is now working on your order
                                  </span>
                                </div>
                              </div>
                            )}
                            {['delivered', 'completed'].includes(order.status) && (
                              <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                                    Order Approved by Seller
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Requirements Preview */}
                            {order.requirements && (
                              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-semibold">Requirements:</span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{order.requirements}</p>
                              </div>
                            )}

                            {/* Deliverables */}
                            {order.deliverables && Array.isArray(order.deliverables) && order.deliverables.length > 0 && (
                              <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2 mb-2">
                                  <Download className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                                    Deliverables:
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {order.deliverables.map((deliverable: any, idx: number) => (
                                    <a
                                      key={idx}
                                      href={deliverable.url || '#'}
                                      className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 hover:underline"
                                    >
                                      <FileText className="h-3 w-3" />
                                      {deliverable.name || 'File'}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                              <Link href={`/service-hub/orders/${order.id}`}>
                                <Button variant="default" size="sm">
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Order
                                </Button>
                              </Link>
                              <Link href={`/service-hub/${order.service.slug}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Service
                                </Button>
                              </Link>
                              <ContactSellerButton
                                sellerId={order.seller.id}
                                sellerName={order.seller.name}
                                gigSlug={order.service.slug}
                                gigTitle={order.service.title}
                              />
                              {order.canReview && (
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={() => handleReview(order.id)}
                                >
                                  <Star className="mr-2 h-4 w-4" />
                                  Leave Review
                                </Button>
                              )}
                              {canCancelByBuyer && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() => setShowCancelModal(order.id)}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel Order
                                  {remainingCancellationHours && remainingCancellationHours > 0 && (
                                    <span className="ml-2 text-xs">
                                      ({remainingCancellationHours}h left)
                                    </span>
                                  )}
                                </Button>
                              )}
                              {order.status === "delivered" && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleAcceptDelivery(order.id)}
                                  disabled={isSubmitting}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  {isSubmitting ? "Processing..." : "Accept & Complete"}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <Card className="border shadow-sm">
                      <CardContent className="pt-12 pb-12">
                        <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No orders found</h3>
                        <p className="text-muted-foreground mb-6">
                          {searchQuery || selectedStatus !== "all"
                            ? "Try adjusting your filters or search query"
                            : "You haven't placed any orders yet"}
                        </p>
                        {!searchQuery && selectedStatus === "all" && (
                          <Link href="/service-hub">
                            <Button className="bg-blue-600 hover:bg-blue-700">
                              <Sparkles className="mr-2 h-4 w-4" />
                              Browse Services
                            </Button>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      <Dialog open={showCancelModal !== null} onOpenChange={(open) => !open && setShowCancelModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order? Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Reason for Cancellation *</Label>
              <Textarea
                placeholder="Why are you cancelling this order?"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showCancelModal && handleCancelOrder(showCancelModal)}
              disabled={isSubmitting || !cancelReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? "Processing..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FrontendLayout>
  )
}

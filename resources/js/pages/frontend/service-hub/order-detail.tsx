"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Label } from "@/components/frontend/ui/label"
import { Input } from "@/components/frontend/ui/input"
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
  FileText,
  MessageCircle,
  Download,
  Star,
  Eye,
  Upload,
  X,
  Plus,
  Send,
  Check,
  Sparkles,
} from "lucide-react"
import { Link, router, usePage } from "@inertiajs/react"
import { useState } from "react"
import { Head } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface Order {
  id: number
  orderNumber: string
  service: {
    id: number
    slug: string
    title: string
    description: string
    image: string | null
    category: string
  }
  buyer: {
    id: number
    name: string
    avatar: string | null
  }
  seller: {
    id: number
    name: string
    avatar: string | null
  }
  package: {
    id: number | null
    name: string
    price: number
  }
  amount: number
  platformFee: number
  transactionFee: number
  salesTax: number
  salesTaxRate: number
  sellerEarnings: number
  paymentMethod: string
  total: number
  status: string
  paymentStatus: string
  orderDate: string
  deliveredAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  requirements: string
  specialInstructions: string | null
  deliverables: Array<{ name: string; url: string; type?: string }>
  canDeliver: boolean
  canAcceptDelivery: boolean
  canComplete: boolean
  canApprove: boolean
  canReject: boolean
  canCancel: boolean
  canReview: boolean
  canSellerReview: boolean
  hasBuyerReview: {
    rating: number
    comment: string
    created_at: string
  } | null
  hasSellerReview: {
    rating: number
    comment: string
    created_at: string
  } | null
}

interface PageProps extends Record<string, unknown> {
  order: Order
  isBuyer: boolean
  isSeller: boolean
}

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    icon: Clock,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    icon: Package,
  },
  delivered: {
    label: "Delivered",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    icon: XCircle,
  },
}

export default function OrderDetail() {
  const { order, isBuyer, isSeller } = usePage<PageProps>().props
  const [showDeliverModal, setShowDeliverModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showSellerReviewModal, setShowSellerReviewModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [deliverables, setDeliverables] = useState<Array<{ description: string; file: File | null; url?: string; type?: string }>>([
    { description: "", file: null }
  ])
  const [review, setReview] = useState({ rating: 5, comment: "" })
  const [sellerReview, setSellerReview] = useState({ rating: 5, comment: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = statusInfo.icon

  const handleAddDeliverable = () => {
    setDeliverables([...deliverables, { description: "", file: null }])
  }

  const handleRemoveDeliverable = (index: number) => {
    if (deliverables.length > 1) {
      setDeliverables(deliverables.filter((_, i) => i !== index))
    }
  }

  const handleUpdateDeliverable = (index: number, field: 'description', value: string) => {
    setDeliverables(deliverables.map((d, i) => i === index ? { ...d, [field]: value } : d))
  }

  const handleFileChange = (index: number, file: File | null) => {
    setDeliverables(deliverables.map((d, i) => {
      if (i === index) {
        return {
          ...d,
          file: file,
          type: file ? file.type : d.type,
        }
      }
      return d
    }))
  }

  const handleDeliver = async () => {
    if (deliverables.some(d => !d.file && !d.url)) {
      showErrorToast("Please upload a file for each deliverable")
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()

      deliverables.forEach((deliverable, index) => {
        // Auto-generate name from file if available
        const fileName = deliverable.file ? deliverable.file.name : `Deliverable ${index + 1}`
        formData.append(`deliverables[${index}][name]`, fileName)
        formData.append(`deliverables[${index}][description]`, deliverable.description || '')
        if (deliverable.file) {
          formData.append(`deliverables[${index}][file]`, deliverable.file)
        }
        if (deliverable.url) {
          formData.append(`deliverables[${index}][url]`, deliverable.url)
        }
        if (deliverable.type) {
          formData.append(`deliverables[${index}][type]`, deliverable.type)
        }
      })

      const response = await fetch(`/service-hub/orders/${order.id}/deliver`, {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        credentials: 'same-origin',
        body: formData,
      })

      if (response.ok) {
        showSuccessToast("Order delivered successfully!")
        router.reload()
      } else {
        const data = await response.json()
        showErrorToast(data.error || "Failed to deliver order")
      }
    } catch (error) {
      showErrorToast("Failed to deliver order")
    } finally {
      setIsSubmitting(false)
      setShowDeliverModal(false)
    }
  }

  const handleAcceptDelivery = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/service-hub/orders/${order.id}/accept-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
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

  const handleApprove = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/service-hub/orders/${order.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        credentials: 'same-origin',
      })

      if (response.ok) {
        showSuccessToast("Order approved successfully! You can now start working on it.")
        router.reload()
      } else {
        const data = await response.json()
        showErrorToast(data.error || "Failed to approve order")
      }
    } catch (error) {
      showErrorToast("Failed to approve order")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/service-hub/orders/${order.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          rejection_reason: rejectionReason,
        }),
      })

      if (response.ok) {
        showSuccessToast("Order rejected successfully.")
        setShowRejectModal(false)
        setRejectionReason("")
        router.reload()
      } else {
        const data = await response.json()
        showErrorToast(data.error || "Failed to reject order")
      }
    } catch (error) {
      showErrorToast("Failed to reject order")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) {
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch(`/service-hub/orders/${order.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          rejection_reason: 'Cancelled by user',
        }),
      })

      if (response.ok) {
        showSuccessToast("Order cancelled successfully.")
        router.reload()
      } else {
        const data = await response.json()
        showErrorToast(data.error || "Failed to cancel order")
      }
    } catch (error) {
      showErrorToast("Failed to cancel order")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!review.comment.trim()) {
      showErrorToast("Please write a review comment")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/service-hub/${order.service.slug}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          order_id: order.id,
          rating: review.rating,
          comment: review.comment,
        }),
      })

      if (response.ok) {
        showSuccessToast("Review submitted successfully!")
        router.reload()
      } else {
        const data = await response.json()
        showErrorToast(data.error || "Failed to submit review")
      }
    } catch (error) {
      showErrorToast("Failed to submit review")
    } finally {
      setIsSubmitting(false)
      setShowReviewModal(false)
    }
  }

  return (
    <FrontendLayout>
      <Head title={`Order ${order.orderNumber} - Service Hub`} />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={isBuyer ? "/service-hub/my-orders" : "/service-hub/seller-orders"}>
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
                  <p className="text-sm text-muted-foreground">
                    {isBuyer ? "Your order details" : "Order management"}
                  </p>
                </div>
              </div>
              <Badge className={statusInfo.color}>
                <StatusIcon className="h-4 w-4 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Service Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {order.service.image && (
                      <img
                        src={order.service.image}
                        alt={order.service.title}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{order.service.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{order.service.description}</p>
                      <Badge variant="secondary">{order.service.category}</Badge>
                      <div className="mt-2">
                        <Link href={`/service-hub/${order.service.slug}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View Service
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Approval/Rejection Status for Buyers */}
              {isBuyer && (
                <>
                  {order.status === 'cancelled' && order.cancellationReason && (
                    <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                          <XCircle className="h-5 w-5" />
                          Order Rejected by Seller
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {order.cancelledAt && (
                            <p className="text-sm text-muted-foreground">
                              Rejected on {new Date(order.cancelledAt).toLocaleString()}
                            </p>
                          )}
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800">
                            <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">
                              Rejection Reason:
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {order.cancellationReason}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {order.status === 'in_progress' && (
                    <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                          <CheckCircle2 className="h-5 w-5" />
                          Order Approved by Seller
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          The seller has approved your order and is now working on it. You will be notified when the order is delivered.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  {['delivered', 'completed'].includes(order.status) && (
                    <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                          <CheckCircle2 className="h-5 w-5" />
                          Order Approved by Seller
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Your order was approved by the seller and is progressing through the delivery process.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Requirements */}
              {order.requirements && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{order.requirements}</p>
                  </CardContent>
                </Card>
              )}

              {/* Special Instructions */}
              {order.specialInstructions && (
                <Card>
                  <CardHeader>
                    <CardTitle>Special Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{order.specialInstructions}</p>
                  </CardContent>
                </Card>
              )}

              {/* Deliverables */}
              {order.deliverables && order.deliverables.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Deliverables
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {order.deliverables.map((deliverable: any, index: number) => (
                        <div
                          key={index}
                          className="p-3 border rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Download className="h-4 w-4 text-blue-600" />
                            <span className="flex-1 font-medium">{deliverable.name}</span>
                            <Badge variant="outline">{deliverable.type || 'File'}</Badge>
                          </div>
                          {deliverable.description && (
                            <p className="text-sm text-muted-foreground mb-2">{deliverable.description}</p>
                          )}
                          {deliverable.url && (
                            <a
                              href={deliverable.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              Download File
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Buyer Review */}
              {order.hasBuyerReview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Buyer Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < order.hasBuyerReview!.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                      <span className="text-sm text-muted-foreground">
                        {order.hasBuyerReview.created_at}
                      </span>
                    </div>
                    <p className="text-sm">{order.hasBuyerReview.comment}</p>
                  </CardContent>
                </Card>
              )}

              {/* Seller Review */}
              {order.hasSellerReview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Seller Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < order.hasSellerReview!.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                      <span className="text-sm text-muted-foreground">
                        {order.hasSellerReview.created_at}
                      </span>
                    </div>
                    <p className="text-sm">{order.hasSellerReview.comment}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Package</span>
                    <span className="font-medium">{order.package.name}</span>
                  </div>

                  {isBuyer ? (
                    // Buyer View: Only show service price
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Price</span>
                        <span className="font-medium">${order.amount.toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-4 flex justify-between">
                        <span className="font-semibold">Total Paid</span>
                        <span className="font-bold text-lg">${order.total.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground pt-2">
                        Payment Method: {order.paymentMethod === 'believe_points' ? 'Believe Points' : 'Stripe Card'}
                      </div>
                    </>
                  ) : (
                    // Seller View: Show full breakdown
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Price</span>
                        <span className="font-medium">${order.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span className="text-muted-foreground">Platform Fee</span>
                        <span className="font-medium">-${order.platformFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span className="text-muted-foreground">Transaction Fee</span>
                        <span className="font-medium">-${order.transactionFee.toFixed(2)}</span>
                      </div>
                      {order.salesTax > 0 && (
                        <div className="flex justify-between text-red-600 dark:text-red-400">
                          <span className="text-muted-foreground">Sales Tax ({order.salesTaxRate}%)</span>
                          <span className="font-medium">-${order.salesTax.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t pt-4 flex justify-between">
                        <span className="font-semibold text-green-600 dark:text-green-400">Your Earnings</span>
                        <span className="font-bold text-lg text-green-600 dark:text-green-400">${order.sellerEarnings.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground pt-2">
                        Payment Method: {order.paymentMethod === 'believe_points' ? 'Believe Points' : 'Stripe Card'}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Order Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Order Date</span>
                    <p className="font-medium">{new Date(order.orderDate).toLocaleString()}</p>
                  </div>
                  {order.deliveredAt && (
                    <div>
                      <span className="text-sm text-muted-foreground">Delivered At</span>
                      <p className="font-medium">{new Date(order.deliveredAt).toLocaleString()}</p>
                    </div>
                  )}
                  {order.completedAt && (
                    <div>
                      <span className="text-sm text-muted-foreground">Completed At</span>
                      <p className="font-medium">{new Date(order.completedAt).toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-muted-foreground">Payment Status</span>
                    <Badge
                      variant={order.paymentStatus === "paid" ? "default" : "outline"}
                      className={
                        order.paymentStatus === "paid"
                          ? "bg-green-600"
                          : "border-yellow-500 text-yellow-700"
                      }
                    >
                      {order.paymentStatus === "paid" ? "Paid" : "Pending"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* User Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{isBuyer ? "Seller" : "Buyer"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={(isBuyer ? order.seller : order.buyer).avatar || undefined}
                      />
                      <AvatarFallback>
                        {(isBuyer ? order.seller : order.buyer).name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        {(isBuyer ? order.seller : order.buyer).name}
                      </p>
                      <Link
                        href={`/service-hub/seller/${isBuyer ? order.seller.id : order.buyer.id}`}
                      >
                        <Button variant="outline" size="sm" className="mt-1">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Contact
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {order.canApprove && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleApprove}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Approve Order
                        </>
                      )}
                    </Button>
                  )}
                  {order.canReject && (
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={() => setShowRejectModal(true)}
                      disabled={isSubmitting}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject Order
                    </Button>
                  )}
                  {order.canCancel && !order.canApprove && !order.canReject && (
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Processing..." : "Cancel Order"}
                    </Button>
                  )}
                  {order.canDeliver && order.status !== 'pending' && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => setShowDeliverModal(true)}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Deliver Order
                    </Button>
                  )}
                  {order.canAcceptDelivery && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleAcceptDelivery}
                      disabled={isSubmitting}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Processing..." : "Accept & Complete"}
                    </Button>
                  )}
                  {order.canReview && (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowReviewModal(true)}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      Write Review
                    </Button>
                  )}
                  {order.canSellerReview && (
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setShowSellerReviewModal(true)
                      }}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      Review Buyer
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Deliver Order Modal */}
      <Dialog open={showDeliverModal} onOpenChange={setShowDeliverModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deliver Order</DialogTitle>
            <DialogDescription>
              Upload deliverables for this order. Buyer will be able to review and accept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {deliverables.map((deliverable, index) => (
              <div key={index} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Label>Deliverable {index + 1}</Label>
                  {deliverables.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDeliverable(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div>
                  <Label>Upload File *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        handleFileChange(index, file)
                      }}
                      accept="*/*"
                      className="cursor-pointer"
                    />
                    {deliverable.file && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span className="truncate max-w-[200px]">{deliverable.file.name}</span>
                        <span className="text-xs">({(deliverable.file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload the deliverable file (PDF, images, documents, etc.)
                  </p>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe this deliverable..."
                    value={deliverable.description || ''}
                    onChange={(e) => handleUpdateDeliverable(index, 'description', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={handleAddDeliverable} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Another Deliverable
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliverModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeliver}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Delivering..." : "Deliver Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your experience with this service
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Rating *</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setReview({ ...review, rating })}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        rating <= review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Review Comment *</Label>
              <Textarea
                placeholder="Share your experience..."
                value={review.comment}
                onChange={(e) => setReview({ ...review, comment: e.target.value })}
                rows={5}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seller Review Modal */}
      <Dialog open={showSellerReviewModal} onOpenChange={setShowSellerReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Buyer</DialogTitle>
            <DialogDescription>
              Share your experience working with this buyer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Rating *</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setSellerReview({ ...sellerReview, rating })}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        rating <= sellerReview.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Review Comment *</Label>
              <Textarea
                placeholder="Share your experience working with this buyer..."
                value={sellerReview.comment}
                onChange={(e) => setSellerReview({ ...sellerReview, comment: e.target.value })}
                rows={5}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSellerReviewModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!sellerReview.comment.trim()) {
                  showErrorToast("Please write a review comment")
                  return
                }

                setIsSubmitting(true)
                try {
                  const response = await fetch(`/service-hub/orders/${order.id}/seller-review`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                      rating: sellerReview.rating,
                      comment: sellerReview.comment,
                    }),
                  })

                  if (response.ok) {
                    showSuccessToast("Seller review submitted successfully!")
                    router.reload()
                  } else {
                    const data = await response.json()
                    showErrorToast(data.error || "Failed to submit review")
                  }
                } catch (error) {
                  showErrorToast("Failed to submit review")
                } finally {
                  setIsSubmitting(false)
                  setShowSellerReviewModal(false)
                }
              }}
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Order Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this order? Please provide a reason (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejection-reason" className="text-sm font-medium mb-2 block">
                Rejection Reason (Optional)
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter reason for rejecting this order..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false)
                setRejectionReason("")
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Reject Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FrontendLayout>
  )
}


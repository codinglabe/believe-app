"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import {
  ArrowLeft,
  Package,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  MessageCircle,
  Download,
  Star,
  Eye,
  Sparkles,
  Filter,
  Search,
} from "lucide-react"
import { Link, router } from "@inertiajs/react"
import { useState } from "react"
import { Head } from "@inertiajs/react"

// Mock data - replace with real data from backend
const mockOrders = [
  {
    id: 1,
    orderNumber: "SO-ABC123XYZ",
    service: {
      id: 1,
      title: "Professional Logo Design",
      image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400",
    },
    seller: {
      id: 1,
      name: "DesignPro",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    },
    package: "Standard",
    amount: 50,
    platformFee: 2.5,
    total: 52.5,
    status: "in_progress",
    paymentStatus: "paid",
    orderDate: "2024-01-15",
    deliveryDate: "2024-01-17",
    requirements: "I need a modern logo for my tech startup. Colors: blue and white. Style: minimalist.",
    canReview: false,
    canCancel: true,
  },
  {
    id: 2,
    orderNumber: "SO-DEF456UVW",
    service: {
      id: 2,
      title: "Website Development - React & Next.js",
      image: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400",
    },
    seller: {
      id: 2,
      name: "CodeMaster",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
    },
    package: "Premium",
    amount: 150,
    platformFee: 7.5,
    total: 157.5,
    status: "delivered",
    paymentStatus: "paid",
    orderDate: "2024-01-10",
    deliveryDate: "2024-01-17",
    deliveredDate: "2024-01-17",
    requirements: "Full-stack web application with user authentication and payment integration.",
    canReview: true,
    canCancel: false,
    deliverables: [
      { name: "Source Code", url: "#", type: "zip" },
      { name: "Documentation", url: "#", type: "pdf" },
    ],
  },
  {
    id: 3,
    orderNumber: "SO-GHI789RST",
    service: {
      id: 3,
      title: "Social Media Content Creation",
      image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400",
    },
    seller: {
      id: 3,
      name: "SocialBoost",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    },
    package: "Basic",
    amount: 45,
    platformFee: 2.25,
    total: 47.25,
    status: "completed",
    paymentStatus: "paid",
    orderDate: "2024-01-05",
    deliveryDate: "2024-01-07",
    deliveredDate: "2024-01-07",
    completedDate: "2024-01-08",
    requirements: "10 social media posts for Instagram and Facebook.",
    canReview: false,
    canCancel: false,
    deliverables: [
      { name: "Social Media Posts", url: "#", type: "images" },
    ],
  },
  {
    id: 4,
    orderNumber: "SO-JKL012MNO",
    service: {
      id: 4,
      title: "Voice Over Recording",
      image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400",
    },
    seller: {
      id: 4,
      name: "VoiceStudio",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
    },
    package: "Standard",
    amount: 80,
    platformFee: 4,
    total: 84,
    status: "pending",
    paymentStatus: "pending",
    orderDate: "2024-01-20",
    deliveryDate: "2024-01-21",
    requirements: "Professional voice over for a 2-minute commercial video.",
    canReview: false,
    canCancel: true,
  },
]

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
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredOrders = mockOrders.filter((order) => {
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.seller.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

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

  const handleReview = (orderId: number) => {
    router.visit(`/service-hub/${mockOrders.find((o) => o.id === orderId)?.service.id}/reviews`)
  }

  const handleCancel = (orderId: number) => {
    // Handle cancellation
    console.log("Cancel order:", orderId)
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
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order, index) => {
                    const statusInfo = getStatusConfig(order.status)
                    const StatusIcon = statusInfo.icon

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
                                    src={order.service.image}
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
                                      <AvatarImage src={order.seller.avatar} />
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
                                  Service: ${order.amount} + Fee: ${order.platformFee}
                                </div>
                              </div>
                            </div>

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
                            {order.deliverables && order.deliverables.length > 0 && (
                              <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2 mb-2">
                                  <Download className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                                    Deliverables:
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {order.deliverables.map((deliverable, idx) => (
                                    <a
                                      key={idx}
                                      href={deliverable.url}
                                      className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 hover:underline"
                                    >
                                      <FileText className="h-3 w-3" />
                                      {deliverable.name}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                              <Link href={`/service-hub/${order.service.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Service
                                </Button>
                              </Link>
                              <Link href={`/service-hub/seller/${order.seller.id}`}>
                                <Button variant="outline" size="sm">
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  Contact Seller
                                </Button>
                              </Link>
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
                              {order.canCancel && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleCancel(order.id)}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel Order
                                </Button>
                              )}
                              {order.status === "delivered" && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    // Mark as completed
                                    console.log("Mark as completed:", order.id)
                                  }}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Mark as Completed
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
    </FrontendLayout>
  )
}


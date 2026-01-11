"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import {
  Plus,
  Package,
  DollarSign,
  TrendingUp,
  Star,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  Settings,
  BarChart3,
  ShoppingBag,
  FileText,
  Sparkles,
  ArrowRight,
  Calendar,
  Users,
  CreditCard,
  XCircle,
  Trash2,
} from "lucide-react"
import { Link, router, usePage } from "@inertiajs/react"
import { Head } from "@inertiajs/react"

interface Profile {
  id: number
  bio: string
  location: string | null
  state: string | null
  profile_image: string | null
}

interface Service {
  id: number
  slug: string
  title: string
  image: string | null
  category: string
  price: number
  rating: number
  orders_count: number
  reviews_count: number
}

interface Order {
  id: number
  orderNumber: string
  serviceTitle: string
  serviceImage: string | null
  buyerName: string
  buyerAvatar: string | null
  amount: number
  sellerEarnings: number
  status: string
  paymentStatus: string
  createdAt: string
}

interface Stats {
  totalOrders: number
  pendingOrders: number
  inProgressOrders: number
  completedOrders: number
  totalEarnings: number
  pendingEarnings: number
  availableEarnings: number
  avgRating: number
  totalReviews: number
  totalServices: number
  activeServices: number
}

interface PageProps extends Record<string, unknown> {
  profile: Profile
  stats: Stats
  activeServices: Service[]
  recentOrders: Order[]
}

export default function SellerDashboard() {
  const { profile, stats, activeServices, recentOrders } = usePage<PageProps>().props

  const handleDeleteService = (serviceId: number, serviceTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${serviceTitle}"?\nThis action cannot be undone.`)) {
      return
    }

    router.delete(`/service-hub/services/${serviceId}`, {
      preserveScroll: true,
      onSuccess: () => {
        // Page will automatically refresh via Inertia
      },
      onError: (errors) => {
        alert(errors?.message || "Failed to delete service. Please try again.")
      },
    })
  }

  const statCards = [
    {
      title: "Total Earnings",
      value: `$${stats.totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      description: `$${stats.availableEarnings.toFixed(2)} available`,
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      icon: ShoppingBag,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      description: `${stats.completedOrders} completed`,
    },
    {
      title: "Active Services",
      value: stats.activeServices.toString(),
      icon: Package,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      description: `${stats.totalServices} total`,
    },
    {
      title: "Average Rating",
      value: stats.avgRating.toFixed(1),
      icon: Star,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      description: `${stats.totalReviews} reviews`,
    },
  ]

  const quickActions = [
    {
      title: "Create New Service",
      description: "Add a new service to your portfolio",
      icon: Plus,
      href: "/service-hub/create",
      color: "from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
    },
    {
      title: "View All Orders",
      description: "Manage and track your orders",
      icon: ShoppingBag,
      href: "/service-hub/seller-orders",
      color: "from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
    },
    {
      title: "Edit Profile",
      description: "Update your seller profile",
      icon: Settings,
      href: "/service-hub/seller-profile/edit",
      color: "from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
    },
    {
      title: "View Analytics",
      description: "See detailed performance metrics",
      icon: BarChart3,
      href: "#",
      color: "from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700",
    },
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
      in_progress: { label: "In Progress", variant: "default" as const, icon: Package },
      delivered: { label: "Delivered", variant: "default" as const, icon: CheckCircle2 },
      completed: { label: "Completed", variant: "default" as const, icon: CheckCircle2 },
      cancelled: { label: "Cancelled", variant: "destructive" as const, icon: XCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 text-xs sm:text-sm">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <FrontendLayout>
      <Head title="Seller Dashboard - Service Hub" />

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-12">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/service-hub">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <ArrowRight className="h-5 w-5 rotate-180" />
                  </Button>
                </Link>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold truncate">Seller Dashboard</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                    Manage your services and orders
                  </p>
                </div>
              </div>

              <Link href="/service-hub/create">
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="mr-1.5 h-4 w-4 sm:mr-2" />
                  <span className="hidden xs:inline">Create Service</span>
                  <span className="xs:hidden">New</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-2 hover:shadow-lg transition-all h-full">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-1">{stat.title}</p>
                          <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{stat.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                        </div>
                        <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor}`}>
                          <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Sparkles className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-sm">Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon
                    return (
                      <Link key={action.title} href={action.href}>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`bg-gradient-to-r ${action.color} text-white p-5 sm:p-6 rounded-xl cursor-pointer transition-all shadow-md hover:shadow-xl`}
                        >
                          <Icon className="h-7 w-7 sm:h-8 sm:w-8 mb-3" />
                          <h3 className="font-semibold text-base sm:text-lg mb-1">{action.title}</h3>
                          <p className="text-xs sm:text-sm text-white/80">{action.description}</p>
                        </motion.div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Active Services */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-2 h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Package className="h-5 w-5" />
                      Active Services
                    </CardTitle>
                    <CardDescription>Your published services</CardDescription>
                  </div>
                  <Link href="/service-hub/create">
                    <Button variant="outline" size="sm">
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add New
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {activeServices.length > 0 ? (
                    <div className="space-y-4">
                      {activeServices.map((service) => (
                        <Link key={service.id} href={`/service-hub/${service.slug}`}>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group relative"
                          >
                            <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                              {service.image && (
                                <img
                                  src={service.image}
                                  alt={service.title}
                                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-base sm:text-lg truncate">{service.title}</h4>
                                <p className="text-xs sm:text-sm text-muted-foreground">{service.category}</p>
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                                  <span className="font-medium">${service.price.toFixed(2)}</span>
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span>{service.rating.toFixed(1)}</span>
                                  </div>
                                  <span className="text-xs sm:text-sm text-muted-foreground">
                                    {service.orders_count} orders
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 absolute top-3 right-3 sm:relative sm:top-auto sm:right-auto">
                              <Link href={`/service-hub/${service.slug}/edit`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteService(service.id, service.title)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        </Link>
                      ))}

                      <Link href="/service-hub">
                        <Button variant="outline" className="w-full mt-4">
                          View All Services
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">You don't have any active services yet</p>
                      <Link href="/service-hub/create">
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Your First Service
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Orders */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="border-2 h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <ShoppingBag className="h-5 w-5" />
                      Recent Orders
                    </CardTitle>
                    <CardDescription>Latest orders from buyers</CardDescription>
                  </div>
                  <Link href="/service-hub/seller-orders">
                    <Button variant="outline" size="sm">
                      View All
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {recentOrders.length > 0 ? (
                    <div className="space-y-4">
                      {recentOrders.map((order) => (
                        <Link key={order.id} href={`/service-hub/orders/${order.id}`}>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            {order.serviceImage && (
                              <img
                                src={order.serviceImage}
                                alt={order.serviceTitle}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                                <h4 className="font-semibold text-sm sm:text-base truncate">{order.serviceTitle}</h4>
                                {getStatusBadge(order.status)}
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={order.buyerAvatar || undefined} />
                                  <AvatarFallback>{order.buyerName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground">{order.buyerName}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">
                                  Earnings: ${order.sellerEarnings.toFixed(2)}
                                </span>
                                <span className="text-xs text-muted-foreground">{order.createdAt}</span>
                              </div>
                            </div>
                          </motion.div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No orders received yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Order Status Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8"
          >
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <BarChart3 className="h-5 w-5" />
                  Order Status Overview
                </CardTitle>
                <CardDescription>Current order status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { title: "Pending", value: stats.pendingOrders, icon: Clock, color: "text-yellow-600" },
                    { title: "In Progress", value: stats.inProgressOrders, icon: Package, color: "text-blue-600" },
                    { title: "Completed", value: stats.completedOrders, icon: CheckCircle2, color: "text-green-600" },
                    {
                      title: "Available",
                      value: `$${stats.availableEarnings.toFixed(2)}`,
                      icon: DollarSign,
                      color: "text-green-600",
                      highlight: true,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className={`p-4 border rounded-lg text-center transition-all ${
                        item.highlight ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20" : ""
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <item.icon className={`h-6 w-6 ${item.color}`} />
                        <span className="font-semibold text-sm sm:text-base">{item.title}</span>
                        <p className="text-xl sm:text-2xl font-bold">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </FrontendLayout>
  )
}

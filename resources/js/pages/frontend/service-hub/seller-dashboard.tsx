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

  const statCards = [
    {
      title: "Total Earnings",
      value: `$${stats.totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      description: `$${stats.availableEarnings.toFixed(2)} available`,
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      icon: ShoppingBag,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      description: `${stats.completedOrders} completed`,
    },
    {
      title: "Active Services",
      value: stats.activeServices.toString(),
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      description: `${stats.totalServices} total`,
    },
    {
      title: "Average Rating",
      value: stats.avgRating.toFixed(1),
      icon: Star,
      color: "text-yellow-600",
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
      color: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
    },
    {
      title: "View All Orders",
      description: "Manage and track your orders",
      icon: ShoppingBag,
      href: "/service-hub/seller-orders",
      color: "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
    },
    {
      title: "Edit Profile",
      description: "Update your seller profile",
      icon: Settings,
      href: "/service-hub/seller-profile/edit",
      color: "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
    },
    {
      title: "View Analytics",
      description: "See detailed performance metrics",
      icon: BarChart3,
      href: "#",
      color: "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700",
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
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <FrontendLayout>
      <Head title="Seller Dashboard - Service Hub" />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/service-hub">
                  <Button variant="ghost" size="icon">
                    <ArrowRight className="h-5 w-5 rotate-180" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">Seller Dashboard</h1>
                  <p className="text-sm text-muted-foreground">Manage your services and orders</p>
                </div>
              </div>
              <Link href="/service-hub/create">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Service
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-2 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                          <p className="text-3xl font-bold">{stat.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                          <Icon className={`h-6 w-6 ${stat.color}`} />
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon
                    return (
                      <Link key={action.title} href={action.href}>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`${action.color} text-white p-6 rounded-lg cursor-pointer transition-all shadow-lg hover:shadow-xl`}
                        >
                          <Icon className="h-8 w-8 mb-3" />
                          <h3 className="font-semibold text-lg mb-1">{action.title}</h3>
                          <p className="text-sm text-white/80">{action.description}</p>
                        </motion.div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Services */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Active Services
                    </CardTitle>
                    <CardDescription>Your published services</CardDescription>
                  </div>
                  <Link href="/service-hub/create">
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
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
                            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            {service.image && (
                              <img
                                src={service.image}
                                alt={service.title}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold">{service.title}</h4>
                              <p className="text-sm text-muted-foreground">{service.category}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm font-medium">${service.price.toFixed(2)}</span>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm">{service.rating.toFixed(1)}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {service.orders_count} orders
                                </span>
                              </div>
                            </div>
                            <Link href={`/service-hub/${service.slug}/edit`}>
                              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          </motion.div>
                        </Link>
                      ))}
                      <Link href="/service-hub">
                        <Button variant="outline" className="w-full">
                          View All Services
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No services yet</p>
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
              <Card className="border-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
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
                            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            {order.serviceImage && (
                              <img
                                src={order.serviceImage}
                                alt={order.serviceTitle}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-semibold text-sm">{order.serviceTitle}</h4>
                                {getStatusBadge(order.status)}
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={order.buyerAvatar || undefined} />
                                  <AvatarFallback>{order.buyerName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground">{order.buyerName}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
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
                      <p className="text-muted-foreground">No orders yet</p>
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
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Order Status Overview
                </CardTitle>
                <CardDescription>Current order status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <span className="font-semibold">Pending</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">Awaiting your action</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold">In Progress</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.inProgressOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">Currently working</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Completed</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.completedOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">Successfully delivered</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Available</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">${stats.availableEarnings.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </FrontendLayout>
  )
}


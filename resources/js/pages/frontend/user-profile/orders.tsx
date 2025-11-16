"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Download, Eye, RotateCcw, ExternalLink, Package, Truck, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Link, usePage } from "@inertiajs/react"

interface OrderItem {
  name: string
  quantity: number
  price: number
  image?: string
}

interface Order {
  id: string
  date: string
  status: "delivered" | "shipped" | "processing" | "cancelled"
  total: number
  items: OrderItem[]
  organization: string
  tracking_number?: string
  delivery_date?: string
  estimated_delivery?: string
  refund_amount?: number
  refund_date?: string
  shipping_cost: number
}

interface PageProps {
  orders: Order[]
}

export default function ProfileOrders() {
  const { orders } = usePage<PageProps>().props

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "shipped":
        return <Truck className="h-4 w-4 text-blue-600" />
      case "processing":
        return <Package className="h-4 w-4 text-yellow-600" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "shipped":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "processing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const handleExport = () => {
    window.open("/profile/orders/export", "_blank")
  }

  return (
    <ProfileLayout title="Order History" description="Track your product orders and deliveries">
      <div className="space-y-6">
        {/* Export Button */}
        <div className="flex justify-end">
          <Button onClick={handleExport} variant="outline" className="bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            Export Orders
          </Button>
        </div>

        {/* Orders List */}
        {orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="border border-gray-200 dark:border-gray-600">
                <CardContent className="p-4 sm:p-6">
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Order {order.id}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Placed on {new Date(order.date).toLocaleDateString()} • {order.organization}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className={getStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                      <span className="font-bold text-lg text-gray-900 dark:text-white">${order.total}</span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3 mb-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <img
                          src={item.image || "/placeholder.svg?height=48&width=48"}
                          alt={item.name}
                          width={48}
                          height={48}
                          className="rounded object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.name}</h5>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Quantity: {item.quantity} × ${item.price}
                          </p>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          ${item.quantity * item.price}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                    {order.tracking_number && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Tracking:</span>
                        <div className="font-mono text-gray-900 dark:text-white">{order.tracking_number}</div>
                      </div>
                    )}
                    {order.delivery_date && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Delivered:</span>
                        <div className="text-gray-900 dark:text-white">
                          {new Date(order.delivery_date).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    {order.estimated_delivery && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Est. Delivery:</span>
                        <div className="text-gray-900 dark:text-white">
                          {new Date(order.estimated_delivery).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    {order.refund_amount && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Refund:</span>
                        <div className="text-green-600 font-medium">${order.refund_amount}</div>
                      </div>
                    )}
                  </div>

                  {/* Order Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <Button size="sm" variant="outline" className="bg-transparent">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {order.status === "delivered" && (
                      <Button size="sm" variant="outline" className="bg-transparent">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reorder
                      </Button>
                    )}
                    {order.tracking_number && (
                      <Button size="sm" variant="outline" className="bg-transparent">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Track Package
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No orders yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
              Start shopping for products from organizations you support.
                          </p>
                          <Button className="bg-blue-600 hover:bg-blue-700">
                              <Link className="flex items-center" href={route("marketplace.index")}>
              <Package className="h-4 w-4 mr-2" />
              Browse Order
                              </Link>
            </Button>
          </div>
        )}
      </div>
    </ProfileLayout>
  )
}

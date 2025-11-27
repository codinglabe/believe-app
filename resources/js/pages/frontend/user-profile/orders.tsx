"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Package, Calendar, DollarSign, FileText, ArrowRight } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Link, usePage } from "@inertiajs/react"

interface OrderItem {
  id: number
  name: string
  primary_image: string
  quantity: number
  unit_price: number
  total_price: number
}

interface Order {
  id: number
  order_number: string
  date: string
  datetime: string
  status: string
  payment_status: string
  total_amount: number
  item_count: number
  printify_order_id?: string
  printify_status?: string
  items: OrderItem[]
}

interface PageProps {
  orders: Order[]
}

export default function ProfileOrders() {
  const { orders } = usePage<PageProps>().props

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'processing': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'shipped': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'delivered': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  const getStatusText = (status: string) => {
    const texts = {
      'pending': 'Pending',
      'processing': 'Processing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'completed': 'Completed',
    }
    return texts[status] || status
  }

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'paid': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'refunded': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  const getPaymentStatusText = (status: string) => {
    const texts = {
      'pending': 'Payment Pending',
      'paid': 'Paid',
      'failed': 'Payment Failed',
      'refunded': 'Refunded',
    }
    return texts[status] || status
  }

  return (
    <ProfileLayout
      title="My Orders"
      description="View and track your order history"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order History</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track and manage your purchases
            </p>
          </div>
        </div>

        {/* Orders List */}
        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Order Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {order.order_number}
                          </h3>
                          <Badge variant="secondary" className={getStatusColor(order.status)}>
                            {getStatusText(order.status)}
                          </Badge>
                          <Badge variant="outline" className={getPaymentStatusColor(order.payment_status)}>
                            {getPaymentStatusText(order.payment_status)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{order.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            <span>{order.item_count} {order.item_count === 1 ? 'item' : 'items'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>${order.total_amount}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button asChild variant="outline" size="sm">
                        <Link href={route('user.profile.order-details', order.id)} preserveScroll={true}>
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex flex-wrap gap-4">
                      {order.items.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <img
                            src={item.primary_image || "/placeholder.svg"}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Qty: {item.quantity} × ${item.unit_price}
                            </p>
                          </div>
                        </div>
                      ))}
                      {order.item_count > 2 && (
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          +{order.item_count - 2} more items
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Printify Status */}
                  {/* {order.printify_order_id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Printify:</span>
                        <Badge variant="outline" className="text-xs">
                          {order.printify_status || 'Processing'}
                        </Badge>
                        <span className="text-gray-500 dark:text-gray-500 text-xs">
                          (ID: {order.printify_order_id})
                        </span>
                      </div>
                    </div>
                  )} */}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No orders yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                You haven't placed any orders yet. Start shopping to see your order history here.
              </p>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href={route('marketplace.index')}>
                  <Package className="h-4 w-4 mr-2" />
                  Browse Orders
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ProfileLayout>
  )
}

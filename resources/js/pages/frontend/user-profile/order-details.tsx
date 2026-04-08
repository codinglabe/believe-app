"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import {
  Package,
  Calendar,
  DollarSign,
  Truck,
  User,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  Printer,
  Download,
  ExternalLink,
  Navigation
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Link, usePage } from "@inertiajs/react"

interface OrderItem {
  id: number
  name: string
  description: string
  primary_image: string
  quantity: number
  unit_price: number
  subtotal: number
  printify_variant_id?: string
  variant_data?: any
}

interface ShippingInfo {
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  country: string
}

interface PrintifyDetails {
  id?: string
  status?: string
  shipping_method?: string
  estimated_delivery?: string
  total_tax?: number
  tracking_number?: string
  carrier?: string
  tracking_url?: string
  printify_connect?: {
    url?: string
  }
}

interface Order {
  id: number
  order_number: string
  date: string
  datetime: string
  status: string
  payment_status: string
  subtotal: number
  shipping_cost: number
  tax_amount: number
  printify_tax_amount?: number
  additional_sales_tax_adjustment?: number
  platform_fee: number
  donation_amount: number
  total_amount: number
  printify_order_id?: string
  printify_status?: string
  paid_at?: string
  shipping_method?: string
  tracking_number?: string | null
  tracking_url?: string | null
  carrier?: string | null
  label_url?: string | null
  shipping_status?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  shipping_info: ShippingInfo | null
  customer_account?: { name: string; email: string } | null
  items: OrderItem[]
  printify_details?: PrintifyDetails | null
}

interface PageProps {
  order: Order
}

export default function OrderDetails() {
  const { order } = usePage<PageProps>().props

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

  const carriers: { [key: string]: string } = {
    usps: (n: string) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
    ups: (n: string) => `https://www.ups.com/track?tracknum=${n}`,
    fedex: (n: string) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
    dhl: (n: string) =>
      `https://www.dhl.com/us-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=${n}`,
  }

  const getTrackingUrl = (
    trackingNumber: string,
    carrier?: string | null,
    explicitUrl?: string | null
  ) => {
    if (explicitUrl && explicitUrl.trim() !== "") return explicitUrl
    const c = (carrier || "").toLowerCase().replace(/\s+/g, "_")
    if (c && carriers[c]) return carriers[c](trackingNumber)
    if (c.includes("usps")) return carriers.usps(trackingNumber)
    if (c.includes("ups")) return carriers.ups(trackingNumber)
    if (c.includes("fedex")) return carriers.fedex(trackingNumber)
    if (c.includes("dhl")) return carriers.dhl(trackingNumber)
    return carriers.usps(trackingNumber)
  }

  const effectiveTrackingNumber =
    order.tracking_number || order.printify_details?.tracking_number || null
  const effectiveCarrier = order.carrier || order.printify_details?.carrier || null
  const effectiveTrackingUrl =
    order.tracking_url || order.printify_details?.tracking_url || null

  const canTrackOrder = () => {
    return (
      !!effectiveTrackingNumber &&
      order.status !== "cancelled" &&
      order.payment_status !== "refunded"
    )
  }

  const shippingStatusLabel = (code: string | null | undefined) => {
    if (!code) return null
    const map: Record<string, string> = {
      label_created: "Label created — carrier has the package",
      shipped: "In transit",
      completed: "Delivered",
    }
    return map[code] || code.replace(/_/g, " ")
  }

  const formatCityLine = (info: ShippingInfo) => {
    const parts = [info.city]
    if (info.state?.trim()) parts.push(info.state)
    parts.push(info.zip)
    return parts.join(", ")
  }

  return (
    <ProfileLayout
      title={`Order ${order.order_number}`}
      description="Order details and tracking information"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href={route('user.profile.orders')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Order {order.order_number}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Placed on {order.date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Track Order Button - Show only when order is shipped/delivered */}
            {canTrackOrder() && effectiveTrackingNumber && (
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <a
                  href={getTrackingUrl(effectiveTrackingNumber, effectiveCarrier, effectiveTrackingUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Track package
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status & Tracking */}
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Order Status & Tracking
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                      {order.shipping_status && (
                        <Badge variant="outline" className="border-violet-300 text-violet-800 dark:border-violet-700 dark:text-violet-200">
                          Delivery: {shippingStatusLabel(order.shipping_status)}
                        </Badge>
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Payment:{" "}
                        <Badge variant="outline" className={getPaymentStatusColor(order.payment_status)}>
                          {getPaymentStatusText(order.payment_status)}
                        </Badge>
                      </span>
                      {order.paid_at && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Paid on {order.paid_at}
                        </span>
                      )}
                    </div>

                    {!order.printify_order_id && order.shipping_status && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        After the seller buys a shipping label, status updates here and via carrier tracking. When the carrier
                        marks the package delivered, this page shows &quot;Delivered&quot;.
                      </p>
                    )}

                    {/* Tracking (Printify or Shippo / manual) */}
                    {canTrackOrder() && effectiveTrackingNumber && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Truck className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <h4 className="font-medium text-green-800 dark:text-green-300">
                            Tracking
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-green-700 dark:text-green-400 font-medium">Tracking number</span>
                            <p className="font-mono text-green-800 dark:text-green-300">{effectiveTrackingNumber}</p>
                          </div>
                          {effectiveCarrier && (
                            <div>
                              <span className="text-green-700 dark:text-green-400 font-medium">Carrier</span>
                              <p className="text-green-800 dark:text-green-300 capitalize">{effectiveCarrier}</p>
                            </div>
                          )}
                          {order.printify_details?.estimated_delivery && (
                            <div className="md:col-span-2">
                              <span className="text-green-700 dark:text-green-400 font-medium">Estimated delivery</span>
                              <p className="text-green-800 dark:text-green-300">
                                {order.printify_details.estimated_delivery}
                              </p>
                            </div>
                          )}
                          {order.shipped_at && (
                            <div className="md:col-span-2 text-sm text-green-800 dark:text-green-300">
                              Shipped / label created: {order.shipped_at}
                            </div>
                          )}
                          {order.delivered_at && (
                            <div className="md:col-span-2 text-sm text-green-800 dark:text-green-300">
                              Delivered: {order.delivered_at}
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button asChild size="sm" className="bg-green-600 hover:bg-green-700">
                            <a
                              href={getTrackingUrl(
                                effectiveTrackingNumber,
                                effectiveCarrier,
                                effectiveTrackingUrl
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Track on carrier site
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Shipping in Progress */}
                    {order.status === 'processing' && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <h4 className="font-medium text-blue-800 dark:text-blue-300">
                              Order in Production
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                              Your order is being prepared for shipping. Tracking information will be available soon.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Order Items ({order.items.length})
                </h3>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <img
                        src={item.primary_image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                        {item.variant_data && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Variant: {JSON.stringify(item.variant_data)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          ${item.subtotal}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.quantity} × ${item.unit_price}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Printify Details */}
            {order.printify_details && (
              <Card className="border border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Production Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <Badge variant="outline" className="ml-2">
                        {order.printify_details.status}
                      </Badge>
                    </div>
                    {order.printify_details.tracking_number && (
                      <div className="md:col-span-2">
                        <span className="text-gray-600 dark:text-gray-400">Tracking Number:</span>
                        <p className="font-mono font-medium text-gray-900 dark:text-white">
                          {order.printify_details.tracking_number}
                        </p>
                      </div>
                    )}
                    {order.printify_details.carrier && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Carrier:</span>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">
                          {order.printify_details.carrier}
                        </p>
                      </div>
                    )}
                    {order.printify_details.estimated_delivery && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Est. Delivery:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {order.printify_details.estimated_delivery}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Order Summary & Shipping */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Order Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${(Number(order?.subtotal) || 0).toFixed(2)}
                    </span>
                                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Platform Fee</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                                          ${(Number(order?.platform_fee) || 0).toFixed(2)}
                    </span>
                                  </div>
                                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Donation Amount</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                                          ${(Number(order?.donation_amount) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                                          ${(Number(order?.shipping_cost) || 0).toFixed(2)}
                    </span>
                  </div>
                  {(Number(order?.printify_tax_amount) > 0 || Number(order?.additional_sales_tax_adjustment) > 0) ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Sales tax (Printify)</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${(Number(order?.printify_tax_amount) || 0).toFixed(2)}
                        </span>
                      </div>
                      {(Number(order?.additional_sales_tax_adjustment) || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Additional sales tax adjustment</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${(Number(order?.additional_sales_tax_adjustment) || 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total tax</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${(Number(order?.tax_amount) || 0).toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tax</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${(Number(order?.tax_amount) || 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                      <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                        ${order?.total_amount}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            {order.shipping_info && (
              <Card className="border border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Shipping Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900 dark:text-white">
                        {order.shipping_info.first_name} {order.shipping_info.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900 dark:text-white">
                        {order.shipping_info.email}
                      </span>
                    </div>
                    {order.shipping_info.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">
                          {order.shipping_info.phone}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-900 dark:text-white">
                          {order.shipping_info.address}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {formatCityLine(order.shipping_info)}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {order.shipping_info.country}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  {canTrackOrder() && effectiveTrackingNumber && (
                    <Button asChild variant="outline" className="w-full justify-start">
                      <a
                        href={getTrackingUrl(
                          effectiveTrackingNumber,
                          effectiveCarrier,
                          effectiveTrackingUrl
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Track your package
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href={route('user.profile.orders')} preserveScroll={true}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Orders
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProfileLayout>
  )
}

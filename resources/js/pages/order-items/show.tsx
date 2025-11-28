import { Head, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, TrendingUp, Package, DollarSign } from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"

interface OrderInfo {
  id: number
  reference_number: string
  total_amount: string
  shipping_cost: string
  tax_amount: string
  status: string
  payment_status: string
  created_at: string
  user: {
    id: number
    name: string
    email: string
  }
  shipping_info: {
    first_name: string
    last_name: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    zip: string
    country: string
  } | null
}

interface ItemData {
  id: number
  order_id: number
  product_id: number
  organization_id: number
  name: string
  description: string
  quantity: number
  unit_price: string
  subtotal: string
  primary_image: string
  variant_data: any
  printify_product_id: string
  printify_blueprint_id: string
  printify_print_provider_id: string
  printify_variant_id: string
  printify_line_item_id: string
  printify_synced: boolean
  created_at: string
  updated_at: string
  product_cost: number
  printify_cost: number
  actual_cost: number
  profit: number
  printify_cost_details: {
    cost: number
    variant_title: string
    print_provider: string
    blueprint: string
  } | null
  product: {
    id: number
    name: string
    image: string
    description: string
    sku: string
    cost: number
  }
  organization: {
    id: number
    name: string
  }
  order: OrderInfo
}

interface Props {
  item: ItemData
  userRole: string
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Orders",
    href: "/orders",
  },
  {
    title: "Items",
    href: "/order-items",
  },
]

export default function Show({ item, userRole }: Props) {
  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(amount))
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getProfitColor = (profit: number) => {
    if (profit > 0) return "text-green-600 dark:text-green-400"
    if (profit < 0) return "text-red-600 dark:text-red-400"
    return "text-gray-600 dark:text-gray-400"
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Order Item - ${item.name}`} />
      <div className="flex h-full flex-1 flex-col gap-6 rounded-xl py-4 px-4 md:py-6 md:px-10 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/order-items">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Items
            </Button>
          </Link>
          <Badge variant={item.printify_synced ? "default" : "secondary"}>
            {item.printify_synced ? "Synced" : "Not Synced"}
          </Badge>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Image */}
          <div className="lg:col-span-1">
            {item.primary_image && (
              <img
                src={item.primary_image || "/placeholder.svg"}
                alt={item.name}
                className="w-full rounded-lg border border-border shadow-sm object-cover aspect-square"
              />
            )}
          </div>

          {/* Middle Column - Product Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Header */}
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{item.name}</h1>
              <p className="text-muted-foreground">{item.description}</p>
            </div>

            {/* Profit Card - Highlighted */}
            <Card className="border-2 border-primary bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Profit Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Product Cost</p>
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(item.product_cost)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Unit Price</p>
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(item.unit_price)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Profit per Unit</p>
                    <p
                      className={`text-lg font-semibold ${getProfitColor(Number(item.unit_price) - item.product_cost)}`}
                    >
                      {formatCurrency(Number(item.unit_price) - item.product_cost)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-medium">{item.quantity} units</span>
                    </div>
                    <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Unit Price</span>
                    <span className="font-medium">{formatCurrency(item.unit_price)}</span>
                    </div>

                    {/* Show Printify cost if available */}
                    {item.printify_cost > 0 && (
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Printify Cost (per unit)</span>
                        <span className="font-medium">{formatCurrency(item.printify_cost)}</span>
                    </div>
                    )}

                    {/* Show product cost if different from Printify cost */}
                    {item.product_cost > 0 && item.product_cost !== item.actual_cost && (
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Product Cost (per unit)</span>
                        <span className="font-medium">{formatCurrency(item.product_cost)}</span>
                    </div>
                    )}

                    <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Actual Cost (per unit)</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                        {formatCurrency(item.actual_cost)}
                    </span>
                    </div>

                    <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Product Cost</span>
                    <span className="font-medium">{formatCurrency(item.actual_cost * item.quantity)}</span>
                    </div>

                    <div className="border-t border-border pt-3 flex justify-between items-center">
                    <span className="text-foreground font-semibold">Subtotal</span>
                    <span className="text-xl font-bold text-foreground">{formatCurrency(item.subtotal)}</span>
                    </div>

                    <div className={`border-t border-border pt-3 flex justify-between items-center text-lg`}>
                    <span className="font-bold">Total Profit</span>
                    <span className={`text-xl font-bold ${getProfitColor(item.profit)}`}>
                        {formatCurrency(item.profit)}
                    </span>
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Section - Order and Organization Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-foreground">{item.organization?.name}</p>
              <p className="text-sm text-muted-foreground mt-2">ID: {item.organization?.id}</p>
            </CardContent>
          </Card>

          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">SKU</p>
                <p className="font-medium">{item.product?.sku || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Product Name</p>
                <p className="font-medium">{item.product?.name}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Related Order Information */}
        {item.order && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Related Order Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm text-muted-foreground mb-1">Order Reference</h4>
                    <Link href={`/orders/${item.order.id}`}>
                      <p className="text-lg font-semibold text-primary hover:underline">
                        {item.order.reference_number}
                      </p>
                    </Link>
                  </div>
                  <div>
                    <h4 className="text-sm text-muted-foreground mb-2">Order Status</h4>
                    <Badge className={getStatusColor(item.order.status)}>{item.order.status}</Badge>
                  </div>
                  <div>
                    <h4 className="text-sm text-muted-foreground mb-2">Payment Status</h4>
                    <Badge variant={item.order.payment_status === "paid" ? "default" : "secondary"}>
                      {item.order.payment_status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm text-muted-foreground mb-1">Order Date</h4>
                    <p className="font-medium">{new Date(item.order.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {userRole === "admin" && (
                    <>
                      <div>
                        <h4 className="text-sm text-muted-foreground mb-1">Shipping Cost</h4>
                        <p className="text-lg font-semibold">{formatCurrency(item.order.shipping_cost)}</p>
                      </div>
                      <div>
                        <h4 className="text-sm text-muted-foreground mb-1">Tax Amount</h4>
                        <p className="text-lg font-semibold">{formatCurrency(item.order.tax_amount)}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <h4 className="text-sm text-muted-foreground mb-1">Customer</h4>
                    <div>
                      <p className="font-medium">{item.order.user?.name}</p>
                      <p className="text-sm text-muted-foreground">{item.order.user?.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {item.order.shipping_info && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="font-semibold mb-4 text-foreground">Shipping Address</h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p className="text-foreground font-medium">
                      {item.order.shipping_info.first_name} {item.order.shipping_info.last_name}
                    </p>
                    <p>{item.order.shipping_info.address}</p>
                    <p>
                      {item.order.shipping_info.city}, {item.order.shipping_info.state} {item.order.shipping_info.zip}
                    </p>
                    <p>{item.order.shipping_info.country}</p>
                    <p className="pt-2">{item.order.shipping_info.phone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Printify Info */}
        {item.printify_product_id && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Printify Integration Details</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                    {item.printify_cost > 0 ? 'Printify Cost' : 'Product Cost'}
                </p>
                <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(item.printify_cost > 0 ? item.printify_cost : item.product_cost)}
                </p>
                </div>
                <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Unit Price</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(item.unit_price)}</p>
                </div>
                <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Profit per Unit</p>
                <p
                    className={`text-lg font-semibold ${getProfitColor(Number(item.unit_price) - item.actual_cost)}`}
                >
                    {formatCurrency(Number(item.unit_price) - item.actual_cost)}
                </p>
                </div>
            </div>

            {/* Show Printify cost details if available */}
            {item.printify_cost_details && (
                <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Printify Details:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                    <span className="text-muted-foreground">Variant:</span>
                    <p className="font-medium">{item.printify_cost_details.variant_title}</p>
                    </div>
                    <div>
                    <span className="text-muted-foreground">Provider:</span>
                    <p className="font-medium">{item.printify_cost_details.print_provider}</p>
                    </div>
                </div>
                </div>
            )}
            </CardContent>
          </Card>
              )}

      </div>
    </AppLayout>
  )
}

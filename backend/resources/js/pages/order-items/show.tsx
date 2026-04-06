import { Head, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, TrendingUp, Package, DollarSign, Heart, Gift, Target } from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"

interface OrderInfo {
  id: number
  reference_number: string
  total_amount: string
  status: string
  payment_status: string
  created_at: string
  user: {
    id: number
    name: string
    email: string
  }
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
  printify_variant_id: string
  printify_synced: boolean
  created_at: string
  updated_at: string
  product_cost: number
  actual_cost: number
  profit: number
  per_organization_donation_amount: number
  product: {
    id: number
    name: string
    image: string
    description: string
    sku: string
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

  // Calculate values
  const unitPrice = Number(item.unit_price)
  const subtotal = Number(item.subtotal)
  const donationPerUnit = item.per_organization_donation_amount / item.quantity
  const productCostPerUnit = item.actual_cost
  const profitPerUnit = unitPrice - productCostPerUnit
  const totalProfit = profitPerUnit * item.quantity
  const organizationProfit = item.per_organization_donation_amount // Donation goes 100% to organization

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
          <div className="flex items-center gap-3">
            <Badge variant={item.printify_synced ? "default" : "secondary"}>
              {item.printify_synced ? "Synced" : "Not Synced"}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Order: #{item.order.reference_number}
            </Badge>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Image */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden border-2 border-primary/20">
              <CardContent className="p-0">
                {item.primary_image ? (
                  <img
                    src={item.primary_image}
                    alt={item.name}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted flex items-center justify-center">
                    <Package className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Product Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Header */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold text-foreground">{item.name}</h1>
                  <p className="text-muted-foreground text-lg">{item.description}</p>
                  <div className="flex items-center gap-4 pt-2">
                    <Badge variant="outline" className="text-sm">
                      SKU: {item.product?.sku || "N/A"}
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      Qty: {item.quantity}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profit & Donation Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Total Profit Card */}
              <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg text-green-800 dark:text-green-200">Total Profit</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700 dark:text-green-300">Per Unit</span>
                      <span className={`text-lg font-bold ${getProfitColor(profitPerUnit)}`}>
                        {profitPerUnit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-green-200">
                      <span className="text-sm font-semibold text-green-800 dark:text-green-200">Total</span>
                      <span className={`text-2xl font-bold ${getProfitColor(totalProfit)}`}>
                        {totalProfit}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Donation Card */}
              <Card className="border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-pink-600" />
                    <CardTitle className="text-lg text-pink-800 dark:text-pink-200">Donation to Organization</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-pink-700 dark:text-pink-300">Per Unit</span>
                      <span className="text-lg font-bold text-pink-600 dark:text-pink-400">
                        {donationPerUnit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-pink-200">
                      <span className="text-sm font-semibold text-pink-800 dark:text-pink-200">Total Donation</span>
                      <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                        {item.per_organization_donation_amount}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Pricing Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {/* Unit Price */}
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Unit Price
                    </span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {unitPrice}
                    </span>
                  </div>

                  {/* Product Cost */}
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Product Cost (per unit)</span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">
                      {productCostPerUnit}
                    </span>
                  </div>

                  {/* Donation */}
                  {item.per_organization_donation_amount > 0 && (
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Gift className="h-4 w-4 text-pink-500" />
                        Donation (per unit)
                      </span>
                      <span className="font-medium text-pink-600 dark:text-pink-400">
                        +{donationPerUnit}
                      </span>
                    </div>
                  )}

                  {/* Profit per Unit */}
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Profit (per unit)</span>
                    <span className={`text-lg font-bold ${getProfitColor(profitPerUnit)}`}>
                      {profitPerUnit}
                    </span>
                  </div>

                  {/* Totals Section */}
                  <div className="space-y-3 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Units</span>
                      <span className="font-medium">{item.quantity} × {unitPrice}</span>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t-2 border-green-200">
                      <span className="text-lg font-bold text-foreground">Subtotal</span>
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        {subtotal}
                      </span>
                    </div>

                    {item.per_organization_donation_amount > 0 && (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-lg font-bold text-pink-600 dark:text-pink-400">Total Donation</span>
                        <span className="text-xl font-bold text-pink-600 dark:text-pink-400">
                          +{item.per_organization_donation_amount}
                        </span>
                      </div>
                    )}

                    <div className={`flex justify-between items-center pt-3 border-t-2 border-blue-200 text-lg`}>
                      <span className="font-bold text-blue-600 dark:text-blue-400">Total Profit</span>
                      <span className={`text-2xl font-bold ${getProfitColor(totalProfit)}`}>
                        {totalProfit}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Section - Organization & Order Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Organization Info with Donation Highlight */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-purple-800 dark:text-purple-200">
                <Package className="h-5 w-5" />
                Organization Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold text-foreground">{item.organization?.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">Organization ID: {item.organization?.id}</p>
                </div>

                {item.per_organization_donation_amount > 0 && (
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold">
                          Donation Received
                        </p>
                        <p className="text-xs text-muted-foreground">
                          100% of donation goes to organization
                        </p>
                      </div>
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {item.per_organization_donation_amount}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Order Reference</p>
                  <Link href={`/orders/${item.order.id}`}>
                    <p className="text-lg font-semibold text-primary hover:underline">
                      #{item.order.reference_number}
                    </p>
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(item.order.status)}>
                      {item.order.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment</p>
                    <Badge variant={item.order.payment_status === "paid" ? "default" : "secondary"}>
                      {item.order.payment_status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{new Date(item.order.created_at).toLocaleDateString()}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <div>
                    <p className="font-medium">{item.order.user?.name}</p>
                    <p className="text-sm text-muted-foreground">{item.order.user?.email}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Printify Integration Status */}
        {item.printify_product_id && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Printify Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Printify Product ID</p>
                  <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {item.printify_product_id}
                  </p>
                </div>
                {/* <Badge variant={item.printify_synced ? "default" : "secondary"}>
                  {item.printify_synced ? "✅ Synced" : "⚠️ Not Synced"}
                </Badge> */}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

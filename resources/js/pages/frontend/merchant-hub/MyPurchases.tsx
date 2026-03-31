import React from "react"
import { Link, router } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { ArrowLeft, ShoppingBag, Receipt, Coins, DollarSign, Calendar, Package, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

declare global {
  function route(name: string, params?: Record<string, unknown>): string
}

function offerImageSrc(src: string | undefined): string {
  if (!src || src === "/placeholder.jpg") return src || "/placeholder.jpg"
  if (src.startsWith("http") || src.startsWith("//") || src.startsWith("/storage")) return src
  return "/storage/" + src.replace(/^\//, "")
}

interface OfferRow {
  id: string
  receipt_code: string
  offer_title: string
  offer_image: string
  merchant_name: string
  points_used: number
  cash_paid: number | null
  status: string
  purchased_at: string
  confirmed_url: string
}

interface ProductOrderRow {
  id: number
  order_number: string
  total_amount: number
  status: string
  payment_status: string
  purchased_at: string
  primary_image: string
  summary: string
  detail_url: string
}

interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

interface Props {
  activeTab: "offers" | "products"
  offerCount: number
  productOrderCount: number
  offers: Paginated<OfferRow> | null
  productOrders: Paginated<ProductOrderRow> | null
}

export default function MyPurchases({
  activeTab,
  offerCount,
  productOrderCount,
  offers,
  productOrders,
}: Props) {
  const offerList = offers?.data ?? []
  const productList = productOrders?.data ?? []

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      approved: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
      fulfilled: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
      pending: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
      canceled: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
      processing: "bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30",
      paid: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    }
    return map[status] || "bg-muted text-muted-foreground"
  }

  const goTab = (t: "offers" | "products") => {
    router.get(route("merchant-hub.my-purchases"), { tab: t }, { preserveScroll: true })
  }

  const offersPage = offers?.current_page ?? 1
  const offersLast = offers?.last_page ?? 1
  const productsPage = productOrders?.current_page ?? 1
  const productsLast = productOrders?.last_page ?? 1

  return (
    <FrontendLayout>
      <PageHead title="My Purchases" description="Merchant Hub offers and product orders." />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <Link href="/merchant-hub">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Merchant Hub
              </Button>
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Purchases</h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base mb-6">
            Offer redemptions and merchant product orders from checkout.
          </p>

          <div className="flex p-1 rounded-xl bg-muted/80 border border-border mb-6 max-w-md">
            <button
              type="button"
              onClick={() => goTab("offers")}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors",
                activeTab === "offers" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Offers
              <span className="ml-1.5 text-xs tabular-nums opacity-80">({offerCount})</span>
            </button>
            <button
              type="button"
              onClick={() => goTab("products")}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors",
                activeTab === "products" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Products
              <span className="ml-1.5 text-xs tabular-nums opacity-80">({productOrderCount})</span>
            </button>
          </div>

          {activeTab === "offers" && (
            <>
              {offerList.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-60" />
                    <p className="text-muted-foreground font-medium">No offer redemptions yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Redeem offers from the Merchant Hub to see them here.</p>
                    <Link href="/merchant-hub">
                      <Button className="mt-4">Browse offers</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {offerList.map((p) => (
                      <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="aspect-[4/3] relative bg-muted w-full">
                          <img
                            src={offerImageSrc(p.offer_image)}
                            alt={p.offer_title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge className={`${getStatusBadge(p.status)} text-xs px-2 py-0.5`}>{p.status}</Badge>
                          </div>
                        </div>
                        <CardContent className="p-3 space-y-2">
                          <h3 className="font-semibold text-foreground text-sm line-clamp-2">{p.offer_title}</h3>
                          <p className="text-xs text-muted-foreground truncate">{p.merchant_name}</p>
                          <div className="flex flex-wrap gap-2 text-sm">
                            {p.points_used > 0 && (
                              <span className="inline-flex items-center gap-1 text-primary">
                                <Coins className="h-3.5 w-3.5" />
                                {p.points_used.toLocaleString()} pts
                              </span>
                            )}
                            {p.cash_paid != null && p.cash_paid > 0 && (
                              <span className="inline-flex items-center gap-1 text-foreground">
                                <DollarSign className="h-3.5 w-3.5" />
                                {p.cash_paid.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(p.purchased_at).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-2 pt-2">
                            <Link href={p.confirmed_url} className="min-w-0 flex-1">
                              <Button variant="outline" size="sm" className="w-full gap-1.5">
                                <Receipt className="h-3.5 w-3.5 shrink-0" />
                                View receipt
                              </Button>
                            </Link>
                            <span className="text-xs text-muted-foreground font-mono truncate max-w-20" title={p.receipt_code}>
                              {p.receipt_code}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {(offersLast > 1 || offersPage > 1) && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      {offersPage > 1 && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            router.get(route("merchant-hub.my-purchases"), { tab: "offers", page: offersPage - 1 })
                          }
                        >
                          Previous
                        </Button>
                      )}
                      <span className="text-sm text-muted-foreground">
                        Page {offersPage} of {offersLast}
                      </span>
                      {offersPage < offersLast && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            router.get(route("merchant-hub.my-purchases"), { tab: "offers", page: offersPage + 1 })
                          }
                        >
                          Next
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === "products" && (
            <>
              {productList.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-60" />
                    <p className="text-muted-foreground font-medium">No product orders yet</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                      Buy from the Merchant Hub products tab — orders paid through checkout appear here. You can also view all
                      orders in your account under{" "}
                      <Link href={route("user.profile.orders")} className="text-primary underline">
                        Profile → Orders
                      </Link>
                      .
                    </p>
                    <Link href="/merchant-hub?tab=products">
                      <Button className="mt-4">Browse products</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {productList.map((o) => (
                      <Card key={o.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="aspect-[4/3] relative bg-muted w-full">
                          <img src={o.primary_image || "/placeholder.jpg"} alt={o.summary} className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                            <Badge className={`${getStatusBadge(o.status)} text-xs px-2 py-0.5`}>{o.status}</Badge>
                            <Badge className={`${getStatusBadge(o.payment_status)} text-xs px-2 py-0.5`}>{o.payment_status}</Badge>
                          </div>
                        </div>
                        <CardContent className="p-3 space-y-2">
                          <h3 className="font-semibold text-foreground text-sm line-clamp-2">{o.summary}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{o.order_number}</p>
                          <p className="text-sm font-semibold tabular-nums">${o.total_amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(o.purchased_at).toLocaleDateString()}
                          </p>
                          <Link href={o.detail_url} className="block pt-1">
                            <Button variant="default" size="sm" className="w-full gap-1.5">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Order details
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {(productsLast > 1 || productsPage > 1) && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      {productsPage > 1 && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            router.get(route("merchant-hub.my-purchases"), { tab: "products", page: productsPage - 1 })
                          }
                        >
                          Previous
                        </Button>
                      )}
                      <span className="text-sm text-muted-foreground">
                        Page {productsPage} of {productsLast}
                      </span>
                      {productsPage < productsLast && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            router.get(route("merchant-hub.my-purchases"), { tab: "products", page: productsPage + 1 })
                          }
                        >
                          Next
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}

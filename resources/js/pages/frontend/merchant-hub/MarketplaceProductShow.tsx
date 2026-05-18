import React, { useState } from "react"
import { Link, router, usePage } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { ArrowLeft, Store, ShoppingCart, Minus, Plus, Loader2 } from "lucide-react"
import axios from "axios"
import { showErrorToast, showSuccessToast } from "@/lib/toast"

declare global {
  function route(name: string, params?: Record<string, unknown>): string
}

interface Props {
  product: {
    id: number
    name: string
    description: string | null
    product_type: string
    price: number
    price_display: string
    images: string[]
    category: string | null
    merchant: { id: number; name: string } | null
    marketplace_product_id: number
    can_purchase: boolean
    purchase_message: string | null
    max_quantity: number | null
    pickup_available?: boolean
    pickup_address?: string | null
  }
}

export default function MarketplaceProductShow({ product }: Props) {
  const { auth } = usePage().props as { auth?: { user?: unknown } }
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)

  const cap =
    product.max_quantity !== null && product.max_quantity !== undefined
      ? Math.max(1, product.max_quantity)
      : 999

  const addPayload = () => ({
    marketplace_product_id: product.marketplace_product_id,
    quantity,
  })

  const requireLogin = () => {
    const dest = window.location.href
    router.visit(`/login?redirect=${encodeURIComponent(dest)}`)
  }

  const handleAddToCart = async () => {
    if (!auth?.user) {
      requireLogin()
      return
    }
    if (!product.can_purchase || !product.marketplace_product_id) {
      showErrorToast(product.purchase_message || "This product cannot be added to cart.")
      return
    }
    if (quantity > cap) {
      showErrorToast(product.max_quantity != null ? `Only ${product.max_quantity} available` : "Invalid quantity")
      return
    }
    setLoading(true)
    try {
      const res = await axios.post(route("cart.add"), addPayload())
      if (res.data.success) {
        showSuccessToast(res.data.message || "Added to cart")
      } else {
        showErrorToast(res.data.message || "Could not add to cart")
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; error?: string } } }
      showErrorToast(err.response?.data?.message || err.response?.data?.error || "Failed to add to cart")
    } finally {
      setLoading(false)
    }
  }

  const handleBuyNow = async () => {
    if (!auth?.user) {
      requireLogin()
      return
    }
    if (!product.can_purchase || !product.marketplace_product_id) {
      showErrorToast(product.purchase_message || "This product cannot be purchased.")
      return
    }
    if (quantity > cap) {
      showErrorToast(product.max_quantity != null ? `Only ${product.max_quantity} available` : "Invalid quantity")
      return
    }
    setLoading(true)
    try {
      const res = await axios.post(route("cart.add"), addPayload())
      if (!res.data.success) {
        showErrorToast(res.data.message || "Could not add to cart")
        setLoading(false)
        return
      }
      router.visit(route("checkout.show"))
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; error?: string } } }
      showErrorToast(err.response?.data?.message || err.response?.data?.error || "Failed to add to cart")
      setLoading(false)
    }
  }

  const mainImage = product.images?.[0] || "/placeholder.jpg"

  return (
    <FrontendLayout>
      <PageHead title={product.name} description={product.description || "Merchant product on Believe In Unity."} />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Link
            href={`${route("merchant-hub.index")}?tab=products`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Merchant Hub
          </Link>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="aspect-square rounded-xl overflow-hidden border bg-muted">
                <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {product.images.slice(1, 6).map((src, i) => (
                    <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-md border" />
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {product.category && <Badge variant="secondary">{product.category}</Badge>}
                <Badge variant="outline" className="capitalize">
                  {product.product_type}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              {product.merchant && (
                <p className="flex items-center gap-2 text-muted-foreground mb-4">
                  <Store className="h-4 w-4" />
                  {product.merchant.name}
                </p>
              )}
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-4">{product.price_display}</p>

              {product.purchase_message && !product.can_purchase && (
                <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                  {product.purchase_message}
                </p>
              )}

              {product.description && (
                <Card className="mb-6">
                  <CardContent className="pt-6 text-sm text-muted-foreground whitespace-pre-wrap">
                    {product.description}
                  </CardContent>
                </Card>
              )}

              <p className="text-sm text-muted-foreground mb-4">
                Purchases use the same cart, checkout, payment, and shipping (Shippo for physical items) as nonprofit marketplace listings.
              </p>

              {product.pickup_available && product.pickup_address && ["physical", "service", "media"].includes(product.product_type) && (
                <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Local pickup available</p>
                  <p className="whitespace-pre-line">{product.pickup_address}</p>
                  <p className="mt-1 text-xs">If you choose pickup at checkout, shipping is free.</p>
                </div>
              )}

              {product.can_purchase && product.marketplace_product_id ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Quantity</span>
                    <div className="flex items-center gap-2 border rounded-lg">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        disabled={loading || quantity <= 1}
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center font-medium">{quantity}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        disabled={loading || quantity >= cap}
                        onClick={() => setQuantity((q) => Math.min(cap, q + 1))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {product.max_quantity != null && (
                      <span className="text-xs text-muted-foreground">{product.max_quantity} in stock</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      type="button"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
                      disabled={loading}
                      onClick={handleAddToCart}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                      Add to cart
                    </Button>
                    <Button type="button" variant="secondary" className="flex-1" disabled={loading} onClick={handleBuyNow}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Buy now
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {!auth?.user ? (
                    <Button type="button" className="w-full sm:w-auto" onClick={requireLogin}>
                      Sign in to purchase
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}

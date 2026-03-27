import React, { useEffect, useState } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Package, Search } from "lucide-react"
import { toast } from "sonner"

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Merchant product pool", href: "/marketplace/product-pool" },
]

interface MerchantMini {
  id: number
  business_name: string | null
  name: string | null
}

interface PoolRow {
  id: number
  name: string
  description: string | null
  category: string | null
  base_price: string
  min_resale_price: string | null
  suggested_retail_price: string | null
  product_type: string
  images?: string[] | null
  nonprofit_approval_type: string
  already_adopted: boolean
  merchant?: MerchantMini | null
}

interface Paginated {
  data: PoolRow[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  links: { url: string | null; label: string; active: boolean }[]
}

interface Props {
  products: Paginated
  categories: string[]
  filters: { search: string; category: string }
}

export default function MarketplaceProductPoolIndex({ products, categories, filters: initial }: Props) {
  const [search, setSearch] = useState(initial.search || "")
  const [category, setCategory] = useState(initial.category || "")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<PoolRow | null>(null)
  const [customPrice, setCustomPrice] = useState("")
  const [message, setMessage] = useState("")
  const [featured, setFeatured] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { success, flash, errors } = usePage().props as {
    success?: string
    flash?: { success?: string }
    errors?: Record<string, string>
  }

  useEffect(() => {
    const msg = success || flash?.success
    if (msg) toast.success(msg)
  }, [success, flash?.success])

  const applyFilters = () => {
    router.get(
      "/marketplace/product-pool",
      { search: search || undefined, category: category || undefined },
      { preserveState: true, replace: true },
    )
  }

  const openSell = (p: PoolRow) => {
    setSelected(p)
    const suggested = p.suggested_retail_price || p.base_price
    setCustomPrice(String(Number(suggested)))
    setMessage("")
    setFeatured(false)
    setDialogOpen(true)
  }

  const submitAdopt = () => {
    if (!selected) return
    setSubmitting(true)
    router.post(
      "/marketplace/product-pool/adopt",
      {
        marketplace_product_id: selected.id,
        custom_price: customPrice,
        supporter_message: message || null,
        is_featured: featured,
      },
      {
        preserveScroll: true,
        onFinish: () => setSubmitting(false),
        onSuccess: () => {
          setDialogOpen(false)
          setSelected(null)
        },
      },
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Merchant product pool" />
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Package className="h-7 w-7" />
              Add products from the merchant pool
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Browse items merchants have listed for nonprofits. When you sell one, your listing uses your price and message.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Search by name or narrow by category.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Button type="button" variant="secondary" onClick={applyFilters}>
              Apply
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.data.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-12">No products in the pool yet.</p>
          )}
          {products.data.map((p) => (
            <Card key={p.id} className="overflow-hidden flex flex-col">
              <div className="aspect-video bg-muted flex items-center justify-center">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-12 w-12 text-muted-foreground/50" />
                )}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base leading-snug">{p.name}</CardTitle>
                <CardDescription className="line-clamp-2">{p.description || "—"}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <p className="text-sm text-muted-foreground">
                  From {p.merchant?.business_name || p.merchant?.name || "Merchant"} · {p.category || "General"}
                </p>
                <p className="text-sm font-medium">Base ${Number(p.base_price).toFixed(2)}</p>
                {p.already_adopted ? (
                  <Button variant="outline" size="sm" disabled className="w-full">
                    Already selling
                  </Button>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => openSell(p)}>
                    Sell this product
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {products.last_page > 1 && (
          <div className="flex flex-wrap justify-center gap-2">
            {products.links.map((l, i) =>
              l.url ? (
                <Button
                  key={i}
                  type="button"
                  variant={l.active ? "default" : "outline"}
                  size="sm"
                  onClick={() => l.url && router.visit(l.url)}
                  dangerouslySetInnerHTML={{ __html: l.label }}
                />
              ) : (
                <span key={i} className="px-2 py-1 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: l.label }} />
              ),
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>List “{selected?.name}”</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="price">Your selling price (USD)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
              {selected?.min_resale_price != null && (
                <p className="text-xs text-muted-foreground mt-1">Minimum: ${Number(selected.min_resale_price).toFixed(2)}</p>
              )}
              {errors?.custom_price && <p className="text-sm text-destructive mt-1">{errors.custom_price}</p>}
              {errors?.marketplace_product_id && (
                <p className="text-sm text-destructive mt-1">{errors.marketplace_product_id}</p>
              )}
            </div>
            <div>
              <Label htmlFor="msg">Message to supporters (optional)</Label>
              <Textarea
                id="msg"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Proceeds support our youth programs"
              />
            </div>
            <div className="flex items-center gap-2">
              <input id="feat" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
              <label htmlFor="feat" className="text-sm">
                Feature on our profile (optional)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitAdopt} disabled={submitting}>
              {submitting ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

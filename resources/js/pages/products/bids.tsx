"use client"

import AppLayout from "@/layouts/app-layout"
import { usePage, router, Link } from "@inertiajs/react"
import { ArrowLeft, Ban, CheckCircle2, Clock, DollarSign, MapPin, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { BreadcrumbItem } from "@/types"

interface BidUser {
  id: number | null
  name: string | null
  city?: string | null
  state?: string | null
  location?: string | null
}

interface Bid {
  id: number
  bid_amount: number
  bid_amount_formatted: string
  status: string
  submitted_at: string | null
  user: BidUser | null
}

interface BidsPageProps {
  product: {
    id: number
    name: string
    pricing_model?: string
    has_winner?: boolean
    can_close_bidding?: boolean
  }
  bids: {
    data: Bid[]
    current_page: number
    last_page: number
    total: number
    from: number | null
    to: number | null
    prev_page_url: string | null
    next_page_url: string | null
  }
}

const formatDateTime = (iso: string | null) => {
  if (!iso) return "-"
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}

export default function ProductBidsPage() {
  const { product, bids } = usePage<BidsPageProps>().props

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Products", href: "/products" },
    { title: "Bids", href: route("products.bids.index", { product: product.id }) },
  ]

  const handleCancelBid = (bid: Bid) => {
    if (!confirm("Are you sure you want to cancel this bid? Bidders will be notified.")) {
      return
    }
    router.post(
      route("products.bids.cancel", {
        product: product.id,
        bid: bid.id,
      }),
      {},
      {
        preserveScroll: true,
      },
    )
  }

  const goToPage = (page: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set("page", String(page))
    router.get(url.pathname + url.search, {}, { preserveScroll: true, preserveState: true })
  }

  const totalBids = bids.total

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href={route("products.index")}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Products
              </Link>
            </div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight">
              Bids for <span className="text-primary">{product.name}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Total bids: <strong>{totalBids}</strong>
            </p>
          </div>
          {product.can_close_bidding && (
            <Button
              onClick={() => {
                if (!confirm("Close bidding and select the highest bidder as winner? Winner will be notified to pay.")) return
                router.post(route("products.bids.close", { product: product.id }), {}, { preserveScroll: true })
              }}
              className="gap-2"
            >
              <Flag className="w-4 h-4" />
              Close bidding & select winner
            </Button>
          )}
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="border-b px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>Bid history</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bidder</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bids.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Clock className="w-8 h-8 text-muted-foreground" />
                        <p className="font-medium">No bids yet</p>
                        <p className="text-xs max-w-md">
                          Once supporters place bids on this product, you will see them here along with their bid amounts
                          and locations.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bids.data.map((bid) => {
                    const status = bid.status?.toLowerCase()
                    let statusVariant: "default" | "secondary" | "destructive" = "secondary"
                    let statusLabel = bid.status.toUpperCase()

                    if (status === "active") statusVariant = "secondary"
                    if (status === "winning") statusVariant = "default"
                    if (status === "cancelled" || status === "rejected") statusVariant = "destructive"

                    return (
                      <tr key={bid.id} className="border-t">
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">
                              {bid.user?.name || "Supporter #" + bid.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{bid.user?.location || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="font-semibold">{bid.bid_amount_formatted}</span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Badge variant={statusVariant} className="text-xs">
                            {status === "winning" ? (
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Winning
                              </span>
                            ) : status === "cancelled" ? (
                              <span className="inline-flex items-center gap-1">
                                <Ban className="w-3 h-3" />
                                Cancelled
                              </span>
                            ) : (
                              statusLabel
                            )}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                          {formatDateTime(bid.submitted_at)}
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          {status === "cancelled" ? (
                            <span className="text-xs text-muted-foreground italic">Already cancelled</span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleCancelBid(bid)}
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Cancel bid
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {bids.total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground flex-wrap gap-3">
              <div>
                Showing {bids.from ?? 0}–{bids.to ?? 0} of {bids.total} bid(s)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!bids.prev_page_url}
                  onClick={() => goToPage(bids.current_page - 1)}
                >
                  Previous
                </Button>
                <span>
                  Page {bids.current_page} of {bids.last_page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!bids.next_page_url}
                  onClick={() => goToPage(bids.current_page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}


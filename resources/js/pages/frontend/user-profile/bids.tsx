"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Link, usePage } from "@inertiajs/react"
import { Gavel, Package, DollarSign, Ban, CheckCircle2, Clock } from "lucide-react"
import { Badge } from "@/components/frontend/ui/badge"

interface Bid {
  id: number
  bid_amount: number
  bid_amount_formatted: string
  status: string
  submitted_at: string | null
  product: { id: number; name: string; pricing_model: string } | null
}

interface PageProps {
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

function formatDate(iso: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}

export default function ProfileBids() {
  const { bids } = usePage<PageProps>().props
  const list = bids.data ?? []

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase()
    if (s === "cancelled") {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-0">
          <Ban className="w-3 h-3 mr-1 inline" />
          CANCELLED
        </Badge>
      )
    }
    if (s === "winning") {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-0">
          <CheckCircle2 className="w-3 h-3 mr-1 inline" />
          Winning
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="capitalize">
        {status || "Active"}
      </Badge>
    )
  }

  return (
    <ProfileLayout
      title="My Bids"
      description="Bids you placed on auction and blind-bid products. Cancelled bids are shown here; you will also receive an email and notification when a bid is cancelled."
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total: <strong className="text-gray-900 dark:text-white">{bids.total}</strong> bid{bids.total !== 1 ? "s" : ""}
        </p>

        {list.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
            <Gavel className="w-14 h-14 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">You haven’t placed any bids yet.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Bids appear here when you place them on auction or blind-bid products from the{" "}
              <Link href="/marketplace" className="text-violet-600 dark:text-violet-400 hover:underline">
                marketplace
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {list.map((bid) => (
                <div
                  key={bid.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Package className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                        {bid.product ? (
                          <Link
                            href={`/products/${bid.product.id}`}
                            className="font-semibold text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                          >
                            {bid.product.name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-gray-900 dark:text-white">Product</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <DollarSign className="w-4 h-4" />
                          {bid.bid_amount_formatted}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {formatDate(bid.submitted_at)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(bid.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(bids.prev_page_url || bids.next_page_url) && (
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 flex-wrap gap-3">
                <span>
                  Showing {bids.from ?? 0}–{bids.to ?? 0} of {bids.total}
                </span>
                <div className="flex gap-2">
                  {bids.prev_page_url && (
                    <Link
                      href={bids.prev_page_url}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Previous
                    </Link>
                  )}
                  {bids.next_page_url && (
                    <Link
                      href={bids.next_page_url}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ProfileLayout>
  )
}

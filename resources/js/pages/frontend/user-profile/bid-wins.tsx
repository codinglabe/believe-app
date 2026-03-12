"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { usePage, router, Link } from "@inertiajs/react"
import { Trophy, DollarSign, Calendar, CreditCard } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"

interface WinProduct {
  id: number
  name: string
  image: string | null
  amount: number
  amount_formatted: string
  payment_deadline: string | null
}

interface PageProps {
  products: WinProduct[]
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return iso
  }
}

export default function ProfileBidWins() {
  const { products } = usePage<PageProps>().props

  const handlePay = (productId: number) => {
    router.post(route("products.winning-bid.checkout", { product: productId }))
  }

  return (
    <ProfileLayout
      title="Winning Bids"
      description="Products you won. Complete payment by the deadline to receive your item."
    >
      <div className="space-y-6">
        {!products || products.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
            <Trophy className="w-14 h-14 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No pending winning bids.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              When you win an auction or blind bid, items will appear here for payment.
            </p>
            <Link href="/profile/bids" className="inline-block mt-4 text-violet-600 dark:text-violet-400 hover:underline text-sm font-medium">
              View my bids
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {p.image && (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-20 h-20 object-cover rounded-lg shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <strong className="text-gray-900 dark:text-white">{p.amount_formatted}</strong>
                    </span>
                    {p.payment_deadline && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Pay by: {formatDate(p.payment_deadline)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <Button
                    onClick={() => handlePay(p.id)}
                    className="gap-2 bg-violet-600 hover:bg-violet-700"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProfileLayout>
  )
}

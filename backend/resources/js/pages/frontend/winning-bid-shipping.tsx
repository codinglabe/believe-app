"use client"

import axios from "axios"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { usePage, Link } from "@inertiajs/react"
import { useState } from "react"
import { Button } from "@/components/frontend/ui/button"
import { Package, ArrowLeft } from "lucide-react"
import { showErrorToast } from "@/lib/toast"

interface Method {
  id: string
  name: string
  cost: number
  estimated_days?: string
  provider?: string
}

interface PageProps {
  product: { id: number; name: string; image: string | null }
  bid_amount: number
  bid_amount_formatted: string
  estimated_tax: number
  payment_deadline: string | null
  shipping_methods: Method[]
}

function formatDeadline(iso: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return iso
  }
}

export default function WinningBidShipping() {
  const { product, bid_amount, bid_amount_formatted, estimated_tax, payment_deadline, shipping_methods } =
    usePage<PageProps>().props

  const [selected, setSelected] = useState(() => shipping_methods[0]?.id ?? "")
  const [processing, setProcessing] = useState(false)

  const selectedMethod = shipping_methods.find((m) => m.id === selected)
  const shipping = selectedMethod?.cost ?? 0
  const total = bid_amount + shipping + estimated_tax

  const submit = async () => {
    if (!selected) return
    setProcessing(true)
    try {
      const { data } = await axios.post<{ redirect?: string }>(
        route("products.winning-bid.checkout", { product: product.id }),
        { shippo_rate_object_id: selected },
        { headers: { Accept: "application/json" } }
      )
      if (data?.redirect) {
        window.location.assign(data.redirect)
        return
      }
      showErrorToast("Invalid response from server.")
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const d = ax.response?.data
      const msg =
        (d?.errors && Object.values(d.errors).flat()[0]) ||
        d?.message ||
        "Failed to start payment."
      showErrorToast(typeof msg === "string" ? msg : "Failed to start payment.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <ProfileLayout
      title="Choose shipping"
      description="Select a Shippo rate. Your card will be charged for your winning bid, shipping, and estimated tax."
    >
      <div className="max-w-2xl space-y-6">
        <Link
          href={route("user.profile.bid-wins")}
          className="inline-flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to winning bids
        </Link>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 flex gap-4">
          {product.image && (
            <img src={product.image} alt="" className="w-20 h-20 object-cover rounded-lg shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 dark:text-white">{product.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Winning bid: <strong className="text-gray-900 dark:text-white">{bid_amount_formatted}</strong>
            </p>
            {payment_deadline && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                Pay by: {formatDeadline(payment_deadline)}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Package className="h-5 w-5" />
            Shipping options (Shippo)
          </h3>
          <div className="space-y-2">
            {shipping_methods.map((m) => (
              <label
                key={m.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-all ${
                  selected === m.id
                    ? "border-violet-600 bg-violet-50 dark:border-violet-500 dark:bg-violet-950/30"
                    : "border-gray-200 dark:border-gray-600 hover:border-violet-300"
                }`}
              >
                <input
                  type="radio"
                  name="rate"
                  className="mt-1"
                  checked={selected === m.id}
                  onChange={() => setSelected(m.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white">{m.name}</div>
                  {m.estimated_days != null && m.estimated_days !== "—" && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Est. {m.estimated_days} days
                    </div>
                  )}
                </div>
                <div className="font-semibold text-gray-900 dark:text-white shrink-0">${m.cost.toFixed(2)}</div>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-5 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Winning bid</span>
            <span className="text-gray-900 dark:text-white">{bid_amount_formatted}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Shipping</span>
            <span className="text-gray-900 dark:text-white">${shipping.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Est. tax</span>
            <span className="text-gray-900 dark:text-white">${estimated_tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white">Total due</span>
            <span className="text-violet-600 dark:text-violet-400">${total.toFixed(2)}</span>
          </div>
        </div>

        <Button
          type="button"
          disabled={!selected || processing}
          onClick={submit}
          className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
        >
          {processing ? "Redirecting to payment…" : `Pay ${total.toFixed(2)} with card`}
        </Button>
      </div>
    </ProfileLayout>
  )
}

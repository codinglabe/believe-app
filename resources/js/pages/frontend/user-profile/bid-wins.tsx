"use client"

import { useState } from "react"
import axios from "axios"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { usePage, Link } from "@inertiajs/react"
import {
  Trophy,
  DollarSign,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { showErrorToast } from "@/lib/toast"

interface WinProduct {
  id: number
  name: string
  image: string | null
  amount: number
  amount_formatted: string
  payment_deadline: string | null
}

interface ShippingMethod {
  id: string
  name: string
  cost: number
  estimated_days?: string
  provider?: string
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

function checkoutErrorMessage(err: unknown): string {
  const ax = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
  const d = ax.response?.data
  if (d?.errors) {
    const first = Object.values(d.errors).flat()[0]
    if (typeof first === "string" && first) return first
  }
  if (d?.message) return d.message
  if (err instanceof Error) return err.message
  return "Failed to start payment."
}

export default function ProfileBidWins() {
  const { products } = usePage<PageProps>().props

  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [ratesByProduct, setRatesByProduct] = useState<Record<number, ShippingMethod[]>>({})
  const [taxByProduct, setTaxByProduct] = useState<Record<number, number>>({})
  const [bidByProduct, setBidByProduct] = useState<Record<number, number>>({})
  const [loadingRates, setLoadingRates] = useState<Record<number, boolean>>({})
  const [rateErrorByProduct, setRateErrorByProduct] = useState<Record<number, string>>({})
  const [selectedRateId, setSelectedRateId] = useState<Record<number, string>>({})
  const [payingProductId, setPayingProductId] = useState<number | null>(null)

  const loadRates = async (productId: number, force = false) => {
    if (!force) {
      const cached = ratesByProduct[productId]
      if (cached && cached.length > 0) {
        return
      }
    }
    setLoadingRates((l) => ({ ...l, [productId]: true }))
    setRateErrorByProduct((e) => {
      const n = { ...e }
      delete n[productId]
      return n
    })
    try {
      const url = route("products.winning-bid.shipping-rates", { product: productId })
      const { data } = await axios.get<{
        success: boolean
        shipping_methods?: ShippingMethod[]
        bid_amount?: number
        estimated_tax?: number
        error?: string
      }>(url, { params: force ? { refresh: 1 } : undefined })
      if (!data.success || !data.shipping_methods?.length) {
        throw new Error(data.error || "No shipping options returned.")
      }
      setRatesByProduct((c) => ({ ...c, [productId]: data.shipping_methods! }))
      setTaxByProduct((c) => ({ ...c, [productId]: data.estimated_tax ?? 0 }))
      setBidByProduct((c) => ({ ...c, [productId]: data.bid_amount ?? 0 }))
      const firstId = data.shipping_methods[0]?.id
      if (firstId) {
        setSelectedRateId((s) => ({ ...s, [productId]: firstId }))
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } }
      const msg =
        ax.response?.data?.error ||
        (err instanceof Error ? err.message : "Could not load shipping rates.")
      setRateErrorByProduct((e) => ({ ...e, [productId]: msg }))
      showErrorToast(msg)
    } finally {
      setLoadingRates((l) => ({ ...l, [productId]: false }))
    }
  }

  const toggleShippingSection = async (productId: number) => {
    const next = !expanded[productId]
    setExpanded((e) => ({ ...e, [productId]: next }))
    if (next) {
      await loadRates(productId)
    }
  }

  const handlePay = async (productId: number) => {
    const rateId = selectedRateId[productId]
    if (!rateId) {
      showErrorToast("Select a shipping option first.")
      return
    }
    setPayingProductId(productId)
    try {
      const { data } = await axios.post<{ redirect?: string }>(
        route("products.winning-bid.checkout", { product: productId }),
        { shippo_rate_object_id: rateId },
        { headers: { Accept: "application/json" } }
      )
      if (data?.redirect) {
        window.location.assign(data.redirect)
        return
      }
      showErrorToast("Invalid response from server.")
    } catch (err: unknown) {
      showErrorToast(checkoutErrorMessage(err))
    } finally {
      setPayingProductId(null)
    }
  }

  return (
    <ProfileLayout
      title="Winning Bids"
      description="For each item, open Shipping options, pick a Shippo rate, then pay — same idea as checkout for manual products."
    >
      <div className="space-y-6">
        {!products || products.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
            <Trophy className="w-14 h-14 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No pending winning bids.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              When you win an auction or blind bid, items will appear here for payment.
            </p>
            <Link
              href="/profile/bids"
              className="inline-block mt-4 text-violet-600 dark:text-violet-400 hover:underline text-sm font-medium"
            >
              View my bids
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((p) => {
              const isOpen = !!expanded[p.id]
              const methods = ratesByProduct[p.id]
              const loading = !!loadingRates[p.id]
              const rateErr = rateErrorByProduct[p.id]
              const bid = bidByProduct[p.id] ?? p.amount
              const tax = taxByProduct[p.id] ?? 0
              const selected = selectedRateId[p.id]
              const selectedMethod = methods?.find((m) => m.id === selected)
              const ship = selectedMethod?.cost ?? 0
              const total = bid + ship + tax

              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    {p.image && (
                      <img
                        src={p.image}
                        alt=""
                        className="w-20 h-20 object-cover rounded-lg shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <strong className="text-gray-900 dark:text-white">{p.amount_formatted}</strong>
                          <span className="text-gray-500">(winning bid)</span>
                        </span>
                        {p.payment_deadline && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Pay by: {formatDate(p.payment_deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => toggleShippingSection(p.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-5 text-left text-sm font-medium text-gray-900 dark:text-white bg-gray-50/80 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                        Shipping options (Shippo)
                        <span className="font-normal text-gray-500 dark:text-gray-400">
                          — choose before paying
                        </span>
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-5 w-5 shrink-0 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 shrink-0 text-gray-500" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-5 pt-2 sm:px-5 space-y-4">
                        {loading && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                            Loading Shippo rates…
                          </div>
                        )}

                        {!loading && rateErr && (
                          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 px-3 py-2 text-sm text-red-800 dark:text-red-200">
                            {rateErr}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => void loadRates(p.id, true)}
                            >
                              Try again
                            </Button>
                          </div>
                        )}

                        {!loading && !rateErr && methods && methods.length > 0 && (
                          <>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Rates use the address you entered when you bid. Pick one option — your card total
                              includes bid + shipping + estimated tax.
                            </p>
                            <div className="space-y-2">
                              {methods.map((m) => (
                                <label
                                  key={m.id}
                                  className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-all ${
                                    selected === m.id
                                      ? "border-violet-600 bg-violet-50 dark:border-violet-500 dark:bg-violet-950/25"
                                      : "border-gray-200 dark:border-gray-600 hover:border-violet-300"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`ship-${p.id}`}
                                    className="mt-1"
                                    checked={selected === m.id}
                                    onChange={() =>
                                      setSelectedRateId((s) => ({ ...s, [p.id]: m.id }))
                                    }
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                                      {m.name}
                                    </div>
                                    {m.estimated_days != null && m.estimated_days !== "—" && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Est. {m.estimated_days} days
                                      </div>
                                    )}
                                  </div>
                                  <div className="font-semibold text-gray-900 dark:text-white text-sm shrink-0">
                                    ${m.cost.toFixed(2)}
                                  </div>
                                </label>
                              ))}
                            </div>

                            <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/30 p-3 text-sm space-y-1">
                              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Winning bid</span>
                                <span className="text-gray-900 dark:text-white">${bid.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Shipping</span>
                                <span className="text-gray-900 dark:text-white">${ship.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Est. tax</span>
                                <span className="text-gray-900 dark:text-white">${tax.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-bold pt-2 border-t border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                                <span>Total</span>
                                <span className="text-violet-600 dark:text-violet-400">${total.toFixed(2)}</span>
                              </div>
                            </div>

                            <Button
                              type="button"
                              disabled={!selected || payingProductId === p.id}
                              onClick={() => handlePay(p.id)}
                              className="w-full gap-2 bg-violet-600 hover:bg-violet-700 sm:w-auto"
                            >
                              {payingProductId === p.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Redirecting…
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-4 w-4" />
                                  Pay ${total.toFixed(2)} with card
                                </>
                              )}
                            </Button>

                            <Link
                              href={route("products.winning-bid.shipping", { product: p.id })}
                              className="inline-flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open full-page shipping view
                            </Link>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ProfileLayout>
  )
}

"use client"

import React, { useState } from "react"
import { Head, router } from "@inertiajs/react"
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import { Package, Truck, FileDown, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"
import axios from "axios"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface OrderLine {
  product_name: string
  quantity: number
  line_total: number
  merchant_share: number
}

interface ShippoRate {
  object_id: string
  provider: string
  servicelevel: { name?: string }
  amount: string
  currency: string
  estimated_days: number | null
}

interface OrderRow {
  id: number
  reference_number: string | null
  created_at: string | null
  status: string | null
  payment_status: string | null
  total_amount: number
  shipping_cost: number
  customer_name: string | null
  customer_email: string | null
  tracking_number: string | null
  tracking_url?: string | null
  label_url?: string | null
  carrier?: string | null
  shipping_status: string | null
  lines: OrderLine[]
  merchant_share_total: number
  split_merchant_amount: number | null
  can_create_shippo_label?: boolean
}

interface Paginated {
  data: OrderRow[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  links: { url: string | null; label: string; active: boolean }[]
}

interface Props {
  orders: Paginated
  shippo_configured: boolean
}

function csrfHeader(): Record<string, string> {
  const token =
    typeof document !== "undefined"
      ? document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? ""
      : ""
  return token ? { "X-CSRF-TOKEN": token } : {}
}

export default function MerchantMarketplaceOrdersIndex({ orders, shippo_configured }: Props) {
  const rows = orders?.data ?? []

  const [shippoModalOpen, setShippoModalOpen] = useState(false)
  const [activeOrder, setActiveOrder] = useState<OrderRow | null>(null)
  const [shippoRates, setShippoRates] = useState<ShippoRate[]>([])
  const [shippoRatesLoading, setShippoRatesLoading] = useState(false)
  const [shippoPurchaseLoading, setShippoPurchaseLoading] = useState(false)
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null)
  const [shippoError, setShippoError] = useState<string | null>(null)
  const [purchaseResult, setPurchaseResult] = useState<{
    label_url: string
    tracking_number: string
    tracking_url: string | null
    carrier: string | null
  } | null>(null)

  const openShippoModal = async (order: OrderRow) => {
    setActiveOrder(order)
    setShippoModalOpen(true)
    setShippoRates([])
    setSelectedRateId(null)
    setShippoError(null)
    setPurchaseResult(null)
    setShippoRatesLoading(true)
    try {
      const { data } = await axios.get(route("merchant.marketplace-orders.shippo.rates", { order: order.id }), {
        headers: { Accept: "application/json", ...csrfHeader() },
      })
      setShippoRates(data.rates || [])
      if ((data.rates?.length ?? 0) === 0) {
        setShippoError("No shipping rates available for this address.")
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } }
      const msg =
        (typeof ax.response?.data?.error === "string" && ax.response.data.error) ||
        "Failed to load shipping rates."
      setShippoError(msg)
      setShippoRates([])
    } finally {
      setShippoRatesLoading(false)
    }
  }

  const closeShippoModal = () => {
    setShippoModalOpen(false)
    setActiveOrder(null)
    setShippoRates([])
    setSelectedRateId(null)
    setShippoError(null)
    setPurchaseResult(null)
    router.reload({ only: ["orders", "shippo_configured"] })
  }

  const purchaseShippoLabel = async () => {
    if (!activeOrder || !selectedRateId) return
    setShippoPurchaseLoading(true)
    setShippoError(null)
    try {
      const { data } = await axios.post(
        route("merchant.marketplace-orders.shippo.purchase-label", { order: activeOrder.id }),
        { rate_object_id: selectedRateId },
        { headers: { Accept: "application/json", ...csrfHeader() } },
      )
      setPurchaseResult({
        label_url: data.label_url || "",
        tracking_number: data.tracking_number || "",
        tracking_url: data.tracking_url ?? null,
        carrier: data.carrier ?? null,
      })
      showSuccessToast("Shipping label created successfully.")
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } }
      const msg =
        (typeof ax.response?.data?.error === "string" && ax.response.data.error) ||
        "Failed to purchase label."
      setShippoError(msg)
      showErrorToast(msg)
    } finally {
      setShippoPurchaseLoading(false)
    }
  }

  return (
    <MerchantDashboardLayout>
      <Head title="Marketplace orders" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-[#2563EB]" />
            Marketplace orders
          </h1>
          <p className="text-sm text-white/70 max-w-xl">
            Orders from supporters who purchased your nonprofit marketplace products (same checkout, shipping, and payments as organization catalog).
          </p>
        </div>
        {!shippo_configured ? (
          <p className="text-xs text-amber-500/90 max-w-2xl">
            Shipping labels (Shippo) are not configured on this environment. When SHIPPO_API_KEY is set, you can create labels and track shipments here for orders you fulfill alone.
          </p>
        ) : null}

        <MerchantCard>
          <MerchantCardHeader>
            <MerchantCardTitle className="text-white text-base">Recent orders</MerchantCardTitle>
          </MerchantCardHeader>
          <MerchantCardContent>
            {rows.length === 0 ? (
              <p className="text-white/60 text-sm">No marketplace orders yet.</p>
            ) : (
              <div className="space-y-6">
                {rows.map((order) => (
                  <div
                    key={order.id}
                    className="border border-[#2563EB]/15 rounded-lg p-4 bg-black/20 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-white font-semibold">
                          {order.reference_number || `#${order.id}`}
                        </p>
                        <p className="text-xs text-white/60">
                          {order.created_at ? new Date(order.created_at).toLocaleString() : ""}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <span className="text-gray-500">Payment: </span>
                        <span className="text-[#16A34A] capitalize">{order.payment_status || "—"}</span>
                        <span className="mx-2 text-gray-600">·</span>
                        <span className="text-white/60">Order: </span>
                        <span className="text-white capitalize">{order.status || "—"}</span>
                      </div>
                    </div>
                    <div className="text-sm text-[#1F3A5F]">
                      <span className="text-gray-500">Customer: </span>
                      {order.customer_name || "—"}
                      {order.customer_email ? (
                        <span className="text-gray-500"> ({order.customer_email})</span>
                      ) : null}
                    </div>
                    {(order.tracking_number || order.label_url) && (
                      <div className="space-y-2 text-sm text-white/80">
                        <div className="flex flex-wrap items-center gap-2">
                          <Truck className="w-4 h-4 text-[#2563EB]" />
                          {order.tracking_number ? (
                            <>
                              <span className="text-gray-500">Tracking:</span> {order.tracking_number}
                              {order.carrier ? (
                                <span className="text-gray-500"> ({order.carrier})</span>
                              ) : null}
                            </>
                          ) : null}
                          {order.shipping_status ? (
                            <span className="text-gray-500 capitalize">
                              ({order.shipping_status.replace(/_/g, " ")})
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-3 pl-6">
                          {order.tracking_url ? (
                            <a
                              href={order.tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#2563EB] hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" /> Track shipment
                            </a>
                          ) : null}
                          {order.label_url ? (
                            <a
                              href={order.label_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#2563EB] hover:underline"
                            >
                              <FileDown className="h-4 w-4" /> Download label
                            </a>
                          ) : null}
                        </div>
                      </div>
                    )}
                    {order.can_create_shippo_label ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => openShippoModal(order)}
                          className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-3 py-2 text-sm font-medium text-white hover:bg-[#1D4ED8]"
                        >
                          <FileDown className="h-4 w-4" />
                          Create shipping label
                        </button>
                      </div>
                    ) : null}
                    <div className="border-t border-[#2563EB]/15 pt-3 space-y-2">
                      {order.lines.map((line, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap justify-between gap-2 text-sm text-[#1F3A5F]"
                        >
                          <span>
                            {line.product_name}{" "}
                            <span className="text-gray-500">×{line.quantity}</span>
                          </span>
                          <span>
                            ${line.line_total.toFixed(2)}
                            <span className="text-gray-500 ml-2">
                              (your share ${line.merchant_share.toFixed(2)})
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-sm pt-1 border-t border-[#2563EB]/15">
                      <span className="text-white/60">Order total (all items)</span>
                      <span className="text-white font-medium">${order.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="text-white/60">Your share (this order&apos;s lines)</span>
                      <span className="text-[#2563EB] font-semibold">
                        ${order.merchant_share_total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {orders.last_page > 1 && (
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {orders.links.map((l, i) =>
                  l.url ? (
                    <button
                      key={i}
                      type="button"
                      onClick={() => l.url && router.visit(l.url)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        l.active ? "bg-[#2563EB] text-white" : "bg-gray-100 text-[#1F3A5F] hover:bg-gray-200"
                      }`}
                      dangerouslySetInnerHTML={{ __html: l.label }}
                    />
                  ) : (
                    <span
                      key={i}
                      className="px-3 py-1 text-gray-500 text-sm"
                      dangerouslySetInnerHTML={{ __html: l.label }}
                    />
                  ),
                )}
              </div>
            )}
          </MerchantCardContent>
        </MerchantCard>
      </motion.div>

      <Dialog open={shippoModalOpen} onOpenChange={(open) => !open && closeShippoModal()}>
        <DialogContent className="max-w-lg border-[#2563EB]/20 bg-[#0A2540] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Create shipping label</DialogTitle>
            <DialogDescription className="text-white/70">
              Order {activeOrder?.reference_number || (activeOrder ? `#${activeOrder.id}` : "")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {shippoError && (
              <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded">{shippoError}</p>
            )}
            {purchaseResult ? (
              <div className="space-y-3 rounded-lg border border-[#2563EB]/20 p-4 bg-black/20">
                <p className="font-medium text-[#16A34A]">Label created successfully</p>
                {purchaseResult.tracking_number ? (
                  <p className="text-sm text-white/80">
                    Tracking: <strong>{purchaseResult.tracking_number}</strong>
                  </p>
                ) : null}
                {purchaseResult.carrier ? (
                  <p className="text-sm text-gray-500">Carrier: {purchaseResult.carrier}</p>
                ) : null}
                <div className="flex gap-2 flex-wrap">
                  {purchaseResult.label_url ? (
                    <a
                      href={purchaseResult.label_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[#2563EB] hover:underline"
                    >
                      <FileDown className="h-4 w-4" /> Download label
                    </a>
                  ) : null}
                  {purchaseResult.tracking_url ? (
                    <a
                      href={purchaseResult.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[#2563EB] hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" /> Track shipment
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                {shippoRatesLoading ? (
                  <div className="flex items-center gap-2 py-4 text-gray-600">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
                    Loading rates…
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {shippoRates.map((rate) => {
                      const name =
                        typeof rate.servicelevel === "object" && rate.servicelevel?.name
                          ? rate.servicelevel.name
                          : `${rate.provider} rate`
                      const isSelected = selectedRateId === rate.object_id
                      return (
                        <label
                          key={rate.object_id}
                          className={`flex items-center justify-between gap-4 p-3 rounded-lg border cursor-pointer transition ${
                            isSelected
                              ? "border-[#2563EB] bg-[#2563EB]/10"
                              : "border-[#2563EB]/20 hover:bg-white/5"
                          }`}
                        >
                          <input
                            type="radio"
                            name="shippo_rate"
                            checked={isSelected}
                            onChange={() => setSelectedRateId(rate.object_id)}
                            className="sr-only"
                          />
                          <div>
                            <span className="font-medium text-white">{name}</span>
                            {rate.estimated_days != null ? (
                              <span className="text-gray-500 text-sm ml-2">{rate.estimated_days} day(s)</span>
                            ) : null}
                          </div>
                          <span className="font-medium text-white">
                            ${Number(rate.amount).toFixed(2)} {rate.currency}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
                {shippoRates.length > 0 ? (
                  <DialogFooter>
                    <Button variant="outline" onClick={closeShippoModal} className="border-gray-300">
                      Cancel
                    </Button>
                    <Button
                      onClick={purchaseShippoLabel}
                      disabled={!selectedRateId || shippoPurchaseLoading}
                      className="bg-[#2563EB] hover:bg-[#1D4ED8]"
                    >
                      {shippoPurchaseLoading ? "Purchasing…" : "Buy label"}
                    </Button>
                  </DialogFooter>
                ) : null}
              </>
            )}
          </div>
          {purchaseResult ? (
            <DialogFooter>
              <Button onClick={closeShippoModal} className="bg-[#2563EB] hover:bg-[#1D4ED8]">
                Done
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </MerchantDashboardLayout>
  )
}

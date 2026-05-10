"use client"

import React, { useMemo, useState } from "react"
import { Head, router } from "@inertiajs/react"
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from "@/components/merchant-ui"
import { MerchantButton } from "@/components/merchant-ui"
import { MerchantInput } from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import { Package, Truck, FileDown, ExternalLink, Search, Filter, Eye, MoreVertical } from "lucide-react"
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
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [tab, setTab] = useState<"all" | "completed" | "pending" | "canceled" | "refunded">("all")

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

  const filteredRows = useMemo(() => {
    return rows.filter((order) => {
      const orderStatus = (order.status || "").toLowerCase()
      const paymentStatus = (order.payment_status || "").toLowerCase()
      const ref = (order.reference_number || `#${order.id}`).toLowerCase()
      const customer = (order.customer_name || "").toLowerCase()
      const items = order.lines.map((l) => l.product_name.toLowerCase()).join(" ")
      const q = search.trim().toLowerCase()
      const searchOk = !q || ref.includes(q) || customer.includes(q) || items.includes(q)
      const statusOk =
        statusFilter === "all" ||
        orderStatus === statusFilter ||
        (statusFilter === "canceled" && orderStatus === "cancelled")
      const paymentOk = paymentFilter === "all" || paymentStatus === paymentFilter
      const tabOk =
        tab === "all" ||
        (tab === "completed" && orderStatus === "completed") ||
        (tab === "pending" && orderStatus === "pending") ||
        (tab === "canceled" && (orderStatus === "canceled" || orderStatus === "cancelled")) ||
        (tab === "refunded" && orderStatus === "refunded")
      return searchOk && statusOk && paymentOk && tabOk
    })
  }, [rows, search, statusFilter, paymentFilter, tab])

  const totalRevenue = rows.reduce((sum, o) => sum + (o.merchant_share_total || 0), 0)
  const completedCount = rows.filter((o) => (o.status || "").toLowerCase() === "completed").length
  const pendingCount = rows.filter((o) => (o.status || "").toLowerCase() === "pending").length
  const canceledCount = rows.filter((o) => {
    const s = (o.status || "").toLowerCase()
    return s === "cancelled" || s === "canceled"
  }).length
  const refundedCount = rows.filter((o) => (o.status || "").toLowerCase() === "refunded").length

  const statusBadge = (status: string | null) => {
    const s = (status || "pending").toLowerCase()
    if (s === "completed") return "bg-emerald-500/20 text-emerald-300"
    if (s === "pending") return "bg-blue-500/20 text-blue-300"
    if (s === "refunded") return "bg-slate-500/20 text-slate-300"
    if (s === "cancelled" || s === "canceled") return "bg-amber-500/20 text-amber-200"
    return "bg-gray-500/20 text-gray-200"
  }

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
      <Head title="Orders" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Orders</h1>
          <p className="mt-1 text-sm text-white/60">View and manage all customer orders for your products and offers.</p>
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 border-b border-[#2563EB]/20 pb-2">
              {[
                ["all", "All Orders"],
                ["completed", "Completed"],
                ["pending", "Pending"],
                ["canceled", "Canceled"],
                ["refunded", "Refunded"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k as typeof tab)}
                  className={`rounded-md px-3 py-1.5 text-sm ${
                    tab === k ? "bg-[#2563EB]/20 text-[#93C5FD]" : "text-white/65 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <MerchantCard className="gap-4 py-4">
              <MerchantCardContent className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                    <MerchantInput
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by order ID, customer or product..."
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-md border border-[#2563EB]/30 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="canceled">Canceled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="rounded-md border border-[#2563EB]/30 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="all">All Payment Types</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  <MerchantButton variant="outline">
                    <Filter className="h-4 w-4" />
                    Filter
                  </MerchantButton>
                </div>

                {!shippo_configured ? (
                  <p className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    Shippo is not configured in this environment. Label creation is disabled.
                  </p>
                ) : null}

                <div className="overflow-hidden rounded-xl border border-[#2563EB]/20">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px]">
                      <thead>
                        <tr className="border-b border-[#2563EB]/15 bg-[#0a2340]/55 text-left text-xs uppercase tracking-wide text-white/60">
                          <th className="px-4 py-3 font-medium">Order ID</th>
                          <th className="px-4 py-3 font-medium">Customer</th>
                          <th className="px-4 py-3 font-medium">Items</th>
                          <th className="px-4 py-3 font-medium">Payment</th>
                          <th className="px-4 py-3 font-medium">Amount</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-14 text-center text-sm text-white/60">
                              No orders found for current filters.
                            </td>
                          </tr>
                        )}
                        {filteredRows.map((order) => (
                          <tr key={order.id} className="border-b border-[#2563EB]/10 bg-black/20 align-top hover:bg-[#2563EB]/5">
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-white">{order.reference_number || `#${order.id}`}</p>
                              <p className="text-xs text-white/45">#{order.id}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-white">{order.customer_name || "—"}</p>
                              <p className="text-xs text-white/45">{order.customer_email || ""}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-white">{order.lines[0]?.product_name || "—"}</p>
                              <p className="text-xs text-white/45">x{order.lines.reduce((n, l) => n + l.quantity, 0)} items</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded bg-violet-500/20 px-2 py-1 text-xs font-medium capitalize text-violet-300">
                                {order.payment_status || "pending"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-white">${order.total_amount.toFixed(2)}</p>
                              <p className="text-xs text-white/45">${order.merchant_share_total.toFixed(2)} share</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadge(order.status)}`}>
                                {order.status || "pending"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-white/70">
                              {order.created_at
                                ? new Date(order.created_at).toLocaleString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                {order.tracking_url ? (
                                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                                    <MerchantButton variant="outline" size="sm">
                                      <Eye className="h-3.5 w-3.5" />
                                    </MerchantButton>
                                  </a>
                                ) : (
                                  <MerchantButton variant="outline" size="sm" disabled>
                                    <Eye className="h-3.5 w-3.5" />
                                  </MerchantButton>
                                )}
                                {order.can_create_shippo_label ? (
                                  <MerchantButton variant="outline" size="sm" onClick={() => openShippoModal(order)}>
                                    <FileDown className="h-3.5 w-3.5" />
                                  </MerchantButton>
                                ) : (
                                  <MerchantButton variant="outline" size="sm" disabled>
                                    <FileDown className="h-3.5 w-3.5" />
                                  </MerchantButton>
                                )}
                                <MerchantButton variant="outline" size="sm">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </MerchantButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {orders.last_page > 1 && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white/60">
                      Showing 1 to {Math.min(filteredRows.length, orders.per_page)} of {orders.total} orders
                    </p>
                    <div className="flex gap-2">
                      {orders.links.map((l, i) =>
                        l.url ? (
                          <button
                            key={i}
                            type="button"
                            onClick={() => l.url && router.visit(l.url)}
                            className={`min-w-8 rounded-md px-3 py-1.5 text-sm ${
                              l.active ? "bg-[#2563EB] text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
                            }`}
                            dangerouslySetInnerHTML={{ __html: l.label }}
                          />
                        ) : (
                          <span
                            key={i}
                            className="rounded-md bg-white/5 px-3 py-1.5 text-sm text-white/30"
                            dangerouslySetInnerHTML={{ __html: l.label }}
                          />
                        ),
                      )}
                    </div>
                  </div>
                )}
              </MerchantCardContent>
            </MerchantCard>
          </div>

          <div className="space-y-4">
            <MerchantCard>
              <MerchantCardHeader>
                <div className="flex items-center justify-between">
                  <MerchantCardTitle className="text-white text-base">Order Summary</MerchantCardTitle>
                  <span className="text-xs text-white/60">This Month</span>
                </div>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-3 text-sm">
                <div className="rounded-md border border-[#2563EB]/20 bg-black/30 p-3">
                  <p className="text-white/60">Total Orders</p>
                  <p className="text-2xl font-bold text-white">{rows.length}</p>
                </div>
                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <p className="text-emerald-200/80">Total Revenue</p>
                  <p className="text-xl font-bold text-emerald-300">${totalRevenue.toFixed(2)}</p>
                </div>
              </MerchantCardContent>
            </MerchantCard>

            <MerchantCard>
              <MerchantCardHeader>
                <MerchantCardTitle className="text-white text-base">Orders by Status</MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-2 text-sm">
                <div className="flex justify-between text-white/75"><span>Completed</span><span>{completedCount}</span></div>
                <div className="flex justify-between text-white/75"><span>Pending</span><span>{pendingCount}</span></div>
                <div className="flex justify-between text-white/75"><span>Canceled</span><span>{canceledCount}</span></div>
                <div className="flex justify-between text-white/75"><span>Refunded</span><span>{refundedCount}</span></div>
              </MerchantCardContent>
            </MerchantCard>

            <MerchantCard>
              <MerchantCardHeader>
                <MerchantCardTitle className="text-white text-base">Recent Activity</MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-3 text-sm">
                {rows.slice(0, 3).map((o) => (
                  <div key={o.id} className="rounded-md border border-[#2563EB]/15 bg-black/20 p-2">
                    <p className="text-white text-xs">Order {o.reference_number || `#${o.id}`} updated</p>
                    <p className="text-white/45 text-xs">{o.created_at ? new Date(o.created_at).toLocaleString() : ""}</p>
                  </div>
                ))}
              </MerchantCardContent>
            </MerchantCard>
          </div>
        </div>
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

"use client"

import React, { useEffect } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import {
  MerchantButton,
  MerchantCard,
  MerchantCardContent,
  MerchantCardHeader,
  MerchantCardTitle,
} from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import { ClipboardCheck, Check, X } from "lucide-react"
import { motion } from "framer-motion"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface RequestRow {
  id: number
  status: string
  custom_price: string
  supporter_message: string | null
  created_at: string | null
  organization: { id: number; name: string } | null
  marketplace_product: { id: number; name: string } | null
}

interface Paginated {
  data: RequestRow[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  links: { url: string | null; label: string; active: boolean }[]
}

interface Props {
  requests: Paginated
  pendingCount: number
  filters: { status: string }
}

export default function MerchantMarketplacePoolApprovalsIndex({ requests, pendingCount, filters: initial }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const setStatusFilter = (status: string) => {
    router.get(
      "/marketplace-pool-approvals",
      { status: status || undefined },
      { preserveState: true, replace: true },
    )
  }

  const approve = (id: number) => {
    if (!confirm("Approve this nonprofit listing? It will go live on the marketplace.")) return
    router.post(`/marketplace-pool-approvals/${id}/approve`)
  }

  const decline = (id: number) => {
    if (
      !confirm(
        "Decline this request? The nonprofit will need to submit again from the product pool if they still want to sell this SKU.",
      )
    )
      return
    router.post(`/marketplace-pool-approvals/${id}/decline`)
  }

  return (
    <MerchantDashboardLayout>
      <Head title="Marketplace pool approvals" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7 text-[#2563EB]" />
            Marketplace pool approvals
          </h1>
          <p className="text-sm text-white/60 mt-1 max-w-2xl">
            When a nonprofit sells one of your pool products and you chose <span className="text-white/90">manual</span>{" "}
            nonprofit approval on that SKU, their listing appears here until you approve or decline it.
          </p>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-200/90 mt-2">
              {pendingCount} pending {pendingCount === 1 ? "request" : "requests"}
            </p>
          )}
        </div>

        <MerchantCard>
          <MerchantCardHeader>
            <MerchantCardTitle className="text-white text-base">Filter</MerchantCardTitle>
          </MerchantCardHeader>
          <MerchantCardContent className="flex flex-wrap gap-2">
            <MerchantButton
              type="button"
              variant={initial.status === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("")}
            >
              All
            </MerchantButton>
            <MerchantButton
              type="button"
              variant={initial.status === "pending_merchant_approval" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending_merchant_approval")}
            >
              Pending
            </MerchantButton>
            <MerchantButton
              type="button"
              variant={initial.status === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("active")}
            >
              Approved (active)
            </MerchantButton>
          </MerchantCardContent>
        </MerchantCard>

        <div className="space-y-4">
          {requests.data.length === 0 && (
            <p className="text-gray-400 text-center py-12">No listing requests match this filter.</p>
          )}
          {requests.data.map((row) => (
            <MerchantCard key={row.id}>
              <MerchantCardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <p className="text-white font-semibold text-lg">{row.marketplace_product?.name ?? "Product"}</p>
                    <p className="text-white/70 text-sm mt-1">
                      Nonprofit: <span className="text-white/90">{row.organization?.name ?? "—"}</span>
                    </p>
                    <p className="text-white/70 text-sm">
                      Their price:{" "}
                      <span className="text-emerald-300 font-medium">${Number(row.custom_price).toFixed(2)}</span>
                    </p>
                    {row.supporter_message && (
                      <p className="text-white/60 text-sm mt-2 italic">&ldquo;{row.supporter_message}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        row.status === "pending_merchant_approval"
                          ? "bg-amber-500/20 text-amber-200"
                          : "bg-emerald-500/20 text-emerald-200"
                      }`}
                    >
                      {row.status === "pending_merchant_approval" ? "Pending your approval" : "Approved · live"}
                    </span>
                    {row.status === "pending_merchant_approval" && (
                      <div className="flex flex-wrap gap-2">
                        <MerchantButton type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(row.id)}>
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </MerchantButton>
                        <MerchantButton type="button" size="sm" variant="outline" onClick={() => decline(row.id)}>
                          <X className="w-4 h-4 mr-1" />
                          Decline
                        </MerchantButton>
                      </div>
                    )}
                  </div>
                </div>
              </MerchantCardContent>
            </MerchantCard>
          ))}
        </div>

        {requests.last_page > 1 && (
          <div className="flex flex-wrap justify-center gap-2">
            {requests.links.map((l, i) =>
              l.url ? (
                <MerchantButton key={i} type="button" variant={l.active ? "default" : "outline"} size="sm" onClick={() => l.url && router.visit(l.url)}>
                  <span dangerouslySetInnerHTML={{ __html: l.label }} />
                </MerchantButton>
              ) : (
                <span key={i} className="px-2 py-1 text-sm text-white/50" dangerouslySetInnerHTML={{ __html: l.label }} />
              ),
            )}
          </div>
        )}

        <p className="text-xs text-white/50">
          To skip this queue for a SKU, edit it under{" "}
          <Link href="/marketplace-products" className="text-[#2563EB] underline underline-offset-2">
            Marketplace products
          </Link>{" "}
          and set <strong className="text-white/70">Nonprofit approval</strong> to{" "}
          <strong className="text-white/70">Automatic</strong> instead of manual.
        </p>
      </motion.div>
    </MerchantDashboardLayout>
  )
}

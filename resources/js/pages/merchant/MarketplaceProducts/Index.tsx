"use client"

import React, { useEffect, useState } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from "@/components/merchant-ui"
import { MerchantButton } from "@/components/merchant-ui"
import { MerchantInput } from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react"
import { motion } from "framer-motion"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface PoolProduct {
  id: number
  name: string
  category: string | null
  base_price: string
  status: string
  nonprofit_marketplace_enabled: boolean
  images?: string[] | null
  created_at: string
}

interface Paginated {
  data: PoolProduct[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  links: { url: string | null; label: string; active: boolean }[]
}

interface Props {
  products: Paginated
  filters: { search: string; status: string }
}

export default function MerchantMarketplaceProductsIndex({ products, filters: initial }: Props) {
  const [search, setSearch] = useState(initial.search || "")
  const [status, setStatus] = useState(initial.status || "")
  const { props } = usePage<{ success?: string; error?: string }>()

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const applyFilters = () => {
    router.get(
      "/marketplace-products",
      { search: search || undefined, status: status || undefined },
      { preserveState: true, replace: true },
    )
  }

  const destroy = (id: number) => {
    if (!confirm("Remove this product from the catalog?")) return
    router.delete(`/marketplace-products/${id}`)
  }

  return (
    <MerchantDashboardLayout>
      <Head title="Marketplace products" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Package className="w-7 h-7 text-[#2563EB]" />
              Nonprofit marketplace products
            </h1>
            <p className="text-sm text-white/60 mt-1 max-w-xl">
              Public Merchant Hub shows only <span className="text-white/80">Active</span> products with stock (or
              unlimited inventory). Draft or inactive items stay private.
            </p>
          </div>
          <Link href="/marketplace-products/create">
            <MerchantButton>
              <Plus className="w-4 h-4 mr-2" />
              Add product
            </MerchantButton>
          </Link>
        </div>

        <MerchantCard>
          <MerchantCardHeader>
            <MerchantCardTitle className="text-white text-base">Search</MerchantCardTitle>
          </MerchantCardHeader>
          <MerchantCardContent className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <MerchantInput
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or description"
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-[#2563EB]/30 bg-black/40 text-white px-3 py-2"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending review</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <MerchantButton type="button" onClick={applyFilters}>
              Filter
            </MerchantButton>
          </MerchantCardContent>
        </MerchantCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.data.length === 0 && (
            <p className="text-gray-400 col-span-full text-center py-12">
              No products yet. Add one to appear in the BIU merchant product pool.
            </p>
          )}
          {products.data.map((p) => (
            <MerchantCard key={p.id} className="overflow-hidden">
              <div className="h-36 bg-gradient-to-br from-[#2d1b1b] to-black flex items-center justify-center">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="w-12 h-12 text-gray-600" />
                )}
              </div>
              <MerchantCardHeader className="pb-1">
                <MerchantCardTitle className="text-white text-lg line-clamp-2">{p.name}</MerchantCardTitle>
                <p className="text-xs text-gray-400">
                  {p.category || "Uncategorized"} · ${Number(p.base_price).toFixed(2)}
                </p>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-3 pt-0">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded ${
                      p.status === "active" ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-500/20 text-gray-300"
                    }`}
                  >
                    {p.status}
                  </span>
                  {p.nonprofit_marketplace_enabled && (
                    <span className="px-2 py-0.5 rounded bg-[#2563EB]/20 text-[#2563EB]">Pool</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link href={`/marketplace-products/${p.id}/edit`} className="flex-1">
                    <MerchantButton variant="outline" size="sm" className="w-full">
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </MerchantButton>
                  </Link>
                  <MerchantButton variant="outline" size="sm" onClick={() => destroy(p.id)} className="text-red-300 border-red-500/40">
                    <Trash2 className="w-3 h-3" />
                  </MerchantButton>
                </div>
              </MerchantCardContent>
            </MerchantCard>
          ))}
        </div>

        {products.last_page > 1 && (
          <div className="flex flex-wrap justify-center gap-2">
            {products.links.map((l, i) =>
              l.url ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => l.url && router.visit(l.url)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    l.active ? "bg-[#2563EB] text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                  dangerouslySetInnerHTML={{ __html: l.label }}
                />
              ) : (
                <span key={i} className="px-3 py-1 text-gray-500 text-sm" dangerouslySetInnerHTML={{ __html: l.label }} />
              ),
            )}
          </div>
        )}
      </motion.div>
    </MerchantDashboardLayout>
  )
}

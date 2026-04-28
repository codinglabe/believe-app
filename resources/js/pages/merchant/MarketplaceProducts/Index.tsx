"use client"

import React, { useEffect, useState } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from "@/components/merchant-ui"
import { MerchantButton } from "@/components/merchant-ui"
import { MerchantInput } from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import { Plus, Search, Pencil, Trash2, Eye, MoreVertical, Package } from "lucide-react"
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
  const selectClass =
    "rounded-md border border-[#2563EB]/25 bg-black/40 px-3 py-2 text-sm text-white outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"

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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
              <Package className="h-7 w-7 text-[#60A5FA]" />
              My Products
            </h1>
            <p className="mt-1 text-sm text-white/60">Manage and edit all your products</p>
          </div>
          <Link href="/marketplace-products/create">
            <MerchantButton>
              <Plus className="mr-1 h-4 w-4" />
              Add Product
            </MerchantButton>
          </Link>
        </div>

        <MerchantCard className="gap-4 py-4">
          <MerchantCardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <MerchantInput
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                />
              </div>
              <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <MerchantButton type="button" onClick={applyFilters} variant="outline">
                Filter
              </MerchantButton>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#2563EB]/20">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-[#2563EB]/20 bg-[#0a2340]/60 text-left text-xs uppercase tracking-wide text-white/60">
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Price</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Created At</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.data.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-14 text-center text-sm text-white/60">
                          No products found. Add one to appear in your product list.
                        </td>
                      </tr>
                    )}

                    {products.data.map((p) => (
                      <tr key={p.id} className="border-b border-[#2563EB]/10 bg-black/20 transition hover:bg-[#2563EB]/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-md border border-[#2563EB]/20 bg-black/40">
                              {p.images?.[0] ? (
                                <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-5 w-5 text-white/40" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{p.name}</p>
                              <p className="text-xs text-white/50">#{p.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/80">{p.category || "Uncategorized"}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-white">${Number(p.base_price).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              p.status === "active"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : p.status === "inactive"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/70">
                          {new Date(p.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/marketplace-products/${p.id}/edit`}>
                              <MerchantButton type="button" variant="outline" size="sm">
                                <Eye className="h-3.5 w-3.5" />
                              </MerchantButton>
                            </Link>
                            <Link href={`/marketplace-products/${p.id}/edit`}>
                              <MerchantButton type="button" variant="outline" size="sm">
                                <Pencil className="h-3.5 w-3.5" />
                              </MerchantButton>
                            </Link>
                            <MerchantButton
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => destroy(p.id)}
                              className="border-red-500/35 text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </MerchantButton>
                            <MerchantButton type="button" variant="outline" size="sm">
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

            {products.last_page > 1 && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {products.links.map((l, i) =>
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
                    <span key={i} className="px-2 py-1 text-sm text-white/35" dangerouslySetInnerHTML={{ __html: l.label }} />
                  ),
                )}
              </div>
            )}
          </MerchantCardContent>
        </MerchantCard>
      </motion.div>
    </MerchantDashboardLayout>
  )
}

"use client"

import React, { useEffect, useState } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from "@/components/merchant-ui"
import { MerchantButton } from "@/components/merchant-ui"
import { MerchantBadge } from "@/components/merchant-ui"
import { MerchantInput } from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Filter,
  Tag,
  Store,
  Trophy,
  CircleDollarSign,
  MoreVertical,
  HelpCircle,
  BookOpenText,
} from "lucide-react"
import { motion } from "framer-motion"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface MerchantHubCategory {
  id: number
  name: string
  slug: string
}

interface MerchantHubOffer {
  id: number
  title: string
  short_description: string | null
  image_url: string | null
  points_required: number
  cash_required: number | null
  currency: string
  status: "draft" | "active" | "paused" | "expired"
  category: MerchantHubCategory
  created_at: string
  updated_at: string
}

interface OffersIndexProps {
  offers: {
    data: MerchantHubOffer[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    links: Array<{
      url: string | null
      label: string
      active: boolean
    }>
  }
  filters: {
    search: string
    status: string
  }
}

export default function MerchantOffersIndex({ offers, filters: initialFilters }: OffersIndexProps) {
  const { props } = usePage<{ success?: string; error?: string }>()
  const [search, setSearch] = useState(initialFilters.search || "")
  const [selectedStatus, setSelectedStatus] = useState(initialFilters.status || "all")
  const [selectedType, setSelectedType] = useState("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [offerToDelete, setOfferToDelete] = useState<MerchantHubOffer | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const applyFilters = () => {
    router.get(
      "/offers",
      {
        search: search || "",
        status: selectedStatus === "all" ? "" : selectedStatus,
      },
      { preserveState: true, replace: true },
    )
  }

  const handleDeleteClick = (offer: MerchantHubOffer) => {
    setOfferToDelete(offer)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!offerToDelete) return
    setIsDeleting(true)
    router.delete(`/offers/${offerToDelete.id}`, {
      onFinish: () => {
        setIsDeleting(false)
        setDeleteDialogOpen(false)
        setOfferToDelete(null)
      },
    })
  }

  const getStatusBadge = (status: MerchantHubOffer["status"]) => {
    const statusConfig: Record<MerchantHubOffer["status"], { label: string; className: string }> = {
      active: { label: "Active", className: "bg-emerald-500/20 text-emerald-300" },
      draft: { label: "Draft", className: "bg-gray-500/20 text-gray-200" },
      paused: { label: "Paused", className: "bg-yellow-500/20 text-yellow-200" },
      expired: { label: "Expired", className: "bg-red-500/20 text-red-300" },
    }
    const config = statusConfig[status] || statusConfig.draft
    return <MerchantBadge className={`shadow-none ${config.className}`}>{config.label}</MerchantBadge>
  }

  const getOfferType = (offer: MerchantHubOffer) => {
    const raw = (offer.category?.name || "").toLowerCase()
    if (raw.includes("tier") || raw.includes("reward")) return "tier"
    if (raw.includes("store")) return "storewide"
    if (raw.includes("point")) return "points"
    return offer.points_required > 0 ? "points" : "discount"
  }

  const typeLabel = (offer: MerchantHubOffer) => {
    const kind = getOfferType(offer)
    if (kind === "points") return "Points Redemption"
    if (kind === "tier") return "Tier Reward (BRP)"
    if (kind === "storewide") return "Storewide Discount"
    return "Product Discount"
  }

  const offerRows = offers.data.filter((offer) => selectedType === "all" || getOfferType(offer) === selectedType)

  const offerTypeCards = [
    {
      key: "discount",
      title: "Product Discount",
      desc: "Offer a discount on a specific product.",
      icon: Tag,
      cardClass: "from-emerald-500/20 to-emerald-700/10 border-emerald-400/30",
      iconClass: "text-emerald-300",
    },
    {
      key: "storewide",
      title: "Storewide Discount",
      desc: "Offer a discount on all your products.",
      icon: Store,
      cardClass: "from-sky-500/20 to-sky-700/10 border-sky-400/30",
      iconClass: "text-sky-300",
    },
    {
      key: "points",
      title: "Points Redemption",
      desc: "Customers redeem using BP or BRP points.",
      icon: CircleDollarSign,
      cardClass: "from-violet-500/20 to-violet-700/10 border-violet-400/30",
      iconClass: "text-violet-300",
    },
    {
      key: "tier",
      title: "Tier Reward (BRP)",
      desc: "Unlock rewards based on customer activity.",
      icon: Trophy,
      cardClass: "from-amber-500/20 to-amber-700/10 border-amber-400/30",
      iconClass: "text-amber-300",
    },
  ]

  return (
    <>
      <Head title="Offers - Merchant Dashboard" />
      <MerchantDashboardLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 space-y-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-white">Offers</h1>
              <p className="text-sm text-white/60">Create and manage offers to reward your customers and drive more impact.</p>
            </div>
            <div className="flex items-center gap-2">
              <MerchantButton variant="outline">
                <HelpCircle className="h-4 w-4" />
                Learn about offers
              </MerchantButton>
              <Link href="/offers/create">
                <MerchantButton>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Offer
                </MerchantButton>
              </Link>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <MerchantCard className="gap-4 py-4">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-xl text-white">Choose Offer Type</MerchantCardTitle>
                  <p className="text-sm text-white/60">Select the type of offer you want to create.</p>
                </MerchantCardHeader>
                <MerchantCardContent>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {offerTypeCards.map((type) => {
                      const Icon = type.icon
                      return (
                        <button
                          key={type.key}
                          type="button"
                          onClick={() => setSelectedType(type.key)}
                          className={`rounded-xl border bg-gradient-to-br p-4 text-left transition hover:border-[#2563EB]/70 ${
                            selectedType === type.key
                              ? "border-[#2563EB]/75 ring-1 ring-[#2563EB]/60"
                              : type.cardClass
                          }`}
                        >
                          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-black/25">
                            <Icon className={`h-5 w-5 ${type.iconClass}`} />
                          </div>
                          <p className="text-sm font-semibold text-white">{type.title}</p>
                          <p className="mt-1 text-xs text-white/65">{type.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              <MerchantCard className="gap-4 py-4">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-xl text-white">All Offers</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                      <MerchantInput
                        type="text"
                        placeholder="Search offers by name or description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                        className="pl-9"
                      />
                    </div>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="rounded-md border border-[#2563EB]/30 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
                    >
                      <option value="all">All Types</option>
                      <option value="discount">Product Discount</option>
                      <option value="storewide">Storewide Discount</option>
                      <option value="points">Points Redemption</option>
                      <option value="tier">Tier Reward</option>
                    </select>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="rounded-md border border-[#2563EB]/30 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="paused">Paused</option>
                      <option value="expired">Expired</option>
                    </select>
                    <MerchantButton variant="outline" onClick={applyFilters}>
                      <Filter className="h-4 w-4 mr-1" />
                      Filter
                    </MerchantButton>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[#2563EB]/20">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px]">
                        <thead>
                          <tr className="border-b border-[#2563EB]/15 bg-[#0a2340]/55 text-left text-xs uppercase tracking-wide text-white/60">
                            <th className="px-4 py-3 font-medium">Offer</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Value / Requirement</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Created</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {offerRows.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-4 py-14 text-center text-sm text-white/60">
                                No offers found. Adjust your filters or create a new offer.
                              </td>
                            </tr>
                          )}

                          {offerRows.map((offer) => (
                            <tr key={offer.id} className="border-b border-[#2563EB]/10 bg-black/20 transition hover:bg-[#2563EB]/5">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-11 w-11 overflow-hidden rounded-md border border-[#2563EB]/20 bg-black/30">
                                    {offer.image_url ? (
                                      <img src={offer.image_url} alt={offer.title} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center">
                                        <Tag className="h-4 w-4 text-white/40" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-white">{offer.title}</p>
                                    <p className="text-xs text-white/50">#{offer.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <MerchantBadge className="shadow-none bg-[#2563EB]/15 text-[#93C5FD] border border-[#2563EB]/35">
                                  {typeLabel(offer)}
                                </MerchantBadge>
                              </td>
                              <td className="px-4 py-3 text-sm text-white">
                                <span className="font-semibold text-[#93C5FD]">{offer.points_required.toLocaleString()} pts</span>
                                {offer.cash_required != null && (
                                  <span className="text-white/70"> + ${Number(offer.cash_required).toFixed(2)}</span>
                                )}
                              </td>
                              <td className="px-4 py-3">{getStatusBadge(offer.status)}</td>
                              <td className="px-4 py-3 text-sm text-white/70">
                                {new Date(offer.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <Link href={`/offers/${offer.id}`}>
                                    <MerchantButton variant="outline" size="sm">
                                      <Eye className="h-3.5 w-3.5" />
                                    </MerchantButton>
                                  </Link>
                                  <Link href={`/offers/${offer.id}/edit`}>
                                    <MerchantButton variant="outline" size="sm">
                                      <Edit className="h-3.5 w-3.5" />
                                    </MerchantButton>
                                  </Link>
                                  <MerchantButton
                                    variant="outline"
                                    size="sm"
                                    className="border-red-500/35 text-red-300 hover:bg-red-500/10"
                                    onClick={() => handleDeleteClick(offer)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </MerchantButton>
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

                  {offers.last_page > 1 && (
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-white/60">
                        Showing {((offers.current_page - 1) * offers.per_page) + 1} to {Math.min(offers.current_page * offers.per_page, offers.total)} of {offers.total} offers
                      </p>
                      <div className="flex gap-2">
                        {offers.links.map((link, index) => (
                          <Link
                            key={index}
                            href={link.url || "#"}
                            className={`min-w-8 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                              link.active
                                ? "bg-[#2563EB] text-white"
                                : link.url
                                  ? "bg-white/10 text-white/70 hover:bg-white/20"
                                  : "bg-white/5 text-white/30 cursor-not-allowed"
                            }`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </MerchantCardContent>
              </MerchantCard>
            </div>

            <MerchantCard className="h-fit">
              <MerchantCardHeader>
                <MerchantCardTitle className="text-lg text-white">About Offer Types</MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3">
                    <p className="font-semibold text-emerald-300">Product Discount</p>
                    <p className="mt-1 text-emerald-100/75">Give a discount on a specific product.</p>
                  </div>
                  <div className="rounded-lg border border-sky-400/30 bg-sky-500/10 p-3">
                    <p className="font-semibold text-sky-300">Storewide Discount</p>
                    <p className="mt-1 text-sky-100/75">Apply a discount to all active products.</p>
                  </div>
                  <div className="rounded-lg border border-violet-400/30 bg-violet-500/10 p-3">
                    <p className="font-semibold text-violet-300">Points Redemption</p>
                    <p className="mt-1 text-violet-100/75">Customers pay with BP or BRP points.</p>
                  </div>
                  <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
                    <p className="font-semibold text-amber-300">Tier Reward (BRP)</p>
                    <p className="mt-1 text-amber-100/75">Reward customers based on BRP milestones.</p>
                  </div>
                </div>
                <div className="rounded-lg border border-[#2563EB]/25 bg-black/25 p-4">
                  <p className="text-sm font-semibold text-white">BP vs BRP</p>
                  <ul className="mt-2 space-y-1 text-xs text-white/70">
                    <li>BP (Believe Points): 1 BP = $1.00</li>
                    <li>BRP (Believe Reward Points): 1 BRP = $0.01</li>
                    <li>BP can be used anywhere, BRP is merchant-hub only.</li>
                  </ul>
                </div>
                <MerchantButton variant="outline" className="w-full">
                  <BookOpenText className="h-4 w-4" />
                  View Help Center
                </MerchantButton>
              </MerchantCardContent>
            </MerchantCard>
          </div>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="bg-gray-900 border-[#2563EB]/40 text-white">
              <DialogHeader>
                <DialogTitle>Delete Offer</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Are you sure you want to delete "{offerToDelete?.title}"? This action cannot be undone.
                  {offerToDelete && (
                    <span className="block mt-2 text-red-400">
                      This offer cannot be deleted if it has existing redemptions.
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <MerchantButton
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false)
                    setOfferToDelete(null)
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </MerchantButton>
                <MerchantButton
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </MerchantButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      </MerchantDashboardLayout>
    </>
  )
}

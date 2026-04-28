import React, { useEffect, useMemo, useState } from "react"
import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from "@/components/merchant-ui"
import { MerchantButton } from "@/components/merchant-ui"
import { MerchantInput } from "@/components/merchant-ui"
import { MerchantLabel } from "@/components/merchant-ui"
import { MerchantTextarea } from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import { ImageUpload } from "@/components/admin/ImageUpload"
import {
  CalendarDays,
  CircleDollarSign,
  Percent,
  ShoppingBag,
  Store,
  Tag,
  Trophy,
} from "lucide-react"
import { motion } from "framer-motion"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface MerchantHubCategory {
  id: number
  name: string
  slug: string
}

interface CreateOfferProps {
  categories: MerchantHubCategory[]
}

type OfferType = "product" | "storewide" | "points" | "tier"

export default function CreateOffer({ categories }: CreateOfferProps) {
  const [offerType, setOfferType] = useState<OfferType>("product")
  const [discountMode, setDiscountMode] = useState<"percentage" | "fixed">("percentage")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("00:00")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("23:59")
  const [limitEnabled, setLimitEnabled] = useState(true)
  const [redemptionLimit, setRedemptionLimit] = useState("200")
  const [showMarketplace, setShowMarketplace] = useState(true)
  const [featuredOffer, setFeaturedOffer] = useState(false)
  const [showPointsMarketplace, setShowPointsMarketplace] = useState(true)

  const { data, setData, post, processing, errors } = useForm({
    merchant_hub_category_id: "",
    title: "",
    short_description: "",
    description: "",
    reference_price: "" as string | number,
    discount_percentage: 5 as number,
    discount_cap: "" as string | number,
    image: null as File | null,
    currency: "USD",
    inventory_qty: "",
    starts_at: "",
    ends_at: "",
    status: "draft" as "draft" | "active" | "paused" | "expired",
    pickup_available: false,
  })

  const price = Number(data.reference_price) || 0
  const pct = Number(data.discount_percentage) || 0
  const discountAmount = price > 0 && pct >= 1 && pct <= 10 ? Math.round(price * (pct / 100) * 100) / 100 : 0
  const pointsRequired = Math.round(discountAmount * 1000)
  const customerPays = Math.round((price - discountAmount) * 100) / 100
  const finalStatus = showMarketplace ? "active" : "draft"
  const typeTitle = useMemo(() => {
    if (offerType === "storewide") return "Storewide Discount"
    if (offerType === "points") return "Points Redemption (BRP)"
    if (offerType === "tier") return "Tier Reward (BRP)"
    return "Product Discount"
  }, [offerType])

  const { props } = usePage<{ success?: string; error?: string }>()

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  useEffect(() => {
    setData("starts_at", startDate ? `${startDate}T${startTime}` : "")
    setData("ends_at", endDate ? `${endDate}T${endTime}` : "")
  }, [startDate, startTime, endDate, endTime, setData])

  useEffect(() => {
    setData("status", finalStatus)
  }, [finalStatus, setData])

  useEffect(() => {
    if (limitEnabled) {
      setData("inventory_qty", redemptionLimit)
    } else {
      setData("inventory_qty", "")
    }
  }, [limitEnabled, redemptionLimit, setData])

  const selectClass =
    "w-full rounded-md border border-[#2563EB]/30 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/offers", {
      forceFormData: true,
      onSuccess: () => {
        router.visit("/offers")
      },
    })
  }

  return (
    <>
      <Head title="Create Offer - Merchant Dashboard" />
      <MerchantDashboardLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Create Offer</h1>
              <p className="mt-1 text-sm text-white/60">
                Offers <span className="mx-2">/</span> Create Offer <span className="mx-2">/</span> {typeTitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/offers">
                <MerchantButton type="button" variant="outline">
                  Cancel
                </MerchantButton>
              </Link>
              <MerchantButton type="submit" form="offer-create-form" disabled={processing}>
                {processing ? "Saving..." : "Save & Review"}
              </MerchantButton>
            </div>
          </div>

          <form id="offer-create-form" onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
            <div className="space-y-5">
              <MerchantCard className="gap-4 py-4">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">1. Offer Type</MerchantCardTitle>
                  <p className="text-sm text-white/60">Select the type of offer you want to create.</p>
                </MerchantCardHeader>
                <MerchantCardContent>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      { key: "product", title: "Product Discount", icon: Tag, sub: "Offer a discount on a specific product." },
                      { key: "storewide", title: "Storewide Discount", icon: Store, sub: "Offer a discount on all your products." },
                      { key: "points", title: "Points Redemption", icon: CircleDollarSign, sub: "Customers redeem using BP/BRP points." },
                      { key: "tier", title: "Tier Reward (BRP)", icon: Trophy, sub: "Unlock rewards based on customer activity." },
                    ].map((item) => {
                      const Icon = item.icon
                      const active = offerType === item.key
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setOfferType(item.key as OfferType)}
                          className={`rounded-xl border px-4 py-3 text-left transition ${
                            active
                              ? "border-[#2563EB]/80 bg-[#2563EB]/15 ring-1 ring-[#2563EB]/50"
                              : "border-[#2563EB]/25 bg-black/20 hover:border-[#2563EB]/50"
                          }`}
                        >
                          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-black/30">
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-1 text-xs text-white/60">{item.sub}</p>
                        </button>
                      )
                    })}
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              <MerchantCard className="gap-4 py-4">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">
                    {offerType === "points" ? "2. Redemption Details" : offerType === "tier" ? "2. Tier & Reward Details" : "2. Discount Details"}
                  </MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <MerchantLabel>Category *</MerchantLabel>
                      <select
                        value={data.merchant_hub_category_id}
                        onChange={(e) => setData("merchant_hub_category_id", e.target.value)}
                        className={selectClass}
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={String(category.id)}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {errors.merchant_hub_category_id && <p className="mt-1 text-sm text-red-400">{errors.merchant_hub_category_id}</p>}
                    </div>
                    <div>
                      <MerchantLabel>Offer Title *</MerchantLabel>
                      <MerchantInput
                        value={data.title}
                        onChange={(e) => setData("title", e.target.value)}
                        placeholder="e.g. 20% OFF Pecan Candy"
                      />
                      {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <MerchantLabel>Discount Type</MerchantLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDiscountMode("percentage")}
                          className={`rounded-md border px-3 py-2 text-left text-sm ${
                            discountMode === "percentage"
                              ? "border-[#2563EB]/70 bg-[#2563EB]/15 text-white"
                              : "border-[#2563EB]/25 bg-black/25 text-white/70"
                          }`}
                        >
                          <Percent className="mb-1 h-4 w-4" />
                          Percentage (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountMode("fixed")}
                          className={`rounded-md border px-3 py-2 text-left text-sm ${
                            discountMode === "fixed"
                              ? "border-[#2563EB]/70 bg-[#2563EB]/15 text-white"
                              : "border-[#2563EB]/25 bg-black/25 text-white/70"
                          }`}
                        >
                          <CircleDollarSign className="mb-1 h-4 w-4" />
                          Fixed Amount
                        </button>
                      </div>
                    </div>
                    <div>
                      <MerchantLabel>Discount Percentage *</MerchantLabel>
                      <div className="relative">
                        <MerchantInput
                          type="number"
                          min="1"
                          max="10"
                          step="1"
                          value={data.discount_percentage}
                          onChange={(e) => setData("discount_percentage", Number(e.target.value || 0))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60">%</span>
                      </div>
                      <p className="mt-1 text-xs text-white/55">System supports 1-10% discount range.</p>
                      {errors.discount_percentage && <p className="mt-1 text-sm text-red-400">{errors.discount_percentage}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <MerchantLabel>Reference Price *</MerchantLabel>
                      <MerchantInput
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={data.reference_price === "" ? "" : data.reference_price}
                        onChange={(e) => setData("reference_price", e.target.value ? Number(e.target.value) : "")}
                        placeholder="0.00"
                      />
                      {errors.reference_price && <p className="mt-1 text-sm text-red-400">{errors.reference_price}</p>}
                    </div>
                    <div>
                      <MerchantLabel>Discount Cap (optional)</MerchantLabel>
                      <MerchantInput
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.discount_cap}
                        onChange={(e) => setData("discount_cap", e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div>
                    <MerchantLabel>Description *</MerchantLabel>
                    <MerchantTextarea
                      value={data.description}
                      onChange={(e) => setData("description", e.target.value)}
                      rows={4}
                      className="bg-black/40 text-white placeholder:text-white/40 border-[#2563EB]/30"
                      placeholder="Describe your offer details"
                    />
                    {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description}</p>}
                  </div>

                  <div>
                    <MerchantLabel>Short Description</MerchantLabel>
                    <MerchantInput
                      value={data.short_description}
                      onChange={(e) => setData("short_description", e.target.value)}
                      maxLength={500}
                      placeholder="Brief summary visible on listing"
                    />
                  </div>

                  <div>
                    <ImageUpload label="Offer Image" value={null} onChange={(file) => setData("image", file)} processing={processing} />
                    {errors.image && <p className="mt-1 text-sm text-red-400">{errors.image}</p>}
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              <MerchantCard className="gap-4 py-4">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">3. Offer Schedule</MerchantCardTitle>
                  <p className="text-sm text-white/60">Choose when your offer is active.</p>
                </MerchantCardHeader>
                <MerchantCardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <MerchantLabel>Start Date</MerchantLabel>
                    <MerchantInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <MerchantLabel>Start Time</MerchantLabel>
                    <MerchantInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <MerchantLabel>End Date</MerchantLabel>
                    <MerchantInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <div>
                    <MerchantLabel>End Time</MerchantLabel>
                    <MerchantInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              <MerchantCard className="gap-4 py-4">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">4. Usage Limits (Optional)</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <label className="flex items-center justify-between rounded-md border border-[#2563EB]/20 bg-black/25 px-3 py-2">
                    <span className="text-sm text-white">Set usage limit</span>
                    <input type="checkbox" checked={limitEnabled} onChange={(e) => setLimitEnabled(e.target.checked)} className="h-4 w-4 accent-[#2563EB]" />
                  </label>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <MerchantLabel>Redemption Limit</MerchantLabel>
                      <MerchantInput
                        type="number"
                        min="0"
                        value={redemptionLimit}
                        onChange={(e) => setRedemptionLimit(e.target.value)}
                        disabled={!limitEnabled}
                      />
                    </div>
                    <div>
                      <MerchantLabel>Current Redemptions</MerchantLabel>
                      <MerchantInput value="0" disabled />
                    </div>
                    <div>
                      <MerchantLabel>Status</MerchantLabel>
                      <select value={data.status} onChange={(e) => setData("status", e.target.value as "draft" | "active" | "paused" | "expired")} className={selectClass}>
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              <MerchantCard className="gap-4 py-4">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">5. Visibility</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-3">
                  <label className="flex items-center justify-between rounded-md border border-[#2563EB]/20 bg-black/25 px-3 py-2">
                    <div>
                      <p className="text-sm text-white">Show on Marketplace</p>
                      <p className="text-xs text-white/55">Make this offer visible to customers.</p>
                    </div>
                    <input type="checkbox" checked={showMarketplace} onChange={(e) => setShowMarketplace(e.target.checked)} className="h-4 w-4 accent-[#2563EB]" />
                  </label>
                  <label className="flex items-center justify-between rounded-md border border-[#2563EB]/20 bg-black/25 px-3 py-2">
                    <div>
                      <p className="text-sm text-white">Featured Offer</p>
                      <p className="text-xs text-white/55">Highlight this offer on top sections.</p>
                    </div>
                    <input type="checkbox" checked={featuredOffer} onChange={(e) => setFeaturedOffer(e.target.checked)} className="h-4 w-4 accent-[#2563EB]" />
                  </label>
                  {(offerType === "points" || offerType === "tier") && (
                    <label className="flex items-center justify-between rounded-md border border-[#2563EB]/20 bg-black/25 px-3 py-2">
                      <div>
                        <p className="text-sm text-white">Show in Points Marketplace</p>
                        <p className="text-xs text-white/55">Display this offer in points redemption feed.</p>
                      </div>
                      <input type="checkbox" checked={showPointsMarketplace} onChange={(e) => setShowPointsMarketplace(e.target.checked)} className="h-4 w-4 accent-[#2563EB]" />
                    </label>
                  )}
                </MerchantCardContent>
              </MerchantCard>
            </div>

            <div className="space-y-5">
              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Offer Summary</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-3 text-sm">
                  <div className="rounded-md border border-[#2563EB]/20 bg-black/30 p-3">
                    <p className="font-semibold text-white">{data.title || `${data.discount_percentage}% OFF Offer`}</p>
                    <p className="mt-0.5 text-xs text-[#93C5FD]">{typeTitle}</p>
                  </div>
                  <div className="flex items-center justify-between text-white/75">
                    <span>Discount</span>
                    <span className="font-semibold text-white">{data.discount_percentage}%</span>
                  </div>
                  <div className="flex items-center justify-between text-white/75">
                    <span>Points Required</span>
                    <span className="font-semibold text-white">{pointsRequired.toLocaleString()} BRP</span>
                  </div>
                  <div className="flex items-center justify-between text-white/75">
                    <span>Discount Amount</span>
                    <span className="font-semibold text-emerald-300">${discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/75">
                    <span>Final Price</span>
                    <span className="font-semibold text-white">${customerPays.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/75">
                    <span>Status</span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">{finalStatus}</span>
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              <MerchantCard>
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Schedule & Limits</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-3 text-sm text-white/75">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#93C5FD]" />
                    <span>{startDate || "No start date"} {startDate ? startTime : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#93C5FD]" />
                    <span>{endDate || "No end date"} {endDate ? endTime : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-[#93C5FD]" />
                    <span>{limitEnabled ? `${redemptionLimit || 0} redemption limit` : "Unlimited redemptions"}</span>
                  </div>
                </MerchantCardContent>
              </MerchantCard>
            </div>
          </form>
        </motion.div>
      </MerchantDashboardLayout>
    </>
  )
}


"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import {
  MerchantCard,
  MerchantCardContent,
  MerchantCardDescription,
  MerchantCardHeader,
  MerchantCardTitle,
} from "@/components/merchant-ui"
import { MerchantButton } from "@/components/merchant-ui"
import { MerchantInput } from "@/components/merchant-ui"
import { MerchantLabel } from "@/components/merchant-ui"
import { MerchantTextarea } from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import { ImageUpload } from "@/components/admin/ImageUpload"
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Percent,
  ShoppingBag,
  Store,
  Tag,
  Trophy,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { cn } from "@/lib/utils"

interface MerchantHubCategory {
  id: number
  name: string
  slug: string
}

interface MerchantHubOffer {
  id: number
  merchant_hub_category_id: number
  title: string
  short_description: string | null
  description: string
  image_url: string | null
  reference_price?: number | null
  discount_percentage?: number | null
  discount_cap?: number | null
  points_required: number
  cash_required: number | null
  currency: string
  inventory_qty: number | null
  starts_at: string | null
  ends_at: string | null
  status: "draft" | "active" | "paused" | "expired"
  pickup_available?: boolean
  category?: MerchantHubCategory
}

interface OffersEditProps {
  offer: MerchantHubOffer
  categories: MerchantHubCategory[]
}

type OfferType = "product" | "storewide" | "points" | "tier"

const TOTAL_STEPS = 6

export default function MerchantOffersEdit({ offer, categories }: OffersEditProps) {
  const inferType = (): OfferType => {
    const raw = (offer.category?.name || "").toLowerCase()
    if (raw.includes("tier") || raw.includes("reward")) return "tier"
    if (raw.includes("store")) return "storewide"
    if (raw.includes("point")) return "points"
    return "product"
  }

  const dateFrom = (dt: string | null) => (dt ? new Date(dt).toISOString().slice(0, 10) : "")
  const timeFrom = (dt: string | null) => (dt ? new Date(dt).toISOString().slice(11, 16) : "00:00")

  const [offerType, setOfferType] = useState<OfferType>(inferType())
  const [discountMode, setDiscountMode] = useState<"percentage" | "fixed">("percentage")
  const [startDate, setStartDate] = useState(dateFrom(offer.starts_at))
  const [startTime, setStartTime] = useState(timeFrom(offer.starts_at))
  const [endDate, setEndDate] = useState(dateFrom(offer.ends_at))
  const [endTime, setEndTime] = useState(timeFrom(offer.ends_at))
  const [limitEnabled, setLimitEnabled] = useState(offer.inventory_qty != null)
  const [redemptionLimit, setRedemptionLimit] = useState(
    offer.inventory_qty != null ? String(offer.inventory_qty) : "200"
  )
  const [showMarketplace, setShowMarketplace] = useState(offer.status === "active")
  const [featuredOffer, setFeaturedOffer] = useState(false)
  const [showPointsMarketplace, setShowPointsMarketplace] = useState(true)
  const [step, setStep] = useState(1)
  const [stepError, setStepError] = useState<string | null>(null)

  const { data, setData, processing, errors } = useForm({
    merchant_hub_category_id: String(offer.merchant_hub_category_id ?? ""),
    title: offer.title ?? "",
    short_description: offer.short_description ?? "",
    description: offer.description ?? "",
    reference_price:
      offer.reference_price ??
      (offer.points_required && (offer.discount_percentage ?? 10)
        ? (offer.points_required / 1000) * 100 / (offer.discount_percentage ?? 10)
        : ""),
    discount_percentage: offer.discount_percentage ?? 5,
    discount_cap: offer.discount_cap ?? "",
    image: null as File | null,
    currency: offer.currency || "USD",
    inventory_qty: offer.inventory_qty != null ? String(offer.inventory_qty) : "",
    starts_at: offer.starts_at ? new Date(offer.starts_at).toISOString().slice(0, 16) : "",
    ends_at: offer.ends_at ? new Date(offer.ends_at).toISOString().slice(0, 16) : "",
    status: offer.status,
    pickup_available: !!(offer.pickup_available ?? false),
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

  const stepsMeta = useMemo(
    () => [
      { id: 1, label: "Offer type", short: "Type" },
      { id: 2, label: "Offer details", short: "Details" },
      { id: 3, label: "Schedule", short: "Schedule" },
      { id: 4, label: "Limits", short: "Limits" },
      { id: 5, label: "Visibility", short: "Visibility" },
      { id: 6, label: "Review", short: "Review" },
    ],
    []
  )

  const discountDetailsTitle =
    offerType === "points" ? "Redemption details" : offerType === "tier" ? "Tier & reward details" : "Discount details"

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

  const imageUrl = offer.image_url
    ? offer.image_url.startsWith("http")
      ? offer.image_url
      : offer.image_url.startsWith("/storage")
        ? offer.image_url
        : `/storage/${offer.image_url}`
    : null

  const validateStep = useCallback(
    (s: number): string | null => {
      if (s === 2) {
        if (!data.merchant_hub_category_id) return "Please choose a category."
        if (!String(data.title).trim()) return "Please enter an offer title."
        if (!String(data.description).trim()) return "Please enter a description."
        const ref = Number(data.reference_price)
        if (!data.reference_price && data.reference_price !== 0) return "Please enter a reference price."
        if (Number.isNaN(ref) || ref < 0.01) return "Reference price must be at least 0.01."
        const d = Number(data.discount_percentage)
        if (Number.isNaN(d) || d < 1 || d > 10) return "Discount must be between 1% and 10%."
      }
      return null
    },
    [data]
  )

  const goNext = () => {
    const err = validateStep(step)
    if (err) {
      setStepError(err)
      return
    }
    setStepError(null)
    setStep((x) => Math.min(TOTAL_STEPS, x + 1))
  }

  const goBack = () => {
    setStepError(null)
    setStep((x) => Math.max(1, x - 1))
  }

  const OFFER_IMAGE_MAX_BYTES = 5120 * 1024

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateStep(2)
    if (err) {
      setStepError(err)
      setStep(2)
      return
    }
    if (data.image instanceof File && data.image.size > OFFER_IMAGE_MAX_BYTES) {
      showErrorToast("Offer image must be 5 MB or smaller.")
      setStepError("Offer image must be 5 MB or smaller.")
      setStep(2)
      return
    }
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return
      if (value instanceof File) {
        formData.append(key, value)
      } else if (typeof value === "boolean") {
        formData.append(key, value ? "1" : "0")
      } else {
        formData.append(key, String(value))
      }
    })
    formData.append("_method", "PUT")
    router.post(`/offers/${offer.id}`, formData, { forceFormData: true })
  }

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  return (
    <>
      <Head title="Edit Offer - Merchant Dashboard" />
      <MerchantDashboardLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "mx-auto max-w-5xl space-y-6 pb-24 sm:pb-8",
            step === TOTAL_STEPS && "pb-28 lg:pb-8"
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Edit offer</h1>
              <p className="text-sm text-white/60">
                Update your offer step by step. You can go back anytime before saving.
              </p>
              <p className="truncate text-xs text-white/45">
                Offers <span className="mx-1.5">/</span> Edit <span className="mx-1.5">/</span> {typeTitle}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link href="/offers">
                <MerchantButton type="button" variant="outline" className="w-full sm:w-auto">
                  Cancel
                </MerchantButton>
              </Link>
              {step === TOTAL_STEPS ? (
                <MerchantButton
                  type="submit"
                  form="offer-edit-form"
                  disabled={processing}
                  className="hidden w-full sm:inline-flex sm:w-auto"
                >
                  {processing ? "Saving…" : "Save changes"}
                </MerchantButton>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-[#2563EB]/20 bg-black/20 p-4 backdrop-blur sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">
                Step {step} of {TOTAL_STEPS}
                <span className="hidden text-white/50 sm:inline"> — {stepsMeta[step - 1]?.label}</span>
              </p>
              <span className="text-xs text-white/50 sm:hidden">{stepsMeta[step - 1]?.short}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/40">
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-[#2563EB] to-[#60A5FA]"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>
            <nav aria-label="Edit offer steps" className="hidden gap-1.5 sm:flex sm:flex-wrap">
              {stepsMeta.map((meta) => {
                const done = step > meta.id
                const active = step === meta.id
                return (
                  <button
                    key={meta.id}
                    type="button"
                    onClick={() => {
                      if (meta.id < step) {
                        setStepError(null)
                        setStep(meta.id)
                      }
                    }}
                    disabled={meta.id > step}
                    className={cn(
                      "flex min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition",
                      active && "border-[#2563EB]/70 bg-[#2563EB]/20 text-white ring-1 ring-[#2563EB]/40",
                      done && !active && "border-emerald-500/35 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15",
                      !active && !done && "cursor-not-allowed border-white/10 bg-black/20 text-white/35",
                      meta.id < step && "cursor-pointer"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                        done && "bg-emerald-500/30 text-emerald-100",
                        active && !done && "bg-[#2563EB] text-white",
                        !active && !done && "bg-white/10 text-white/50"
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : meta.id}
                    </span>
                    <span className="truncate">{meta.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          <form id="offer-edit-form" onSubmit={handleSubmit} className="space-y-6">
            {stepError && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              >
                {stepError}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="min-w-0 space-y-5"
                >
                  {step === 1 && (
                    <MerchantCard className="gap-4 py-5">
                      <MerchantCardHeader>
                        <MerchantCardTitle className="text-xl text-white sm:text-2xl">Choose offer type</MerchantCardTitle>
                        <MerchantCardDescription className="text-white/65">
                          Pick what matches your promotion. Category on file is used for reporting; adjust details in the next step.
                        </MerchantCardDescription>
                      </MerchantCardHeader>
                      <MerchantCardContent>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {[
                            { key: "product", title: "Product discount", icon: Tag, sub: "Discount on a specific product." },
                            { key: "storewide", title: "Storewide discount", icon: Store, sub: "Discount across your catalog." },
                            { key: "points", title: "Points redemption", icon: CircleDollarSign, sub: "Customers use BP/BRP points." },
                            { key: "tier", title: "Tier reward (BRP)", icon: Trophy, sub: "Rewards tied to customer tiers." },
                          ].map((item) => {
                            const Icon = item.icon
                            const active = offerType === item.key
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => setOfferType(item.key as OfferType)}
                                className={`rounded-xl border px-4 py-4 text-left transition ${
                                  active
                                    ? "border-[#2563EB]/80 bg-[#2563EB]/15 ring-2 ring-[#2563EB]/40"
                                    : "border-[#2563EB]/25 bg-black/20 hover:border-[#2563EB]/50"
                                }`}
                              >
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-black/35">
                                  <Icon className="h-5 w-5 text-white" />
                                </div>
                                <p className="text-sm font-semibold text-white">{item.title}</p>
                                <p className="mt-1.5 text-xs leading-relaxed text-white/60">{item.sub}</p>
                              </button>
                            )
                          })}
                        </div>
                      </MerchantCardContent>
                    </MerchantCard>
                  )}

                  {step === 2 && (
                    <MerchantCard className="gap-4 py-5">
                      <MerchantCardHeader>
                        <MerchantCardTitle className="text-xl text-white sm:text-2xl">{discountDetailsTitle}</MerchantCardTitle>
                        <MerchantCardDescription className="text-white/65">
                          Category, pricing, and copy shown to customers. Fields marked * are required.
                        </MerchantCardDescription>
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
                            {errors.merchant_hub_category_id && (
                              <p className="mt-1 text-sm text-red-400">{errors.merchant_hub_category_id}</p>
                            )}
                          </div>
                          <div>
                            <MerchantLabel>Offer title *</MerchantLabel>
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
                            <MerchantLabel>Discount type</MerchantLabel>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setDiscountMode("percentage")}
                                className={`rounded-md border px-3 py-3 text-left text-sm ${
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
                                className={`rounded-md border px-3 py-3 text-left text-sm ${
                                  discountMode === "fixed"
                                    ? "border-[#2563EB]/70 bg-[#2563EB]/15 text-white"
                                    : "border-[#2563EB]/25 bg-black/25 text-white/70"
                                }`}
                              >
                                <CircleDollarSign className="mb-1 h-4 w-4" />
                                Fixed amount
                              </button>
                            </div>
                          </div>
                          <div>
                            <MerchantLabel>Discount percentage *</MerchantLabel>
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
                            <p className="mt-1 text-xs text-white/55">Supported range is 1–10%.</p>
                            {errors.discount_percentage && (
                              <p className="mt-1 text-sm text-red-400">{errors.discount_percentage}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <MerchantLabel>Reference price *</MerchantLabel>
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
                            <MerchantLabel>Discount cap (optional)</MerchantLabel>
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
                          <MerchantLabel>Short description</MerchantLabel>
                          <MerchantInput
                            value={data.short_description}
                            onChange={(e) => setData("short_description", e.target.value)}
                            maxLength={500}
                            placeholder="Brief summary visible on listing"
                          />
                        </div>

                        <div>
                          <ImageUpload
                            label="Offer image"
                            value={imageUrl}
                            onChange={(file) => setData("image", file)}
                            processing={processing}
                            maxFileSizeKb={5120}
                          />
                          {errors.image && <p className="mt-1 text-sm text-red-400">{errors.image}</p>}
                        </div>
                      </MerchantCardContent>
                    </MerchantCard>
                  )}

                  {step === 3 && (
                    <MerchantCard className="gap-4 py-5">
                      <MerchantCardHeader>
                        <MerchantCardTitle className="text-xl text-white sm:text-2xl">Offer schedule</MerchantCardTitle>
                        <MerchantCardDescription className="text-white/65">
                          Optional start and end — leave blank to control timing later from your dashboard.
                        </MerchantCardDescription>
                      </MerchantCardHeader>
                      <MerchantCardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <MerchantLabel>Start date</MerchantLabel>
                          <MerchantInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div>
                          <MerchantLabel>Start time</MerchantLabel>
                          <MerchantInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                        </div>
                        <div>
                          <MerchantLabel>End date</MerchantLabel>
                          <MerchantInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        <div>
                          <MerchantLabel>End time</MerchantLabel>
                          <MerchantInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                        </div>
                      </MerchantCardContent>
                    </MerchantCard>
                  )}

                  {step === 4 && (
                    <MerchantCard className="gap-4 py-5">
                      <MerchantCardHeader>
                        <MerchantCardTitle className="text-xl text-white sm:text-2xl">Usage limits</MerchantCardTitle>
                        <MerchantCardDescription className="text-white/65">
                          Cap how many times this offer can be redeemed, or leave unlimited.
                        </MerchantCardDescription>
                      </MerchantCardHeader>
                      <MerchantCardContent className="space-y-4">
                        <label className="flex items-center justify-between rounded-md border border-[#2563EB]/20 bg-black/25 px-3 py-3">
                          <span className="text-sm text-white">Set usage limit</span>
                          <input
                            type="checkbox"
                            checked={limitEnabled}
                            onChange={(e) => setLimitEnabled(e.target.checked)}
                            className="h-4 w-4 accent-[#2563EB]"
                          />
                        </label>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <MerchantLabel>Redemption limit</MerchantLabel>
                            <MerchantInput
                              type="number"
                              min="0"
                              value={redemptionLimit}
                              onChange={(e) => setRedemptionLimit(e.target.value)}
                              disabled={!limitEnabled}
                            />
                          </div>
                          <div>
                            <MerchantLabel>Current redemptions</MerchantLabel>
                            <MerchantInput value="0" disabled />
                          </div>
                          <div>
                            <MerchantLabel>Status</MerchantLabel>
                            <select
                              value={data.status}
                              onChange={(e) => setData("status", e.target.value as "draft" | "active" | "paused" | "expired")}
                              className={selectClass}
                            >
                              <option value="draft">Draft</option>
                              <option value="active">Active</option>
                              <option value="paused">Paused</option>
                              <option value="expired">Expired</option>
                            </select>
                          </div>
                        </div>
                      </MerchantCardContent>
                    </MerchantCard>
                  )}

                  {step === 5 && (
                    <MerchantCard className="gap-4 py-5">
                      <MerchantCardHeader>
                        <MerchantCardTitle className="text-xl text-white sm:text-2xl">Visibility</MerchantCardTitle>
                        <MerchantCardDescription className="text-white/65">
                          Control where shoppers discover this offer.
                        </MerchantCardDescription>
                      </MerchantCardHeader>
                      <MerchantCardContent className="space-y-3">
                        <label className="flex items-center justify-between rounded-md border border-[#2563EB]/20 bg-black/25 px-3 py-3">
                          <div>
                            <p className="text-sm text-white">Show on marketplace</p>
                            <p className="text-xs text-white/55">Make this offer visible to customers.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={showMarketplace}
                            onChange={(e) => setShowMarketplace(e.target.checked)}
                            className="h-4 w-4 accent-[#2563EB]"
                          />
                        </label>
                        <label className="flex items-center justify-between rounded-md border border-[#2563EB]/20 bg-black/25 px-3 py-3">
                          <div>
                            <p className="text-sm text-white">Featured offer</p>
                            <p className="text-xs text-white/55">Highlight this offer in top sections.</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={featuredOffer}
                            onChange={(e) => setFeaturedOffer(e.target.checked)}
                            className="h-4 w-4 accent-[#2563EB]"
                          />
                        </label>
                        {(offerType === "points" || offerType === "tier") && (
                          <label className="flex items-center justify-between rounded-md border border-[#2563EB]/20 bg-black/25 px-3 py-3">
                            <div>
                              <p className="text-sm text-white">Show in points marketplace</p>
                              <p className="text-xs text-white/55">Display in the points redemption feed.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={showPointsMarketplace}
                              onChange={(e) => setShowPointsMarketplace(e.target.checked)}
                              className="h-4 w-4 accent-[#2563EB]"
                            />
                          </label>
                        )}
                      </MerchantCardContent>
                    </MerchantCard>
                  )}

                  {step === 6 && (
                    <MerchantCard className="gap-4 py-5 lg:hidden">
                      <MerchantCardHeader>
                        <MerchantCardTitle className="text-xl text-white sm:text-2xl">Almost done</MerchantCardTitle>
                        <MerchantCardDescription className="text-white/65">
                          Review the summary below, then save your changes.
                        </MerchantCardDescription>
                      </MerchantCardHeader>
                    </MerchantCard>
                  )}
                </motion.div>
              </AnimatePresence>

              <aside className={cn("min-w-0 space-y-4", step !== TOTAL_STEPS && "hidden lg:block")}>
                <MerchantCard className="sticky top-4 py-5">
                  <MerchantCardHeader>
                    <MerchantCardTitle className="text-lg text-white">Live preview</MerchantCardTitle>
                    <MerchantCardDescription className="text-white/55">Updates as you complete each step.</MerchantCardDescription>
                  </MerchantCardHeader>
                  <MerchantCardContent className="space-y-3 text-sm">
                    <div className="rounded-md border border-[#2563EB]/20 bg-black/30 p-3">
                      <p className="font-semibold text-white">{data.title || `${data.discount_percentage}% OFF offer`}</p>
                      <p className="mt-0.5 text-xs text-[#93C5FD]">{typeTitle}</p>
                    </div>
                    <div className="flex items-center justify-between text-white/75">
                      <span>Discount</span>
                      <span className="font-semibold text-white">{data.discount_percentage}%</span>
                    </div>
                    <div className="flex items-center justify-between text-white/75">
                      <span>Points required</span>
                      <span className="font-semibold text-white">{pointsRequired.toLocaleString()} BRP</span>
                    </div>
                    <div className="flex items-center justify-between text-white/75">
                      <span>Discount amount</span>
                      <span className="font-semibold text-emerald-300">${discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/75">
                      <span>Final price</span>
                      <span className="font-semibold text-white">${customerPays.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/75">
                      <span>Listing status</span>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">{finalStatus}</span>
                    </div>
                  </MerchantCardContent>
                </MerchantCard>

                <MerchantCard className={cn("py-5", step !== TOTAL_STEPS && "hidden lg:block")}>
                  <MerchantCardHeader>
                    <MerchantCardTitle className="text-lg text-white">Schedule & limits</MerchantCardTitle>
                  </MerchantCardHeader>
                  <MerchantCardContent className="space-y-3 text-sm text-white/75">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0 text-[#93C5FD]" />
                      <span>
                        {startDate || "No start date"} {startDate ? startTime : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0 text-[#93C5FD]" />
                      <span>
                        {endDate || "No end date"} {endDate ? endTime : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 shrink-0 text-[#93C5FD]" />
                      <span>{limitEnabled ? `${redemptionLimit || 0} redemption limit` : "Unlimited redemptions"}</span>
                    </div>
                  </MerchantCardContent>
                </MerchantCard>
              </aside>
            </div>

            {step < TOTAL_STEPS && (
              <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#2563EB]/20 bg-[#0a0f1a]/95 p-4 backdrop-blur-md lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
                <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:justify-between">
                  <MerchantButton
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    disabled={step <= 1}
                    className="order-2 w-full sm:order-1 sm:w-auto"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </MerchantButton>
                  <MerchantButton type="button" onClick={goNext} className="order-1 w-full sm:order-2 sm:w-auto">
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </MerchantButton>
                </div>
              </div>
            )}

            {step === TOTAL_STEPS && (
              <>
                <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:justify-between lg:pb-0">
                  <MerchantButton type="button" variant="outline" onClick={goBack} className="w-full sm:w-auto">
                    <ChevronLeft className="h-4 w-4" />
                    Back to edit
                  </MerchantButton>
                </div>
                <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#2563EB]/20 bg-[#0a0f1a]/95 p-4 backdrop-blur-md sm:hidden">
                  <div className="mx-auto flex max-w-5xl flex-col gap-2">
                    <MerchantButton type="submit" form="offer-edit-form" disabled={processing} className="w-full">
                      {processing ? "Saving…" : "Save changes"}
                    </MerchantButton>
                  </div>
                </div>
              </>
            )}
          </form>
        </motion.div>
      </MerchantDashboardLayout>
    </>
  )
}

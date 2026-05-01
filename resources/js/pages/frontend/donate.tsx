"use client"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState, useMemo, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, CreditCard, Shield, Search, X, Loader2, Coins, Lock, ChevronRight, Building2, UtensilsCrossed, Brain, Check, CheckCircle, Gift, Wrench, TrendingUp, Car, Package, FileText, Camera, ArrowLeft, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { router, usePage, Link } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"
import { useNotification } from "@/components/frontend/notification-provider"
import { SubscriptionRequiredModal } from "@/components/SubscriptionRequiredModal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import SiteTitle from "@/components/site-title"
import { cn } from "@/lib/utils"
import type { ProcessingFeeRates } from "@/types"
import { Switch } from "@/components/frontend/ui/switch"

/** Matches `DonationController@index` `feePreview` prop (same rules as checkout). */
type FeePreviewRail = "card" | "bank"

interface FeePreviewFromServer {
  mode: "donor_covers" | "org_covers"
  rail?: FeePreviewRail
  base_gift_usd: number
  checkout_total_usd: number
  processing_fee_estimate: number
  estimated_net_to_org_usd: number
}

/** Nonprofit or Care Alliance (donation routes to hub org via organization_id). */
interface DonateCause {
  id: string
  kind: "organization" | "care_alliance"
  organization_id: number
  name: string
  description: string
  image: string | null
  raised: number
  goal: number
  supporters: number
  alliance_slug?: string
  care_alliance_id?: number
  /** Lifetime total this logged-in user has donated to this recipient (from server). */
  donated_total?: number
}

function CauseAvatar({
  name,
  src,
  className,
  shape = "circle",
}: {
  name: string
  src?: string | null
  className?: string
  /** `square` uses rounded corners like the search list thumbnails. */
  shape?: "circle" | "square"
}) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase()
  const usableSrc = typeof src === "string" && src.trim() !== "" ? src.trim() : undefined
  const round = shape === "square" ? "rounded-md" : "rounded-full"
  return (
    <Avatar className={cn("shrink-0", round, className)}>
      <AvatarImage src={usableSrc} alt="" className="object-cover" />
      <AvatarFallback
        className={cn(
          round,
          "bg-purple-500/25 text-slate-800 text-sm font-semibold dark:bg-purple-500/35 dark:text-white",
        )}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}

function CauseKindBadge({ kind }: { kind: DonateCause["kind"] }) {
  return kind === "care_alliance" ? (
    <Badge className="inline-flex w-fit items-center gap-1 border-0 px-2 py-0.5 text-xs font-semibold shadow-sm bg-indigo-600 text-white hover:bg-indigo-600">
      <Building2 className="h-3 w-3 shrink-0" />
      Care Alliance
    </Badge>
  ) : (
    <Badge className="inline-flex w-fit items-center gap-1 border-0 px-2 py-0.5 text-xs font-semibold shadow-sm bg-green-600 text-white hover:bg-green-600">
      <CheckCircle className="h-3 w-3 shrink-0" />
      Organization
    </Badge>
  )
}

interface User {
  name: string
  email: string
  // Add other user properties if needed
}

interface TopOrganization {
  name: string
  total: number
}

/** Fallback if shared `processingFeeRates` is missing (should not happen on normal Inertia responses). */
const DEFAULT_PROCESSING_FEE_RATES: ProcessingFeeRates = {
  card_percent: 0.029,
  card_fixed_usd: 0.3,
  ach_percent: 0.008,
  ach_fee_cap_usd: 5,
}

interface DonatePageProps {
  seo?: { title: string; description?: string }
  organizations: DonateCause[]
  /** Causes the current user has donated to (with totals); empty when logged out. */
  donatedCauses?: DonateCause[]
  user?: User | null
  message?: string
  searchQuery?: string
  thisYearDonated?: number
  givingGoal?: number
  topOrganizations?: TopOrganization[]
  feePreview?: FeePreviewFromServer | null
}

const amountConfig = [
  { amount: 25, impact: "Helps fund supplies" },
  { amount: 50, badge: "Most Popular", impact: "Provides meals for 10 children" },
  { amount: 100, badge: "High Impact", impact: "Funds mental health support" },
  { amount: 250 },
  { amount: 500 },
  { amount: 1000 },
]

const TOP_ORG_ICONS = [Building2, UtensilsCrossed, Brain]

type DonationMode = "cash_points" | "non_cash"
type NonCashType = "goods" | "services" | "stocks_crypto" | "vehicle" | "other"

const NON_CASH_TYPES: { id: NonCashType; label: string; icon: typeof Gift }[] = [
  { id: "goods", label: "Goods", icon: Gift },
  { id: "services", label: "Services", icon: Wrench },
  { id: "stocks_crypto", label: "Stocks / Crypto", icon: TrendingUp },
  { id: "vehicle", label: "Vehicle", icon: Car },
  { id: "other", label: "Other", icon: Package },
]

const CONDITION_OPTIONS = ["New", "Like New", "Good", "Fair", "Poor"]

// The component now accepts props from Laravel via Inertia
function causeMatchesSearch(cause: DonateCause, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  if (cause.name.toLowerCase().includes(q)) return true
  if (cause.description && cause.description.toLowerCase().includes(q)) return true
  return false
}

export default function DonatePage({
  seo,
  organizations: initialOrganizations,
  donatedCauses: initialDonatedCauses = [],
  user,
  searchQuery: initialSearchQuery = "",
  thisYearDonated = 0,
  givingGoal = 1000,
  topOrganizations = [],
}: DonatePageProps) {
  const page = usePage<DonatePageProps & { processingFeeRates?: ProcessingFeeRates }>()
  const processingFeeRates = page.props.processingFeeRates ?? DEFAULT_PROCESSING_FEE_RATES
  const feePreview = page.props.feePreview ?? null
  const flash = page.props
  const { showNotification } = useNotification()

  // Check for subscription required flash message
  useEffect(() => {
    if ((flash as any)?.subscription_required || (flash as any)?.errors?.subscription) {
      setShowSubscriptionModal(true)
    }
  }, [flash])

  const [donationMode, setDonationMode] = useState<DonationMode>("cash_points")
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [selectedCauseId, setSelectedCauseId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'believe_points'>('stripe')
  const [donorCoversProcessingFees, setDonorCoversProcessingFees] = useState(true)
  const [feePreviewRail, setFeePreviewRail] = useState<FeePreviewRail>("card")
  const [feePreviewLoading, setFeePreviewLoading] = useState(false)

  // Non-cash donation state
  const [nonCashType, setNonCashType] = useState<NonCashType>("goods")
  const [nonCashItemName, setNonCashItemName] = useState("")
  const [nonCashEstimatedValue, setNonCashEstimatedValue] = useState("")
  const [nonCashCondition, setNonCashCondition] = useState("New")
  const [nonCashPreferredOrgId, setNonCashPreferredOrgId] = useState<number | null>(null)
  const [nonCashUploadPhotos, setNonCashUploadPhotos] = useState(false)
  const [isSubmittingNonCash, setIsSubmittingNonCash] = useState(false)
  const [nonCashSearchQuery, setNonCashSearchQuery] = useState("")
  const [nonCashSearchFocused, setNonCashSearchFocused] = useState(false)

  // Get user's Believe Points balance
  const pageProps = usePage().props as any
  const authUser = pageProps.auth?.user || null
  const donatedCauses = (pageProps.donatedCauses as DonateCause[] | undefined) ?? initialDonatedCauses
  const currentBalance = parseFloat(authUser?.believe_points || '0') || 0
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery) // Initialize with prop from Laravel
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isSearchingOrganizations, setIsSearchingOrganizations] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  const donatePartialReloadSkipRef = useRef(true)

  // Donor Information States, pre-filled if user prop is provided
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [phone, setPhone] = useState("")
  const [donorMessage, setDonorMessage] = useState("") // Renamed to avoid conflict with page message prop

  const searchContainerRef = useRef<HTMLDivElement>(null)
  const nonCashOrgSearchRef = useRef<HTMLDivElement>(null)

  /** Inertia partial reload: organizations (search), feePreview (amount + cover switch). No fetch/axios. */
  useEffect(() => {
    if (donatePartialReloadSkipRef.current) {
      donatePartialReloadSkipRef.current = false
      return
    }
    const t = window.setTimeout(() => {
      const q: Record<string, string | number> = {}
      const sq = searchQuery.trim()
      if (sq) q.search = sq
      const baseUsd = (selectedAmount ?? Number.parseFloat(customAmount)) || 0
      if (paymentMethod === "stripe" && baseUsd > 0) {
        q.fee_preview_amount = baseUsd
        q.fee_preview_donor_covers = donorCoversProcessingFees ? 1 : 0
        q.fee_preview_rail = feePreviewRail
      }
      setFeePreviewLoading(true)
      setIsSearchingOrganizations(true)
      router.get(route("donate"), q, {
        preserveScroll: true,
        preserveState: true,
        replace: true,
        only: ["organizations", "searchQuery", "feePreview"],
        onFinish: () => {
          setFeePreviewLoading(false)
          setIsSearchingOrganizations(false)
        },
        onCancel: () => {
          setFeePreviewLoading(false)
          setIsSearchingOrganizations(false)
        },
      })
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, selectedAmount, customAmount, paymentMethod, donorCoversProcessingFees, feePreviewRail])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false)
      }
      if (nonCashOrgSearchRef.current && !nonCashOrgSearchRef.current.contains(event.target as Node)) {
        setNonCashSearchFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (flash?.warning) {
      // Show warning notification
      showNotification({
        type: "warning",
        message: typeof flash?.warning === "string" ? flash.warning : "Warning",
      })
    }
  }, [flash, showNotification])

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount("")
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    setSelectedAmount(null)
  }

  const getCurrentAmount = () => {
    return selectedAmount || Number.parseFloat(customAmount) || 0
  }

  const pointsRequired = getCurrentAmount() // 1$ = 1 believe point
  const hasEnoughPoints = currentBalance >= pointsRequired
  const canUseBelievePoints = hasEnoughPoints
  const givingProgress = givingGoal > 0 ? Math.min(100, (thisYearDonated / givingGoal) * 100) : 0

  const selectedCause = useMemo(() => {
    if (!selectedCauseId) return undefined
    return (
      initialOrganizations.find((cause) => cause.id === selectedCauseId) ??
      donatedCauses.find((cause) => cause.id === selectedCauseId)
    )
  }, [selectedCauseId, initialOrganizations, donatedCauses])

  const donatedCausesFiltered = useMemo(
    () => donatedCauses.filter((c) => causeMatchesSearch(c, searchQuery)),
    [donatedCauses, searchQuery],
  )
  const allOrganizationsFiltered = useMemo(() => {
    const matched = initialOrganizations.filter((c) => causeMatchesSearch(c, searchQuery))
    const donatedIds = new Set(donatedCausesFiltered.map((c) => c.id))
    return matched.filter((c) => !donatedIds.has(c.id))
  }, [initialOrganizations, searchQuery, donatedCausesFiltered])

  const donationSubscriptionModalRecipientKind = useMemo((): "organization" | "care_alliance" => {
    if (selectedCause?.kind === "care_alliance") {
      return "care_alliance"
    }
    if (donationMode === "non_cash" && nonCashPreferredOrgId != null) {
      const row = initialOrganizations.find((o) => o.organization_id === nonCashPreferredOrgId)
      if (row?.kind === "care_alliance") {
        return "care_alliance"
      }
    }
    return "organization"
  }, [selectedCause, donationMode, nonCashPreferredOrgId, initialOrganizations])

  const handleCauseSelect = (id: string) => {
    setSelectedCauseId(id)
    setSearchQuery("") // Clear search query after selection
    setIsSearchFocused(false) // Hide search results
  }

  const handleClearCauseSelection = () => {
    setSelectedCauseId(null)
    setSearchQuery("") // Clear search query when clearing selection
    setIsSearchFocused(true) // Show search input again
  }

  const handleSubmit = async () => {
    setSubmissionError(null)
    setIsSubmitting(true)

    if (!selectedCauseId || !selectedCause) {
      setSubmissionError("Please select a non-profit organization.")
      setIsSubmitting(false)
      return
    }

    if (getCurrentAmount() <= 0) {
      setSubmissionError("Please enter a valid donation amount.")
      setIsSubmitting(false)
      return
    }

    const donationData = {
      organization_id: selectedCause.organization_id,
      recipient_kind: selectedCause.kind,
      care_alliance_id:
        selectedCause.kind === "care_alliance" && selectedCause.care_alliance_id != null
          ? selectedCause.care_alliance_id
          : undefined,
      amount: getCurrentAmount(),
      frequency: 'one-time',
      message: donorMessage,
      payment_method: paymentMethod,
      donor_covers_processing_fees: paymentMethod === "stripe" ? donorCoversProcessingFees : false,
      donation_fee_rail: paymentMethod === "stripe" ? feePreviewRail : undefined,
      name: name,
      email: email,
      phone: phone,
    }

    // In a real Inertia.js application, you would use:
    router.post("/donate", donationData, {
      onStart: () => setIsSubmitting(true),
      onFinish: () => setIsSubmitting(false),
      onSuccess: () => {

      },
      onError: (errors) => {
        // Check if subscription is required
        if (errors.subscription || (flash as any)?.subscription_required) {
          setShowSubscriptionModal(true)
          setSubmissionError(null)
        } else {
          setSubmissionError(errors.subscription || errors.message || "Failed to process donation. Please try again.")
        }
        console.error("Donation submission errors:", errors)
      },
    })
  }

  const handleNonCashSubmit = () => {
    setSubmissionError(null)
    if (!nonCashItemName.trim()) {
      setSubmissionError("Please enter the donation item name.")
      return
    }
    const value = Number.parseFloat(nonCashEstimatedValue)
    if (Number.isNaN(value) || value < 0) {
      setSubmissionError("Please enter a valid estimated fair market value.")
      return
    }
    if (!nonCashPreferredOrgId) {
      setSubmissionError("Please select a preferred receiving organization.")
      return
    }
    setIsSubmittingNonCash(true)
    router.post(route("donations.non-cash.store"), {
      non_cash_type: nonCashType,
      item_name: nonCashItemName.trim(),
      estimated_fair_market_value: value,
      condition: nonCashCondition,
      organization_id: nonCashPreferredOrgId,
      upload_photos: nonCashUploadPhotos,
    }, {
      preserveState: true,
      onFinish: () => setIsSubmittingNonCash(false),
      onSuccess: () => {
        setNonCashItemName("")
        setNonCashEstimatedValue("")
        setNonCashCondition("New")
        setNonCashPreferredOrgId(null)
        setNonCashSearchQuery("")
        setNonCashUploadPhotos(false)
        showNotification({ type: "success", message: "Your non-cash donation request has been submitted. We'll be in touch shortly." })
      },
      onError: (errors) => {
        const msg = typeof errors?.message === "string" ? errors.message : (errors && Object.values(errors)[0]?.[0])
        setSubmissionError(msg || "Failed to submit donation request. Please try again.")
      },
    })
  }

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Donate"} description={seo?.description} />
      <div
        className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-100/30 dark:from-[#1e0a2e] dark:via-[#2d1b4e] dark:to-[#1e0a2e]"
      >
        {/* Light-mode speckles */}
        <div
          className="absolute inset-0 pointer-events-none opacity-70 block dark:hidden"
          style={{
            backgroundImage: `radial-gradient(circle at 10% 30%, rgba(236,72,153,0.12) 0%, transparent 2%),
              radial-gradient(circle at 90% 20%, rgba(147,51,234,0.12) 0%, transparent 2%),
              radial-gradient(circle at 50% 70%, rgba(255,255,255,0.35) 0%, transparent 1.5%),
              radial-gradient(circle at 30% 80%, rgba(236,72,153,0.10) 0%, transparent 2%),
              radial-gradient(circle at 70% 50%, rgba(147,51,234,0.10) 0%, transparent 2%)`,
          }}
        />

        {/* Dark-mode speckles (existing style) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 hidden dark:block"
          style={{
            backgroundImage: `radial-gradient(circle at 10% 30%, rgba(236,72,153,0.2) 0%, transparent 2%),
              radial-gradient(circle at 90% 20%, rgba(147,51,234,0.2) 0%, transparent 2%),
              radial-gradient(circle at 50% 70%, rgba(255,255,255,0.08) 0%, transparent 1.5%),
              radial-gradient(circle at 30% 80%, rgba(236,72,153,0.15) 0%, transparent 2%),
              radial-gradient(circle at 70% 50%, rgba(147,51,234,0.15) 0%, transparent 2%)`,
          }}
        />
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Back to Home */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-900/70 hover:text-slate-900 dark:text-white/70 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          {/* Page header: branding | title + subtitle | user profile */}
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8 sm:mb-10"
          >
            {/* Left: BELIEVE IN UNITY branding */}
            <SiteTitle className="shrink-0 order-2 lg:order-1 justify-center lg:justify-start" />

            {/* Center: Make a Difference Today + subtitle */}
            <div className="text-center order-1 lg:order-2 flex-1 px-0 lg:px-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1 dark:text-white">
                Make a Difference Today
              </h1>
              <p className="text-sm sm:text-base text-slate-900/80 max-w-xl mx-auto dark:text-white/80">
                Your donation, no matter the size, creates real impact in communities worldwide.
              </p>
            </div>

            {/* Right: User profile (when logged in) */}
            <div className="flex items-center justify-center lg:justify-end gap-3 shrink-0 order-3">
              {authUser ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-white/5 px-4 py-2.5 backdrop-blur-sm">
                  <Avatar className="h-9 w-9 border border-slate-200/70 dark:border-white/20">
                    <AvatarImage src={typeof (authUser as any).image === 'string' && (authUser as any).image ? ((authUser as any).image.startsWith('/') ? (authUser as any).image : `/${(authUser as any).image}`) : undefined} />
                    <AvatarFallback className="bg-purple-500/25 text-slate-900 text-sm dark:text-white">
                      {(authUser as any).name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate dark:text-white">{(authUser as any).name}</p>
                    <p className="flex items-center gap-1 text-xs text-green-400">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      {(authUser as any).role === "organization" || (authUser as any).role === "organization_pending" ? "Organization" : "Verified Supporter"}
                    </p>
                  </div>
                </div>
              ) : (
                <Link
                  href={route("login")}
                  className="text-sm font-medium text-slate-900/70 hover:text-slate-900 dark:text-white/80 dark:hover:text-white transition-colors"
                >
                  Sign in
                </Link>
              )}
            </div>
          </motion.header>

          {/* Donation type: Cash/Points vs Non-Cash Asset — pill tabs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 flex flex-col sm:flex-row gap-3 p-1 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 w-full sm:w-auto sm:inline-flex"
          >
            <button
              type="button"
              onClick={() => setDonationMode("cash_points")}
              className={`flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold transition-all ${
                donationMode === "cash_points"
                  ? "bg-purple-500/40 text-white shadow-lg shadow-purple-500/25 border border-purple-400/50"
                  : "text-slate-900/70 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-purple-500/10 dark:hover:bg-white/10 border border-transparent"
              }`}
            >
              <Coins className="h-5 w-5 shrink-0" />
              Donate Cash / Points
            </button>
            <button
              type="button"
              onClick={() => setDonationMode("non_cash")}
              className={`flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold transition-all ${
                donationMode === "non_cash"
                  ? "bg-purple-500/40 text-white shadow-lg shadow-purple-500/25 border border-purple-400/50"
                  : "text-slate-900/70 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-purple-500/10 dark:hover:bg-white/10 border border-transparent"
              }`}
            >
              <Gift className="h-5 w-5 shrink-0" />
              Donate Non-Cash Asset
            </button>
          </motion.div>

          {donationMode === "cash_points" ? (
          <>
          {/* Three glass cards — Cash / Points */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Card 1: Select Your Donation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative z-30 rounded-2xl border border-slate-200/70 bg-white/60 backdrop-blur-xl shadow-xl shadow-black/10 overflow-visible text-slate-900 dark:text-white dark:border-white/10 dark:bg-purple-950/40"
            >
              <div className="rounded-t-2xl px-5 py-4 flex items-center gap-2 border-b border-slate-200/70 dark:border-white/10">
                <Heart className="h-5 w-5 text-purple-300 fill-purple-400/80 shrink-0" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select Your Donation</h2>
              </div>
              <div className="p-5 space-y-5 rounded-b-2xl">
                <p className="text-sm text-slate-600 dark:text-white/70">Choose amount to donate.</p>
                {/* Org search */}
                <div className="relative" ref={searchContainerRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-white/50" />
                    <Input
                      type="text"
                      placeholder="Search for non-profit organisation..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      className="pl-10 h-11 rounded-lg border-slate-200/60 bg-white/60 text-slate-900 placeholder:text-slate-500 text-sm focus-visible:ring-purple-400/50 focus-visible:border-purple-400/50 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-white/50"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600/70 hover:text-slate-900 dark:text-white/60 dark:hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <AnimatePresence>
                    {selectedCause && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 flex items-center justify-between p-2 rounded-lg bg-white/70 border border-slate-200/70 dark:bg-white/10 dark:border-white/10"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CauseAvatar name={selectedCause.name} src={selectedCause.image} className="h-8 w-8" />
                          <div className="min-w-0 flex flex-col gap-1">
                            <span className="font-medium text-slate-900 truncate dark:text-white">{selectedCause.name}</span>
                            <CauseKindBadge kind={selectedCause.kind} />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-8 w-8 text-slate-700/80 hover:text-slate-900 hover:bg-white/80 dark:text-white/80 dark:hover:text-white dark:hover:bg-white/10"
                          onClick={handleClearCauseSelection}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {isSearchFocused &&
                    !selectedCause &&
                    (searchQuery || initialOrganizations.length > 0 || donatedCauses.length > 0) && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-xl max-h-72 overflow-y-auto dark:border-white/20 dark:bg-purple-950/95">
                      {isSearchingOrganizations ? (
                        <div className="p-3 text-center text-sm text-slate-600/70 dark:text-white/60 flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                        </div>
                      ) : donatedCausesFiltered.length === 0 && allOrganizationsFiltered.length === 0 ? (
                        <p className="p-3 text-sm text-slate-600/70 dark:text-white/60">No organizations found.</p>
                      ) : (
                        <>
                          {donatedCausesFiltered.length > 0 && (
                            <div role="group" aria-label="Organizations you have donated to">
                              <div className="sticky top-0 z-10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-white/95 border-b border-slate-200/60 dark:text-white/55 dark:bg-purple-950/98 dark:border-white/10">
                                Organizations you&apos;ve supported
                              </div>
                              {donatedCausesFiltered.map((cause) => (
                                <button
                                  key={cause.id}
                                  type="button"
                                  className="w-full p-3 text-left hover:bg-white/80 flex items-center gap-3 text-slate-900 border-b border-slate-100/80 dark:hover:bg-white/10 dark:text-white dark:border-white/5"
                                  onClick={() => handleCauseSelect(cause.id)}
                                >
                                  <CauseAvatar name={cause.name} src={cause.image} shape="square" className="h-9 w-9" />
                                  <div className="min-w-0 flex flex-col gap-0.5 flex-1">
                                    <div className="font-medium text-sm truncate">{cause.name}</div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                      <CauseKindBadge kind={cause.kind} />
                                      {typeof cause.donated_total === "number" && cause.donated_total > 0 && (
                                        <span className="text-xs text-slate-600 dark:text-white/55">
                                          You gave $
                                          {cause.donated_total.toLocaleString("en-US", {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 2,
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {allOrganizationsFiltered.length > 0 && (
                            <div role="group" aria-label="All organizations">
                              {donatedCausesFiltered.length > 0 && (
                                <div className="sticky top-0 z-10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-white/95 border-b border-slate-200/60 dark:text-white/55 dark:bg-purple-950/98 dark:border-white/10">
                                  All organizations
                                </div>
                              )}
                              {allOrganizationsFiltered.map((cause) => (
                                <button
                                  key={cause.id}
                                  type="button"
                                  className="w-full p-3 text-left hover:bg-white/80 flex items-center gap-3 text-slate-900 border-b border-slate-100/80 last:border-b-0 dark:hover:bg-white/10 dark:text-white dark:border-white/5"
                                  onClick={() => handleCauseSelect(cause.id)}
                                >
                                  <CauseAvatar name={cause.name} src={cause.image} shape="square" className="h-9 w-9" />
                                  <div className="min-w-0 flex flex-col gap-1">
                                    <div className="font-medium text-sm truncate">{cause.name}</div>
                                    <CauseKindBadge kind={cause.kind} />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                {/* Amount buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {amountConfig.map(({ amount, badge, impact }) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleAmountSelect(amount)}
                      className={`relative rounded-xl border-2 p-3 text-center transition-all ${
                        selectedAmount === amount
                          ? "border-purple-400 bg-purple-500/30 text-slate-900 shadow-lg shadow-purple-500/20 dark:text-white"
                          : "border-slate-200/60 bg-white/60 hover:border-purple-400/50 hover:bg-white/80 text-slate-800 dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white"
                      }`}
                    >
                      {badge && (
                        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500 text-white whitespace-nowrap">
                          {badge}
                        </span>
                      )}
                      <span className="block text-lg font-bold">${amount}</span>
                      {impact && <span className="block text-xs text-slate-600/70 mt-0.5 dark:text-white/60">{impact}</span>}
                    </button>
                  ))}
                </div>
                <div>
                  <Label className="text-xs text-slate-600/70 mb-1 block dark:text-white/70">Other amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600/70 dark:text-white/60">$</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={customAmount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      className="pl-8 h-11 rounded-lg border-slate-200/60 bg-white/60 text-slate-900 placeholder:text-slate-500 focus-visible:ring-purple-400/50 focus-visible:border-purple-400/50 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Pay Securely */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-slate-200/70 bg-white/60 backdrop-blur-xl shadow-xl shadow-black/10 overflow-hidden text-slate-900 dark:text-white dark:border-white/10 dark:bg-purple-950/40"
            >
              <div className="px-5 py-4 flex items-center gap-2 border-b border-slate-200/70 dark:border-white/10">
                <Lock className="h-5 w-5 text-purple-300 shrink-0" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pay Securely</h2>
              </div>
              <div className="p-5 space-y-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    paymentMethod === 'stripe'
                      ? "border-purple-400 bg-purple-500/20 text-slate-900 shadow-lg shadow-purple-500/10 dark:text-white"
                      : "border-slate-200/60 bg-white/60 hover:border-purple-400/50 text-slate-800 dark:border-white/20 dark:bg-white/5 dark:text-white"
                  }`}
                >
                  <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <CreditCard className="h-5 w-5 text-slate-900 dark:text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {feePreviewRail === "bank" ? "Pay with bank (ACH)" : "Pay with card"}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-slate-600/70 dark:text-white/60">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>Stripe Checkout</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-600/50 shrink-0 dark:text-white/50" />
                </button>
                {paymentMethod === "stripe" && getCurrentAmount() > 0 && (
                  <div className="rounded-xl border border-slate-200/60 bg-white/40 p-4 space-y-3 dark:border-white/15 dark:bg-white/5">
                    <div>
                      <div className="text-xs text-slate-600/80 dark:text-white/65 mb-2 font-medium">Fee preview for</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFeePreviewRail("card")}
                          className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                            feePreviewRail === "card"
                              ? "border-purple-400 bg-purple-500/25 text-slate-900 dark:text-white"
                              : "border-slate-200/60 bg-white/50 text-slate-700 hover:border-purple-400/40 dark:border-white/15 dark:bg-white/5 dark:text-white/90"
                          }`}
                        >
                          Card
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeePreviewRail("bank")}
                          className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                            feePreviewRail === "bank"
                              ? "border-purple-400 bg-purple-500/25 text-slate-900 dark:text-white"
                              : "border-slate-200/60 bg-white/50 text-slate-700 hover:border-purple-400/40 dark:border-white/15 dark:bg-white/5 dark:text-white/90"
                          }`}
                        >
                          Bank (ACH)
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-white/45 mt-2 leading-snug">
                        Card uses {(processingFeeRates.card_percent * 100).toFixed(1)}% + $
                        {processingFeeRates.card_fixed_usd.toFixed(2)}; bank uses {(processingFeeRates.ach_percent * 100).toFixed(1)}% capped at $
                        {processingFeeRates.ach_fee_cap_usd.toFixed(2)} (typical US Stripe rates). Pick the method you plan to use in Checkout—actual fees may vary.
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">Make Full Impact</div>
                        <p className="text-xs text-slate-600/85 dark:text-white/60 mt-0.5 leading-snug">
                          On: cover fees so 100% of your donation goes to the nonprofit—the extra covers processing.
                          Off: processing fees reduce what the nonprofit receives. Final total is confirmed in Stripe
                          Checkout.
                        </p>
                      </div>
                      <Switch checked={donorCoversProcessingFees} onCheckedChange={setDonorCoversProcessingFees} />
                    </div>
                    <div className="text-xs space-y-1.5 border-t border-slate-200/50 pt-3 dark:border-white/10 min-h-[5.5rem] relative">
                      {feePreviewLoading && !feePreview ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-slate-600/80 dark:text-white/60">
                          <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
                          <span>Loading fee preview…</span>
                        </div>
                      ) : null}
                      {feePreview ? (
                        <div className={cn("relative space-y-1.5", feePreviewLoading && "opacity-60")}>
                          {feePreview.mode === "donor_covers" ? (
                            <>
                              <div className="flex justify-between font-semibold text-slate-900 dark:text-white">
                                <span>Total Charged</span>
                                <span className="tabular-nums">${feePreview.checkout_total_usd.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-slate-700 dark:text-white/85">
                                <span>Donation to Nonprofit</span>
                                <span className="font-medium tabular-nums">${feePreview.base_gift_usd.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-slate-600/90 dark:text-white/65">
                                <span>Processing Fees (covered by you)</span>
                                <span className="tabular-nums">${feePreview.processing_fee_estimate.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-semibold text-slate-900 dark:text-white pt-1 border-t border-slate-200/40 dark:border-white/10">
                                <span>✓ Nonprofit receives</span>
                                <span className="tabular-nums">${feePreview.estimated_net_to_org_usd.toFixed(2)}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between font-semibold text-slate-900 dark:text-white">
                                <span>Total Charged</span>
                                <span className="tabular-nums">${feePreview.checkout_total_usd.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-slate-700 dark:text-white/85">
                                <span>Donation to Nonprofit</span>
                                <span className="font-medium tabular-nums">${feePreview.estimated_net_to_org_usd.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-slate-600/90 dark:text-white/65">
                                <span>Processing Fees</span>
                                <span className="tabular-nums">${feePreview.processing_fee_estimate.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-semibold text-slate-900 dark:text-white pt-1 border-t border-slate-200/40 dark:border-white/10">
                                <span>✓ Nonprofit receives</span>
                                <span className="tabular-nums">${feePreview.estimated_net_to_org_usd.toFixed(2)}</span>
                              </div>
                            </>
                          )}
                          {feePreviewLoading ? (
                            <div className="absolute inset-0 top-0 flex items-center justify-center rounded-md bg-white/50 dark:bg-purple-950/50 backdrop-blur-[1px]">
                              <Loader2 className="h-5 w-5 animate-spin text-purple-600 dark:text-purple-300" aria-hidden />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <p className="text-[11px] text-slate-500 dark:text-white/50 pt-1 flex items-start gap-1.5">
                        <Landmark className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-80" />
                        Sales tax may apply at checkout when enabled in Stripe. Stripe Checkout will only show{" "}
                        {feePreviewRail === "bank" ? "US bank account (ACH)" : "card"} for this
                        donation, matching your selection above.
                      </p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => canUseBelievePoints && setPaymentMethod('believe_points')}
                  disabled={!canUseBelievePoints}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    paymentMethod === 'believe_points'
                      ? "border-purple-400 bg-purple-500/20 text-slate-900 shadow-lg shadow-purple-500/10 dark:text-white"
                      : "border-slate-200/60 bg-white/60 hover:border-purple-400/50 text-slate-800 dark:border-white/20 dark:bg-white/5 dark:text-white"
                  } ${!canUseBelievePoints ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                    <Coins className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {currentBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })} Believe Points
                    </div>
                    <div className="text-sm text-slate-600/70 dark:text-white/60">Use your points balance</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-600/50 shrink-0 dark:text-white/50" />
                </button>
                <Link
                  href="/believe-points"
                  className="flex items-center justify-between gap-3 p-4 rounded-xl border-2 border-slate-200/60 bg-white/60 hover:border-purple-400/50 hover:bg-white/80 text-left text-slate-800 dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white font-medium text-sm transition-all"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                      <Coins className="h-5 w-5 text-white" />
                    </span>
                    <span className="font-semibold">Add Believe Points</span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-600/50 shrink-0 dark:text-white/70" />
                </Link>
              </div>
            </motion.div>

            {/* Card 3: Your Year-to-Date Giving */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl border border-slate-200/70 bg-white/60 backdrop-blur-xl shadow-xl shadow-black/10 overflow-hidden text-slate-900 dark:text-white dark:border-white/10 dark:bg-purple-950/40"
            >
              <div className="px-5 py-4 border-b border-slate-200/70 dark:border-white/10">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Year-to-Date Giving</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${typeof thisYearDonated === 'number' ? thisYearDonated.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 0}
                  </div>
                  <div className="text-sm text-slate-600/70 dark:text-white/60">/ ${givingGoal.toLocaleString()} Goal</div>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200/50 dark:bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${givingProgress}%` }}
                  />
                </div>
                {topOrganizations.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Top 3 Organizations</div>
                    <ul className="space-y-2">
                      {topOrganizations.slice(0, 3).map((org, i) => {
                        const Icon = TOP_ORG_ICONS[i] ?? Building2
                        return (
                          <li key={i} className="flex items-center gap-2 text-sm text-slate-700/90 dark:text-white/80">
                            <Icon className="h-4 w-4 text-purple-400 shrink-0" />
                            <span className="truncate flex-1">{org.name}</span>
                            <span className="font-medium text-slate-900 shrink-0 dark:text-white">
                              ${org.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600/70 dark:text-white/60">Your top supported organizations will appear here after you donate.</p>
                )}
                <Link
                  href={route("profile.donations")}
                  className="inline-flex items-center justify-center w-full py-2.5 rounded-xl border border-slate-200/70 bg-white/60 hover:bg-white/80 hover:border-purple-400/50 text-slate-900 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20 dark:hover:border-purple-400/50 dark:text-white font-medium text-sm transition-all"
                >
                  View Giving Dashboard
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Make My Impact CTA + Trust footer — Cash/Points only */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 space-y-6"
          >
            {submissionError && (
              <div className="rounded-xl border border-red-300/60 bg-red-50/80 dark:border-red-400/30 dark:bg-red-500/20 backdrop-blur-sm p-4 flex items-start gap-3">
                <X className="h-5 w-5 text-red-600 dark:text-red-300 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{submissionError}</p>
              </div>
            )}
            <Button
              size="lg"
              className="w-full max-w-2xl mx-auto flex h-14 text-lg font-bold bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 hover:from-purple-600 hover:via-purple-700 hover:to-pink-600 text-white shadow-xl shadow-purple-500/25 rounded-xl border-0"
              onClick={handleSubmit}
              disabled={getCurrentAmount() === 0 || !selectedCauseId || isSubmitting || (paymentMethod === 'believe_points' && !hasEnoughPoints)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  Make My Impact <span className="ml-1">→</span>
                </>
              )}
            </Button>
          </motion.div>
          </>
          ) : (
          /* ——— Non-Cash Asset: three panels ——— */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left: Select a type */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl shadow-xl shadow-black/10 overflow-hidden text-slate-900 dark:text-white dark:border-white/10 dark:bg-purple-950/40"
            >
              <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/10">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Donate Non-Cash Asset</h2>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-sm text-slate-600/70 dark:text-white/70">Select a type:</p>
                {NON_CASH_TYPES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setNonCashType(id)}
                    className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      nonCashType === id
                        ? "border-purple-400 bg-purple-500/20 text-slate-900 dark:text-white"
                        : "border-slate-200/80 bg-white/75 text-slate-800 hover:bg-white/90 hover:border-purple-400/50 dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:border-white/30"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </span>
                    <span className="text-xs font-medium text-slate-600/70 dark:text-white/70">Donate</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Center: Non-cash form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative z-30 rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl shadow-xl shadow-black/10 overflow-visible text-slate-900 dark:text-white dark:border-white/10 dark:bg-purple-950/40"
            >
              <div className="rounded-t-2xl px-5 py-4 flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10">
                <FileText className="h-5 w-5 text-purple-300 shrink-0" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Donate a Non-Cash Asset</h2>
              </div>
              <div className="p-5 space-y-4 rounded-b-2xl">
                <div>
                  <Label className="text-sm text-slate-700/80 dark:text-white/80 mb-1 block">Donation Item</Label>
                  <Input
                    placeholder="e.g. Office furniture, laptops..."
                    value={nonCashItemName}
                    onChange={(e) => setNonCashItemName(e.target.value)}
                    className="rounded-lg border-slate-200/60 bg-white/60 text-slate-900 placeholder:text-slate-500 focus-visible:ring-purple-400/50 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
                  />
                </div>
                <div>
                  <Label className="text-sm text-slate-700/80 dark:text-white/80 mb-1 block">Estimated Fair Market Value</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600/70 dark:text-white/60">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={nonCashEstimatedValue}
                      onChange={(e) => setNonCashEstimatedValue(e.target.value)}
                      className="pl-8 rounded-lg border-slate-200/60 bg-white/60 text-slate-900 placeholder:text-slate-500 focus-visible:ring-purple-400/50 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-slate-700/80 dark:text-white/80 mb-1 block">Condition</Label>
                  <select
                    value={nonCashCondition}
                    onChange={(e) => setNonCashCondition(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200/60 bg-white/60 text-slate-900 px-3 focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 dark:border-white/20 dark:bg-white/5 dark:text-white"
                  >
                    {CONDITION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-white text-slate-900 dark:bg-purple-950 dark:text-white">{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="relative" ref={nonCashOrgSearchRef}>
                  <Label className="text-sm text-slate-700/80 dark:text-white/80 mb-1 block">Preferred Receiving Organization</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-white/50" />
                    <Input
                      type="text"
                      placeholder="Select an organization"
                      value={
                        nonCashSearchQuery ||
                        (nonCashPreferredOrgId
                          ? initialOrganizations.find((o) => o.organization_id === nonCashPreferredOrgId)?.name ?? ""
                          : "")
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setNonCashSearchQuery(e.target.value)
                        if (nonCashPreferredOrgId) setNonCashPreferredOrgId(null)
                      }}
                      onFocus={() => setNonCashSearchFocused(true)}
                      className="pl-10 pr-9 rounded-lg border-slate-200/60 bg-white/60 text-slate-900 placeholder:text-slate-500 focus-visible:ring-purple-400/50 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
                    />
                    {nonCashPreferredOrgId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setNonCashPreferredOrgId(null)
                          setNonCashSearchQuery("")
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600/70 hover:text-slate-900 dark:text-white/60 dark:hover:text-white p-1"
                        aria-label="Clear organization"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  {nonCashSearchFocused && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-xl max-h-48 overflow-y-auto dark:border-white/20 dark:bg-purple-950/95">
                      {initialOrganizations
                        .filter((o) => !nonCashSearchQuery || o.name.toLowerCase().includes(nonCashSearchQuery.toLowerCase()))
                        .slice(0, 8)
                        .map((org) => (
                          <button
                            key={org.id}
                            type="button"
                            className="w-full p-3 text-left hover:bg-white/80 flex items-center gap-3 text-slate-900 dark:hover:bg-white/10 dark:text-white"
                            onClick={() => {
                              setNonCashPreferredOrgId(org.organization_id)
                              setNonCashSearchQuery("")
                              setNonCashSearchFocused(false)
                            }}
                          >
                            <CauseAvatar name={org.name} src={org.image} className="h-8 w-8" />
                            <div className="min-w-0 flex flex-col gap-1">
                              <span className="font-medium text-sm truncate">{org.name}</span>
                              <CauseKindBadge kind={org.kind} />
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700/80 dark:text-white/80 text-sm">
                  <input
                    type="checkbox"
                    checked={nonCashUploadPhotos}
                    onChange={(e) => setNonCashUploadPhotos(e.target.checked)}
                    className="rounded border-slate-200/60 bg-white/60 text-purple-600 focus:ring-purple-400/50 dark:border-white/20 dark:bg-white/5 dark:text-purple-500"
                  />
                  <Camera className="h-4 w-4 shrink-0" />
                  Upload Photos
                </label>
                {submissionError && (
                  <div className="rounded-lg border border-red-300/60 bg-red-50/80 dark:border-red-400/30 dark:bg-red-500/20 p-3 text-sm text-red-800 dark:text-red-200">
                    {submissionError}
                  </div>
                )}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg"
                    onClick={handleNonCashSubmit}
                    disabled={isSubmittingNonCash}
                  >
                    {isSubmittingNonCash ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Submit Donation Request"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDonationMode("cash_points")}
                    className="text-sm text-slate-600/70 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Right: Quick links + Year-to-Date */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl shadow-xl shadow-black/10 overflow-hidden text-slate-900 dark:text-white dark:border-white/10 dark:bg-purple-950/40"
            >
              <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/10">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Donate a Non-Cash Asset</h2>
              </div>
              <div className="p-5 space-y-3">
                {NON_CASH_TYPES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setNonCashType(id)}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/80 bg-white/75 hover:bg-white/90 text-slate-800 text-sm transition-colors dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-600/50 dark:text-white/50" />
                  </button>
                ))}
                <div className="pt-4 border-t border-slate-200/80 dark:border-white/10">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    ${typeof thisYearDonated === "number" ? thisYearDonated.toLocaleString("en-US", { maximumFractionDigits: 0 }) : 0}
                  </div>
                  <div className="text-sm text-slate-600/70 dark:text-white/60">/ ${givingGoal.toLocaleString()} Goal</div>
                  <div className="h-2 rounded-full bg-slate-200/50 mt-2 overflow-hidden dark:bg-white/20">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                      style={{ width: `${givingProgress}%` }}
                    />
                  </div>
                  <Link
                    href={route("profile.donations")}
                    className="inline-flex items-center justify-center w-full py-2.5 rounded-xl border border-slate-200/70 bg-white/60 hover:bg-white/80 hover:border-purple-400/50 text-slate-900 font-medium text-sm mt-3 transition-all dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/20 dark:hover:border-purple-400/50 dark:text-white"
                  >
                    View Giving Dashboard
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
          )}

          {/* Trust footer — both modes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600/70 dark:text-white/70"
          >
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-green-400" /> 100% Secure Donations
            </span>
            <span className="flex items-center gap-1.5">501(c)(3) EIN: 12-3456789</span>
            <span>IRS Compliant</span>
            <span className="flex items-center gap-1 text-slate-600/70 dark:text-white/60">Stripe · card &amp; ACH</span>
          </motion.div>
        </div>

        {/* Subscription Required Modal - Supporter View */}
        <SubscriptionRequiredModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          feature="donations"
          isSupporterView={true}
          donationRecipientKind={donationSubscriptionModalRecipientKind}
        />
      </div>
    </FrontendLayout>
  )
}

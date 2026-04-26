import React, { useEffect, useState } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { MerchantLabel } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { ArrowLeft, Wallet, Check, CreditCard, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface Package {
  brp: number
  price: number
  label: string
}

interface Props {
  wallet: {
    balance_brp: number
    available_brp: number
  }
  packages: Package[]
  feePreview?: {
    budget_usd: number
    platform_fee_usd: number
    processing_fee_usd: number
    checkout_total_usd: number
  } | null
}

export default function BuyBrp({ wallet, packages, feePreview = null }: Props) {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  const [feePreviewLoading, setFeePreviewLoading] = useState(false)

  const { props } = usePage<{ success?: string; error?: string }>()

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const effectiveBrp = selectedPackage !== null
    ? packages[selectedPackage].brp
    : Number(customAmount) || 0
  const budgetDollars = effectiveBrp
  const platformFee = budgetDollars * 0.045
  const processingFee = budgetDollars * 0.035
  const totalCharge = budgetDollars + platformFee + processingFee

  // Donation page pattern: server-calculated fee preview via Inertia partial reload.
  // This keeps rules centralized in the controller and avoids UI drift.
  useEffect(() => {
    if (effectiveBrp <= 0) return
    const t = window.setTimeout(() => {
      router.get(
        '/wallet/brp/buy',
        { fee_preview_amount_bp: effectiveBrp },
        {
          preserveState: true,
          preserveScroll: true,
          replace: true,
          only: ['feePreview'],
          onStart: () => setFeePreviewLoading(true),
          onFinish: () => setFeePreviewLoading(false),
        },
      )
    }, 350)

    return () => window.clearTimeout(t)
  }, [effectiveBrp])

  const handlePurchase = () => {
    if (effectiveBrp < 10) {
      showErrorToast('Minimum purchase is 10 BP ($10)')
      return
    }
    setProcessing(true)
    router.post('/wallet/brp/purchase', { amount_brp: effectiveBrp }, {
      onFinish: () => setProcessing(false),
    })
  }

  return (
    <>
      <Head title="Buy BP - Merchant Dashboard" />
      <MerchantDashboardLayout>
        <div className="w-full max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Header */}
            <div>
              <Link href="/wallet/brp" className="text-sm text-gray-400 hover:text-white flex items-center gap-1 mb-2 w-fit">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to wallet
              </Link>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1">Buy BP</h1>
                  <p className="text-gray-400">Top up Believe Points for Feedback & Rewards campaigns.</p>
                </div>
                <div className="text-sm text-gray-500">
                  1 BP = $1.00
                </div>
              </div>
            </div>

            {/* Current Balance */}
            <div className="grid gap-4 md:grid-cols-3">
              <MerchantCard className="shadow-lg md:col-span-2">
                <MerchantCardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Available balance</p>
                      <p className="text-lg font-bold text-white truncate">{wallet.available_brp.toLocaleString()} BP</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">USD value</p>
                    <p className="text-sm font-semibold text-gray-300">${wallet.available_brp.toFixed(2)}</p>
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              <MerchantCard className="shadow-lg">
                <MerchantCardContent className="p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Selected amount</p>
                  <p className="text-2xl font-extrabold text-white mt-1">
                    {effectiveBrp > 0 ? `${effectiveBrp.toLocaleString()} BP` : '—'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {effectiveBrp > 0 ? `$${budgetDollars.toFixed(2)} budget` : 'Pick a package or enter a custom amount.'}
                  </p>
                </MerchantCardContent>
              </MerchantCard>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
              {/* Left: choose amount */}
              <MerchantCard className="shadow-xl">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white">Choose an amount</MerchantCardTitle>
                  <p className="text-sm text-gray-400 mt-1">Packages are the fastest way. You can also enter a custom amount.</p>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {packages.map((pkg, index) => (
                      <button
                        key={pkg.brp}
                        type="button"
                        onClick={() => {
                          setSelectedPackage(index)
                          setCustomAmount('')
                        }}
                        className={`p-4 rounded-xl border-2 transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 ${
                          selectedPackage === index
                            ? 'border-[#2563EB] bg-[#2563EB]/10'
                            : 'border-gray-800/70 bg-gray-900/30 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <span className="text-base font-bold text-white block">{pkg.label}</span>
                            <span className="text-xs text-gray-500">Best for quick top-ups</span>
                          </div>
                          {selectedPackage === index && <Check className="h-5 w-5 text-[#2563EB]" aria-hidden />}
                        </div>
                        <p className="text-xl font-extrabold text-emerald-400">${pkg.price}</p>
                      </button>
                    ))}
                  </div>

                  {/* Custom amount */}
                  <div className="pt-4 border-t border-gray-800">
                    <MerchantLabel htmlFor="custom_amount">Custom amount</MerchantLabel>
                    <div className="mt-2 flex gap-2">
                      <MerchantInput
                        id="custom_amount"
                        type="number"
                        min={10}
                        step={10}
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value)
                          setSelectedPackage(null)
                        }}
                        placeholder="e.g., 75"
                      />
                      <div className="px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-800/70 text-gray-400 text-sm whitespace-nowrap">
                        BP
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Minimum purchase: 10 BP.</p>
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              {/* Right: sticky summary (prevents huge page jumps) */}
              {effectiveBrp > 0 ? (
                <div className="lg:sticky lg:top-6">
                  <MerchantCard className="shadow-xl border border-[#2563EB]/20">
                    <MerchantCardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Order summary</span>
                        <span className="text-sm font-semibold text-gray-300">{effectiveBrp.toLocaleString()} BP</span>
                      </div>

                      <div className="rounded-xl border border-gray-800/70 bg-gray-950/25 p-3">
                        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Fee preview</div>
                        <div className="text-xs space-y-1.5 relative min-h-[5.25rem]">
                          {!feePreview && feePreviewLoading ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                              <span>Calculating…</span>
                            </div>
                          ) : null}
                          <div className={feePreviewLoading ? 'opacity-60' : ''}>
                            <div className="flex justify-between text-gray-300">
                              <span>Budget</span>
                              <span className="font-medium tabular-nums">${(feePreview?.budget_usd ?? budgetDollars).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                              <span>Platform (4.5%)</span>
                              <span className="tabular-nums">+${(feePreview?.platform_fee_usd ?? platformFee).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                              <span>Processing (3.5%)</span>
                              <span className="tabular-nums">+${(feePreview?.processing_fee_usd ?? processingFee).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-white pt-1 border-t border-gray-800/60 mt-2">
                              <span>Est. charge</span>
                              <span className="tabular-nums">${(feePreview?.checkout_total_usd ?? totalCharge).toFixed(2)}</span>
                            </div>
                          </div>
                          {feePreviewLoading && feePreview ? (
                            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/10 backdrop-blur-[1px]">
                              <Loader2 className="h-4 w-4 animate-spin text-gray-300" aria-hidden />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <MerchantButton
                        onClick={handlePurchase}
                        disabled={processing || effectiveBrp < 10}
                        className="w-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461]"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {processing ? 'Processing...' : `Continue to Stripe • $${(feePreview?.checkout_total_usd ?? totalCharge).toFixed(2)}`}
                      </MerchantButton>

                      <p className="text-[11px] text-gray-500 text-center">Fees are added on top. Your full budget is credited as BP.</p>
                    </MerchantCardContent>
                  </MerchantCard>
                </div>
              ) : (
                <div className="lg:sticky lg:top-6">
                  <MerchantCard className="shadow-xl border border-gray-800/50">
                    <MerchantCardContent className="p-4">
                      <p className="text-sm text-gray-400">Select an amount to see fees and total charge.</p>
                    </MerchantCardContent>
                  </MerchantCard>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}

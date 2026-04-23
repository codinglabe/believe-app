import React, { useEffect, useState } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { MerchantLabel } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { ArrowLeft, Wallet, Check, CreditCard } from 'lucide-react'
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
}

export default function BuyBrp({ wallet, packages }: Props) {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [processing, setProcessing] = useState(false)

  const { props } = usePage<{ success?: string; error?: string }>()

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const effectiveBrp = selectedPackage !== null
    ? packages[selectedPackage].brp
    : Number(customAmount) || 0
  const effectivePrice = (effectiveBrp * 0.01).toFixed(2)

  const handlePurchase = () => {
    if (effectiveBrp < 1000) {
      showErrorToast('Minimum purchase is 1,000 BRP ($10)')
      return
    }
    setProcessing(true)
    router.post('/wallet/brp/purchase', { amount_brp: effectiveBrp }, {
      onFinish: () => setProcessing(false),
    })
  }

  return (
    <>
      <Head title="Buy BRP - Merchant Dashboard" />
      <MerchantDashboardLayout>
        <div className="w-full max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Header */}
            <div>
              <Link href="/wallet/brp" className="text-sm text-gray-400 hover:text-white flex items-center gap-1 mb-2">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to wallet
              </Link>
              <h1 className="text-3xl font-bold text-white mb-1">Buy BRP</h1>
              <p className="text-gray-400">Purchase Believe Reward Points for your campaigns</p>
            </div>

            {/* Current Balance */}
            <MerchantCard className="shadow-lg">
              <MerchantCardContent className="p-4 flex items-center gap-3">
                <Wallet className="h-5 w-5 text-emerald-400" />
                <span className="text-gray-400">Current Balance:</span>
                <span className="text-white font-bold">{wallet.available_brp.toLocaleString()} BRP</span>
                <span className="text-gray-500">(${(wallet.available_brp * 0.01).toFixed(2)})</span>
              </MerchantCardContent>
            </MerchantCard>

            {/* Packages */}
            <MerchantCard className="shadow-xl">
              <MerchantCardHeader>
                <MerchantCardTitle className="text-white">Select a Package</MerchantCardTitle>
                <p className="text-sm text-gray-400 mt-1">1 BRP = $0.01</p>
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
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedPackage === index
                          ? 'border-[#2563EB] bg-[#2563EB]/10'
                          : 'border-gray-700/50 bg-gray-900/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-white">{pkg.label}</span>
                        {selectedPackage === index && <Check className="h-5 w-5 text-[#2563EB]" />}
                      </div>
                      <p className="text-2xl font-extrabold text-emerald-400">${pkg.price}</p>
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div className="pt-4 border-t border-gray-800">
                  <MerchantLabel htmlFor="custom_amount">Or enter a custom amount (min 1,000 BRP)</MerchantLabel>
                  <MerchantInput
                    id="custom_amount"
                    type="number"
                    min={1000}
                    step={100}
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value)
                      setSelectedPackage(null)
                    }}
                    placeholder="e.g., 15000"
                    className="mt-2"
                  />
                  {customAmount && Number(customAmount) > 0 && (
                    <p className="text-sm text-gray-400 mt-1">= ${(Number(customAmount) * 0.01).toFixed(2)}</p>
                  )}
                </div>
              </MerchantCardContent>
            </MerchantCard>

            {/* Purchase Summary */}
            {effectiveBrp > 0 && (
              <MerchantCard className="shadow-xl border border-[#2563EB]/20">
                <MerchantCardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">You'll receive</span>
                    <span className="text-2xl font-bold text-white">{effectiveBrp.toLocaleString()} BRP</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">Total charge</span>
                    <span className="text-2xl font-bold text-emerald-400">${effectivePrice}</span>
                  </div>
                  <MerchantButton
                    onClick={handlePurchase}
                    disabled={processing || effectiveBrp < 1000}
                    className="w-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#FF1FA3] hover:via-[#EC1F4C] hover:to-[#F98461]"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {processing ? 'Processing...' : `Pay $${effectivePrice} with Stripe`}
                  </MerchantButton>
                  <p className="text-xs text-gray-500 text-center mt-2">Secure payment powered by Stripe</p>
                </MerchantCardContent>
              </MerchantCard>
            )}
          </motion.div>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}

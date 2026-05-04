import React, { useEffect, useState } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import { route } from 'ziggy-js'
import { MerchantDashboardLayout } from '@/components/merchant'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantInput } from '@/components/merchant-ui'
import { MerchantLabel } from '@/components/merchant-ui'
import { Check, Play, Plus, X, Info, ChevronRight, Heart, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

const BRP_PER_USD = 100
const PRESETS = [100, 250, 500, 1000, 2500] as const

const AWARD_CARDS: { key: string; title: string; desc: string }[] = [
  { key: 'offer_engagement', title: 'Offer Engagement', desc: 'Awarded when customers engage with offers (clicks, saves, views).' },
  { key: 'purchase', title: 'Purchase-Based', desc: 'Awarded after a purchase (e.g. spend $20 → earn 200 BRP).' },
  { key: 'visit', title: 'Visit / Check-in', desc: 'Awarded for visiting the store.' },
  { key: 'referral', title: 'Referral-Based', desc: 'Awarded for referring friends.' },
  { key: 'review', title: 'Review / Feedback', desc: 'Awarded for leaving reviews.' },
  { key: 'promo_push', title: 'Promotional Push', desc: 'Targeted distribution to users in a specific area (e.g. within 5 miles).' },
]

const TRIGGER_OPTIONS = AWARD_CARDS.map((c) => ({ value: c.key, label: c.title }))

export interface TriggerRule {
  trigger: string
  spend_amount_usd: number | ''
  award_brp: number | ''
  limit_per_user_brp: number | ''
  expiry_days: number | ''
}

interface Props {
  wallet: {
    available_merchant_brp: number
    available_bp: number
  }
}

function Stepper({ active }: { active: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, title: 'Fund Campaign', sub: 'Add funds to your BRP Bank.' },
    { n: 2 as const, title: 'Set Triggers', sub: 'Choose how customers earn.' },
    { n: 3 as const, title: 'Review & Launch', sub: 'Confirm and go live.' },
  ]

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-2 w-full">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold border ${
                active === s.n ? 'bg-violet-600 border-violet-400 text-white' : 'bg-black/30 border-white/15 text-gray-400'
              }`}
            >
              {s.n}
            </div>
            <div className="min-w-0">
              <p className={`font-semibold ${active === s.n ? 'text-white' : 'text-gray-400'}`}>{s.title}</p>
              <p className="text-xs text-gray-500 leading-snug">{s.sub}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <ChevronRight className="hidden lg:block w-5 h-5 text-white/20 shrink-0 mt-2" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function BrpCampaignFund({ wallet }: Props) {
  const [fundUsd, setFundUsd] = useState(500)
  const [presetMode, setPresetMode] = useState<number | 'custom'>(500)
  const [awardTriggers, setAwardTriggers] = useState<string[]>(['offer_engagement'])
  const [rules, setRules] = useState<TriggerRule[]>([
    {
      trigger: 'purchase',
      spend_amount_usd: 20,
      award_brp: 200,
      limit_per_user_brp: 1000,
      expiry_days: 60,
    },
  ])
  const [howModal, setHowModal] = useState(false)
  const [processing, setProcessing] = useState(false)

  const { props } = usePage<{ success?: string; error?: string }>()
  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const merchantBrp = Math.round(fundUsd * BRP_PER_USD)
  const platformFee = fundUsd * 0.045
  const processingFee = fundUsd * 0.035
  const totalCharge = fundUsd + platformFee + processingFee
  const estLow = Math.max(1, Math.floor(fundUsd / 6.25))
  const estHigh = Math.max(estLow, Math.floor(fundUsd / 3.33))

  const setPreset = (v: number | 'custom') => {
    setPresetMode(v)
    if (v !== 'custom') setFundUsd(v)
  }

  const toggleAward = (key: string) => {
    setAwardTriggers((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const updateRule = (index: number, patch: Partial<TriggerRule>) => {
    setRules((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const addRule = () => {
    setRules((r) => [
      ...r,
      {
        trigger: 'purchase',
        spend_amount_usd: 20,
        award_brp: 200,
        limit_per_user_brp: 1000,
        expiry_days: 60,
      },
    ])
  }

  const removeRule = (index: number) => {
    setRules((r) => (r.length <= 1 ? r : r.filter((_, i) => i !== index)))
  }

  const resetCampaign = () => {
    setFundUsd(500)
    setPresetMode(500)
    setAwardTriggers(['offer_engagement'])
    setRules([
      {
        trigger: 'purchase',
        spend_amount_usd: 20,
        award_brp: 200,
        limit_per_user_brp: 1000,
        expiry_days: 60,
      },
    ])
  }

  const launch = () => {
    if (awardTriggers.length === 0) {
      showErrorToast('Select at least one way to award Merchant BRP.')
      return
    }
    if (fundUsd < 10) {
      showErrorToast('Minimum fund is $10.')
      return
    }

    for (const rule of rules) {
      if (!rule.award_brp || Number(rule.award_brp) < 1) {
        showErrorToast('Each rule needs an award amount in BRP.')
        return
      }
      if (!rule.limit_per_user_brp || Number(rule.limit_per_user_brp) < 1) {
        showErrorToast('Each rule needs a per-user limit in BRP.')
        return
      }
      if (!rule.expiry_days || Number(rule.expiry_days) < 1) {
        showErrorToast('Each rule needs an expiry in days.')
        return
      }
      if (rule.trigger === 'purchase' && (rule.spend_amount_usd === '' || Number(rule.spend_amount_usd) < 0)) {
        showErrorToast('Purchase rules need a spend amount.')
        return
      }
    }

    setProcessing(true)
    router.post(
      route('merchant.brp-funding.checkout'),
      {
        fund_amount_usd: fundUsd,
        name: `Campaign ${new Date().toLocaleDateString()}`,
        award_triggers: awardTriggers,
        trigger_rules: rules.map((r) => ({
          trigger: r.trigger,
          spend_amount_usd: r.trigger === 'purchase' ? Number(r.spend_amount_usd) : null,
          award_brp: Number(r.award_brp),
          limit_per_user_brp: Number(r.limit_per_user_brp),
          expiry_days: Number(r.expiry_days),
        })),
      },
      {
        preserveScroll: true,
        onFinish: () => setProcessing(false),
      },
    )
  }

  const activeStep: 1 | 2 | 3 = 1

  return (
    <>
      <Head title="Fund BRP Campaign — BIU Merchant Hub" />
      <MerchantDashboardLayout>
        <div className="w-full max-w-[1280px] mx-auto space-y-6 pb-10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-white/90 mb-1">
                  <Heart className="w-5 h-5 text-violet-400 fill-violet-500/30" />
                  <span className="text-sm font-semibold text-violet-300">BIU Merchant Hub</span>
                </div>
                <h1 className="text-3xl font-bold text-white">Fund BRP Campaign</h1>
                <p className="text-gray-400 mt-1 max-w-xl">
                  Buy BRP for your business and award it to customers using smart triggers.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <MerchantButton
                  type="button"
                  variant="outline"
                  className="border-white/20 bg-black/20 text-white hover:bg-white/10"
                  onClick={() => setHowModal(true)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  How Merchant BRP Works
                </MerchantButton>
                <MerchantButton
                  type="button"
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0"
                  onClick={resetCampaign}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New BRP Campaign
                </MerchantButton>
              </div>
            </div>

            <MerchantCard className="border border-violet-500/25 bg-black/20">
              <MerchantCardContent className="p-4 md:p-6">
                <Stepper active={activeStep} />
              </MerchantCardContent>
            </MerchantCard>
          </motion.div>

          <div className="grid xl:grid-cols-[1fr_340px] gap-6 items-start">
            <div className="space-y-6">
              {/* 1 — Fund */}
              <MerchantCard className="border border-white/10 shadow-xl">
                <MerchantCardHeader>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-200 font-bold text-sm">
                      1
                    </span>
                    <MerchantCardTitle className="text-white">Fund your BRP campaign</MerchantCardTitle>
                  </div>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-4">
                  <div>
                    <MerchantLabel className="text-gray-300">I want to spend (USD)</MerchantLabel>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <MerchantInput
                        type="number"
                        min={10}
                        step={1}
                        value={fundUsd}
                        onChange={(e) => {
                          setPresetMode('custom')
                          setFundUsd(Number(e.target.value) || 0)
                        }}
                        className="pl-8 text-lg font-semibold"
                      />
                    </div>
                    <p className="mt-3 text-gray-300">
                      You will receive{' '}
                      <span className="font-bold text-white">{merchantBrp.toLocaleString()} Merchant BRP</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">1 BRP = $0.01 — funds convert at this rate for customer-facing rewards.</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPreset(p)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                          presetMode === p
                            ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-900/40'
                            : 'border-white/15 bg-black/30 text-gray-300 hover:border-white/25'
                        }`}
                      >
                        ${p.toLocaleString()}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPreset('custom')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        presetMode === 'custom'
                          ? 'bg-violet-600 border-violet-400 text-white'
                          : 'border-white/15 bg-black/30 text-gray-300 hover:border-white/25'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  <div className="rounded-xl border border-violet-500/35 bg-violet-500/10 px-4 py-3 flex gap-2">
                    <Info className="w-5 h-5 text-violet-300 shrink-0" />
                    <p className="text-sm text-gray-200">
                      These BRP are locked to your business and can only be redeemed at your store.
                    </p>
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              {/* 2 — Award types */}
              <MerchantCard className="border border-white/10 shadow-xl">
                <MerchantCardHeader>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-200 font-bold text-sm">
                      2
                    </span>
                    <MerchantCardTitle className="text-white">How do you want to award Merchant BRP?</MerchantCardTitle>
                  </div>
                </MerchantCardHeader>
                <MerchantCardContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {AWARD_CARDS.map((c) => {
                      const on = awardTriggers.includes(c.key)
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => toggleAward(c.key)}
                          className={`text-left p-4 rounded-xl border-2 transition-all relative ${
                            on ? 'border-emerald-500/70 bg-emerald-500/10' : 'border-white/10 bg-black/25 hover:border-white/20'
                          }`}
                        >
                          {on && (
                            <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </span>
                          )}
                          <p className="font-semibold text-white pr-8">{c.title}</p>
                          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{c.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              {/* 3 — Rules */}
              <MerchantCard className="border border-white/10 shadow-xl">
                <MerchantCardHeader>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-200 font-bold text-sm">
                      3
                    </span>
                    <MerchantCardTitle className="text-white">Set trigger rules</MerchantCardTitle>
                  </div>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-6">
                  {rules.map((rule, idx) => (
                    <div key={idx} className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-300">Rule {idx + 1}</p>
                        {rules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRule(idx)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400"
                            aria-label="Remove rule"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div>
                        <MerchantLabel>Trigger</MerchantLabel>
                        <select
                          value={rule.trigger}
                          onChange={(e) => updateRule(idx, { trigger: e.target.value })}
                          className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 text-white px-3 py-2 text-sm"
                        >
                          {TRIGGER_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value} className="bg-[#0a1628]">
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {rule.trigger === 'purchase' && (
                        <div>
                          <MerchantLabel>Spend amount (USD)</MerchantLabel>
                          <div className="relative mt-2">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <MerchantInput
                              type="number"
                              min={0}
                              step={0.01}
                              value={rule.spend_amount_usd}
                              onChange={(e) => updateRule(idx, { spend_amount_usd: e.target.value === '' ? '' : Number(e.target.value) })}
                              className="pl-8"
                            />
                          </div>
                        </div>
                      )}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <MerchantLabel>Award amount (BRP)</MerchantLabel>
                          <MerchantInput
                            type="number"
                            min={1}
                            className="mt-2"
                            value={rule.award_brp}
                            onChange={(e) =>
                              updateRule(idx, { award_brp: e.target.value === '' ? '' : Number(e.target.value) })
                            }
                          />
                        </div>
                        <div>
                          <MerchantLabel>Limit per user (BRP / month)</MerchantLabel>
                          <MerchantInput
                            type="number"
                            min={1}
                            className="mt-2"
                            value={rule.limit_per_user_brp}
                            onChange={(e) =>
                              updateRule(idx, { limit_per_user_brp: e.target.value === '' ? '' : Number(e.target.value) })
                            }
                          />
                        </div>
                      </div>
                      <div className="sm:w-1/2">
                        <MerchantLabel>BRP expiry</MerchantLabel>
                        <div className="flex gap-2 mt-2">
                          <MerchantInput
                            type="number"
                            min={1}
                            value={rule.expiry_days}
                            onChange={(e) =>
                              updateRule(idx, { expiry_days: e.target.value === '' ? '' : Number(e.target.value) })
                            }
                          />
                          <span className="flex items-center text-sm text-gray-500 whitespace-nowrap">days</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <MerchantButton type="button" variant="outline" className="border-white/20 text-white" onClick={addRule}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add another rule
                    </MerchantButton>
                    <MerchantButton
                      type="button"
                      disabled={processing}
                      onClick={launch}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0 sm:ml-auto"
                    >
                      {processing ? 'Redirecting to checkout…' : 'Review & launch →'}
                    </MerchantButton>
                  </div>
                </MerchantCardContent>
              </MerchantCard>
            </div>

            {/* Summary rail */}
            <div className="space-y-4 xl:sticky xl:top-24">
              <MerchantCard className="border border-violet-500/30 shadow-xl">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white text-base">Campaign summary</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">You spend</span>
                    <span className="font-bold text-white">${fundUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Merchant BRP you receive</span>
                    <span className="text-violet-300 font-semibold">{merchantBrp.toLocaleString()} BRP</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">BRP value</span>
                    <span className="text-gray-200">$0.01 / BRP</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Est. reach</span>
                    <span className="text-gray-200">
                      {estLow} – {estHigh} customers
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-3 space-y-1.5 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Platform (4.5%)</span>
                      <span>+${platformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing (3.5%)</span>
                      <span>+${processingFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-white pt-1">
                      <span>Est. card charge</span>
                      <span>${totalCharge.toFixed(2)}</span>
                    </div>
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 flex gap-2 items-start">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-100/90">
                  <span className="font-semibold text-white">100% redeemable</span> at your business — funded BRP stays tied to your offers.
                </p>
              </div>

              <MerchantCard className="border border-white/10">
                <MerchantCardHeader>
                  <MerchantCardTitle className="text-white text-sm">How Merchant BRP works</MerchantCardTitle>
                </MerchantCardHeader>
                <MerchantCardContent className="space-y-3 text-xs text-gray-400">
                  <div className="flex gap-2">
                    <span className="text-violet-400 font-bold">1</span>
                    <span>Merchant funds a campaign (real USD → Merchant BRP).</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-violet-400 font-bold">2</span>
                    <span>Customers earn BRP through your triggers.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-violet-400 font-bold">3</span>
                    <span>Customers redeem BRP at checkout for discounts.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-violet-400 font-bold">4</span>
                    <span>You grow visits, orders, and loyalty.</span>
                  </div>
                </MerchantCardContent>
              </MerchantCard>

              <MerchantCard className="border border-white/10">
                <MerchantCardContent className="p-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Your BRP balance</p>
                  <p className="text-2xl font-bold text-white">{wallet.available_merchant_brp.toLocaleString()} BRP</p>
                  <p className="text-xs text-gray-500 mt-1">Across all campaigns (wallet balance × 100 at $0.01/BRP).</p>
                  <Link href="/wallet/brp" className="text-sm text-violet-400 hover:text-violet-300 mt-3 inline-block font-medium">
                    View balance details →
                  </Link>
                </MerchantCardContent>
              </MerchantCard>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {howModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setHowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="max-w-lg w-full rounded-2xl border border-white/15 bg-[#0c1829] p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-white mb-2">How Merchant BRP works</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Merchants pay real money to buy Merchant BRP. That balance is distributed to customers based on your rules. When customers redeem BRP, you are giving a discount funded from the BRP you purchased — not free magic internet points.
                </p>
                <ol className="space-y-3 text-sm text-gray-300 list-decimal list-inside">
                  <li>You fund a campaign with USD (plus standard processing fees).</li>
                  <li>Customers earn Merchant BRP through the triggers you choose.</li>
                  <li>Customers spend BRP at your business to unlock savings.</li>
                  <li>You keep the relationship and the sale — with predictable reward economics.</li>
                </ol>
                <MerchantButton className="mt-6 w-full bg-violet-600 hover:bg-violet-500" onClick={() => setHowModal(false)}>
                  Got it
                </MerchantButton>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </MerchantDashboardLayout>
    </>
  )
}

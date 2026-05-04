import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { MerchantDashboardLayout } from '@/components/merchant'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { Info, ArrowRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

const BRP_USD = 0.01

function Step({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 min-w-0">
      <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300 font-bold">
        {n}
      </div>
      <p className="text-sm text-gray-200 leading-snug px-1">{title}</p>
    </div>
  )
}

export default function PlaybooksIndex() {
  return (
    <>
      <Head title="Merchant Playbooks — BIU" />
      <MerchantDashboardLayout>
        <div className="w-full max-w-[1400px] mx-auto space-y-8 pb-12">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">BIU Merchant Playbooks</h1>
              <p className="text-gray-400 max-w-2xl">
                Three proven patterns to attract customers using Merchant BRP. Pick the strategy that matches your goal — discounts scale with BRP at a fixed rate.
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 flex items-start gap-2 max-w-sm">
              <Info className="w-5 h-5 text-violet-300 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-200">
                <span className="font-semibold text-white">BRP Value = ${BRP_USD.toFixed(2)}.</span>{' '}
                BRP is used to unlock discounts at checkout.
              </p>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Playbook 1 */}
            <MerchantCard className="border border-white/10 shadow-xl h-full flex flex-col">
              <MerchantCardHeader className="pb-2">
                <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold uppercase tracking-wide">
                  <Sparkles className="w-4 h-4" /> Playbook 1
                </div>
                <MerchantCardTitle className="text-xl text-white mt-1">Get Customers in the Door</MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-4 flex-1 flex flex-col">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Goal</p>
                  <p className="text-gray-300 text-sm">Drive new customers and first visits with simple product discounts.</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Best for</p>
                  <p className="text-gray-300 text-sm">New customer acquisition.</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 overflow-hidden text-sm">
                  <div className="px-3 py-2 bg-white/5 font-semibold text-white">Example breakdown</div>
                  <dl className="divide-y divide-white/10">
                    <div className="px-3 py-2 flex justify-between gap-2"><dt className="text-gray-500">Product</dt><dd className="text-gray-200 text-right">Pecan Candy (16oz)</dd></div>
                    <div className="px-3 py-2 flex justify-between gap-2"><dt className="text-gray-500">Retail price</dt><dd className="text-white font-medium">$45.00</dd></div>
                    <div className="px-3 py-2 flex justify-between gap-2"><dt className="text-gray-500">Discount</dt><dd className="text-emerald-400">10%</dd></div>
                    <div className="px-3 py-2 flex justify-between gap-2"><dt className="text-gray-500">You save (customer)</dt><dd>$4.50</dd></div>
                    <div className="px-3 py-2 flex justify-between gap-2"><dt className="text-gray-500">BRP required</dt><dd className="text-violet-300 font-semibold">450 BRP</dd></div>
                    <div className="px-3 py-2 flex justify-between gap-2"><dt className="text-gray-500">Final price</dt><dd className="text-white font-semibold">$40.50</dd></div>
                  </dl>
                </div>
                <p className="text-sm text-gray-400 border-l-2 border-violet-500/50 pl-3">
                  Customers use 450 BRP to save $4.50 and pay $40.50.
                </p>
                <div className="mt-auto pt-2 border-t border-white/10">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Merchant benefit</p>
                  <p className="text-sm text-gray-300">Brings in new customers and drives first-time purchases.</p>
                </div>
              </MerchantCardContent>
            </MerchantCard>

            {/* Playbook 2 */}
            <MerchantCard className="border border-white/10 shadow-xl h-full flex flex-col">
              <MerchantCardHeader className="pb-2">
                <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold uppercase tracking-wide">
                  <Sparkles className="w-4 h-4" /> Playbook 2
                </div>
                <MerchantCardTitle className="text-xl text-white mt-1">Increase Spend</MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-4 flex-1 flex flex-col">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Goal</p>
                  <p className="text-gray-300 text-sm">Encourage customers to spend more with a stronger reward when they cross a minimum.</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Best for</p>
                  <p className="text-gray-300 text-sm">Raising average order value.</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 overflow-hidden text-sm">
                  <div className="px-3 py-2 bg-white/5 font-semibold text-white">Offer terms</div>
                  <dl className="divide-y divide-white/10">
                    <div className="px-3 py-2 flex justify-between gap-2"><dt className="text-gray-500">Minimum spend</dt><dd className="text-white font-medium">$50.00</dd></div>
                    <div className="px-3 py-2 flex justify-between gap-2"><dt className="text-gray-500">Reward (discount)</dt><dd className="text-emerald-400 font-medium">$10.00</dd></div>
                    <div className="px-3 py-2 flex justify-between gap-2"><dt className="text-gray-500">BRP required</dt><dd className="text-violet-300 font-semibold">1,000 BRP</dd></div>
                  </dl>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 overflow-hidden text-sm">
                  <div className="px-3 py-2 bg-white/5 font-semibold text-white">Checkout example</div>
                  <dl className="divide-y divide-white/10">
                    <div className="px-3 py-2 flex justify-between gap-2"><dt className="text-gray-500">Cart total</dt><dd>$60.00</dd></div>
                    <div className="px-3 py-2 flex justify-between gap-2"><dt className="text-gray-500">Discount</dt><dd className="text-emerald-400">−$10.00</dd></div>
                    <div className="px-3 py-2 flex justify-between gap-2"><dt className="text-gray-500">Final price</dt><dd className="text-white font-semibold">$50.00</dd></div>
                  </dl>
                </div>
                <div className="mt-auto pt-2 border-t border-white/10">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Merchant benefit</p>
                  <p className="text-sm text-gray-300">Encourages higher spending while you control the reward level.</p>
                </div>
              </MerchantCardContent>
            </MerchantCard>

            {/* Playbook 3 */}
            <MerchantCard className="border border-white/10 shadow-xl h-full flex flex-col">
              <MerchantCardHeader className="pb-2">
                <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold uppercase tracking-wide">
                  <Sparkles className="w-4 h-4" /> Playbook 3
                </div>
                <MerchantCardTitle className="text-xl text-white mt-1">Build Loyalty (Tier System)</MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-4 flex-1 flex flex-col">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Goal</p>
                  <p className="text-gray-300 text-sm">Reward your best customers with higher discounts based on tier.</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Best for</p>
                  <p className="text-gray-300 text-sm">Repeat purchases and loyalty.</p>
                </div>
                <p className="text-xs text-gray-500">
                  Tier structure (cart total <span className="text-gray-300">$100</span> example). Discount and BRP scale with cart and tier %.
                </p>
                <div className="space-y-2 text-sm">
                  {[
                    { tier: 'Bronze', pct: '5%', save: '$5.00', brp: '500 BRP' },
                    { tier: 'Silver', pct: '10%', save: '$10.00', brp: '1,000 BRP' },
                    { tier: 'Gold', pct: '15%', save: '$15.00', brp: '1,500 BRP' },
                  ].map((row) => (
                    <div key={row.tier} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-amber-200/90">{row.tier}</span>
                      <span className="text-gray-300">{row.pct} discount</span>
                      <span className="text-gray-400">Save {row.save}</span>
                      <span className="text-violet-300 font-medium">{row.brp}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 italic">
                  Discount and BRP required are calculated from cart total and tier percentage.
                </p>
                <div className="mt-auto pt-2 border-t border-white/10">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Merchant benefit</p>
                  <p className="text-sm text-gray-300">Builds loyalty, increases repeats, and rewards top supporters.</p>
                </div>
              </MerchantCardContent>
            </MerchantCard>
          </div>

          {/* How it works */}
          <MerchantCard className="border border-violet-500/20 bg-gradient-to-br from-violet-950/40 to-transparent">
            <MerchantCardHeader>
              <MerchantCardTitle className="text-white text-lg">How it works</MerchantCardTitle>
            </MerchantCardHeader>
            <MerchantCardContent>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-2">
                <Step n={1} title="Customer earns BRP by doing good on BIU." />
                <div className="hidden md:flex items-center pt-4 text-violet-500/40 shrink-0">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <Step n={2} title="Customer chooses an offer from your business." />
                <div className="hidden md:flex items-center pt-4 text-violet-500/40 shrink-0">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <Step n={3} title="Customer redeems BRP to unlock the discount." />
                <div className="hidden md:flex items-center pt-4 text-violet-500/40 shrink-0">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <Step n={4} title="Customer pays the balance — you grow traffic and sales." />
              </div>
            </MerchantCardContent>
          </MerchantCard>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/brp-funding"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold px-6 py-3 shadow-lg"
            >
              Fund a BRP campaign
            </Link>
            <Link
              href="/offers/create"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium px-6 py-3"
            >
              Create an offer
            </Link>
          </div>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}

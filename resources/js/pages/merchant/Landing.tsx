import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { MerchantButton } from '@/components/merchant-ui'
import { MerchantHeader, MerchantFooter } from '@/components/merchant'
import {
  ArrowRight,
  HeartHandshake,
  LineChart,
  Megaphone,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Tag,
  UserPlus,
  Users,
} from 'lucide-react'

const howItWorksCards = [
  {
    title: 'Join The Hub',
    text: 'Signup and get approved into the 10% volunteer discount merchant network.',
    icon: Store,
  },
  {
    title: 'Create Your Offers',
    text: "Set your item, discount, limits and what's tracked in your dashboard.",
    icon: Tag,
  },
  {
    title: 'Volunteers Claim',
    text: 'Verified volunteers redeem your offer and show proof in-store or online.',
    icon: ShieldCheck,
  },
  {
    title: 'You Gain Customers',
    text: 'New customers come for value, and stronger community impact.',
    icon: Users,
  },
]

const merchantValueCards = [
  {
    title: 'Get New Customers',
    text: 'Reach engaged volunteers who love supporting community-minded businesses.',
    icon: UserPlus,
  },
  {
    title: 'You Stay in Control',
    text: "You decide the terms, usage limits, and what's included in the discount.",
    icon: SlidersHorizontal,
  },
  {
    title: 'Track What Matters',
    text: 'See claims, repeat customer impact, and discount payouts in your dashboard.',
    icon: LineChart,
  },
  {
    title: 'Strengthen Community',
    text: 'Show your support for volunteers and make a positive local impact.',
    icon: HeartHandshake,
  },
]

export default function MerchantLanding() {
  return (
    <>
      <Head title="Reward Service. Grow Together." />

      <div className="min-h-screen bg-[#050B1D] text-white">
        <MerchantHeader variant="public" />

        <main className="pt-24 pb-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <section className="rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-[#0A122D] via-[#0D1735] to-[#111A3D] p-6 shadow-[0_0_80px_rgba(56,65,162,0.28)] sm:p-8 lg:p-10">
              <div className="grid gap-7 lg:grid-cols-2 lg:gap-8">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/25 bg-indigo-300/10 px-3 py-1 text-xs font-semibold text-indigo-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
                    10% Discount For Verified Volunteers
                  </div>

                  <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                    Reward Service.
                    <span className="mt-1 block bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                      Grow Together.
                    </span>
                  </h1>

                  <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                    BIU Merchant Hub helps nonprofits and churches reward verified volunteers with a 10% discount,
                    turning your community service into new customers for your business.
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link href="/register">
                      <MerchantButton className="w-full sm:w-auto">
                        Join the 10% Discount Merchant Hub
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </MerchantButton>
                    </Link>
                    <Link href="/hub">
                      <MerchantButton variant="outline" className="w-full border-slate-600/80 bg-transparent sm:w-auto">
                        Browse Offers
                      </MerchantButton>
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 text-xs text-slate-300 sm:text-sm">
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-center">Simple Setup</div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-center">No Hidden Fees</div>
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-center">Full Control</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-300/20 bg-[#081229] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-100">Welcome back, Merchant</p>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-300">Live</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
                      <p className="text-xs text-slate-400">Total Offers</p>
                      <p className="mt-1 text-xl font-bold">24</p>
                    </div>
                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
                      <p className="text-xs text-slate-400">Total Claims</p>
                      <p className="mt-1 text-xl font-bold">1,248</p>
                    </div>
                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/45 p-3">
                      <p className="text-xs text-slate-400">New Customers</p>
                      <p className="mt-1 text-xl font-bold">312</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/45 p-4">
                    <p className="text-xs text-slate-400">Claims Trend</p>
                    <div className="mt-3 h-24 rounded-lg bg-gradient-to-b from-indigo-400/20 to-transparent p-2">
                      <div className="h-full w-full rounded-md border border-dashed border-indigo-300/35" />
                    </div>
                    <p className="mt-3 text-xs text-slate-300">You paid out $2,481 discounts this month</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="pt-14">
              <h2 className="text-center text-3xl font-bold sm:text-4xl">How It Works</h2>
              <p className="mx-auto mt-2 max-w-xl text-center text-slate-300">Simple steps to start rewarding volunteers and growing your business.</p>

              <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {howItWorksCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <div key={card.title} className="rounded-2xl border border-slate-700/70 bg-[#0A132B] p-5">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-violet-400/40 bg-violet-500/10">
                        <Icon className="h-5 w-5 text-violet-300" />
                      </div>
                      <h3 className="text-lg font-semibold">{card.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{card.text}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="pt-14">
              <h2 className="text-center text-3xl font-bold sm:text-4xl">Why Merchants Love It</h2>
              <p className="mx-auto mt-2 max-w-2xl text-center text-slate-300">
                Drive growth while supporting the people who support your community.
              </p>

              <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {merchantValueCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <div key={card.title} className="rounded-2xl border border-slate-700/70 bg-[#0A132B] p-5">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-blue-400/40 bg-blue-500/10">
                        <Icon className="h-5 w-5 text-blue-300" />
                      </div>
                      <h3 className="text-lg font-semibold">{card.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{card.text}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="pt-14">
              <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-r from-[#0F1D46] via-[#182B65] to-[#0E1F4B] px-6 py-8 sm:px-8 sm:py-10">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Ready to make an impact?</p>
                    <h3 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
                      Let's grow your business
                      <span className="block">and our community.</span>
                    </h3>
                    <p className="mt-3 text-slate-200">
                      Join the BIU Merchant Hub and start rewarding volunteers today.
                    </p>
                  </div>
                  <div className="flex min-w-[260px] flex-col gap-3">
                    <Link href="/register">
                      <MerchantButton className="w-full">
                        Join the 10% Discount Merchant Hub
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </MerchantButton>
                    </Link>
                    <Link href="/hub">
                      <MerchantButton variant="outline" className="w-full border-slate-300/30 text-white">
                        Browse Offers
                      </MerchantButton>
                    </Link>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2 text-sm text-violet-200">
                  <Megaphone className="h-4 w-4" />
                  Built for community-minded merchants.
                </div>
              </div>
            </section>
          </div>
        </main>

        <MerchantFooter />
      </div>
    </>
  )
}

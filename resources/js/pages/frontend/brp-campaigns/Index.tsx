import React, { useEffect, useState } from 'react'
import { Link, router } from '@inertiajs/react'
import FrontendLayout from '@/layouts/frontend/frontend-layout'
import { PageHead } from '@/components/frontend/PageHead'
import { Card, CardContent } from '@/components/frontend/ui/card'
import { Input } from '@/components/frontend/ui/input'
import { Badge } from '@/components/frontend/ui/badge'
import { Button } from '@/components/frontend/ui/button'
import { Search, Sparkles, Building2, ArrowRight, Coins, Filter, Target } from 'lucide-react'

interface Campaign {
  id: number
  name: string
  merchant_name: string
  fund_amount_usd: number
  merchant_brp_amount: number
  award_triggers: string[]
  created_at: string
}

interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
}

interface Props {
  campaigns: Paginated<Campaign>
  filters: {
    search: string
    sort: string
  }
  stats: {
    active_campaigns: number
    total_merchant_brp: number
  }
}

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'budget_high', label: 'Highest BRP Budget' },
  { value: 'budget_low', label: 'Lowest BRP Budget' },
]

const triggerLabelMap: Record<string, string> = {
  offer_engagement: 'Offer engagement',
  purchase: 'Purchase based',
  visit: 'Visit / check-in',
  referral: 'Referral based',
  promo_push: 'Promotional push',
}

function prettyTrigger(trigger: string) {
  return triggerLabelMap[trigger] ?? trigger.replaceAll('_', ' ')
}

function buildQuery(search: string, sort: string) {
  return {
    search: search || undefined,
    sort: sort !== 'newest' ? sort : undefined,
  }
}

export default function BrpCampaignsIndex({ campaigns, filters, stats }: Props) {
  const [search, setSearch] = useState(filters.search ?? '')

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (search === filters.search) return
      router.get('/brp-campaigns', buildQuery(search, filters.sort), {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      })
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [search, filters.search, filters.sort])

  return (
    <FrontendLayout>
      <PageHead
        title="Earn & Save Campaigns"
        description="Discover active merchant BRP campaigns and see how businesses are rewarding customers."
      />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.18),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_32%),linear-gradient(180deg,_#030712_0%,_#0b1120_100%)]">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-violet-200">
                <Sparkles className="h-3.5 w-3.5" />
                Earn & Save
              </p>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Earn & Save Campaigns</h1>
              <p className="mt-3 max-w-2xl text-base text-slate-300 sm:text-lg">
                Explore active merchant BRP campaigns and see where customers can earn and redeem rewards.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
              <Card className="border-violet-500/30 bg-slate-950/70 shadow-[0_0_0_1px_rgba(124,58,237,0.12)]">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-2xl bg-violet-500/15 p-3 text-violet-300">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Active Campaigns</p>
                    <p className="text-2xl font-bold text-white">{stats.active_campaigns}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-emerald-500/30 bg-slate-950/70 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Total BRP Budget</p>
                    <p className="text-2xl font-bold text-white">{stats.total_merchant_brp.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] rounded-[28px] border border-white/10 bg-slate-950/55 p-4 shadow-2xl shadow-violet-950/20 backdrop-blur sm:p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns or merchants"
                className="h-12 rounded-2xl border-white/10 bg-slate-950/80 pl-11 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select
                value={filters.sort}
                onChange={(e) =>
                  router.get('/brp-campaigns', buildQuery(search, e.target.value), {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                  })
                }
                className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/80 pl-11 pr-4 text-sm font-medium text-white outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {campaigns.data.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-white/10 bg-slate-950/50 px-6 py-16 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-xl font-semibold text-white">No active campaigns found</h3>
              <p className="mt-2 text-sm text-slate-400">Try a different search or check back as new campaigns go live.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {campaigns.data.map((campaign) => (
                <Card
                  key={campaign.id}
                  className="group overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/80 shadow-[0_24px_64px_rgba(2,8,23,0.45)] transition duration-300 hover:-translate-y-1 hover:border-violet-400/30"
                >
                  <div className="h-24 bg-gradient-to-br from-violet-500/20 via-violet-500/5 to-transparent" />
                  <CardContent className="relative p-5">
                    <div className="-mt-12 flex items-start justify-between gap-3">
                      <div className="rounded-3xl border border-white/10 bg-white p-3 text-slate-900 shadow-xl shadow-slate-950/30">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <Badge className="border border-violet-500/30 bg-violet-500/10 text-violet-200">Live</Badge>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold leading-tight text-white">{campaign.name}</h3>
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                          <Building2 className="h-4 w-4" />
                          <span>{campaign.merchant_name}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                          <p className="text-xs uppercase tracking-wide text-emerald-200/70">Budget</p>
                          <p className="mt-1 text-xl font-black text-emerald-300">{campaign.merchant_brp_amount.toLocaleString()} BRP</p>
                          <p className="text-xs text-emerald-100/60">${campaign.fund_amount_usd.toFixed(2)} funded</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Earn Rate</p>
                          <p className="mt-1 text-xl font-black text-white">$0.01 / BRP</p>
                          <p className="text-xs text-slate-500">Reward redemption value</p>
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Active trigger types</p>
                        <div className="flex flex-wrap gap-2">
                          {(campaign.award_triggers ?? []).slice(0, 3).map((trigger) => (
                            <Badge key={trigger} variant="outline" className="border-white/15 bg-white/5 text-slate-200">
                              {prettyTrigger(trigger)}
                            </Badge>
                          ))}
                          {(campaign.award_triggers?.length ?? 0) > 3 && (
                            <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-300">
                              +{(campaign.award_triggers?.length ?? 0) - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button asChild className="h-11 w-full rounded-xl bg-violet-600 text-white hover:bg-violet-500">
                        <Link href={route('merchant-hub.index')} className="flex items-center justify-center gap-2">
                          Explore deals
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {campaigns.last_page > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: campaigns.last_page }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() =>
                    router.get(
                      '/brp-campaigns',
                      { ...buildQuery(search, filters.sort), page: page === 1 ? undefined : page },
                      { preserveState: true, preserveScroll: true, replace: true },
                    )
                  }
                  className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold transition ${
                    page === campaigns.current_page
                      ? 'border-violet-500 bg-violet-600 text-white'
                      : 'border-white/10 bg-slate-900/70 text-slate-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}


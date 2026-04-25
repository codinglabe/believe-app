import React, { useEffect, useState } from 'react'
import { Link, router } from '@inertiajs/react'
import FrontendLayout from '@/layouts/frontend/frontend-layout'
import { PageHead } from '@/components/frontend/PageHead'
import { Badge } from '@/components/frontend/ui/badge'
import { Button } from '@/components/frontend/ui/button'
import { Input } from '@/components/frontend/ui/input'
import { Card, CardContent } from '@/components/frontend/ui/card'
import { MessageSquare, Clock3, Search, CheckCircle2, Sparkles, Building2, ArrowRight, Vote, Filter } from 'lucide-react'

interface Campaign {
  id: number
  uuid: string
  title: string
  type: 'quick_vote' | 'short_feedback' | 'standard_survey' | 'deep_feedback'
  merchant_name: string
  reward_per_response_brp: number
  reward_dollars: number
  reward_bp_display?: number
  estimated_time: string
  responses_count: number
  questions_count: number
  already_responded: boolean
  created_at: string
}

interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
}

interface Option {
  value: string
  label: string
}

interface Props {
  campaigns: Paginated<Campaign>
  filters: {
    search: string
    type: string
    sort: string
  }
  typeOptions: Option[]
  stats: {
    active_campaigns: number
    completed_by_user: number
  }
}

const typeMeta: Record<Campaign['type'], { label: string; pill: string; glow: string; cta: string; icon: typeof Vote }> = {
  quick_vote: {
    label: 'Quick Vote',
    pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    glow: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    cta: 'Vote Now',
    icon: Vote,
  },
  short_feedback: {
    label: 'Short Feedback',
    pill: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    glow: 'from-blue-500/20 via-blue-500/5 to-transparent',
    cta: 'Share Feedback',
    icon: MessageSquare,
  },
  standard_survey: {
    label: 'Standard Survey',
    pill: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    glow: 'from-violet-500/20 via-violet-500/5 to-transparent',
    cta: 'Take Survey',
    icon: Sparkles,
  },
  deep_feedback: {
    label: 'Deep Feedback',
    pill: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    glow: 'from-orange-500/20 via-orange-500/5 to-transparent',
    cta: 'Give Detailed Feedback',
    icon: MessageSquare,
  },
}

const sortOptions: Option[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Active' },
  { value: 'reward_high', label: 'Highest BP' },
  { value: 'reward_low', label: 'Lowest BP' },
]

function buildQuery(search: string, type: string, sort: string) {
  return {
    search: search || undefined,
    type: type !== 'all' ? type : undefined,
    sort: sort !== 'newest' ? sort : undefined,
  }
}

export default function FeedbackCampaignsIndex({ campaigns, filters, typeOptions, stats }: Props) {
  const [search, setSearch] = useState(filters.search ?? '')

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (search === filters.search) return
      router.get('/feedback-campaigns', buildQuery(search, filters.type, filters.sort), {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      })
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [search, filters.search, filters.type, filters.sort])

  return (
    <FrontendLayout>
      <PageHead
        title="Feedback Campaigns"
        description="Browse active feedback campaigns, pick the one you want, and earn BP for completed responses."
      />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_32%),linear-gradient(180deg,_#030712_0%,_#0b1120_100%)]">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
                <Sparkles className="h-3.5 w-3.5" />
                Earn & Save
              </p>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Feedback Campaigns</h1>
              <p className="mt-3 max-w-2xl text-base text-slate-300 sm:text-lg">
                Browse all active campaigns in one place, choose the one you want, and earn BP for completed responses.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
              <Card className="border-blue-500/30 bg-slate-950/70 shadow-[0_0_0_1px_rgba(37,99,235,0.12)]">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-300">
                    <MessageSquare className="h-5 w-5" />
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
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Completed By You</p>
                    <p className="text-2xl font-bold text-white">{stats.completed_by_user}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-8 space-y-5 rounded-[28px] border border-white/10 bg-slate-950/55 p-4 shadow-2xl shadow-blue-950/20 backdrop-blur sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search campaigns or organizations"
                  className="h-12 rounded-2xl border-white/10 bg-slate-950/80 pl-11 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <select
                  value={filters.sort}
                  onChange={(e) =>
                    router.get('/feedback-campaigns', buildQuery(search, filters.type, e.target.value), {
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

            <div className="flex flex-wrap gap-2">
              {typeOptions.map((option) => {
                const active = filters.type === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      router.get('/feedback-campaigns', buildQuery(search, option.value, filters.sort), {
                        preserveState: true,
                        preserveScroll: true,
                        replace: true,
                      })
                    }
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-white/10 bg-slate-900/70 text-slate-300 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Active Campaigns</h2>
              <p className="mt-1 text-sm text-slate-400">Pick a campaign to vote or provide feedback.</p>
            </div>
            <p className="text-sm text-slate-500">{campaigns.data.length} shown</p>
          </div>

          {campaigns.data.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-white/10 bg-slate-950/50 px-6 py-16 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-xl font-semibold text-white">No campaigns found</h3>
              <p className="mt-2 text-sm text-slate-400">Try a different search or filter to find active feedback campaigns.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {campaigns.data.map((campaign) => {
                const meta = typeMeta[campaign.type]
                const Icon = meta.icon

                return (
                  <Card
                    key={campaign.id}
                    className="group overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/80 shadow-[0_24px_64px_rgba(2,8,23,0.45)] transition duration-300 hover:-translate-y-1 hover:border-blue-400/30"
                  >
                    <div className={`h-28 bg-gradient-to-br ${meta.glow}`} />
                    <CardContent className="relative p-5">
                      <div className="-mt-14 flex items-start justify-between gap-3">
                        <div className="rounded-3xl border border-white/10 bg-white p-4 text-slate-900 shadow-xl shadow-slate-950/30">
                          <Icon className="h-7 w-7" />
                        </div>
                        <div className="flex gap-2">
                          <Badge className={`border ${meta.pill}`}>{meta.label}</Badge>
                          <Badge variant="outline" className="border-white/10 bg-slate-950/80 text-slate-300">
                            <Clock3 className="mr-1 h-3.5 w-3.5" />
                            {campaign.estimated_time}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <div>
                          <h3 className="text-2xl font-bold leading-tight text-white">{campaign.title}</h3>
                          <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                            <Building2 className="h-4 w-4" />
                            <span>{campaign.merchant_name}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                            <p className="text-xs uppercase tracking-wide text-emerald-200/70">Earn</p>
                            <p className="mt-1 text-2xl font-black text-emerald-300">
                              {((campaign.reward_bp_display ?? campaign.reward_per_response_brp / 100)).toFixed(2)} BP
                            </p>
                            <p className="text-xs text-emerald-100/60">1 BP = $1.00 · ${campaign.reward_dollars.toFixed(2)}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Participation</p>
                            <p className="mt-1 text-2xl font-black text-white">{campaign.responses_count}</p>
                            <p className="text-xs text-slate-500">{campaign.questions_count} question{campaign.questions_count === 1 ? '' : 's'}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-slate-400">
                          <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                          {campaign.already_responded ? (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-300">
                              <CheckCircle2 className="h-4 w-4" />
                              Completed
                            </span>
                          ) : (
                            <span className="text-slate-500">Open now</span>
                          )}
                        </div>

                        <Link href={`/feedback/${campaign.uuid}`} className="block">
                          <Button
                            className={`h-12 w-full rounded-2xl text-base font-semibold ${
                              campaign.already_responded
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-800'
                                : 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white hover:from-blue-500 hover:via-blue-500 hover:to-cyan-400'
                            }`}
                          >
                            {campaign.already_responded ? 'View Response Status' : meta.cta}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {campaigns.last_page > 1 ? (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: campaigns.last_page }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() =>
                    router.get(
                      '/feedback-campaigns',
                      { ...buildQuery(search, filters.type, filters.sort), page },
                      { preserveState: true, preserveScroll: true, replace: true }
                    )
                  }
                  className={`h-11 min-w-11 rounded-2xl px-4 text-sm font-semibold transition ${
                    campaigns.current_page === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-white/10 bg-slate-900/70 text-slate-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </FrontendLayout>
  )
}

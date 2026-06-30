import React, { useEffect, useMemo, useState } from 'react'
import { Head, Link, usePage } from '@inertiajs/react'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantDashboardLayout } from '@/components/merchant'
import { SubscriptionRequiredModal } from '@/components/merchant/SubscriptionRequiredModal'
import {
  ArrowUpRight,
  ChevronDown,
  Gift,
  Plus,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'

interface WeeklyData {
  week: string
  value: number
}

interface RecentRedemption {
  id: string
  points: number
  status: string
  code?: string
  customer_name?: string
  offer_title?: string
  offer_image_url?: string | null
  created_at?: string
}

interface GrowthStats {
  activeOffersNew: number | null
  redemptions: number | null
  pointsEarned: number | null
  customers: number | null
}

interface Props {
  stats: {
    activeOffers: number
    totalRedemptions: number
    totalPointsEarned: number
    totalRewardsRedeemed: number
    totalCustomers?: number
    growth?: GrowthStats
    weeklyPointsRedeemedTotal?: number
    weeklyPointsChartGrowthPercent?: number | null
    weeklyRedemptionsCountGrowthPercent?: number | null
  }
  weeklyRedemptions: WeeklyData[]
  recentRedemptions: RecentRedemption[]
  rewardsData: WeeklyData[]
}

function GrowthBadge({ value }: { value: number | null | undefined }) {
  if (value == null) {
    return <span className="text-xs text-slate-500">— vs last 7 days</span>
  }
  const positive = value >= 0
  return (
    <span className={cn('text-xs font-semibold', positive ? 'text-[#00C853]' : 'text-rose-400')}>
      {positive ? '+' : ''}
      {value}% vs last 7 days
    </span>
  )
}

function ChartFooterGrowth({ value, label }: { value: number | null | undefined; label: string }) {
  if (value == null) {
    return <span className="text-xs text-slate-500">{label}: —</span>
  }
  const positive = value >= 0
  return (
    <span className={cn('text-xs font-medium', positive ? 'text-[#00C853]' : 'text-rose-400')}>
      {label}: {positive ? '+' : ''}
      {value}%
    </span>
  )
}

const chartTooltipStyle = {
  backgroundColor: '#161B30',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#f8fafc',
}

export default function MerchantDashboard({
  stats,
  weeklyRedemptions,
  recentRedemptions,
  rewardsData,
}: Props) {
  const weeklyData = weeklyRedemptions || []
  const recentData = recentRedemptions || []
  const rewardsWeeklyData = rewardsData || []
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [rangeLabel] = useState('Last 7 Weeks')

  const { auth } = usePage().props as {
    auth?: { user?: { name?: string; business_name?: string; has_active_subscription?: boolean } }
  }
  const displayName = auth?.user?.business_name || auth?.user?.name || 'merchant'
  const onFreePlan = !auth?.user?.has_active_subscription

  useEffect(() => {
    if (onFreePlan && !sessionStorage.getItem('merchant_free_plan_notice_dismissed')) {
      setShowSubscriptionModal(true)
    }
  }, [onFreePlan])

  const dismissFreePlanNotice = () => {
    sessionStorage.setItem('merchant_free_plan_notice_dismissed', '1')
    setShowSubscriptionModal(false)
  }

  const insights = useMemo(() => {
    const g = stats?.growth
    const rows: { icon: React.ReactNode; text: string; accent: string }[] = []
    if (g?.redemptions != null) {
      const up = g.redemptions >= 0
      rows.push({
        icon: <TrendingUp className="h-5 w-5" />,
        text: `Redemptions are ${up ? 'up' : 'down'} ${Math.abs(g.redemptions)}% compared to the prior 7 days.`,
        accent: 'text-[#00C853]',
      })
    }
    if (g?.customers != null) {
      rows.push({
        icon: <Users className="h-5 w-5" />,
        text: `Unique redeemers this week ${g.customers >= 0 ? 'grew' : 'fell'} by ${Math.abs(g.customers)}% vs the week before.`,
        accent: 'text-[#FF9100]',
      })
    }
    if (g?.pointsEarned != null) {
      rows.push({
        icon: <Target className="h-5 w-5" />,
        text: `Points activity is ${g.pointsEarned >= 0 ? 'trending up' : 'cooling'} ${Math.abs(g.pointsEarned)}% week over week.`,
        accent: 'text-[#8E2DE2]',
      })
    }
    while (rows.length < 3) {
      rows.push({
        icon: <Sparkles className="h-5 w-5" />,
        text: 'Publish a new offer to drive more redemptions and repeat visits.',
        accent: 'text-slate-300',
      })
    }
    return rows.slice(0, 3)
  }, [stats?.growth])

  const totalCustomers = stats?.totalCustomers ?? 0
  const weeklyPointsTotal = stats?.weeklyPointsRedeemedTotal ?? weeklyData.reduce((s, d) => s + d.value, 0)

  return (
    <>
      <Head title="Merchant Dashboard" />
      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
        onClose={dismissFreePlanNotice}
      />
      <MerchantDashboardLayout>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 mx-auto max-w-[1600px] space-y-6 sm:space-y-8"
        >
          {/* Page header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Overview</h1>
              <p className="text-sm text-slate-400 sm:text-base">
                <span aria-hidden>👋</span> Welcome back,{' '}
                <span className="font-medium text-slate-200">{displayName}</span>!
              </p>
            </div>
            <Link href="/offers/create" className="shrink-0 self-start">
              <span className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8E2DE2] to-[#4A00E0] px-5 text-sm font-semibold text-white shadow-lg shadow-purple-900/40 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 sm:h-12 sm:px-6">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                Create Offer
              </span>
            </Link>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <MerchantCard className="rounded-xl border border-white/[0.06] bg-[#161B30] py-5 shadow-xl">
              <MerchantCardHeader className="px-5 pb-2 pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8E2DE2]/90 to-[#4A00E0] shadow-md shadow-purple-900/40">
                      <Tag className="h-5 w-5 text-white" />
                    </div>
                    <MerchantCardTitle className="text-sm font-semibold text-slate-200 sm:text-base">Active Offers</MerchantCardTitle>
                  </div>
                </div>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-1 px-5">
                <p className="text-3xl font-bold tracking-tight text-white">{stats?.activeOffers ?? 0}</p>
                <GrowthBadge value={stats?.growth?.activeOffersNew} />
              </MerchantCardContent>
            </MerchantCard>

            <MerchantCard className="rounded-xl border border-white/[0.06] bg-[#161B30] py-5 shadow-xl">
              <MerchantCardHeader className="px-5 pb-2 pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1e40af] shadow-md shadow-blue-900/30">
                      <Gift className="h-5 w-5 text-white" />
                    </div>
                    <MerchantCardTitle className="text-sm font-semibold text-slate-200 sm:text-base">Redemptions</MerchantCardTitle>
                  </div>
                </div>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-1 px-5">
                <p className="text-3xl font-bold tracking-tight text-white">{stats?.totalRedemptions?.toLocaleString() ?? 0}</p>
                <GrowthBadge value={stats?.growth?.redemptions} />
              </MerchantCardContent>
            </MerchantCard>

            <MerchantCard className="rounded-xl border border-white/[0.06] bg-[#161B30] py-5 shadow-xl">
              <MerchantCardHeader className="px-5 pb-2 pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00C853] to-[#009624] shadow-md shadow-emerald-900/25">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <MerchantCardTitle className="text-sm font-semibold text-slate-200 sm:text-base">Points Earned</MerchantCardTitle>
                  </div>
                </div>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-1 px-5">
                <p className="text-3xl font-bold tracking-tight text-white">{stats?.totalPointsEarned?.toLocaleString() ?? 0}</p>
                <GrowthBadge value={stats?.growth?.pointsEarned} />
              </MerchantCardContent>
            </MerchantCard>

            <MerchantCard className="rounded-xl border border-white/[0.06] bg-[#161B30] py-5 shadow-xl">
              <MerchantCardHeader className="px-5 pb-2 pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF9100] to-[#e65100] shadow-md shadow-orange-900/25">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <MerchantCardTitle className="text-sm font-semibold text-slate-200 sm:text-base">Total Customers</MerchantCardTitle>
                  </div>
                </div>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-1 px-5">
                <p className="text-3xl font-bold tracking-tight text-white">{totalCustomers.toLocaleString()}</p>
                <GrowthBadge value={stats?.growth?.customers} />
              </MerchantCardContent>
            </MerchantCard>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-2">
            <MerchantCard className="rounded-xl border border-white/[0.06] bg-[#161B30] shadow-xl">
              <MerchantCardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 px-5 pt-6">
                <MerchantCardTitle className="text-base font-semibold text-white sm:text-lg">Weekly Points Redeemed</MerchantCardTitle>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300"
                >
                  {rangeLabel}
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
                </button>
              </MerchantCardHeader>
              <MerchantCardContent className="px-2 pb-2 sm:px-5">
                <div className="h-[220px] w-full sm:h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8E2DE2" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#4A00E0" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                      <XAxis dataKey="week" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(148,163,184,0.2)' }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        labelStyle={{ color: '#cbd5e1' }}
                        formatter={(v: number | string) => [Number(v).toLocaleString(), 'Points']}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#a855f7"
                        strokeWidth={2}
                        fill="url(#lineFill)"
                        dot={{ fill: '#c084fc', strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] px-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-0">
                  <p className="text-sm text-slate-400">
                    Total Points Redeemed:{' '}
                    <span className="font-semibold text-white">{weeklyPointsTotal.toLocaleString()}</span>
                  </p>
                  <ChartFooterGrowth value={stats?.weeklyPointsChartGrowthPercent} label="Growth vs prior 7 weeks" />
                </div>
              </MerchantCardContent>
            </MerchantCard>

            <MerchantCard className="rounded-xl border border-white/[0.06] bg-[#161B30] shadow-xl">
              <MerchantCardHeader className="flex flex-row items-center justify-between px-5 pt-6">
                <MerchantCardTitle className="text-base font-semibold text-white sm:text-lg">Recent Redemptions</MerchantCardTitle>
                <Link href="/redemptions" className="text-xs font-semibold text-[#a78bfa] hover:text-white sm:text-sm">
                  View all
                </Link>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-4 px-5 pb-6">
                {recentData.length > 0 ? (
                  <>
                    <Link
                      href={`/redemptions/${recentData[0].id}`}
                      className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 transition hover:border-white/10 hover:bg-white/[0.05]"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                        {recentData[0].offer_image_url ? (
                          <img src={recentData[0].offer_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Gift className="h-6 w-6 text-slate-500" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          {recentData[0].points?.toLocaleString() ?? 0} Points Used
                        </p>
                        {recentData[0].offer_title && (
                          <p className="truncate text-sm text-slate-300">{recentData[0].offer_title}</p>
                        )}
                        {recentData[0].customer_name && (
                          <p className="text-xs text-slate-500">{recentData[0].customer_name}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {recentData[0].created_at && (
                            <span className="text-xs text-slate-500">
                              {new Date(recentData[0].created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                          <span className="rounded-full bg-[#00C853]/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#00C853]">
                            {recentData[0].status === 'completed' || recentData[0].status === 'used'
                              ? 'Completed'
                              : recentData[0].status}
                          </span>
                        </div>
                      </div>
                    </Link>
                    {recentData.length > 1 ? (
                      <ul className="space-y-2">
                        {recentData.slice(1).map((redemption) => (
                          <li key={redemption.id}>
                            <Link
                              href={`/redemptions/${redemption.id}`}
                              className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.04]"
                            >
                              <span className="truncate font-medium text-white">{redemption.offer_title || 'Offer'}</span>
                              <span className="shrink-0 text-xs text-slate-500">{redemption.points?.toLocaleString() ?? 0} pts</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] py-6 text-center">
                        <Gift className="h-9 w-9 text-slate-600" aria-hidden />
                        <p className="text-sm text-slate-500">No more redemptions yet</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-slate-500">
                    <Gift className="mx-auto mb-2 h-10 w-10 opacity-40" />
                    <p className="text-sm">No redemptions yet</p>
                  </div>
                )}
              </MerchantCardContent>
            </MerchantCard>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-2">
            <MerchantCard className="rounded-xl border border-white/[0.06] bg-[#161B30] shadow-xl">
              <MerchantCardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 px-5 pt-6">
                <MerchantCardTitle className="text-base font-semibold text-white sm:text-lg">Reward Points Spent on Offers</MerchantCardTitle>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300"
                >
                  {rangeLabel}
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
                </button>
              </MerchantCardHeader>
              <MerchantCardContent className="px-2 pb-6 sm:px-5">
                <div className="h-[220px] w-full sm:h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rewardsWeeklyData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor="#2563eb" />
                          <stop offset="100%" stopColor="#8E2DE2" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                      <XAxis dataKey="week" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(148,163,184,0.2)' }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(v: number | string) => [Number(v).toLocaleString(), 'Redemptions']}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={48}>
                        {rewardsWeeklyData.map((_, i) => (
                          <Cell key={i} fill="url(#barGrad)" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-col gap-1 border-t border-white/[0.06] pt-4 sm:flex-row sm:justify-between">
                  <span className="text-sm text-slate-400">
                    Volume (period):{' '}
                    <span className="font-semibold text-white">{stats?.totalRewardsRedeemed?.toLocaleString() ?? 0}</span>
                  </span>
                  <ChartFooterGrowth value={stats?.weeklyRedemptionsCountGrowthPercent} label="Growth vs prior 7 weeks" />
                </div>
              </MerchantCardContent>
            </MerchantCard>

            <MerchantCard className="rounded-xl border border-white/[0.06] bg-[#161B30] shadow-xl">
              <MerchantCardHeader className="px-5 pt-6">
                <MerchantCardTitle className="text-base font-semibold text-white sm:text-lg">Insights</MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent className="flex flex-col gap-4 px-5 pb-6">
                <ul className="space-y-4">
                  {insights.map((row, idx) => (
                    <li key={idx} className="flex gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 sm:p-4">
                      <span className={cn('mt-0.5 shrink-0', row.accent)}>{row.icon}</span>
                      <p className="text-sm leading-relaxed text-slate-300">{row.text}</p>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/analytics"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#8E2DE2]/55 bg-transparent py-3 text-sm font-semibold text-purple-200 transition hover:border-[#a78bfa] hover:bg-purple-950/30"
                >
                  View All Analytics
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Link>
              </MerchantCardContent>
            </MerchantCard>
          </div>
        </motion.div>
      </MerchantDashboardLayout>
    </>
  )
}

import React, { useEffect } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MessageSquare, Wallet, Eye, Users, DollarSign, Activity, Search, BarChart3, ShoppingCart, Pencil } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { ofb } from './theme'

interface Campaign {
  id: number
  uuid: string
  title: string
  type: string
  reward_per_response_brp: number
  total_budget_brp: number
  remaining_budget_brp: number
  spent_budget_brp: number
  max_responses: number
  responses_count: number
  status: string
  created_at: string
  reward_bp_display: number
  total_budget_bp_display: number
  remaining_budget_bp_display: number
  spent_budget_bp_display: number
}

interface WalletInfo {
  balance_brp: number
  reserved_brp: number
  spent_brp: number
  available_brp: number
  balance_dollars: number
  available_dollars: number
  reserved_dollars: number
  sent_bp: number
  sent_dollars: number
}

interface Stats {
  active_campaigns: number
  total_responses: number
  filtered_campaigns: number
  completed_in_filter: number
}

function formatBp(n: number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

interface Props {
  campaigns: {
    data: Campaign[]
    links: any[]
    current_page: number
    last_page: number
    total: number
    from: number | null
    to: number | null
  }
  stats: Stats
  wallet: WalletInfo
  organization: { id: number; name: string }
  filters: { search: string; status: string; view: string }
}

const typeLabels: Record<string, string> = {
  quick_vote: 'Quick Vote', short_feedback: 'Short Feedback',
  standard_survey: 'Standard Survey', deep_feedback: 'Deep Feedback',
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-500/20 text-gray-400' },
  active:    { label: 'Active',    className: 'bg-purple-500/15 text-purple-400' },
  paused:    { label: 'Paused',    className: 'bg-amber-500/20 text-amber-400' },
  completed: { label: 'Completed', className: 'bg-blue-500/20 text-blue-400' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
}

export default function OrgFeedbackRewardsIndex({ campaigns, stats, wallet, organization, filters }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()
  const view = filters.view || 'campaigns'

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const topCampaigns = [...campaigns.data].sort((a, b) => b.responses_count - a.responses_count).slice(0, 5)

  const setView = (v: string) =>
    router.get('/organization/feedback-rewards', { ...filters, view: v }, { preserveState: true, replace: true })

  return (
    <AppLayout>
      <Head title="Feedback & Rewards" />
      <div className="w-full max-w-none py-8 px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`text-3xl font-bold mb-1 ${ofb.titleGradient}`}>Feedback & Rewards</h1>
            <p className="text-muted-foreground">{organization.name} · 1 BP = $1.00</p>
          </div>
          <div className="flex gap-2">
            <Link href="/organization/wallet/brp">
              <Button variant="outline" className={ofb.btnOutline}>
                <Wallet className="h-4 w-4 mr-2" />{formatBp(wallet.available_brp)} BP
              </Button>
            </Link>
            <Link href="/organization/feedback-rewards/create">
              <Button className={ofb.btn}>
                <Plus className="h-4 w-4 mr-2" />Create Campaign
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Campaigns', value: stats.active_campaigns, icon: Activity, color: ofb.text },
            { label: 'Total Responses', value: stats.total_responses, icon: Users, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'BP sent', value: formatBp(wallet.sent_bp), icon: DollarSign, color: 'text-amber-600', sub: `= $${wallet.sent_dollars.toFixed(2)}` },
            { label: 'Available balance', value: formatBp(wallet.available_brp), icon: Wallet, color: 'text-teal-600 dark:text-teal-400', sub: `= $${wallet.available_dollars.toFixed(2)}` },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                    {stat.sub && <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>}
                  </div>
                  <stat.icon className={`h-5 w-5 ${stat.color} opacity-70`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border w-fit">
          {[
            { key: 'campaigns', label: 'Campaigns', icon: MessageSquare },
            { key: 'insights',  label: 'Insights',  icon: BarChart3 },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setView(tab.key)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                view === tab.key ? `${ofb.tabActive} shadow-sm` : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />{tab.label}
            </button>
          ))}
        </div>

        {/* ── CAMPAIGNS VIEW ── */}
        {view === 'campaigns' && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border">
                {['', 'active', 'completed', 'paused', 'draft'].map((s) => (
                  <button key={s}
                    onClick={() => router.get('/organization/feedback-rewards', { search: filters.search, status: s, view: 'campaigns' }, { preserveState: true, replace: true })}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      filters.status === s ? `${ofb.tabActive} shadow-sm` : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" placeholder="Search campaigns..." defaultValue={filters.search}
                  onChange={(e) => router.get('/organization/feedback-rewards', { search: e.target.value, status: filters.status, view: 'campaigns' }, { preserveState: true, replace: true })}
                  className={`w-full pl-9 pr-4 py-2 rounded-lg bg-muted/50 border text-sm focus:outline-none focus:ring-1 ${ofb.focus}`}
                  />
              </div>
            </div>

            <Card>
              <CardHeader className="pb-0"><CardTitle>Campaigns</CardTitle></CardHeader>
              <CardContent className="p-0">
                {campaigns.data.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <MessageSquare className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-40" />
                    <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
                    <p className="text-muted-foreground mb-6">Create your first feedback campaign to start collecting supporter insights</p>
                    <Link href="/organization/feedback-rewards/create">
                      <Button className={ofb.btn}><Plus className="h-4 w-4 mr-2" />Create Campaign</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          {['Campaign', 'Type', 'Reward', 'Budget', 'Responses', 'Status', 'Created', ''].map(h => (
                            <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {campaigns.data.map((campaign) => {
                          const sc = statusConfig[campaign.status] || statusConfig.draft
                          return (
                            <tr key={campaign.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-5 py-4"><p className="text-sm font-medium truncate max-w-[180px]">{campaign.title}</p></td>
                              <td className="px-5 py-4"><span className="text-sm text-muted-foreground">{typeLabels[campaign.type] || campaign.type}</span></td>
                              <td className="px-5 py-4">
                                <span className="text-sm font-medium">
                                  {(Number(campaign.reward_bp_display) || 0).toFixed(2)} BP
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-sm text-muted-foreground">
                                  {(Number(campaign.remaining_budget_bp_display) || 0).toFixed(2)} /{' '}
                                  {(Number(campaign.total_budget_bp_display) || 0).toFixed(2)} BP
                                </span>
                              </td>
                              <td className="px-5 py-4"><span className="text-sm">{campaign.responses_count} / {campaign.max_responses}</span></td>
                              <td className="px-5 py-4"><Badge className={sc.className}>{sc.label}</Badge></td>
                              <td className="px-5 py-4"><span className="text-sm text-muted-foreground">{new Date(campaign.created_at).toLocaleDateString()}</span></td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Link href={`/organization/feedback-rewards/${campaign.id}/edit`}>
                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" title="Edit campaign">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Link href={`/organization/feedback-rewards/${campaign.id}`}>
                                    <Button variant="ghost" size="sm" className={ofb.textGhost} title="View campaign" aria-label="View campaign">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {campaigns.data.length > 0 && campaigns.last_page > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
                <p className="text-sm text-muted-foreground text-center sm:text-left">
                  {campaigns.total > 0 && campaigns.from != null && campaigns.to != null
                    ? `Showing ${campaigns.from}–${campaigns.to} of ${campaigns.total} campaigns`
                    : `${campaigns.total} ${campaigns.total === 1 ? 'campaign' : 'campaigns'}`}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {campaigns.links?.map((link: any, i: number) => (
                    <button
                      key={i}
                      type="button"
                      disabled={!link.url}
                      onClick={() => link.url && router.get(link.url)}
                      className={`px-3 py-1.5 rounded text-sm ${
                        link.active ? `${ofb.tabActive} text-white` : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      } ${!link.url ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      aria-label={String(link.label).replace(/<[^>]*>/g, '').trim() || 'Pagination'}
                      title={String(link.label).replace(/<[^>]*>/g, '').trim() || 'Pagination'}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ))}
                </div>
              </div>
            )}
            {campaigns.data.length > 0 && campaigns.last_page === 1 && (campaigns.total ?? 0) > 0 && (
              <p className="text-sm text-muted-foreground px-1">
                {campaigns.total} {campaigns.total === 1 ? 'campaign' : 'campaigns'}
              </p>
            )}
          </>
        )}

        {/* ── INSIGHTS VIEW ── */}
        {view === 'insights' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: 'Total Campaigns', value: stats.filtered_campaigns, color: 'text-foreground' },
                { label: 'Completed', value: stats.completed_in_filter, color: 'text-blue-500' },
                { label: 'Total Responses', value: stats.total_responses, color: 'text-teal-500' },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-5 text-center">
                    <p className={`text-4xl font-extrabold ${s.color}`}>{s.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle>Wallet overview</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Total balance', bp: wallet.balance_brp, usd: wallet.balance_dollars, valueClass: ofb.text },
                  { label: 'Reserved', bp: wallet.reserved_brp, usd: wallet.reserved_dollars, valueClass: 'text-amber-600' },
                  { label: 'BP sent', bp: wallet.sent_bp, usd: wallet.sent_dollars, valueClass: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Available', bp: wallet.available_brp, usd: wallet.available_dollars, valueClass: 'text-teal-600 dark:text-teal-400' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center gap-4 py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${item.valueClass}`}>{formatBp(item.bp)} BP</p>
                      <p className="text-xs text-muted-foreground">= ${item.usd.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Top Campaigns by Responses</CardTitle></CardHeader>
              <CardContent className="p-0">
                {topCampaigns.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No campaigns yet.</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        {['Campaign', 'Status', 'Responses', 'BP sent', 'Completion'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {topCampaigns.map((c, i) => {
                        const sc  = statusConfig[c.status] || statusConfig.draft
                        const pct = c.max_responses > 0 ? Math.round((c.responses_count / c.max_responses) * 100) : 0
                        return (
                          <tr key={c.id} className="hover:bg-muted/30">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                                <Link href={`/organization/feedback-rewards/${c.id}`} className={`text-sm font-medium ${ofb.text} hover:text-blue-600 transition-colors truncate max-w-[160px] dark:hover:text-blue-400`}>
                                  {c.title}
                                </Link>
                              </div>
                            </td>
                            <td className="px-5 py-3"><Badge className={sc.className}>{sc.label}</Badge></td>
                            <td className="px-5 py-3 text-sm">{c.responses_count} / {c.max_responses}</td>
                            <td className="px-5 py-3 text-sm font-medium text-purple-600 dark:text-purple-400">
                              {(c.spent_budget_bp_display ?? 0).toFixed(2)} BP
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden w-20">
                                  <div className={`h-full rounded-full ${ofb.progress}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {wallet.available_brp === 0 && (
              <Card className={ofb.surfaceSoft}>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">No BP available</p>
                    <p className="text-sm text-muted-foreground">Top up your wallet to launch more campaigns</p>
                  </div>
                  <Link href="/organization/wallet/brp/buy">
                    <Button className={`${ofb.btn} shrink-0`}>
                      <ShoppingCart className="h-4 w-4 mr-2" />Buy BP
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

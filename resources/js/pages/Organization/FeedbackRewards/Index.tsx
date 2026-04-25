import React, { useEffect } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MessageSquare, Wallet, Eye, Users, DollarSign, Activity, Search, BarChart3, ShoppingCart } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

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
}

interface WalletInfo {
  balance_brp: number
  reserved_brp: number
  spent_brp: number
  available_brp: number
}

interface Props {
  campaigns: { data: Campaign[]; links: any[]; current_page: number; last_page: number }
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
  active:    { label: 'Active',    className: 'bg-emerald-500/20 text-emerald-400' },
  paused:    { label: 'Paused',    className: 'bg-amber-500/20 text-amber-400' },
  completed: { label: 'Completed', className: 'bg-blue-500/20 text-blue-400' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
}

export default function OrgFeedbackRewardsIndex({ campaigns, wallet, organization, filters }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()
  const view = filters.view || 'campaigns'

  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const activeCampaigns = campaigns.data.filter((c) => c.status === 'active').length
  const totalResponses  = campaigns.data.reduce((s, c) => s + c.responses_count, 0)
  const completedCount  = campaigns.data.filter((c) => c.status === 'completed').length
  const topCampaigns    = [...campaigns.data].sort((a, b) => b.responses_count - a.responses_count).slice(0, 5)

  const setView = (v: string) =>
    router.get('/organization/feedback-rewards', { ...filters, view: v }, { preserveState: true, replace: true })

  return (
    <AppLayout>
      <Head title="Feedback & Rewards" />
      <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Feedback & Rewards</h1>
            <p className="text-muted-foreground">{organization.name}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/organization/wallet/brp">
              <Button variant="outline" className="border-[#FF1493]/40 text-[#FF1493] hover:bg-[#FF1493]/10">
                <Wallet className="h-4 w-4 mr-2" />{wallet.available_brp.toLocaleString()} BRP
              </Button>
            </Link>
            <Link href="/organization/feedback-rewards/create">
              <Button className="bg-gradient-to-r from-[#FF1493] to-[#DC143C]">
                <Plus className="h-4 w-4 mr-2" />Create Campaign
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Campaigns', value: activeCampaigns,                      icon: Activity,   color: 'text-[#FF1493]' },
            { label: 'Total Responses',  value: totalResponses,                        icon: Users,      color: 'text-emerald-500' },
            { label: 'BRP Spent',        value: wallet.spent_brp.toLocaleString(),     icon: DollarSign, color: 'text-amber-500',   sub: `$${(wallet.spent_brp * 0.01).toFixed(2)}` },
            { label: 'BRP Available',    value: wallet.available_brp.toLocaleString(), icon: Wallet,     color: 'text-foreground',  sub: `$${(wallet.available_brp * 0.01).toFixed(2)}` },
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
                view === tab.key ? 'bg-[#FF1493] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                      filters.status === s ? 'bg-[#FF1493] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted/50 border text-sm focus:outline-none focus:ring-1 focus:ring-[#FF1493]/60" />
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
                      <Button className="bg-gradient-to-r from-[#FF1493] to-[#DC143C]"><Plus className="h-4 w-4 mr-2" />Create Campaign</Button>
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
                              <td className="px-5 py-4"><span className="text-sm font-medium">{campaign.reward_per_response_brp} BP</span></td>
                              <td className="px-5 py-4"><span className="text-sm text-muted-foreground">{campaign.remaining_budget_brp.toLocaleString()} / {campaign.total_budget_brp.toLocaleString()}</span></td>
                              <td className="px-5 py-4"><span className="text-sm">{campaign.responses_count} / {campaign.max_responses}</span></td>
                              <td className="px-5 py-4"><Badge className={sc.className}>{sc.label}</Badge></td>
                              <td className="px-5 py-4"><span className="text-sm text-muted-foreground">{new Date(campaign.created_at).toLocaleDateString()}</span></td>
                              <td className="px-5 py-4 text-right">
                                <Link href={`/organization/feedback-rewards/${campaign.id}`}>
                                  <Button variant="ghost" size="sm" className="text-[#FF1493]"><Eye className="h-4 w-4" /></Button>
                                </Link>
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

            {campaigns.last_page > 1 && (
              <div className="flex items-center justify-center gap-2">
                {campaigns.links?.map((link: any, i: number) => (
                  <button key={i} disabled={!link.url} onClick={() => link.url && router.get(link.url)}
                    className={`px-3 py-1.5 rounded text-sm ${link.active ? 'bg-[#FF1493] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'} ${!link.url ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    dangerouslySetInnerHTML={{ __html: link.label }} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── INSIGHTS VIEW ── */}
        {view === 'insights' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: 'Total Campaigns', value: campaigns.data.length, color: 'text-foreground' },
                { label: 'Completed',        value: completedCount,        color: 'text-blue-500' },
                { label: 'Total Responses',  value: totalResponses,        color: 'text-emerald-500' },
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
              <CardHeader><CardTitle>BRP Budget Overview</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Total BRP Purchased', value: wallet.balance_brp + wallet.spent_brp, color: '#FF1493' },
                  { label: 'BRP Spent on Rewards', value: wallet.spent_brp,    color: '#10B981' },
                  { label: 'BRP Reserved',         value: wallet.reserved_brp, color: '#F59E0B' },
                  { label: 'BRP Available',        value: wallet.available_brp, color: '#8B5CF6' },
                ].map((item) => {
                  const total = (wallet.balance_brp + wallet.spent_brp) || 1
                  const pct   = Math.round((item.value / total) * 100)
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-bold">{item.value.toLocaleString()} BRP</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: item.color }} />
                      </div>
                    </div>
                  )
                })}
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
                        {['Campaign', 'Status', 'Responses', 'BRP Spent', 'Completion'].map(h => (
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
                                <Link href={`/organization/feedback-rewards/${c.id}`} className="text-sm font-medium hover:text-[#FF1493] transition-colors truncate max-w-[160px]">
                                  {c.title}
                                </Link>
                              </div>
                            </td>
                            <td className="px-5 py-3"><Badge className={sc.className}>{sc.label}</Badge></td>
                            <td className="px-5 py-3 text-sm">{c.responses_count} / {c.max_responses}</td>
                            <td className="px-5 py-3 text-sm font-medium text-[#FF1493]">{(c.spent_budget_brp ?? 0).toLocaleString()} BRP</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden w-20">
                                  <div className="h-full rounded-full bg-[#FF1493]" style={{ width: `${pct}%` }} />
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
              <Card className="border-[#FF1493]/20 bg-[#FF1493]/5">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">No BRP available</p>
                    <p className="text-sm text-muted-foreground">Top up your wallet to launch more campaigns</p>
                  </div>
                  <Link href="/organization/wallet/brp/buy">
                    <Button className="bg-gradient-to-r from-[#FF1493] to-[#DC143C] shrink-0">
                      <ShoppingCart className="h-4 w-4 mr-2" />Buy BRP
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

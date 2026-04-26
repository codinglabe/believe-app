import React, { useEffect } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Rocket, StopCircle, Copy, Pencil } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface InsightBreakdown { label: string; count: number; percentage: number }
interface Insight { question: string; type: string; total: number; breakdown: InsightBreakdown[] }
interface Campaign {
  id: number; uuid: string; title: string; type: string
  reward_per_response_brp: number; total_budget_brp: number
  spent_budget_brp: number; remaining_budget_brp: number
  max_responses: number; responses_count: number
  status: string; created_at: string
  starts_at: string | null; ends_at: string | null
  questions: any[]
}
interface Response {
  id: number; supporter: { id: number; name: string; email: string }
  reward_brp: number; status: string; created_at: string
}
interface Props {
  campaign: Campaign
  insights: Insight[]
  recentResponses: Response[]
  organization: { id: number; name: string }
}

const typeLabels: Record<string, string> = {
  quick_vote: 'Quick Vote', short_feedback: 'Short Feedback',
  standard_survey: 'Standard Survey', deep_feedback: 'Deep Feedback',
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-500/20 text-gray-400' },
  active: { label: 'Active', className: 'bg-emerald-500/20 text-emerald-400 animate-pulse' },
  paused: { label: 'Paused', className: 'bg-amber-500/20 text-amber-400' },
  completed: { label: 'Completed', className: 'bg-blue-500/20 text-blue-400' },
}

const CHART_COLORS = ['#FF1493', '#10B981', '#F59E0B', '#8B5CF6', '#DC143C', '#06B6D4']

function DonutChart({ breakdown, total }: { breakdown: InsightBreakdown[]; total: number }) {
  const size = 140; const r = 54; const cx = 70; const cy = 70
  const circ = 2 * Math.PI * r
  let offset = 0
  const arcs = breakdown.map((item, i) => {
    const dash = (item.percentage / 100) * circ
    const gap = circ - dash
    const arc = { offset, dash, gap, color: CHART_COLORS[i % CHART_COLORS.length] }
    offset += dash
    return arc
  })
  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          {arcs.map((arc, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={arc.color}
              strokeWidth={18} strokeDasharray={`${arc.dash} ${arc.gap}`} strokeDashoffset={-arc.offset} />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold">{total}</span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
      </div>
      <div className="space-y-1.5 flex-1">
        {breakdown.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-muted-foreground flex-1 truncate">{item.label}</span>
            <span className="font-bold">{item.count}</span>
            <span className="text-muted-foreground w-10 text-right">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OrgShowCampaign({ campaign, insights, recentResponses, organization }: Props) {
  const { props } = usePage<{ success?: string; error?: string }>()
  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const shareUrl = `${window.location.origin}/feedback/${campaign.uuid}`
  const completionRate = campaign.max_responses > 0 ? Math.round((campaign.responses_count / campaign.max_responses) * 100) : 0
  const sc = statusConfig[campaign.status] || statusConfig.draft

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      showSuccessToast('Link copied!')
    } catch {
      showErrorToast('Unable to copy link. Please copy it manually.')
    }
  }

  return (
    <AppLayout>
      <Head title={`${campaign.title} — Feedback & Rewards`} />
      <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <Link href="/organization/feedback-rewards" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1">
              <ArrowLeft className="h-3.5 w-3.5" />Back to Campaigns
            </Link>
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-2xl font-bold">{campaign.title}</h1>
              <Badge className={sc.className}>{sc.label}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">{typeLabels[campaign.type]} · {organization.name}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href={`/organization/feedback-rewards/${campaign.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-1" />Edit
              </Button>
            </Link>
            {campaign.status === 'draft' && (
              <Button
                onClick={() => router.post(`/organization/feedback-rewards/${campaign.id}/launch`)}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600"
              >
                <Rocket className="h-4 w-4 mr-1" />Launch Campaign
              </Button>
            )}
            {campaign.status === 'active' && (
              <>
                <Button variant="outline" size="sm" onClick={copyShareUrl}>
                  <Copy className="h-4 w-4 mr-1" />Copy Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => { if (confirm('End campaign? Unused BRP will be released back to your wallet.')) router.post(`/organization/feedback-rewards/${campaign.id}/end`) }}
                >
                  <StopCircle className="h-4 w-4 mr-1" />End Campaign
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main: Insights */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Response Insights</CardTitle>
                <p className="text-sm text-muted-foreground">Analysis of all responses collected so far</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {insights.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">
                    No responses yet. {campaign.status === 'active' ? 'Share your campaign link to start collecting feedback.' : 'Launch the campaign to start collecting feedback.'}
                  </p>
                ) : insights.map((insight, qi) => (
                  <div key={qi} className="space-y-2">
                    <p className="text-sm font-medium">{insight.question}</p>
                    <p className="text-xs text-muted-foreground">{insight.type.replace('_', ' ')} · {insight.total} responses</p>
                    {insight.total === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No responses yet</p>
                    ) : insight.type === 'multiple_choice' ? (
                      <DonutChart breakdown={insight.breakdown} total={insight.total} />
                    ) : (
                      <div className="space-y-2">
                        {insight.breakdown.map((item, bi) => (
                          <div key={bi} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-16">{item.label}</span>
                            <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.percentage}%`, background: CHART_COLORS[bi] }} />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{item.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {recentResponses.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Recent Responses</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        {['Date', 'Supporter', 'BP Earned', 'Status'].map(h => (
                          <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentResponses.map((resp) => (
                        <tr key={resp.id} className="hover:bg-muted/30">
                          <td className="px-5 py-3 text-sm text-muted-foreground">{new Date(resp.created_at).toLocaleDateString()}</td>
                          <td className="px-5 py-3 text-sm">{resp.supporter?.name || 'Anonymous'}</td>
                          <td className="px-5 py-3 text-sm text-emerald-500 font-semibold">+{resp.reward_brp} BP</td>
                          <td className="px-5 py-3">
                            <Badge className="bg-emerald-500/15 text-emerald-500">{resp.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-3.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Campaign Stats</p>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Responses</span><span className="font-bold">{campaign.responses_count} / {campaign.max_responses}</span></div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Completion</span><span>{completionRate}%</span></div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#FF1493] to-emerald-500 transition-all duration-700" style={{ width: `${completionRate}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">BRP Spent</span><span className="font-bold">{campaign.spent_budget_brp.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">BRP Remaining</span><span className="font-bold text-emerald-500">{campaign.remaining_budget_brp.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Reward/Response</span><span className="font-bold">{campaign.reward_per_response_brp} BP</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Budget</span><span className="font-bold">{campaign.total_budget_brp.toLocaleString()} BRP</span></div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-muted-foreground text-xs">{new Date(campaign.created_at).toLocaleDateString()}</span>
                </div>
                {campaign.starts_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="text-xs">{new Date(campaign.starts_at).toLocaleDateString()}</span>
                  </div>
                )}
                {campaign.ends_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">End Date</span>
                    <span className="text-xs">{new Date(campaign.ends_at).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {campaign.status === 'active' && (
              <div className="p-4 rounded-xl bg-[#FF1493]/10 border border-[#FF1493]/20 space-y-2">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Share Link</p>
                <p className="text-xs text-[#FF1493] break-all">{shareUrl}</p>
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={copyShareUrl}>
                  <Copy className="h-3 w-3 mr-1" />Copy Link
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Link href={`/organization/feedback-rewards/${campaign.id}/edit`}>
                <Button variant="outline" className="w-full">
                  <Pencil className="h-4 w-4 mr-2" />Edit Campaign
                </Button>
              </Link>
              {campaign.status === 'draft' && (
                <Button
                  onClick={() => router.post(`/organization/feedback-rewards/${campaign.id}/launch`)}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600"
                >
                  <Rocket className="h-4 w-4 mr-2" />Launch Campaign
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
